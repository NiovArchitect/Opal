defmodule OpalCore.Settings.IngestionStatus do
  @moduledoc """
  Per-part progress for long/multi-source work (spec SF-A, harvest
  audit section 12, Settings follow-on wave; CH-3/ER-2).

  Each ingestion source from the validated D-ING register carries
  its OWN state line, derived from that source's own read - never
  from a page-level aggregate. One source failing produces that
  source's error line only; the others still render (a blocked
  source never blanks the page). `retry_source/2` re-runs exactly
  one source's derivation (ER-2: retry retries the failed thing).

  Progress is stated in words and real counts - never a percentage
  or a predicted finish (DIR-4-C: no invented ETAs).
  """

  import Ecto.Query

  alias OpalCore.Calls.CallSession
  alias OpalCore.Intelligence.DeepgramClient
  alias OpalCore.Messaging.Message
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.RealWorld.ProviderConnections
  alias OpalCore.SocialFlow.Sms.TwilioSmsAdapter

  @sources ~w(chats calls call_transcription texts room meetings)

  def sources, do: @sources

  @doc "All source lines for the account. Never raises: a failing source becomes its own error line."
  def status_for_user(user_id) when is_binary(user_id) do
    Enum.map(@sources, &source_line(user_id, &1))
  end

  def status_for_user(_), do: []

  @doc "Re-derive ONE source only (ER-2). Unknown source: {:error, :unknown_source}."
  def retry_source(user_id, source) when is_binary(user_id) and source in @sources do
    {:ok, source_line(user_id, source)}
  end

  def retry_source(_, _), do: {:error, :unknown_source}

  defp source_line(user_id, source) do
    derive(user_id, source)
  rescue
    _ ->
      %{
        "source" => source,
        "title" => title(source),
        "state" => "error",
        "state_label" => "Something went wrong reading this source",
        "progress" => "This source could not be read just now. The others are unaffected.",
        "error" => "source_read_failed",
        "retryable" => true
      }
  end

  defp base(source, state, label, progress) do
    %{
      "source" => source,
      "title" => title(source),
      "state" => state,
      "state_label" => label,
      "progress" => progress,
      "error" => nil,
      "retryable" => false
    }
  end

  defp title("chats"), do: "Chats in the app"
  defp title("calls"), do: "Phone calls"
  defp title("call_transcription"), do: "Call transcription"
  defp title("texts"), do: "Texts"
  defp title("room"), do: "Listening in the room"
  defp title("meetings"), do: "Meetings"

  # D-ING: in-app chats are REAL (channels/REST -> messages -> Center).
  defp derive(user_id, "chats") do
    count =
      Message
      |> where([m], m.sender_user_id == ^user_id)
      |> Repo.aggregate(:count, :id)

    progress =
      if count == 1,
        do: "Caught up - 1 message of yours is in Opal's working memory.",
        else: "Caught up - #{count} messages of yours are in Opal's working memory."

    base("chats", "working", "Working now", progress)
  end

  # D-ING: in-app WebRTC calls are REAL; there is no PSTN dial-out.
  defp derive(user_id, "calls") do
    count =
      CallSession
      |> where([c], c.caller_user_id == ^user_id or c.callee_user_id == ^user_id)
      |> Repo.aggregate(:count, :id)

    progress =
      cond do
        count == 0 -> "No calls yet. Calls you make in the app will show up here."
        count == 1 -> "1 call so far, kept as outcomes - not as a recording."
        true -> "#{count} calls so far, kept as outcomes - not as recordings."
      end

    base("calls", "working", "Working now", progress)
  end

  # D-ING: transcription is REAL but configuration-gated, honestly.
  defp derive(_user_id, "call_transcription") do
    if DeepgramClient.configured?() do
      base(
        "call_transcription",
        "working",
        "Working now",
        "Call transcription is set up. Only outcomes are kept after a call."
      )
    else
      base(
        "call_transcription",
        "not_set_up",
        "Not set up",
        "Transcription is not configured, so nothing is written down from calls."
      )
    end
  end

  # D-ING: SMS is outbound only today; inbound ingestion is ABSENT,
  # blocked on a sending number (founder step F-1).
  defp derive(_user_id, "texts") do
    readiness = TwilioSmsAdapter.readiness()

    if TwilioSmsAdapter.configured?() do
      base(
        "texts",
        "sending_only",
        "Sending only",
        "Opal can send invite texts. Texts sent to Opal do not become memory yet."
      )
    else
      detail =
        case readiness do
          {:disabled, :from_or_messaging_service_missing} -> "no sending number is set up"
          {:disabled, _} -> "texting is not configured"
          _ -> "no sending number is set up"
        end

      base(
        "texts",
        "waiting",
        "Waiting on a sending number",
        "Texts do not reach Opal today (#{detail}). Nothing is faked in the meantime."
      )
    end
  end

  # D-ING: in-room capture is ABSENT - there is no such path in Opal.
  defp derive(_user_id, "room") do
    base(
      "room",
      "absent",
      "Not in Opal today",
      "There is no room listening in Opal, hidden or otherwise."
    )
  end

  # D-ING: meetings are links only; nothing inside a meeting returns.
  # The one real read: whether a Google account is connected at all.
  defp derive(user_id, "meetings") do
    connected = ProviderConnections.connected?(user_id, "google_calendar")

    progress =
      if connected,
        do: "Meeting links on your plans are kept. Nothing inside a meeting comes back to Opal.",
        else: "Meeting links on plans are kept. Nothing inside a meeting comes back to Opal."

    base("meetings", "links_only", "Links only", progress)
  end
end
