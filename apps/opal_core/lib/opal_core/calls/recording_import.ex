defmodule OpalCore.Calls.RecordingImport do
  @moduledoc """
  Repair #25 — one imported call recording and its extraction state.

  Provenance is structural: a row in this table IS an imported
  recording (`source = imported_recording`); in-app calls never land
  here. Status moves only forward through
  `received → transcribing → folding → done`, or to `failed` with a
  truthful `failure_reason`. Timing stamps are written by the
  pipeline itself so latency claims read stored data.
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @statuses ~w(received transcribing folding done failed)

  schema "call_recording_imports" do
    field :uploader_user_id, :binary_id
    field :call_id, :binary_id
    field :conversation_id, :binary_id
    field :speaker_map, :map, default: %{}
    field :status, :string, default: "received"
    field :failure_reason, :string
    field :storage_key, :string
    field :original_filename, :string
    field :content_type, :string
    field :byte_size, :integer
    field :sha256, :string
    field :language, :string, default: "en-US"
    field :consent_attested_by_user_id, :binary_id
    field :consent_attested_at, :utc_datetime_usec
    field :consent_basis, :string
    field :provider, :string
    field :confidence, :float
    field :segment_count, :integer, default: 0
    field :unattributed_segment_count, :integer, default: 0
    field :capsule_ids, :map, default: %{}
    field :transcription_started_at, :utc_datetime_usec
    field :transcribed_at, :utc_datetime_usec
    field :folded_at, :utc_datetime_usec
    field :transcription_ms, :integer
    field :fold_ms, :integer
    field :total_ms, :integer

    timestamps(type: :utc_datetime_usec)
  end

  def statuses, do: @statuses

  def create_changeset(row, attrs) do
    row
    |> cast(attrs, [
      :uploader_user_id,
      :call_id,
      :conversation_id,
      :speaker_map,
      :status,
      :storage_key,
      :original_filename,
      :content_type,
      :byte_size,
      :sha256,
      :language,
      :consent_attested_by_user_id,
      :consent_attested_at,
      :consent_basis
    ])
    |> validate_required([
      :uploader_user_id,
      :speaker_map,
      :storage_key,
      :content_type,
      :byte_size,
      :sha256,
      :consent_attested_by_user_id,
      :consent_attested_at,
      :consent_basis
    ])
    |> validate_inclusion(:status, @statuses)
    |> unique_constraint([:uploader_user_id, :sha256],
      name: :call_recording_imports_uploader_sha_index
    )
  end

  def transition_changeset(row, attrs) do
    row
    |> cast(attrs, [
      :status,
      :failure_reason,
      :provider,
      :confidence,
      :segment_count,
      :unattributed_segment_count,
      :capsule_ids,
      :transcription_started_at,
      :transcribed_at,
      :folded_at,
      :transcription_ms,
      :fold_ms,
      :total_ms
    ])
    |> validate_required([:status])
    |> validate_inclusion(:status, @statuses)
  end

  @doc "Participant user ids declared for this recording (speaker order 0, 1)."
  def participant_ids(%__MODULE__{speaker_map: map}) when is_map(map) do
    map
    |> Enum.sort_by(fn {k, _} -> to_string(k) end)
    |> Enum.map(fn {_, v} -> v end)
    |> Enum.filter(&is_binary/1)
  end

  def participant_ids(_), do: []

  @doc "The participant who is not `user_id`, or nil."
  def other_participant(%__MODULE__{} = row, user_id) do
    row
    |> participant_ids()
    |> Enum.find(&(&1 != user_id))
  end

  def to_contract(%__MODULE__{} = row) do
    %{
      "id" => row.id,
      "source" => "imported_recording",
      "status" => row.status,
      "failure_reason" => row.failure_reason,
      "call_id" => row.call_id,
      "conversation_id" => row.conversation_id,
      "uploader_user_id" => row.uploader_user_id,
      "participant_user_ids" => participant_ids(row),
      "speaker_map" => row.speaker_map,
      "original_filename" => row.original_filename,
      "content_type" => row.content_type,
      "byte_size" => row.byte_size,
      "language" => row.language,
      "provider" => row.provider,
      "confidence" => row.confidence,
      "segment_count" => row.segment_count,
      "unattributed_segment_count" => row.unattributed_segment_count,
      "capsule_ids" => row.capsule_ids,
      "consent" => %{
        "attested_by_user_id" => row.consent_attested_by_user_id,
        "attested_at" => row.consent_attested_at && DateTime.to_iso8601(row.consent_attested_at),
        "basis" => row.consent_basis
      },
      "timings_ms" => %{
        "transcription" => row.transcription_ms,
        "fold" => row.fold_ms,
        "total" => row.total_ms
      },
      "inserted_at" => row.inserted_at && DateTime.to_iso8601(row.inserted_at),
      "updated_at" => row.updated_at && DateTime.to_iso8601(row.updated_at)
    }
  end
end
