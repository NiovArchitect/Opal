defmodule OpalCore.SocialFlow.NotificationDelivery do
  @moduledoc """
  Delivery seam after AttentionAuthority (Pass 14).

  AttentionAuthority decides whether intervention is justified.
  This module never escalates severity — only routes delivery class:

  silent | ambient | notify | supersede | suppress | expire

  One semantic consequence → at most one active interruption.
  Reconnect must not re-notify already-delivered identical consequences.
  Not a notification center / feed.
  """

  alias OpalCore.SocialFlow.AttentionAuthority
  alias OpalCore.SocialFlow.Execution.NotificationContent
  alias OpalCore.SocialFlow.OpalCalendar.ReminderDelivery

  @doc """
  Build a DeliveryIntent from attention facts + optional flow consequence + history.

  ctx:
  - permission: unknown|granted|denied|unavailable
  - app_active_reality_id
  - app_backgrounded boolean
  - history: list of prior receipts %{consequence_id, supersession_key, status, ...}
  """
  def build_intent(facts, flow \\ nil, ctx \\ %{})

  def build_intent(facts, flow, ctx) when is_map(facts) do
    facts = stringify(facts)
    flow = if is_map(flow), do: stringify(flow), else: %{}
    ctx = stringify(ctx)
    d = AttentionAuthority.evaluate(facts)
    policy = AttentionAuthority.notification_policy(facts, previous_notice(ctx, facts))
    reality_id = facts["conversation_id"] || flow["reality_id"] || "_"
    super_key = flow["supersession_key"] || "notify:#{reality_id}:#{d.reason}"

    cond do
      d.class in ~w(silence ambient) or policy.action == :silent ->
        intent(reality_id, super_key, "silent", nil, d, ["attention_not_interruptive", d.reason])

      not delivery_eligible?(flow, d) ->
        intent(reality_id, super_key, "silent", flow["human_consequence"], d, ["not_delivery_eligible"])

      ctx["app_active_reality_id"] && ctx["app_active_reality_id"] == reality_id ->
        intent(reality_id, super_key, "suppress", flow["human_consequence"], d, [
          "app_active_relevant_surface",
          "downgrade_external"
        ])

      ctx["permission"] in ~w(denied unavailable) ->
        intent(reality_id, super_key, "suppress", flow["human_consequence"], d, [
          "permission_#{ctx["permission"]}",
          "in_app_only"
        ])

      already_delivered?(ctx, super_key) ->
        intent(reality_id, super_key, "suppress", flow["human_consequence"], d, [
          "dedupe_already_delivered",
          "reconnect_safe"
        ])

      is_integer(facts["minutes_until"]) and facts["minutes_until"] < -15 ->
        intent(reality_id, super_key, "expire", nil, d, ["stale_after_event_start"])

      policy.action == :supersede or supersede_prior_leave?(ctx, reality_id, super_key) ->
        copy = human_copy(flow, facts)
        lock = lock_screen(copy)

        Map.merge(
          intent(reality_id, super_key, "supersede", copy, d, ["same_lineage_updated"]),
          %{
            "lock_screen_copy" => lock,
            "privacy_transformed" => lock != copy,
            "channel" => channel(ctx)
          }
        )

      policy.action == :notify or d.class in ~w(time_sensitive critical) ->
        copy = human_copy(flow, facts)
        lock = lock_screen(copy)

        Map.merge(
          intent(reality_id, super_key, "notify", copy, d, ["attention_authorized", d.class]),
          %{
            "lock_screen_copy" => lock,
            "privacy_transformed" => lock != copy,
            "channel" => channel(ctx)
          }
        )

      true ->
        intent(reality_id, super_key, "silent", nil, d, ["not_interruptive"])
    end
  end

  def build_intent(_, _, _), do: intent("_", "empty", "silent", nil, %{}, ["invalid"])

  @doc "Append receipt; mark prior same-lineage delivers superseded when needed."
  def record_receipt(history, intent, status) when is_list(history) and is_map(intent) do
    intent = stringify(intent)
    reality = intent["consequence_id"] || intent["reality_id"]
    super_key = intent["supersession_key"]

    history =
      if intent["delivery_class"] == "supersede" or status == "superseded" do
        Enum.map(history, fn r ->
          r = stringify(r)

          if r["consequence_id"] == reality and r["status"] == "delivered" and
               r["supersession_key"] != super_key do
            Map.put(r, "status", "superseded")
          else
            r
          end
        end)
      else
        history
      end

    receipt = %{
      "intent_id" => intent["id"],
      "consequence_id" => reality,
      "supersession_key" => super_key,
      "status" => to_string(status),
      "at" => DateTime.utc_now() |> DateTime.to_iso8601(),
      "channel" => intent["channel"] || "none"
    }

    history ++ [receipt]
  end

  def record_receipt(history, _, _), do: history || []

  @doc "Active (delivered|opened) receipts for one consequence — property tests."
  def active_for(history, consequence_id) when is_list(history) do
    Enum.filter(history, fn r ->
      r = stringify(r)
      r["consequence_id"] == consequence_id and r["status"] in ~w(delivered opened)
    end)
  end

  def permission_prompt_copy,
    do: "Want Opal to let you know when it’s time to head out?"

  # --- internals ---

  defp delivery_eligible?(flow, d) do
    flow["delivery_eligible"] == true or d.class in ~w(time_sensitive critical)
  end

  defp human_copy(flow, facts) do
    flow["human_consequence"] ||
      facts["human_consequence"] ||
      ReminderDelivery.lock_screen_copy(facts)["lock_screen"]
  end

  defp lock_screen(nil), do: nil

  defp lock_screen(copy) when is_binary(copy) do
    cond do
      Regex.match?(~r/\b(preference|memory|medical|private)\b/i, copy) ->
        "Your timing changed."

      String.length(copy) > 90 ->
        "Your plan needs you."

      true ->
        # Prefer NotificationContent minimal discipline when place/minutes known
        content = NotificationContent.build(%{"kind" => "leave_by", "content_summary" => copy}, mode: "minimal")
        content["lock_screen"] || copy
    end
  end

  defp channel(ctx) do
    cond do
      ctx["permission"] == "granted" and ctx["app_backgrounded"] != false -> "browser_or_os"
      true -> "in_app"
    end
  end

  defp already_delivered?(ctx, super_key) do
    hist = ctx["history"] || []

    Enum.any?(hist, fn r ->
      r = stringify(r)
      r["supersession_key"] == super_key and r["status"] in ~w(delivered acted dismissed)
    end)
  end

  defp supersede_prior_leave?(ctx, reality_id, super_key) do
    String.starts_with?(super_key, "leave:") and
      Enum.any?(ctx["history"] || [], fn r ->
        r = stringify(r)

        r["consequence_id"] == reality_id and String.starts_with?(r["supersession_key"] || "", "leave:") and
          r["supersession_key"] != super_key and r["status"] == "delivered"
      end)
  end

  defp previous_notice(ctx, facts) do
    hist = ctx["history"] || []
    cid = facts["conversation_id"]

    hist
    |> Enum.filter(fn r -> stringify(r)["consequence_id"] == cid end)
    |> List.last()
    |> case do
      nil -> nil
      r ->
        r = stringify(r)
        %{"consequence_id" => r["consequence_id"], "payload_key" => r["supersession_key"]}
    end
  end

  defp intent(reality_id, super_key, class, copy, attention, reasons) do
    %{
      "id" => "di-#{reality_id}-#{class}",
      "reality_id" => reality_id,
      "consequence_id" => reality_id,
      "supersession_key" => super_key,
      "delivery_class" => class,
      "copy" => copy,
      "lock_screen_copy" => if(is_binary(copy), do: lock_screen(copy), else: nil),
      "privacy" => "minimal",
      "privacy_transformed" => false,
      "channel" => if(class in ~w(notify supersede), do: "browser_or_os", else: "none"),
      "attention" => attention,
      "reasons" => reasons
    }
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
