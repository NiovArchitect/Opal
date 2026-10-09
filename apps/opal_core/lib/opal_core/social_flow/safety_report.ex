defmodule OpalCore.SocialFlow.SafetyReport do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @categories ~w(
    repeated_unwanted_requests impersonation inappropriate_content harassment
    suspicious_account safety_concern other
    fake_venue not_a_real_place host_isnt_here
  )

  schema "safety_reports" do
    field :category, :string
    field :status, :string, default: "submitted"
    field :privacy_class, :string, default: "reporter_confidential"
    field :note, :string
    field :source_request_ids, {:array, :binary_id}, default: []
    field :source_message_ids, {:array, :binary_id}, default: []
    field :policy_version, :string, default: "sf9-dev-0.1"
    field :triage_proposal, :map, default: %{}
    field :containment_action, :string
    field :containment_expires_at, :utc_datetime_usec
    field :reporter_visible_status, :string
    field :idempotency_key, :string
    field :closed_at, :utc_datetime_usec
    field :subject_venue_id, :binary_id
    field :subject_live_room_id, :binary_id
    belongs_to :reporter_user, OpalCore.Accounts.User, foreign_key: :reporter_user_id
    belongs_to :reported_user, OpalCore.Accounts.User, foreign_key: :reported_user_id
    timestamps(type: :utc_datetime_usec)
  end

  def categories, do: @categories

  def changeset(r, attrs) do
    r
    |> cast(attrs, [
      :reporter_user_id,
      :reported_user_id,
      :category,
      :status,
      :privacy_class,
      :note,
      :source_request_ids,
      :source_message_ids,
      :policy_version,
      :triage_proposal,
      :containment_action,
      :containment_expires_at,
      :reporter_visible_status,
      :idempotency_key,
      :closed_at,
      :subject_venue_id,
      :subject_live_room_id
    ])
    |> validate_required([
      :reporter_user_id,
      :reported_user_id,
      :category,
      :status,
      :privacy_class,
      :idempotency_key
    ])
    |> validate_inclusion(:category, @categories)
    |> validate_inclusion(
      :status,
      ~w(submitted triaged action_taken no_action more_information_needed appealed closed)
    )
    |> unique_constraint(:idempotency_key)
  end

  def to_reporter_contract(%__MODULE__{} = r) do
    %{
      "id" => r.id,
      "category" => r.category,
      "status" => r.status,
      "reporter_visible_status" => r.reporter_visible_status || r.status,
      "policy_version" => r.policy_version,
      "reported_user_id" => r.reported_user_id,
      "no_legal_conclusion" => true,
      "reporter_confidential" => true
    }
  end

  def to_subject_contract(%__MODULE__{} = _r) do
    # reported user never sees reporter identity or full report
    %{"error" => "not_found"}
  end
end
