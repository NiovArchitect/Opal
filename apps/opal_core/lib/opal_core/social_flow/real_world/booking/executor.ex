defmodule OpalCore.SocialFlow.RealWorld.Booking.Executor do
  @moduledoc """
  Booking execution on top of ProviderBoundary.

  Recovery without restart: preserve aligned context when a slot fills.
  Never labels Booked without authoritative confirmation.
  """

  alias OpalCore.SocialFlow.RealWorld.Booking.ProviderBoundary
  alias OpalCore.SocialFlow.RealWorld.Cognition.AutomationLadder
  alias OpalCore.SocialFlow.RealWorld.Place.Catalog

  @doc """
  Full aligned booking attempt with optional recovery candidates.
  """
  def book_aligned(attrs) when is_map(attrs) do
    a = stringify(attrs)
    venue_id = a["venue_id"]
    slot_label = a["slot_label"] || "7:30"

    with {:ok, inquiry} <-
           ProviderBoundary.inquire(%{
             venue_id: venue_id,
             conversation_id: a["conversation_id"],
             time_window: a["time_window"],
             party_size: a["party_size"] || 2
           }),
         {:ok, checked} <-
           ProviderBoundary.check_availability(inquiry, [
             %{"id" => "s1", "label" => slot_label}
           ]),
         ladder <- %{"rung" => "prepare", "action" => "make_reservation"},
         {:ok, at_auth} <- AutomationLadder.advance(ladder),
         true <- at_auth["rung"] == "authorize",
         true <- a["user_authorized"] == true || {:error, :user_authorization_required},
         {:ok, requested} <- ProviderBoundary.request_booking(checked, user_authorized: true),
         {:ok, outcome} <- maybe_confirm(requested, a) do
      if outcome["booked"] == true do
        {:ok,
         %{
           "booking" => outcome,
           "aligned_context_preserved" => true,
           "step_eliminated" => "manual_reservation_site",
           "authorizes_set" => false
         }}
      else
        recover(a, outcome["failure_class"] || "failed")
      end
    else
      {:error, :user_authorization_required} = err ->
        err

      {:error, reason} ->
        recover(a, reason)
    end
  end

  def book_aligned(_), do: {:error, :invalid}

  defp maybe_confirm(requested, a) do
    if a["provider_confirms"] == false do
      ProviderBoundary.fail(requested, "filled_up")
    else
      ProviderBoundary.confirm(requested, a["provider_ref"] || "prov-live-stub")
    end
  end

  defp recover(a, reason) do
    # Preserve time/place alignment; suggest alternate from catalog
    ranked =
      Catalog.rank_for_group(
        category: a["category"] || "dinner",
        quiet_only: a["quiet_only"] == true
      )

    alt =
      ranked["options"]
      |> Enum.reject(&(&1["id"] == a["venue_id"]))
      |> List.first()

    {:ok,
     %{
       "booking" => %{
         "state" => "failed",
         "booked" => false,
         "failure_class" => to_string(reason)
       },
       "recovery" =>
         if alt do
           %{
             "shared_safe_summary" => "#{alt["display_name"]} has another time nearby.",
             "venue_id" => alt["id"],
             "aligned_context_preserved" => true,
             "restart_required" => false
           }
         else
           %{
             "shared_safe_summary" => "Couldn't check that right now.",
             "aligned_context_preserved" => true,
             "restart_required" => false
           }
         end,
       "step_eliminated" => "restart_from_scratch"
     }}
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
