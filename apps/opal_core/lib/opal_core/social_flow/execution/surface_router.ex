defmodule OpalCore.SocialFlow.Execution.SurfaceRouter do
  @moduledoc """
  Decide WHERE to surface — not only WHAT.

  Escalation: do not jump to lock screen if a cheaper surface is enough.
  Active conversation remains primary when humans are already discussing.
  Duplicate-surface suppression: one path only.

  Push is the exception, not the default output of proactive intelligence.
  """

  alias OpalCore.SocialFlow.Ambient.InterruptionDebt
  alias OpalCore.SocialFlow.Execution.AttentionTier

  @surfaces ~w(none active_conversation in_app_passive push lock_screen)

  def surfaces, do: @surfaces

  @doc """
  Route a justified intervention to the cheapest sufficient surface.

  attrs:
  - attention_tier
  - chat_open / in_conversation / active_conversation
  - app_foreground
  - time_sensitive / minutes_to_leave
  - already_presented_surfaces (list)
  - push_permission
  - human_asked
  """
  def route(attrs) when is_map(attrs) do
    a = stringify(attrs)
    tier = AttentionTier.normalize(a["attention_tier"] || "dormant")
    already = List.wrap(a["already_presented_surfaces"] || a["presented_on"])

    cond do
      not AttentionTier.may_surface?(tier) and a["human_asked"] != true ->
        none("tier_not_surfaceable")

      # Humans already resolving in conversation — never push about that
      conversation_active?(a) ->
        pick("active_conversation", a, already, "humans_already_in_thread")

      # App open but not this thread
      a["app_foreground"] == true or a["in_app"] == true ->
        pick("in_app_passive", a, already, "app_open_cheaper_than_push")

      # Urgent + inactive → push/lock may be justified
      tier == "urgent_actionable" and time_critical?(a) ->
        if a["push_permission"] in ~w(denied revoked) do
          none("push_permission_denied_fallback_quiet_or_in_app")
        else
          surface = if a["device_locked"] == true, do: "lock_screen", else: "push"
          pick(surface, a, already, "time_critical_inactive")
        end

      tier == "actionable" ->
        # Prefer in-app passive over push for non-urgent
        if a["app_installed"] != false do
          pick("in_app_passive", a, already, "actionable_not_push_default")
        else
          none("no_cheap_surface")
        end

      true ->
        none("no_route")
    end
  end

  def route(_), do: none("invalid")

  @doc """
  After a surface delivered, mark so duplicates suppress.
  """
  def suppress_duplicates(chosen_surface, already \\ []) do
    s = to_string(chosen_surface)
    prior = Enum.map(List.wrap(already), &to_string/1)

    %{
      "chosen" => s,
      "suppressed" => Enum.reject(@surfaces, &(&1 == s or &1 == "none")),
      "already" => prior,
      "one_path_only" => true,
      "duplicate_surface" => false
    }
  end

  @doc """
  User opens app after push — conversation should know action was presented.
  """
  def on_user_open_after_push(attrs) when is_map(attrs) do
    a = stringify(attrs)

    %{
      "already_presented" => true,
      "presented_on" => ["push" | List.wrap(a["presented_on"])],
      "do_not_re_present_in_chat" => a["force_chat_repeat"] != true,
      "continuation_context" => %{
        "conversation_id" => a["conversation_id"],
        "plan_id" => a["plan_id"],
        "not_generic_home" => true
      },
      "stale_push" => a["stale_push"] == true,
      "suppress_if_stale" => true
    }
  end

  def on_user_open_after_push(_), do: %{"already_presented" => false}

  defp pick(surface, a, already, reason) do
    if to_string(surface) in Enum.map(already, &to_string/1) do
      none("already_presented_on_#{surface}")
    else
      debt =
        InterruptionDebt.evaluate(%{
          "effort_removed" => a["effort_removed"] || 0.75,
          "uncertainty_removed" => a["uncertainty_removed"] || 0.55,
          "this_got_easy" => a["this_got_easy"] != false,
          "actionable" => true,
          "confidence" => a["confidence"] || 0.85,
          "surface" => surface,
          "quality_band" => a["quality_band"] || "strong",
          "option_count" => 1,
          "human_asked" => a["human_asked"] == true,
          "time_sensitive" => time_critical?(a)
        })

      if debt["surface_ok"] or a["human_asked"] == true do
        dup = suppress_duplicates(surface, already)

        %{
          "surface" => surface,
          "present" => true,
          "reason" => reason,
          "interruption_debt" => debt,
          "duplicate_suppression" => dup,
          "push_is_exception" => surface in ~w(push lock_screen),
          "escalation_justified" => surface in ~w(push lock_screen),
          "authorizes_set" => false
        }
      else
        none("debt_not_repaid_on_#{surface}")
      end
    end
  end

  defp none(reason) do
    %{
      "surface" => "none",
      "present" => false,
      "reason" => reason,
      "push_is_exception" => true,
      "authorizes_set" => false
    }
  end

  defp conversation_active?(a) do
    a["chat_open"] == true or a["in_conversation"] == true or
      a["active_conversation"] == true or a["humans_discussing_plan"] == true
  end

  defp time_critical?(a) do
    a["time_sensitive"] == true or
      (is_number(a["minutes_to_leave"]) and a["minutes_to_leave"] <= 30) or
      (is_number(a["minutes_to_start"]) and a["minutes_to_start"] <= 45)
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
