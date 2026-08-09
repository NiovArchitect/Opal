defmodule OpalCore.SocialFlow.OpalCalendar.Commitment do
  @moduledoc """
  Authoritative Opal-owned social time commitment.

  Reflects AlignmentAuthority → Set; never establishes Set itself.
  Private across conversations: peer of conversation A never sees details of B.
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @statuses ~w(active cancelled superseded completed)
  @sync_statuses ~w(not_synced sync_requested synced sync_failed sync_revoked)

  schema "opal_calendar_commitments" do
    field :status, :string, default: "active"
    field :start_at, :utc_datetime_usec
    field :end_at, :utc_datetime_usec
    field :timezone, :string, default: "UTC"
    field :label, :string
    field :place_label, :string
    field :plan_version, :integer, default: 1
    field :proposal_key, :string
    field :participant_user_ids, {:array, :binary_id}, default: []
    field :created_from_alignment, :boolean, default: true
    field :superseded_by_id, :binary_id
    field :cancelled_at, :utc_datetime_usec
    field :completed_at, :utc_datetime_usec
    field :external_sync_status, :string, default: "not_synced"
    field :external_provider, :string
    field :external_event_ref, :string
    field :metadata, :map, default: %{}

    belongs_to :conversation, OpalCore.Messaging.Conversation
    belongs_to :shared_plan, OpalCore.SocialFlow.SharedPlan
    belongs_to :owner_user, OpalCore.Accounts.User, foreign_key: :owner_user_id

    timestamps(type: :utc_datetime_usec)
  end

  def statuses, do: @statuses
  def sync_statuses, do: @sync_statuses

  def changeset(row, attrs) do
    row
    |> cast(attrs, [
      :conversation_id,
      :shared_plan_id,
      :owner_user_id,
      :status,
      :start_at,
      :end_at,
      :timezone,
      :label,
      :place_label,
      :plan_version,
      :proposal_key,
      :participant_user_ids,
      :created_from_alignment,
      :superseded_by_id,
      :cancelled_at,
      :completed_at,
      :external_sync_status,
      :external_provider,
      :external_event_ref,
      :metadata
    ])
    |> validate_required([
      :conversation_id,
      :owner_user_id,
      :status,
      :start_at,
      :end_at,
      :timezone
    ])
    |> validate_inclusion(:status, @statuses)
    |> validate_inclusion(:external_sync_status, @sync_statuses)
    |> validate_range()
  end

  defp validate_range(cs) do
    s = get_field(cs, :start_at)
    e = get_field(cs, :end_at)

    if s && e && DateTime.compare(e, s) != :gt do
      add_error(cs, :end_at, "must be after start_at")
    else
      cs
    end
  end

  @doc "Owner-private contract — never send to peers of another conversation."
  def to_owner_contract(%__MODULE__{} = c) do
    %{
      "schema_version" => "0.1.0",
      "id" => c.id,
      "conversation_id" => c.conversation_id,
      "shared_plan_id" => c.shared_plan_id,
      "owner_user_id" => c.owner_user_id,
      "status" => c.status,
      "start_at" => iso(c.start_at),
      "end_at" => iso(c.end_at),
      "timezone" => c.timezone,
      "label" => c.label,
      "place_label" => c.place_label,
      "plan_version" => c.plan_version,
      "created_from_alignment" => c.created_from_alignment,
      "external_sync_status" => c.external_sync_status,
      "authorizes_set" => false
    }
  end

  @doc "Busy abstraction only — no who/what/where from other relationships."
  def to_busy_block(%__MODULE__{} = c) do
    %{
      "start_at" => c.start_at,
      "end_at" => c.end_at,
      "source" => "opal_calendar",
      "owner_user_id" => c.owner_user_id,
      "busy" => true,
      "commitment_id" => c.id,
      "conversation_id" => c.conversation_id,
      "no_peer_details" => true
    }
  end

  defp iso(nil), do: nil
  defp iso(%DateTime{} = dt), do: DateTime.to_iso8601(dt)
end
