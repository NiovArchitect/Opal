defmodule OpalCore.SocialFlow.Feasibility.MaterialTime do
  @moduledoc """
  Opal-novel time services — **silence by default**.

  Realtime time is not a clock feed. Opal surfaces a moment only when
  user value changed: leave-by window, compressed overlap, or plan
  significant change. Intermediate recomputes stay silent.

  Law (OPAL_REALTIME_INTELLIGENCE_ARCHITECTURE):
  EVENT → … → SIGNAL ONLY IF USER VALUE CHANGED
  """

  alias OpalCore.SocialFlow.Feasibility.LeaveByMateriality

  @doc """
  Classify a time-related candidate for UI.

  Returns `{:silence, reason}` or `{:material, kind, payload}`.
  """
  def evaluate(candidate, opts \\ []) when is_map(candidate) do
    c = stringify(candidate)
    kind = c["kind"] || c["type"] || "unknown"

    case kind do
      "leave_by" ->
        case LeaveByMateriality.evaluate(c, opts) do
          {:silence, meta} -> {:silence, meta["reason"] || "leave_by_silence"}
          {:material, payload} -> {:material, "leave_by", payload}
        end

      "availability_overlap" ->
        evaluate_overlap(c, opts)

      "significant_change" ->
        evaluate_significant_change(c, opts)

      "shared_now" ->
        evaluate_shared_now(c, opts)

      _ ->
        {:silence, "unknown_kind"}
    end
  end

  @doc """
  Shared-safe overlap projection — one suggestion, not a schedule dump.
  Material only when strongest_common_start is present and not already shown.
  """
  def evaluate_overlap(overlap, opts \\ []) when is_map(overlap) do
    o = stringify(overlap)
    already? = Keyword.get(opts, :already_shown, false) == true
    start = o["strongest_common_start"] || o["start"]

    cond do
      already? ->
        {:silence, "already_shown"}

      is_nil(start) or start == "" ->
        {:silence, "no_common_start"}

      o["shared_safe"] == false ->
        {:silence, "not_shared_safe"}

      true ->
        {:material, "availability_overlap",
         %{
           "kind" => "availability_overlap",
           "strongest_common_start" => start,
           "window_note" => o["window_note"],
           "compression" => o["compression"] || "one_suggestion",
           "one_suggestion" => true,
           "shared_safe" => true,
           "spam" => false,
           "materiality" => "OVERLAP_COMPRESSED"
         }}
    end
  end

  @doc """
  Significant plan change — one calm interrupt, not a changelog.
  """
  def evaluate_significant_change(change, opts \\ []) when is_map(change) do
    c = stringify(change)
    already? = Keyword.get(opts, :already_notified, false) == true

    cond do
      already? ->
        {:silence, "already_notified"}

      c["user_value_changed"] != true and c["significant"] != true ->
        {:silence, "no_user_value_change"}

      true ->
        {:material, "significant_change",
         %{
           "kind" => "significant_change",
           "commitment_id" => c["commitment_id"],
           "content_summary" => c["content_summary"] || "Your plan changed",
           "spam" => false,
           "materiality" => "PLAN_VALUE_CHANGED"
         }}
    end
  end

  @doc """
  Shared-now: both (or group) free in a window — without exposing private calendars.
  """
  def evaluate_shared_now(payload, opts \\ []) when is_map(payload) do
    p = stringify(payload)
    already? = Keyword.get(opts, :already_shown, false) == true
    window = p["shared_window_start"] || p["strongest_common_start"]

    cond do
      already? ->
        {:silence, "already_shown"}

      is_nil(window) or window == "" ->
        {:silence, "no_shared_window"}

      p["participant_roster_exposed"] == true ->
        {:silence, "roster_forbidden"}

      true ->
        {:material, "shared_now",
         %{
           "kind" => "shared_now",
           "shared_window_start" => window,
           "participant_count" => p["participant_count"],
           "roster_exposed" => false,
           "calendars_exposed" => false,
           "spam" => false,
           "materiality" => "SHARED_NOW"
         }}
    end
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
