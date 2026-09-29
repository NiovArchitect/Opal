defmodule OpalCore.Calls.Assist do
  @moduledoc """
  Per-call Assist. Transcription starts only when both participants allow it.
  Either person turning it off stops shared transcription. The call continues.
  """

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Calls
  alias OpalCore.Calls.AssistConsent
  alias OpalCore.Calls.CallSession
  alias OpalCore.Calls.DeepgramGrant
  alias OpalCore.Calls.TranscriptSegment
  alias OpalCore.Calls.VoiceAlignment
  alias OpalCore.Events.Publisher
  alias OpalCore.Repo

  def state(call_id, user_id) when is_binary(call_id) and is_binary(user_id) do
    with {:ok, call} <- Calls.get(call_id, user_id) do
      if call.status == "answered" and not is_nil(call.media_connected_at) do
        apply_defaults(call)
      end

      {:ok, view(call, user_id)}
    end
  end

  def set_allowed(call_id, user_id, allowed, scope \\ "call") when is_boolean(allowed) do
    with {:ok, call} <- connected_call(call_id, user_id) do
      if scope == "account" do
        _ = set_account_default(user_id, allowed)
      end

      now = DateTime.utc_now() |> DateTime.truncate(:microsecond)
      row = Repo.get_by(AssistConsent, call_id: call.id, user_id: user_id) || %AssistConsent{}

      attrs =
        if allowed do
          %{
            call_id: call.id,
            user_id: user_id,
            allowed: true,
            allowed_at: now,
            revoked_at: nil,
            source: if(scope == "account", do: "account_enable", else: "call_resume")
          }
        else
          %{
            call_id: call.id,
            user_id: user_id,
            allowed: false,
            revoked_at: now,
            source: "call_pause"
          }
        end

      case row |> AssistConsent.changeset(attrs) |> Repo.insert_or_update() do
        {:ok, _} -> {:ok, view(call, user_id)}
        {:error, changeset} -> {:error, changeset}
      end
    end
  end

  def apply_defaults(%CallSession{} = call) do
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    for user_id <- [call.caller_user_id, call.callee_user_id], is_binary(user_id) do
      user = Repo.get(User, user_id)
      existing = Repo.get_by(AssistConsent, call_id: call.id, user_id: user_id)

      if user && user.assist_calls_enabled == true && is_nil(existing) do
        %AssistConsent{}
        |> AssistConsent.changeset(%{
          call_id: call.id,
          user_id: user_id,
          allowed: true,
          allowed_at: now,
          source: "account_default"
        })
        |> Repo.insert()
      end
    end

    :ok
  end

  defp view(call, user_id) do
    self = Enum.find(consents(call.id), &(&1.user_id == user_id))

    %{
      call: call,
      assist: assist_state(call, user_id),
      account_default: account_default(user_id),
      self_allowed: allowed?(self),
      self_paused: paused?(self)
    }
  end

  defp account_default(user_id) do
    case Repo.get(User, user_id) do
      %User{assist_calls_enabled: value} -> value
      _ -> nil
    end
  end

  defp set_account_default(user_id, enabled) do
    case Repo.get(User, user_id) do
      %User{} = user ->
        user
        |> User.changeset(%{assist_calls_enabled: enabled})
        |> Repo.update()

      _ ->
        {:error, :not_found}
    end
  end

  defp paused?(%AssistConsent{allowed: false, revoked_at: at}) when not is_nil(at), do: true
  defp paused?(_), do: false

  def grant(call_id, user_id, issuer \\ &DeepgramGrant.issue/0) when is_function(issuer, 0) do
    with {:ok, call} <- connected_call(call_id, user_id),
         :active <- assist_state(call, user_id),
         {:ok, token} <- issuer.() do
      {:ok, %{access_token: token.access_token, expires_in: token.expires_in}}
    else
      {:ok, _} -> {:error, :assist_inactive}
      :off -> {:error, :assist_inactive}
      :waiting_for_other -> {:error, :assist_inactive}
      other -> other
    end
  end

  def accept_transcript(call_id, user_id, attrs) when is_map(attrs) do
    with {:ok, call} <- connected_call(call_id, user_id),
         :active <- assist_state(call, user_id) do
      text = String.trim(to_string(attrs["text"] || ""))
      final? = attrs["final"] in [true, "true"]
      provider_segment_id = attrs["provider_segment_id"]

      cond do
        text == "" or not is_binary(provider_segment_id) or provider_segment_id == "" ->
          {:error, :invalid}

        not final? ->
          {:ok, %{persisted: false, folded: false}}

        true ->
          store_final(call, user_id, text, attrs)
      end
    else
      :off -> {:error, :assist_inactive}
      :waiting_for_other -> {:error, :assist_inactive}
      other -> other
    end
  end

  def assist_state(call, user_id) do
    rows = consents(call.id)
    self = Enum.find(rows, &(&1.user_id == user_id))
    peer = Enum.find(rows, &(&1.user_id != user_id))
    revoked? = Enum.any?(rows, &(not is_nil(&1.revoked_at) and &1.allowed != true))

    cond do
      revoked? -> :off
      allowed?(self) and allowed?(peer) -> :active
      allowed?(self) -> :waiting_for_other
      true -> :off
    end
  end

  defp store_final(call, user_id, text, attrs) do
    case fetch_or_insert_segment(call, user_id, text, attrs) do
      {:ok, row, :existing} ->
        {:ok, %{persisted: true, folded: false, segment_id: row.id}}

      {:ok, row, :new} ->
        folded =
          if is_binary(call.conversation_id) do
            VoiceAlignment.record(call.conversation_id, %{
              "text" => row.text,
              "speaker_user_id" => row.speaker_user_id,
              "call_id" => call.id,
              "source_segment_id" => row.id,
              "confidence" => row.confidence
            })
          else
            {:ok, :no_conversation}
          end

        case folded do
          {:ok, state} when is_map(state) ->
            OpalCore.Calls.Outcomes.record_proposal(call, row, state)

          _ ->
            :skipped
        end

        {:ok,
         %{
           persisted: true,
           folded: match?({:ok, state} when is_map(state), folded),
           segment_id: row.id
         }}

      {:error, reason} ->
        {:error, reason}
    end
  end

  defp fetch_or_insert_segment(call, user_id, text, attrs) do
    case Repo.get_by(TranscriptSegment, call_id: call.id, provider_segment_id: attrs["provider_segment_id"]) do
      %TranscriptSegment{} = row ->
        {:ok, row, :existing}

      nil ->
        case insert_segment(call, user_id, text, attrs) do
          {:ok, row} ->
            _ = publish_final(call, row)
            {:ok, row, :new}

          {:error, changeset} ->
            {:error, changeset}
        end
    end
  end

  defp insert_segment(call, user_id, text, attrs) do
    sequence = Repo.aggregate(from(s in TranscriptSegment, where: s.call_id == ^call.id), :count) + 1

    %TranscriptSegment{}
    |> TranscriptSegment.changeset(%{
      call_id: call.id,
      conversation_id: call.conversation_id,
      speaker_user_id: user_id,
      sequence: sequence,
      text: text,
      final: true,
      confidence: float_or_nil(attrs["confidence"]),
      language: attrs["language"],
      provider: attrs["provider"] || "deepgram",
      provider_segment_id: attrs["provider_segment_id"],
      started_at: parse_time(attrs["started_at"]),
      ended_at: parse_time(attrs["ended_at"])
    })
    |> Repo.insert()
  end

  defp publish_final(call, segment) do
    Publisher.record(%{
      event_type: "call.transcript.final",
      event_id: "evt_call_transcript_" <> segment.id,
      aggregate_type: "call_session",
      aggregate_id: call.id,
      partition_key: call.id,
      actor_user_id: segment.speaker_user_id,
      conversation_id: call.conversation_id,
      source_type: "call_transcript",
      source_id: segment.id,
      privacy_class: "shared_authorized",
      privacy_scope: "call_participants",
      consent_scope: "per_call_assist",
      purpose: "alignment",
      payload: %{
        "call_id" => call.id,
        "segment_id" => segment.id,
        "speaker_user_id" => segment.speaker_user_id,
        "final" => true,
        "provider" => segment.provider
      }
    })
  rescue
    _ -> :error
  end

  defp connected_call(call_id, user_id) do
    with {:ok, call} <- Calls.get(call_id, user_id) do
      if call.status == "answered" and not is_nil(call.media_connected_at) do
        {:ok, call}
      else
        {:error, :not_connected}
      end
    end
  end

  defp consents(call_id) do
    Repo.all(from c in AssistConsent, where: c.call_id == ^call_id)
  end

  defp allowed?(%AssistConsent{allowed: true, revoked_at: nil}), do: true
  defp allowed?(_), do: false

  defp float_or_nil(value) when is_float(value), do: value
  defp float_or_nil(value) when is_integer(value), do: value / 1
  defp float_or_nil(value) when is_binary(value) do
    case Float.parse(value) do
      {number, _} -> number
      :error -> nil
    end
  end
  defp float_or_nil(_), do: nil

  defp parse_time(value) when is_binary(value) do
    case DateTime.from_iso8601(value) do
      {:ok, dt, _} -> DateTime.truncate(dt, :microsecond)
      _ -> nil
    end
  end
  defp parse_time(_), do: nil
end
