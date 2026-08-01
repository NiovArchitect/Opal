defmodule OpalCore.SocialFlow.FamilyPlan do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "family_plans" do
    field :title, :string
    field :status, :string, default: "proposed"
    field :time_label, :string
    field :location_label, :string
    field :youth_user_id, :binary_id
    field :guardian_user_id, :binary_id
    field :copy_guardian, :string
    field :copy_youth, :string
    field :no_precise_location, :boolean, default: true
    field :no_background_tracking, :boolean, default: true
    field :source_message_ids, {:array, :binary_id}, default: []
    field :idempotency_key, :string
    field :confirmed_at, :utc_datetime_usec
    field :current_revision, :integer, default: 1
    belongs_to :family, OpalCore.SocialFlow.FamilyContext, foreign_key: :family_id
    belongs_to :conversation, OpalCore.Messaging.Conversation
    belongs_to :created_by_user, OpalCore.Accounts.User, foreign_key: :created_by_user_id
    timestamps(type: :utc_datetime_usec)
  end

  def changeset(p, attrs) do
    p
    |> cast(attrs, [
      :family_id,
      :conversation_id,
      :created_by_user_id,
      :title,
      :status,
      :time_label,
      :location_label,
      :youth_user_id,
      :guardian_user_id,
      :copy_guardian,
      :copy_youth,
      :no_precise_location,
      :no_background_tracking,
      :source_message_ids,
      :idempotency_key,
      :confirmed_at,
      :current_revision
    ])
    |> validate_required([
      :family_id,
      :conversation_id,
      :created_by_user_id,
      :title,
      :status,
      :idempotency_key
    ])
    |> validate_inclusion(:status, ~w(proposed confirmed revised cancelled completed))
    |> unique_constraint(:idempotency_key)
  end

  def to_contract(%__MODULE__{} = p, viewer_role \\ "guardian") do
    base = %{
      "id" => p.id,
      "family_id" => p.family_id,
      "title" => p.title,
      "status" => p.status,
      "time_label" => p.time_label,
      "location_label" => p.location_label,
      "current_revision" => p.current_revision,
      "no_precise_location" => p.no_precise_location,
      "no_background_tracking" => p.no_background_tracking,
      "no_attendance_inference" => true
    }

    copy =
      if viewer_role in ~w(youth guardian_managed_youth),
        do: p.copy_youth,
        else: p.copy_guardian

    Map.put(base, "copy", copy)
  end
end
