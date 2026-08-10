defmodule OpalCore.SocialFlow.Execution.QuestionLedger do
  @moduledoc """
  Privacy-safe ledger of every question Opal asks.

  Each entry answers: WHY was this asked?
  And later: COULD it have been eliminated safely?

  No private message text. No names. No raw conversation.
  """

  use Agent

  @reasons ~w(
    missing_willingness
    missing_time
    missing_high_impact_preference
    missing_permission
    missing_provider_truth
    missing_execution_authorization
    stale_fact_confirmation
    required_participant_unresolved
    high_impact_unknown
    user_asked
    other
  )

  def reasons, do: @reasons

  def start_link(_ \\ []) do
    Agent.start_link(fn -> [] end, name: __MODULE__)
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
      Agent.update(__MODULE__, fn _ -> [] end)
    catch
      :exit, _ -> ensure_started()
    end

    :ok
  end

  @doc """
  Record a question Opal decided to ask.

  attrs: reason_category, topic, plan_index, avoidable?, later_necessary?
  Never include message text.
  """
  def record(attrs) when is_map(attrs) do
    ensure_started()
    a = stringify(attrs)
    reason = normalize_reason(a["reason_category"] || a["reason"])

    entry = %{
      "id" => "q_" <> short_id(),
      "reason_category" => reason,
      "topic" => a["topic"] || "unknown",
      "plan_index" => a["plan_index"],
      "relationship_scoped" => a["relationship_scoped"] == true,
      "could_have_been_eliminated" => a["could_have_been_eliminated"] == true,
      "later_proven_necessary" => a["later_proven_necessary"],
      "caused_correction" => a["caused_correction"] == true,
      "ignored_by_user" => a["ignored_by_user"] == true,
      "private_text" => false,
      "at" => DateTime.utc_now()
    }

    Agent.update(__MODULE__, fn list -> [entry | list] end)
    {:ok, entry}
  end

  def record(_), do: {:error, :invalid}

  @doc "Mark post-hoc whether a question was avoidable."
  def mark_eliminable(id, avoidable?) when is_binary(id) do
    ensure_started()

    Agent.update(__MODULE__, fn list ->
      Enum.map(list, fn
        %{"id" => ^id} = e -> Map.put(e, "could_have_been_eliminated", avoidable? == true)
        e -> e
      end)
    end)

    :ok
  end

  def snapshot do
    ensure_started()
    Agent.get(__MODULE__, & &1)
  end

  def summary do
    entries = snapshot()
    total = length(entries)
    avoidable = Enum.count(entries, &(&1["could_have_been_eliminated"] == true))
    corrections = Enum.count(entries, &(&1["caused_correction"] == true))

    by_reason =
      entries
      |> Enum.group_by(& &1["reason_category"])
      |> Map.new(fn {k, v} -> {k, length(v)} end)

    %{
      "questions_asked" => total,
      "could_have_been_eliminated" => avoidable,
      "caused_correction" => corrections,
      "by_reason" => by_reason,
      "elimination_opportunity_rate" =>
        if(total > 0, do: Float.round(avoidable / total * 1.0, 3), else: 0.0),
      "goal" => "fewer_and_higher_value",
      "private_text" => false
    }
  end

  defp normalize_reason(r) when r in @reasons, do: r
  defp normalize_reason("willingness"), do: "missing_willingness"
  defp normalize_reason("time"), do: "missing_time"
  defp normalize_reason("preference"), do: "missing_high_impact_preference"
  defp normalize_reason("permission"), do: "missing_permission"
  defp normalize_reason("provider"), do: "missing_provider_truth"
  defp normalize_reason("authorization"), do: "missing_execution_authorization"
  defp normalize_reason("stale"), do: "stale_fact_confirmation"
  defp normalize_reason("required"), do: "required_participant_unresolved"
  defp normalize_reason(_), do: "other"

  defp short_id do
    :crypto.strong_rand_bytes(6) |> Base.encode16(case: :lower)
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
