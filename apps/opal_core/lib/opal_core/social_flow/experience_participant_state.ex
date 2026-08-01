defmodule OpalCore.SocialFlow.ExperienceParticipantState do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "experience_participant_states" do
    field :attendance_state, :string, default: "expected"
    field :arrival_state, :string, default: "no_update"
    field :visibility, :string, default: "group"
    field :source, :string, default: "explicit"
    field :shared_note, :string
    field :private_note, :string
    field :expected_arrival_label, :string
    field :effective_at, :utc_datetime_usec
    field :expires_at, :utc_datetime_usec
    field :superseded_at, :utc_datetime_usec
    field :idempotency_key, :string
    belongs_to :experience, OpalCore.SocialFlow.SocialExperience
    belongs_to :user, OpalCore.Accounts.User
    timestamps(type: :utc_datetime_usec)
  end

  def changeset(s, attrs) do
    s
    |> cast(attrs, [
      :experience_id,
      :user_id,
      :attendance_state,
      :arrival_state,
      :visibility,
      :source,
      :shared_note,
      :private_note,
      :expected_arrival_label,
      :effective_at,
      :expires_at,
      :superseded_at,
      :idempotency_key
    ])
    |> validate_required([:experience_id, :user_id, :arrival_state, :idempotency_key])
    |> validate_inclusion(
      :attendance_state,
      ~w(expected declined withdrawn cannot_attend unknown)
    )
    |> validate_inclusion(
      :arrival_state,
      ~w(no_update on_the_way running_late arrived left unknown)
    )
    |> validate_inclusion(:visibility, ~w(group organizer private selected))
    |> unique_constraint(:idempotency_key)
  end

  def to_public_contract(%__MODULE__{} = s) do
    %{
      "id" => s.id,
      "experience_id" => s.experience_id,
      "user_id" => s.user_id,
      "attendance_state" => s.attendance_state,
      "arrival_state" => s.arrival_state,
      "visibility" => s.visibility,
      "expected_arrival_label" => s.expected_arrival_label,
      "shared_note" => s.shared_note
    }
  end
end
