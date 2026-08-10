defmodule OpalCore.SocialFlow.Execution.MemoryStore do
  @moduledoc """
  In-process durable/ephemeral memory store for adaptive learning.

  Supports admit, retrieve, supersede, contradict, forget/revoke.
  Not a profile graph. Not a public score.
  """

  use Agent

  alias OpalCore.SocialFlow.Ambient.Freshness
  alias OpalCore.SocialFlow.Execution.{MemoryAdmission, MemoryKind, MemoryScope}

  def start_link(_ \\ []) do
    Agent.start_link(fn -> %{} end, name: __MODULE__)
  end

  def ensure_started do
    case Process.whereis(__MODULE__) do
      nil ->
        case start_link([]) do
          {:ok, _} -> :ok
          {:error, {:already_started, _}} -> :ok
          _ -> :ok
        end

      pid ->
        if Process.alive?(pid), do: :ok, else: start_link([]) && :ok
    end
  end

  def reset do
    ensure_started()

    try do
      Agent.update(__MODULE__, fn _ -> %{} end)
    catch
      :exit, _ -> ensure_started()
    end

    :ok
  end

  @doc "Admit via MemoryAdmission; store if admitted."
  def admit(attrs) when is_map(attrs) do
    ensure_started()
    a = stringify(attrs)

    decision =
      if a["admitted"] == true and is_binary(a["dimension"]) do
        %{"admit" => true, "fact" => a}
      else
        MemoryAdmission.evaluate(a)
      end

    if decision["admit"] do
      fact = stamp(decision["fact"] || a)
      id = fact["id"]

      Agent.get_and_update(__MODULE__, fn state ->
        state2 = supersede_weaker(state, fact)
        {{:ok, fact}, Map.put(state2, id, fact)}
      end)
    else
      {:reject, decision}
    end
  end

  def admit(_), do: {:reject, %{"reason" => "invalid"}}

  @doc "Retrieve memories applicable to context, freshness-filtered, authority-sorted."
  def retrieve(context, opts \\ []) when is_map(context) do
    ensure_started()
    c = stringify(context)
    now = Keyword.get(opts, :now) || c["now"] || DateTime.utc_now()
    dimension = Keyword.get(opts, :dimension) || c["dimension"]

    ensure_started()

    facts =
      Agent.get(__MODULE__, fn state ->
        state
        |> Map.values()
        |> Enum.filter(fn f ->
          MemoryScope.applicable?(f, c) and f["forgotten"] != true and f["superseded"] != true and
            (is_nil(dimension) or f["dimension"] == dimension) and fresh_enough?(f, now)
        end)
        |> Enum.sort_by(& &1["authority_rank"], :desc)
      end)

    %{
      "memories" => facts,
      "count" => length(facts),
      "profile_machine" => false,
      "public_score" => false
    }
  end

  @doc "Explicit forget / revoke."
  def forget(memory_id, opts \\ []) when is_binary(memory_id) do
    ensure_started()
    reason = Keyword.get(opts, :reason, "user_forget")

    Agent.get_and_update(__MODULE__, fn state ->
      case Map.get(state, memory_id) do
        nil ->
          {{:error, :not_found}, state}

        fact ->
          updated =
            Map.merge(fact, %{
              "forgotten" => true,
              "revoked" => true,
              "forgotten_at" => DateTime.utc_now(),
              "forget_reason" => reason
            })

          {{:ok, updated}, Map.put(state, memory_id, updated)}
      end
    end)
  end

  @doc "Mark contradiction — reduce confidence on inferred; do not argue."
  def contradict(memory_id, _opts \\ [])

  def contradict(memory_id, _opts) when is_binary(memory_id) do
    ensure_started()

    Agent.get_and_update(__MODULE__, fn state ->
      case Map.get(state, memory_id) do
        nil ->
          {{:error, :not_found}, state}

        %{"kind" => kind} = fact ->
          if kind in ~w(inferred_preference derived_context repeated_behavior) do
            updated =
              Map.merge(fact, %{
                "confidence_band" => "inferred_low_medium",
                "authority_rank" => max(MemoryKind.authority_rank(kind) - 15, 0),
                "contradicted" => true,
                "contradiction_count" => (fact["contradiction_count"] || 0) + 1,
                "do_not_argue" => true
              })

            {{:ok, updated}, Map.put(state, memory_id, updated)}
          else
            # Explicit needs supersession by new explicit, not silent contradict
            {{:ok, Map.put(fact, "needs_explicit_supersession", true)}, state}
          end
      end
    end)
  end

  def snapshot do
    ensure_started()
    Agent.get(__MODULE__, &Map.values/1)
  end

  def get(id) when is_binary(id) do
    ensure_started()
    Agent.get(__MODULE__, &Map.get(&1, id))
  end

  defp stamp(fact) do
    id =
      fact["id"] ||
        "mem_" <>
          (:crypto.hash(:sha256, :erlang.term_to_binary({fact, :os.system_time()}))
           |> Base.encode16(case: :lower)
           |> binary_part(0, 12))

    Map.merge(fact, %{
      "id" => id,
      "forgotten" => false,
      "superseded" => false,
      "stored_at" => DateTime.utc_now()
    })
  end

  defp supersede_weaker(state, new_fact) do
    Enum.reduce(state, %{}, fn {id, old}, acc ->
      if same_slot?(old, new_fact) and
           (new_fact["authority_rank"] || 0) >= (old["authority_rank"] || 0) and
           id != new_fact["id"] do
        Map.put(
          acc,
          id,
          Map.merge(old, %{
            "superseded" => true,
            "superseded_by" => new_fact["id"],
            "superseded_at" => DateTime.utc_now()
          })
        )
      else
        Map.put(acc, id, old)
      end
    end)
  end

  defp same_slot?(a, b) do
    a["owner_user_id"] == b["owner_user_id"] and a["dimension"] == b["dimension"] and
      a["scope"] == b["scope"] and a["scope_id"] == b["scope_id"] and
      a["forgotten"] != true
  end

  defp fresh_enough?(fact, now) do
    if fact["durable"] == true and fact["kind"] in ~w(explicit_fact explicit_correction) do
      true
    else
      observed = get_in(fact, ["provenance", "observed_at"]) || fact["stored_at"]

      {:ok, f} =
        Freshness.confidence(%{
          "source_class" => fact["freshness_class"] || "conversation_evidence",
          "observed_at" => observed,
          "now" => now,
          "lifecycle_active" => fact["durable"] == true
        })

      f["usable"] != false and f["stale"] != true
    end
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
