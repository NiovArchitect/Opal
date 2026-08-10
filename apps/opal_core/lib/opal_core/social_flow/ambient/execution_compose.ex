defmodule OpalCore.SocialFlow.Ambient.ExecutionCompose do
  @moduledoc """
  Compose execution capabilities from one resolved ExecutionContext.

  Target flow:

  aligned possibility → human choice → authorized execution → confirmed → quiet

  Reuses: BookingBridge, DeviceMoment, ExecutionReadiness, ReminderDelivery,
  AlignmentLoop.remember_new_reality.

  No new UI. No payment. No provider breadth.
  """

  alias OpalCore.SocialFlow.Ambient.{
    AlignmentLoop,
    BookingBridge,
    ExecutionAction,
    ExecutionContext,
    ExecutionReadiness
  }

  alias OpalCore.SocialFlow.Physical.DeviceMoment
  alias OpalCore.SocialFlow.OpalCalendar.ReminderDelivery

  @doc """
  After Set: package leave-by, nav prep, optional booking inquiry from context.
  Zero re-entry of place/time/party.
  """
  def after_set(attrs) when is_map(attrs) do
    with {:ok, ctx} <- ExecutionContext.from_resolved(attrs),
         true <- ctx["set"] == true || {:error, :set_required} do
      commitment = commitment_from_ctx(ctx)

      leave =
        case DeviceMoment.schedule_leave_by(commitment, queue: true) do
          {:ok, l} -> l
          _ -> %{"reentry_required" => false}
        end

      nav =
        case DeviceMoment.prepare_navigation(commitment) do
          {:ok, n} -> n
          _ -> nil
        end

      {:ok, exec} =
        ExecutionReadiness.assess(%{
          "set" => true,
          "provider_checked" => attrs[:provider_checked] || attrs["provider_checked"] == true,
          "provider_available" =>
            attrs[:provider_available] || attrs["provider_available"] == true,
          "slot_label" => ctx["slot_label"],
          "party_size" => ctx["party_size"],
          "place_selected" => true,
          "time_known" => true
        })

      booking =
        if ExecutionContext.ready_for?(ctx, "booking_inquiry") and
             (attrs[:check_booking] || attrs["check_booking"]) do
          case BookingBridge.check_for_set(booking_attrs(ctx, attrs)) do
            {:ok, b} -> b
            _ -> nil
          end
        else
          nil
        end

      {:ok, nav_action} = ExecutionAction.prepare(ctx, "navigation")
      {:ok, leave_action} = ExecutionAction.prepare(ctx, "leave_by")

      {:ok,
       %{
         "context" => ctx,
         "leave_by" => leave,
         "navigation_prepared" => nav,
         "navigation_action" => nav_action,
         "leave_action" => leave_action,
         "execution" => exec,
         "booking" => booking,
         "reentry_required" => false,
         "reuses_alignment_context" => true,
         "auto_started_nav" => false,
         "booked" => false,
         "authorizes_set" => false,
         "quiet_after" => true
       }}
    end
  end

  def after_set(_), do: {:error, :invalid}

  @doc """
  Start directions from context — user_authorized required.
  Destination from context; never retyped.
  """
  def start_directions(ctx, opts \\ []) when is_map(ctx) do
    alias OpalCore.SocialFlow.Execution.NavigationTransport

    c = stringify(ctx)

    with true <- ExecutionContext.ready_for?(c, "navigation") || {:error, :destination_required},
         {:ok, prepared} <-
           NavigationTransport.prepare(c, platform: opts[:platform] || c["platform"]),
         {:ok, started} <-
           NavigationTransport.start(prepared,
             user_authorized: opts[:user_authorized] == true or opts["user_authorized"] == true
           ) do
      {:ok,
       %{
         "action" => started,
         "opened_url" => started["opened_url"],
         "reentry_required" => false,
         "handoff_started" => started["handoff_started"] == true,
         "navigation_started" => started["navigation_started"] == true,
         "directions_started" => started["navigation_started"] == true,
         "human_step_removed" => started["human_step_removed"],
         "authorizes_set" => false
       }}
    else
      {:error, :user_authorization_required} ->
        {:error, :user_authorization_required}

      {:error, :destination_stale} ->
        {:error, :destination_stale}

      other ->
        other
    end
  end

  @doc """
  Privacy-safe lock-screen reminder copy from leave-by context.
  Prefer action timing over relationship/private place detail.
  """
  def reminder_lock_screen_copy(leave_or_ctx) when is_map(leave_or_ctx) do
    a = stringify(leave_or_ctx)
    minutes = a["minutes_until_leave"] || a["leave_in_minutes"]

    copy =
      cond do
        is_number(minutes) and minutes > 0 and minutes <= 120 ->
          "Leave in #{trunc(minutes)} minutes."

        is_binary(a["private_copy"]) and String.contains?(a["private_copy"] || "", "Leave") ->
          # Strip person names / private venue if present in loose copy
          privacy_safe_line(a["private_copy"])

        true ->
          "Leave soon for your plan."
      end

    %{
      "lock_screen" => copy,
      "expanded_private" => a["private_copy"],
      "relationship_exposed" => false,
      "private_place_on_lock" => false,
      "engagement_spam" => false
    }
  end

  def reminder_lock_screen_copy(_), do: %{"lock_screen" => "Leave soon for your plan."}

  @doc """
  Re-queue reminders after time change; cancel stale deliveries.
  """
  def refresh_reminders_after_time_change(ctx, deliveries, opts \\ [])
      when is_map(ctx) and is_list(deliveries) do
    c = stringify(ctx)
    commitment_id = c["native_commitment_id"] || c["commitment_id"]

    cancelled =
      if is_binary(commitment_id) do
        ReminderDelivery.cancel_for_commitment(commitment_id, deliveries)
      else
        Enum.map(deliveries, &Map.put(stringify(&1), "delivery_status", "cancelled"))
      end

    commitment = commitment_from_ctx(c)

    new_queue =
      case DeviceMoment.schedule_leave_by(commitment, Keyword.put(opts, :queue, true)) do
        {:ok, %{"queued" => q}} -> q
        _ -> []
      end

    {:ok,
     %{
       "cancelled" => cancelled,
       "queued" => new_queue,
       "stale_reminders_cleared" => true,
       "reentry_required" => false
     }}
  end

  @doc """
  Booking inquiry from context only (no re-entry of venue/time/party).
  """
  def booking_inquiry(ctx, attrs \\ %{}) when is_map(ctx) do
    c = stringify(ctx)
    a = stringify(attrs)

    if ExecutionContext.ready_for?(c, "booking_inquiry") do
      with {:ok, action} <- ExecutionAction.prepare(c, "booking_inquiry"),
           {:ok, result} <- BookingBridge.check_for_set(booking_attrs(c, a)) do
        # Provider returned different slot than social — human decision
        social_slot = c["slot_label"] || c["when"]
        provider_slot = get_in(result, ["booking", "slot_label"]) || result["slot_label"]

        mismatch =
          is_binary(provider_slot) and is_binary(social_slot) and provider_slot != social_slot and
            a["allow_silent_time_shift"] != true

        if mismatch do
          {:ok,
           %{
             "action" => action,
             "booking" => result,
             "human_decision" => ExecutionAction.provider_time_mismatch(c, provider_slot),
             "booked" => false,
             "set_unchanged" => true,
             "authorizes_set" => false
           }}
        else
          {:ok,
           %{
             "action" => action,
             "booking" => result,
             "booked" => false,
             "may_prompt_book" => get_in(result, ["may_prompt_book"]),
             "authorizes_set" => false
           }}
        end
      end
    else
      {:error, :not_ready}
    end
  end

  @doc """
  After confirmed booking: remember durable truth only; quiet.
  """
  def after_confirmed(ctx, confirmation) when is_map(ctx) and is_map(confirmation) do
    c = stringify(ctx)
    conf = stringify(confirmation)

    if conf["provider_confirmed"] == true or conf["status"] == "confirmed" do
      remembered =
        AlignmentLoop.remember_new_reality(
          %{
            "set" => true,
            "provider_confirmed" => true,
            "provider_outcome" => "confirmed",
            "execution_done" => true,
            "party_size" => c["party_size"],
            "place" => conf["place"] || c["place"],
            "when" => conf["when"] || c["when"],
            "commitment" => %{
              "place" => conf["place"] || c["place"],
              "when" => conf["when"] || c["when"],
              "provider_ref" => conf["provider_ref"],
              "confirmation_ref" => conf["confirmation_ref"]
            }
          },
          %{},
          %{}
        )

      {:ok,
       %{
         "remembered" => remembered,
         "booked" => true,
         "narrate" => false,
         "quiet" => true,
         "raw_payload_stored" => false,
         "authorizes_set" => false
       }}
    else
      {:error, :not_confirmed}
    end
  end

  def after_confirmed(_, _), do: {:error, :invalid}

  @doc """
  External ticket handoff — not booked.
  """
  def ticket_handoff(ctx, opts \\ []) when is_map(ctx) do
    c = stringify(ctx)
    url = opts[:url] || opts["url"] || c["ticket_url"]

    {:ok, action} = ExecutionAction.prepare(c, "ticket_handoff")

    {:ok,
     %{
       "action" => action,
       "handoff_started" => is_binary(url),
       "ticket_url" => url,
       "booked" => false,
       "purchased" => false,
       "confirmed" => false,
       "app_switch_friction" => true,
       "authorizes_set" => false
     }}
  end

  defp booking_attrs(ctx, attrs) do
    %{
      "set" => true,
      "venue_id" => ctx["venue_id"] || attrs["venue_id"],
      "conversation_id" => ctx["conversation_id"],
      "party_size" => ctx["party_size"],
      "slot_label" => ctx["slot_label"] || ctx["when"],
      "time_window" => ctx["when"],
      "provider" => ctx["provider"] || attrs["provider"],
      "slots" => attrs["slots"]
    }
  end

  defp commitment_from_ctx(ctx) do
    %{
      "owner_user_id" => ctx["actor_user_id"],
      "conversation_id" => ctx["conversation_id"],
      "place" => ctx["place"] || ctx["place_label"] || ctx["destination"],
      "place_label" => ctx["place_label"] || ctx["place"] || ctx["destination"],
      "when" => ctx["when"],
      "start_at" => ctx["when"],
      "travel_minutes" => ctx["travel_minutes"] || 20,
      "commitment_id" => ctx["native_commitment_id"],
      "slot_label" => ctx["slot_label"]
    }
  end

  defp privacy_safe_line(copy) when is_binary(copy) do
    copy
    |> String.replace(~r/\bwith\s+\w+/i, "")
    |> String.replace(~r/\bat\s+[^.]{3,40}/i, "")
    |> String.trim()
    |> case do
      "" -> "Leave soon for your plan."
      other -> other
    end
  end

  defp privacy_safe_line(_), do: "Leave soon for your plan."

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
