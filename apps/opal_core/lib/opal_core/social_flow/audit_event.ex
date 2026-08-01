defmodule OpalCore.SocialFlow.AuditEvent do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "social_flow_audit_events" do
    field :conversation_id, :binary_id
    field :plan_id, :binary_id
    field :actor_user_id, :binary_id
    field :event_type, :string
    field :payload, :map, default: %{}
    field :trace_id, :string

    timestamps(type: :utc_datetime_usec, updated_at: false)
  end

  def changeset(e, attrs) do
    e
    |> cast(attrs, [
      :conversation_id,
      :plan_id,
      :actor_user_id,
      :event_type,
      :payload,
      :trace_id
    ])
    |> validate_required([:event_type])
  end
end
