defmodule OpalCore.Center.ScheduleFeasibility do
  @moduledoc """
  Work-conflict evaluation with travel buffers.

  Does not invent PTO success. Distinguishes:
  - no conflict → PTO_ACTION = NONE
  - conflict → evaluate standing authority / prepare ask
  """

  @doc """
  Evaluate whether a departure conflicts with a work shift.

  Options:
  - `:shift_end` DateTime
  - `:departure_at` DateTime
  - `:buffer_minutes` integer (default 180)
  - `:already_approved_pto` boolean
  """
  def evaluate_work_conflict(opts) when is_list(opts) or is_map(opts) do
    opts = normalize(opts)
    shift_end = opts[:shift_end] || opts["shift_end"]
    departure = opts[:departure_at] || opts["departure_at"]
    buffer = opts[:buffer_minutes] || opts["buffer_minutes"] || 180
    approved? = opts[:already_approved_pto] || opts["already_approved_pto"] || false

    cond do
      approved? ->
        result(:none, false, "PTO already approved — no new request.")

      is_nil(shift_end) or is_nil(departure) ->
        result(:unknown, false, "Work schedule not known yet.")

      true ->
        needed = DateTime.add(departure, -buffer * 60, :second)

        if DateTime.compare(shift_end, needed) != :gt do
          result(:none, false, "Feasible after work with travel buffer — no time-off request.")
        else
          result(:conflict, true, "Work overlaps departure — time-off may be needed.")
        end
    end
  end

  @doc """
  Standing PTO auto-submit policy check (authority substrate).

  Returns `:auto_prepare_submit` | `:ask` | `:none`.
  Never claims approval.
  """
  def pto_action_for_conflict(conflict_result, standing \\ %{}) when is_map(conflict_result) do
    if conflict_result["work_conflict"] != true do
      %{
        "PTO_ACTION" => "NONE",
        "PTO_PROVIDER_CONNECTED" => standing["provider_connected"] == true,
        "submission_supported" => standing["submission_supported"] == true,
        "status" => "none"
      }
    else
      days_ahead = standing["days_ahead"] || 0
      days_needed = standing["days_needed"] || 1
      balance_ok = standing["pto_balance_ok"] != false
      blackout = standing["blackout"] == true
      standing_ok = standing["standing_submit"] == true
      connected = standing["provider_connected"] == true
      supported = standing["submission_supported"] == true

      cond do
        not connected or not supported ->
          %{
            "PTO_ACTION" => "PREPARE_BLOCKED",
            "PTO_PROVIDER_CONNECTED" => connected,
            "submission_supported" => supported,
            "status" => "external_blocker",
            "consumer_copy" =>
              "Your work overlaps this trip. I can prepare a time-off request once a work provider is connected."
          }

        standing_ok and days_ahead >= 14 and days_needed <= 2 and balance_ok and not blackout ->
          %{
            "PTO_ACTION" => "PREPARE_AUTO_SUBMIT",
            "PTO_PROVIDER_CONNECTED" => true,
            "submission_supported" => true,
            "status" => "prepared",
            "note" => "Standing authority allows prepare→submit; submitted ≠ approved."
          }

        true ->
          %{
            "PTO_ACTION" => "ASK",
            "PTO_PROVIDER_CONNECTED" => connected,
            "submission_supported" => supported,
            "status" => "need_confirmation",
            "consumer_copy" =>
              "Your work overlaps this trip. Want me to prepare a time-off request?"
          }
      end
    end
  end

  defp result(pto, conflict?, copy) do
    %{
      "PTO_ACTION" =>
        case pto do
          :none -> "NONE"
          :conflict -> "EVALUATE"
          :unknown -> "UNKNOWN"
        end,
      "work_conflict" => conflict?,
      "consumer_copy" => copy,
      "WORK_CONFLICT_ENGINE" => "active"
    }
  end

  defp normalize(opts) when is_list(opts), do: Map.new(opts)
  defp normalize(opts) when is_map(opts), do: opts
end
