defmodule OpalCore.Messaging.Message do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  # call_invite: optional continuity hint in chat (IDs + status — not SDP)
  @message_types ~w(text voice_transcript call_invite)
  @delivery_states ~w(accepted persisted delivered failed)
  @ai_states ~w(not_requested consent_required queued processing completed refused failed)

  schema "messages" do
    field :client_message_id, :string
    field :message_type, :string
    field :body, :string, default: ""
    field :source_language, :string
    field :server_seq, :integer
    field :delivery_state, :string, default: "persisted"
    field :ai_processing_state, :string, default: "not_requested"
    field :schema_version, :string, default: "0.1.0"

    belongs_to :conversation, OpalCore.Messaging.Conversation
    belongs_to :sender_user, OpalCore.Accounts.User, foreign_key: :sender_user_id

    timestamps(type: :utc_datetime_usec)
  end

  def message_types, do: @message_types
  def delivery_states, do: @delivery_states
  def ai_states, do: @ai_states

  def create_changeset(message, attrs) do
    message
    |> cast(attrs, [
      :id,
      :conversation_id,
      :sender_user_id,
      :client_message_id,
      :message_type,
      :body,
      :source_language,
      :server_seq,
      :delivery_state,
      :ai_processing_state,
      :schema_version
    ])
    |> validate_required([
      :conversation_id,
      :sender_user_id,
      :client_message_id,
      :message_type,
      :server_seq
    ])
    |> validate_inclusion(:message_type, @message_types)
    |> validate_inclusion(:delivery_state, @delivery_states)
    |> validate_inclusion(:ai_processing_state, @ai_states)
    |> validate_length(:client_message_id, max: 128)
    |> validate_length(:body, max: 8000)
    |> unique_constraint([:conversation_id, :client_message_id])
    |> unique_constraint([:conversation_id, :server_seq])
  end

  def to_contract(%__MODULE__{} = message) do
    media = decode_media(message.source_language)

    base = %{
      "schema_version" => message.schema_version,
      "id" => message.id,
      "client_message_id" => message.client_message_id,
      "conversation_id" => message.conversation_id,
      "sender_user_id" => message.sender_user_id,
      "message_type" => message.message_type,
      "body" => message.body,
      "source_language" => message.source_language,
      "created_at" => DateTime.to_iso8601(message.inserted_at),
      "server_seq" => message.server_seq,
      "delivery_state" => message.delivery_state,
      "ai_processing_state" => message.ai_processing_state
    }

    if media == %{} do
      base
    else
      Map.merge(base, %{
        "audio_url" => resolve_audio_url(media),
        "duration_ms" => media["duration_ms"],
        "transcription_confidence" => media["transcription_confidence"],
        "transcription_stub" => media["stub"] == true
      })
    end
  end

  # TTS speak stores compact {"sk","tts","approved"} (varchar 255). Mint a
  # fresh signed share URL so the thread <audio> player has a playable src.
  defp resolve_audio_url(%{"audio_url" => url}) when is_binary(url) and url != "", do: url

  defp resolve_audio_url(%{"sk" => sk} = media) when is_binary(sk) and sk != "" do
    if media["tts"] == true or media["tts"] == "true" do
      OpalCore.Voice.AudioStore.public_url(%{
        "storage_key" => sk,
        "mime_type" => media["mime"] || "audio/mpeg"
      })
    else
      nil
    end
  end

  defp resolve_audio_url(_), do: nil

  defp decode_media(nil), do: %{}
  defp decode_media(s) when is_binary(s) do
    case Jason.decode(s) do
      {:ok, map} when is_map(map) -> map
      _ -> %{}
    end
  end

  defp decode_media(_), do: %{}
end
