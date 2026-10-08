defmodule OpalCore.Bookings.EmailWatch do
  @moduledoc """
  Paste G Phase 6 — arm a confirmation-email watch after a real booking.

  Gmail search may still be gated (see BLOCKED / Phase 2–3). Arming records
  intent on the booking metadata and never claims an email was read.
  """

  alias OpalCore.Bookings.Booking
  alias OpalCore.Repo

  @doc """
  Arm watch for a confirmed booking. Returns `{:ok, watch}` with status `armed`.
  """
  def arm(booking, opts \\ [])

  def arm(%Booking{} = booking, opts) do
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    watch = %{
      "status" => "armed",
      "armed_at" => DateTime.to_iso8601(now),
      "confirmation_number" => booking.confirmation_number,
      "provider" => booking.provider,
      "provider_ref" => booking.provider_ref,
      "gmail_connected" => Keyword.get(opts, :gmail_connected, false) == true,
      "note" =>
        if(Keyword.get(opts, :gmail_connected, false),
          do: "Watching inbox for confirmation",
          else: "Watch armed — Gmail not connected; will activate when email search is live"
        )
    }

    details = Map.merge(booking.details || %{}, %{"email_watch" => watch})

    case booking |> Booking.changeset(%{details: details}) |> Repo.update() do
      {:ok, updated} -> {:ok, Map.put(watch, "booking_id", updated.id)}
      {:error, _} = err -> err
    end
  end

  def arm(_, _), do: {:error, :invalid}

  @doc "Read watch status from booking details."
  def status(%Booking{} = booking) do
    case get_in(booking.details || %{}, ["email_watch"]) do
      %{} = w -> {:ok, w}
      _ -> {:ok, %{"status" => "none"}}
    end
  end

  def status(_), do: {:error, :invalid}
end
