defmodule OpalCore.Email.ConfirmationWatchWorker do
  @moduledoc """
  After a booking confirms, watch a short window for a confirmation email.

  Privacy: extracts facts into `commitment_ledger` only — never stores email
  bodies (no email_body column). Bodies are processed then discarded in
  `OpalCore.Email.get_message/2`.
  """

  use Oban.Worker, queue: :events, max_attempts: 8

  require Logger

  alias OpalCore.Bookings.Booking
  alias OpalCore.Email
  alias OpalCore.Repo
  alias OpalCore.SocialMemory.Commitment

  @impl Oban.Worker
  def perform(%Oban.Job{args: args}) do
    account_id = args["account_id"]
    booking_id = args["booking_id"]
    attempt = args["attempt"] || 0
    window_sec = args["window_sec"] || default_window_sec()
    started_at = parse_dt(args["started_at"]) || DateTime.utc_now()

    elapsed = DateTime.diff(DateTime.utc_now(), started_at, :second)

    cond do
      not is_binary(account_id) or not is_binary(booking_id) ->
        {:error, :invalid_args}

      elapsed > window_sec ->
        Logger.info("email.confirm_watch expired booking=#{booking_id} elapsed=#{elapsed}")
        :ok

      true ->
        watch_once(account_id, booking_id, attempt, window_sec, started_at)
    end
  end

  defp watch_once(account_id, booking_id, attempt, window_sec, started_at) do
    booking = Repo.get(Booking, booking_id)

    cond do
      is_nil(booking) or booking.account_id != account_id ->
        {:error, :booking_not_found}

      email_confirmation_recorded?(account_id, booking) ->
        :ok

      true ->
        query = build_query(booking)

        case Email.search(account_id, query, max_results: 5) do
          {:ok, %{"message_ids" => [id | _]}} ->
            case Email.get_message(account_id, id) do
              {:ok, facts} ->
                _ = write_commitment(account_id, booking, facts)
                Logger.info("email.confirm_watch hit booking=#{booking_id}")
                :ok

              {:error, reason} ->
                Logger.warning("email.confirm_watch get_message=#{inspect(reason)}")
                maybe_reschedule(account_id, booking_id, attempt, window_sec, started_at)
            end

          {:ok, _} ->
            maybe_reschedule(account_id, booking_id, attempt, window_sec, started_at)

          {:error, :disconnected} ->
            Logger.info("email.confirm_watch disconnected booking=#{booking_id}")
            :ok

          {:error, :empty_query} ->
            :ok

          {:error, reason} ->
            Logger.warning("email.confirm_watch search=#{inspect(reason)}")
            maybe_reschedule(account_id, booking_id, attempt, window_sec, started_at)
        end
    end
  end

  defp maybe_reschedule(account_id, booking_id, attempt, window_sec, started_at) do
    delay = next_delay_sec(attempt)

    if DateTime.diff(DateTime.utc_now(), started_at, :second) + delay > window_sec do
      :ok
    else
      %{
        "account_id" => account_id,
        "booking_id" => booking_id,
        "attempt" => attempt + 1,
        "window_sec" => window_sec,
        "started_at" => DateTime.to_iso8601(started_at)
      }
      |> __MODULE__.new(schedule_in: delay)
      |> Oban.insert()
      |> case do
        {:ok, _} -> :ok
        {:error, reason} -> {:error, reason}
      end
    end
  end

  @doc "Enqueue a watch after booking confirm. Short window in test."
  def enqueue(account_id, booking_id, opts \\ []) do
    window_sec = Keyword.get(opts, :window_sec, default_window_sec())

    %{
      "account_id" => account_id,
      "booking_id" => booking_id,
      "attempt" => 0,
      "window_sec" => window_sec,
      "started_at" => DateTime.utc_now() |> DateTime.to_iso8601()
    }
    |> __MODULE__.new()
    |> Oban.insert()
  end

  defp default_window_sec do
    if Mix.env() == :test, do: 30, else: 24 * 60 * 60
  end

  defp next_delay_sec(attempt) when attempt < 3, do: 5
  defp next_delay_sec(attempt) when attempt < 6, do: 60
  defp next_delay_sec(_), do: 300

  defp build_query(%Booking{} = b) do
    bits =
      [
        b.confirmation_number,
        b.provider_ref,
        get_in(b.details || %{}, ["destination"]),
        get_in(b.details || %{}, ["place"]),
        b.booking_type,
        "confirmation OR reservation OR itinerary"
      ]
      |> Enum.filter(&(is_binary(&1) and String.trim(&1) != ""))
      |> Enum.map(&String.trim/1)

    Enum.join(bits, " ")
  end

  # Only short-circuit when an *email-derived* commitment already exists —
  # booking confirm also writes a ledger row with the same conf number.
  defp email_confirmation_recorded?(account_id, %Booking{} = b) do
    conf = b.confirmation_number || ""

    import Ecto.Query

    from(c in Commitment,
      where: c.account_id == ^account_id,
      where: like(c.description, ^"Email confirmation%"),
      where: ilike(c.description, ^"%#{String.slice(conf, 0, 32)}%"),
      limit: 1
    )
    |> Repo.one()
    |> then(&(not is_nil(&1)))
  rescue
    _ -> false
  end

  defp write_commitment(account_id, %Booking{} = booking, facts) when is_map(facts) do
    conf = facts["confirmation_number"] || booking.confirmation_number || "pending"
    subject = facts["subject"] || "booking confirmation"
    description = "Email confirmation #{conf}: #{String.slice(to_string(subject), 0, 120)}"

    conversation_id = booking.conversation_id || account_id
    source_message_id = Ecto.UUID.generate()

    %Commitment{}
    |> Commitment.changeset(%{
      account_id: account_id,
      description: String.slice(description, 0, 240),
      status: "open",
      source_conversation_id: conversation_id,
      source_message_id: source_message_id
    })
    |> Repo.insert()
  end

  defp parse_dt(nil), do: nil

  defp parse_dt(s) when is_binary(s) do
    case DateTime.from_iso8601(s) do
      {:ok, dt, _} -> dt
      _ -> nil
    end
  end
end
