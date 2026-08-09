defmodule OpalCore.SocialFlow.RealWorld.Booking.ProviderBoundary do
  @moduledoc """
  Provider abstraction for reservations.

  SocialFlow asks for availability; provider adapters return candidates/status.
  Never label "Booked" until provider confirmation exists.

  States: candidate | availability_checked | hold_available | requested |
          confirmed | failed | cancelled
  """

  @states ~w(
    candidate
    availability_checked
    hold_available
    requested
    confirmed
    failed
    cancelled
  )

  def states, do: @states

  def inquire(attrs) when is_map(attrs) do
    a = stringify(attrs)

    {:ok,
     %{
       "schema_version" => "0.1.0",
       "state" => "candidate",
       "venue_id" => a["venue_id"],
       "conversation_id" => a["conversation_id"],
       "time_window" => a["time_window"],
       "party_size" => a["party_size"],
       "provider" => a["provider"] || "abstract",
       "booked" => false
     }}
  end

  def check_availability(inquiry, slots) when is_map(inquiry) and is_list(slots) do
    i = stringify(inquiry)

    state = if slots == [], do: "failed", else: "availability_checked"

    {:ok,
     i
     |> Map.put("state", state)
     |> Map.put("slots", Enum.take(slots, 3))
     |> Map.put("booked", false)
     |> Map.put(
       "shared_safe_summary",
       if(slots == [], do: "No times open there.", else: slot_summary(slots))
     )}
  end

  def request_hold(inquiry, slot_id) when is_map(inquiry) and is_binary(slot_id) do
    i = stringify(inquiry)

    if i["state"] in ~w(availability_checked hold_available) do
      {:ok,
       i
       |> Map.put("state", "hold_available")
       |> Map.put("selected_slot_id", slot_id)
       |> Map.put("booked", false)}
    else
      {:error, :invalid_state}
    end
  end

  def request_booking(inquiry, opts \\ []) when is_map(inquiry) do
    i = stringify(inquiry)

    cond do
      Keyword.get(opts, :user_authorized) != true ->
        {:error, :user_authorization_required}

      i["state"] not in ~w(hold_available availability_checked) ->
        {:error, :invalid_state}

      true ->
        {:ok, Map.put(i, "state", "requested") |> Map.put("booked", false)}
    end
  end

  def confirm(inquiry, provider_ref) when is_map(inquiry) and is_binary(provider_ref) do
    i = stringify(inquiry)

    if i["state"] == "requested" do
      {:ok,
       i
       |> Map.put("state", "confirmed")
       |> Map.put("booked", true)
       |> Map.put("provider_ref", provider_ref)
       |> Map.put("shared_safe_summary", "Reservation confirmed.")}
    else
      {:error, :invalid_state}
    end
  end

  def fail(inquiry, reason \\ "provider_unavailable") when is_map(inquiry) do
    {:ok,
     inquiry
     |> stringify()
     |> Map.put("state", "failed")
     |> Map.put("booked", false)
     |> Map.put("failure_class", to_string(reason))
     |> Map.put("shared_safe_summary", "Couldn't check that right now.")}
  end

  defp slot_summary([%{"label" => l} | _]) when is_binary(l), do: l <> " is open."
  defp slot_summary([_ | _]), do: "A time is open."
  defp slot_summary(_), do: "Checking times."

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
