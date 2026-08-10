defmodule OpalCore.SocialFlow.Execution.PermissionMoment do
  @moduledoc """
  Just-in-time OS permission requests — never generic onboarding spam.

  Ask when obvious value exists, then OS permission.
  Permission request itself incurs interruption debt.
  Denied → plan still works, no nag, no repeat every plan.
  Later granted → future actions may use; do not retro-spam old reminders.
  """

  alias OpalCore.SocialFlow.Ambient.InterruptionDebt

  @permission_kinds ~w(
    notifications
    location_foreground
    contacts
  )

  @doc """
  Decide whether to ask for a permission now.

  attrs:
  - permission / kind
  - permission_state: unknown | prompt | granted | denied | revoked
  - value_context: e.g. "leave_reminder" | "eta" | "navigation_origin"
  - asked_before / denied_at_plan_ids
  - human_asked
  """
  def evaluate(attrs) when is_map(attrs) do
    a = stringify(attrs)
    kind = normalize_kind(a["permission"] || a["kind"])
    state = a["permission_state"] || "unknown"
    value = a["value_context"] || a["purpose"]

    cond do
      kind not in @permission_kinds ->
        nothing("unknown_permission")

      state == "granted" ->
        nothing("already_granted")

      state in ~w(denied revoked) and a["force_reask"] != true ->
        fallback(kind, "permission_denied_no_nag")

      not obvious_value?(kind, value, a) and a["human_asked"] != true ->
        nothing("no_obvious_value")

      a["asked_this_session"] == true and state != "prompt" ->
        nothing("already_asked_session")

      to_i(a["nag_count"]) >= 1 and state in ~w(denied revoked) ->
        fallback(kind, "no_repeated_prompt")

      true ->
        debt =
          InterruptionDebt.evaluate(%{
            "effort_removed" => value_effort(kind, value),
            "uncertainty_removed" => 0.4,
            "this_got_easy" => true,
            "actionable" => true,
            "confidence" => 0.85,
            "surface" => a["surface"] || "active_conversation",
            "quality_band" => "solid",
            "option_count" => 1,
            "human_asked" => a["human_asked"] == true
          })

        if debt["surface_ok"] do
          ask(kind, value, debt)
        else
          nothing("permission_debt_not_repaid")
        end
    end
  end

  def evaluate(_), do: nothing("invalid")

  @doc "Copy for obvious-value permission moments."
  def prompt_copy(kind, value_context) do
    case {normalize_kind(kind), to_string(value_context || "")} do
      {"notifications", "leave_reminder"} ->
        "Want Opal to remind you when it’s time to leave?"

      {"notifications", _} ->
        "Want a reminder when this plan needs you?"

      {"location_foreground", "leave_reminder"} ->
        "Want Opal to tell you when to leave?"

      {"location_foreground", "eta"} ->
        "Use your location once to estimate travel time?"

      {"location_foreground", "navigation_origin"} ->
        "Use current location for directions?"

      {"contacts", _} ->
        "Find people you already know on Opal?"

      _ ->
        nil
    end
  end

  @doc """
  After OS permission result. Never retroactively spam old reminders.
  """
  def after_os_result(kind, result, opts \\ [])

  def after_os_result(kind, result, opts) when is_binary(kind) or is_atom(kind) do
    r = to_string(result)
    granted? = r in ~w(granted allowed yes true)

    %{
      "permission" => normalize_kind(kind),
      "permission_state" => if(granted?, do: "granted", else: "denied"),
      "retroactive_spam" => false,
      "reschedule_old_reminders" => false,
      "future_actions_may_use" => granted?,
      "plan_still_works" => true,
      "nag" => false,
      "purpose" => Keyword.get(opts, :purpose)
    }
  end

  def after_os_result(_, _, _), do: %{"permission_state" => "unknown"}

  defp obvious_value?("notifications", value, a) do
    value in ~w(leave_reminder plan_upcoming time_to_leave) or
      a["reminder_useful"] == true or a["set"] == true
  end

  defp obvious_value?("location_foreground", value, a) do
    value in ~w(leave_reminder eta navigation_origin travel) or
      a["leave_by_useful"] == true or a["navigation_useful"] == true
  end

  defp obvious_value?("contacts", value, _) do
    value in ~w(find_friends onboarding_match)
  end

  defp obvious_value?(_, _, a), do: a["human_asked"] == true

  defp value_effort("notifications", "leave_reminder"), do: 0.7
  defp value_effort("location_foreground", _), do: 0.65
  defp value_effort(_, _), do: 0.5

  defp ask(kind, value, debt) do
    copy = prompt_copy(kind, value)

    %{
      "kind" => "permission_question",
      "permission" => kind,
      "value_context" => value,
      "copy" => copy || "Allow this for your plan?",
      "answers" => ["Yes", "Not now"],
      "then_os_permission" => true,
      "interruption_debt" => debt,
      "then_get_quiet" => true,
      "feed" => false,
      "settings_hub" => false,
      "onboarding_generic" => false
    }
  end

  defp fallback(kind, reason) do
    %{
      "kind" => "nothing",
      "reason" => reason,
      "permission" => kind,
      "plan_still_works" => true,
      "fallback" => "conversation_native_commitment",
      "nag" => false,
      "then_get_quiet" => true
    }
  end

  defp nothing(reason) do
    %{
      "kind" => "nothing",
      "reason" => reason,
      "then_get_quiet" => true,
      "nag" => false
    }
  end

  defp normalize_kind(k) when is_atom(k), do: normalize_kind(Atom.to_string(k))

  defp normalize_kind(k) when is_binary(k) do
    case k do
      "notification" -> "notifications"
      "push" -> "notifications"
      "location" -> "location_foreground"
      "foreground_location" -> "location_foreground"
      "bg_location" -> "location_foreground"
      other -> other
    end
  end

  defp normalize_kind(_), do: "unknown"

  defp to_i(n) when is_integer(n), do: n
  defp to_i(n) when is_float(n), do: trunc(n)
  defp to_i(_), do: 0

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
