defmodule OpalCore.SocialFlow.CareRotation do
  @moduledoc """
  Repair #18 Division B (B4) — a care rotation: a standing agreement
  among a set of Opal users to take turns checking in on one person.

  A coordination primitive, NOT a medical product: there is no health
  data anywhere on this record — no condition, medication, symptom, or
  wellbeing field exists. The subject is a plain `subject_label` string
  (the `Celebration.person_name` precedent) plus an optional consented
  link to a real user. No shadow account is ever created for a subject.

  Membership is consent-based: `member_user_ids` is the rotation order
  and holds only users who accepted; `pending_member_user_ids` holds
  proposals until each person accepts for themselves.
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @statuses ~w(active paused ended)
  @max_members 8

  schema "care_rotations" do
    field :subject_label, :string
    field :subject_user_id, :binary_id
    field :pending_subject_user_id, :binary_id
    field :subject_visible, :boolean, default: false
    field :created_by_user_id, :binary_id
    field :admin_user_id, :binary_id
    field :member_user_ids, {:array, :binary_id}, default: []
    field :pending_member_user_ids, {:array, :binary_id}, default: []
    field :next_assignee_index, :integer, default: 0
    field :cadence, :map, default: %{}
    field :timezone, :string, default: "America/Los_Angeles"
    field :conversation_id, :binary_id
    field :status, :string, default: "active"

    timestamps(type: :utc_datetime_usec)
  end

  def statuses, do: @statuses
  def max_members, do: @max_members

  def changeset(rotation, attrs) do
    rotation
    |> cast(attrs, [
      :subject_label,
      :subject_user_id,
      :pending_subject_user_id,
      :subject_visible,
      :created_by_user_id,
      :admin_user_id,
      :member_user_ids,
      :pending_member_user_ids,
      :next_assignee_index,
      :cadence,
      :timezone,
      :conversation_id,
      :status
    ])
    |> validate_required([
      :subject_label,
      :created_by_user_id,
      :admin_user_id,
      :cadence,
      :timezone,
      :status
    ])
    |> validate_length(:subject_label, max: 120)
    |> validate_inclusion(:status, @statuses)
    |> validate_change(:member_user_ids, fn :member_user_ids, ids ->
      if length(ids || []) > @max_members,
        do: [member_user_ids: "rotation set is capped at #{@max_members} members"],
        else: []
    end)
  end
end
