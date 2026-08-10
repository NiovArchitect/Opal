defmodule OpalCore.SocialFlow.Execution.CorrectionLedger do
  @moduledoc """
  Privacy-safe human correction ledger.

  Corrections are gold for architecture improvement — never user blame.

  Classify against: memory | inference | scope | world_fact | current_plan | provider_truth
  """

  use Agent

  @targets ~w(
    memory
    inference
    scope
    world_fact
    current_plan
    provider_truth
    delivery
    authority
  )

  @failure_classes ~w(
    missed_intent
    wrong_intent
    wrong_scope
    wrong_participant
    wrong_time
    wrong_willingness
    wrong_preference
    wrong_durability
    wrong_relationship_scope
    stale_truth
    authority_error
  )

  def targets, do: @targets
  def failure_classes, do: @failure_classes

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
  Record a correction. No private message body in telemetry.
  """
  def record(attrs) when is_map(attrs) do
    ensure_started()
    a = stringify(attrs)

    entry = %{
      "id" => "c_" <> short_id(),
      "target" => normalize_target(a["target"] || a["against"]),
      "failure_class" => normalize_class(a["failure_class"] || a["class"]),
      "immediate_update" => a["immediate_update"] != false,
      "dependent_only_invalidation" => a["dependent_only"] != false,
      "invalidated" => List.wrap(a["invalidated"] || []),
      "preserved" => List.wrap(a["preserved"] || []),
      "plan_index" => a["plan_index"],
      "private_text" => false,
      "user_blame" => false,
      "at" => DateTime.utc_now()
    }

    Agent.update(__MODULE__, fn list -> [entry | list] end)
    {:ok, entry}
  end

  def record(_), do: {:error, :invalid}

  @doc """
  Propagation rule: Friday not Thursday invalidates time-dependent only.
  """
  def propagate(correction_kind, plan_state \\ %{})

  def propagate("time_change", plan_state) when is_map(plan_state) do
    %{
      "invalidated" => ~w(time travel leave_by provider_slot readiness_time),
      "preserved" => ~w(relationship_context food_preference participants hard_constraints),
      "erase_all" => false,
      "immediate" => true
    }
  end

  def propagate("preference_correction", _) do
    %{
      "invalidated" => ~w(preference_dependent_candidates fit),
      "preserved" => ~w(time participants relationship_context),
      "erase_all" => false,
      "immediate" => true
    }
  end

  def propagate("scope_correction", _) do
    %{
      "invalidated" => ~w(wrong_scope_memory applied_prior),
      "preserved" => ~w(correct_scope_memory current_plan),
      "erase_all" => false,
      "immediate" => true
    }
  end

  def propagate("venue_failure", _) do
    %{
      "invalidated" => ~w(destination navigation leave_by provider_prep provider_slot),
      "preserved" => ~w(time relationship_context vibe budget participants hard_constraints),
      "erase_all" => false,
      "immediate" => true,
      "one_replacement" => true
    }
  end

  def propagate("destination_change", _) do
    %{
      "invalidated" => ~w(destination navigation leave_by provider_prep),
      "preserved" => ~w(time willingness people relationship_context),
      "erase_all" => false,
      "immediate" => true
    }
  end

  def propagate("wrong_preference", _) do
    %{
      "invalidated" => ~w(preference_dependent_candidates fit memory_prior),
      "preserved" => ~w(time participants relationship_context hard_constraints),
      "erase_all" => false,
      "immediate" => true
    }
  end

  def propagate(_, _) do
    %{
      "invalidated" => ~w(dependent_reasoning),
      "preserved" => ~w(unrelated_context),
      "erase_all" => false,
      "immediate" => true
    }
  end

  def snapshot do
    ensure_started()
    Agent.get(__MODULE__, & &1)
  end

  def summary do
    entries = snapshot()

    by_class =
      entries
      |> Enum.group_by(& &1["failure_class"])
      |> Map.new(fn {k, v} -> {k, length(v)} end)

    by_target =
      entries
      |> Enum.group_by(& &1["target"])
      |> Map.new(fn {k, v} -> {k, length(v)} end)

    %{
      "corrections" => length(entries),
      "by_class" => by_class,
      "by_target" => by_target,
      "all_immediate" => Enum.all?(entries, &(&1["immediate_update"] == true)),
      "user_blame" => false,
      "private_text" => false
    }
  end

  defp normalize_target(t) when t in @targets, do: t
  defp normalize_target(_), do: "inference"

  defp normalize_class(c) when c in @failure_classes, do: c
  defp normalize_class("stale"), do: "stale_truth"
  defp normalize_class("scope"), do: "wrong_scope"
  defp normalize_class(_), do: "wrong_intent"

  defp short_id, do: :crypto.strong_rand_bytes(6) |> Base.encode16(case: :lower)

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
