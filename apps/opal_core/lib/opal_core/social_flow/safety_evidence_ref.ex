defmodule OpalCore.SocialFlow.SafetyEvidenceRef do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "safety_evidence_refs" do
    field :source_message_id, :binary_id
    field :content_hash, :string
    field :minimal_snippet, :string
    field :sender_user_id, :binary_id
    field :conversation_id, :binary_id
    field :captured_at, :utc_datetime_usec
    field :expires_at, :utc_datetime_usec
    field :policy_version, :string, default: "sf9-dev-0.1"
    field :idempotency_key, :string
    belongs_to :report, OpalCore.SocialFlow.SafetyReport
    timestamps(type: :utc_datetime_usec)
  end

  def changeset(e, attrs) do
    e
    |> cast(attrs, [
      :report_id,
      :source_message_id,
      :content_hash,
      :minimal_snippet,
      :sender_user_id,
      :conversation_id,
      :captured_at,
      :expires_at,
      :policy_version,
      :idempotency_key
    ])
    |> validate_required([
      :report_id,
      :content_hash,
      :captured_at,
      :expires_at,
      :idempotency_key
    ])
    |> unique_constraint(:idempotency_key)
  end

  def to_restricted_contract(%__MODULE__{} = e) do
    %{
      "id" => e.id,
      "source_message_id" => e.source_message_id,
      "content_hash" => e.content_hash,
      "captured_at" => DateTime.to_iso8601(e.captured_at),
      "expires_at" => DateTime.to_iso8601(e.expires_at),
      "not_full_conversation" => true
    }
  end
end
