defmodule OpalCore.SocialFlow.OpalChronologyMoment do
  @moduledoc """
  Durable Opal moment — persisted causal history, not recompute-on-read.
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "opal_chronology_moments" do
    field :kind, :string
    field :lifecycle_stage, :string
    field :label, :string
    field :detail, :string
    field :privacy_class, :string, default: "shared_progress"
    field :visibility, :string, default: "shared"
    field :viewer_user_id, :binary_id
    field :evidence_message_id, :binary_id
    field :source_message_ids, {:array, :binary_id}, default: []
    field :after_server_seq, :integer, default: 0
    field :created_from, :string, default: "conversation_evidence"
    field :composition_snapshot, :map, default: %{}
    field :idempotency_key, :string
    belongs_to :conversation, OpalCore.Messaging.Conversation
    timestamps(type: :utc_datetime_usec)
  end

  def changeset(m, attrs) do
    m
    |> cast(attrs, [
      :conversation_id,
      :kind,
      :lifecycle_stage,
      :label,
      :detail,
      :privacy_class,
      :visibility,
      :viewer_user_id,
      :evidence_message_id,
      :source_message_ids,
      :after_server_seq,
      :created_from,
      :composition_snapshot,
      :idempotency_key
    ])
    |> validate_required([
      :conversation_id,
      :kind,
      :label,
      :privacy_class,
      :visibility,
      :idempotency_key
    ])
    |> unique_constraint(:idempotency_key)
  end

  def to_contract(%__MODULE__{} = m) do
    %{
      "id" => m.id,
      "conversation_id" => m.conversation_id,
      "kind" => m.kind,
      "lifecycle_stage" => m.lifecycle_stage,
      "label" => m.label,
      "detail" => m.detail,
      "privacy_class" => m.privacy_class,
      "visibility" => m.visibility,
      "viewer_user_id" => m.viewer_user_id,
      "evidence_message_id" => m.evidence_message_id,
      "source_message_ids" => m.source_message_ids || [],
      "after_server_seq" => m.after_server_seq,
      "created_from" => m.created_from,
      "composition_snapshot" => m.composition_snapshot || %{},
      "inserted_at" =>
        if(m.inserted_at, do: DateTime.to_iso8601(m.inserted_at), else: nil),
      "durable" => true,
      "not_staged" => true
    }
  end
end
