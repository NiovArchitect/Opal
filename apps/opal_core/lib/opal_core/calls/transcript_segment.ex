defmodule OpalCore.Calls.TranscriptSegment do
  @moduledoc """
  Final call transcript evidence for the participants of one call.

  Retention: these rows exist only to prove speaker, final text, and
  alignment provenance. They are deleted with the call. They are not copied
  into long-term memory. Interim speech is not stored. Raw audio is not stored.
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "call_transcript_segments" do
    field :call_id, :binary_id
    field :conversation_id, :binary_id
    field :speaker_user_id, :binary_id
    field :sequence, :integer, default: 0
    field :started_at, :utc_datetime_usec
    field :ended_at, :utc_datetime_usec
    field :text, :string, default: ""
    field :final, :boolean, default: false
    field :confidence, :float
    field :language, :string
    field :provider, :string, default: "deepgram"
    field :provider_segment_id, :string

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(row, attrs) do
    row
    |> cast(attrs, [
      :call_id,
      :conversation_id,
      :speaker_user_id,
      :sequence,
      :started_at,
      :ended_at,
      :text,
      :final,
      :confidence,
      :language,
      :provider,
      :provider_segment_id
    ])
    |> validate_required([:call_id, :speaker_user_id, :text, :provider_segment_id])
    |> unique_constraint([:call_id, :provider_segment_id])
  end
end
