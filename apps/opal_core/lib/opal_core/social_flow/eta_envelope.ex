defmodule OpalCore.SocialFlow.ETAEnvelope do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "eta_envelopes" do
    field :visibility_scope, :string, default: "group"
    field :arrival_start_at, :utc_datetime_usec
    field :arrival_end_at, :utc_datetime_usec
    field :arrival_window_label, :string
    field :precision_class, :string, default: "approximate_window"
    field :source_class, :string, default: "user_stated"
    field :confidence, :float, default: 0.7
    field :generated_at, :utc_datetime_usec
    field :expires_at, :utc_datetime_usec
    field :revoked_at, :utc_datetime_usec
    field :superseded_at, :utc_datetime_usec
    field :status, :string, default: "active"
    field :idempotency_key, :string
    belongs_to :experience, OpalCore.SocialFlow.SocialExperience
    belongs_to :owner_user, OpalCore.Accounts.User, foreign_key: :owner_user_id
    timestamps(type: :utc_datetime_usec)
  end

  def changeset(e, attrs) do
    e
    |> cast(attrs, [
      :experience_id,
      :owner_user_id,
      :visibility_scope,
      :arrival_start_at,
      :arrival_end_at,
      :arrival_window_label,
      :precision_class,
      :source_class,
      :confidence,
      :generated_at,
      :expires_at,
      :revoked_at,
      :superseded_at,
      :status,
      :idempotency_key
    ])
    |> validate_required([
      :experience_id,
      :owner_user_id,
      :precision_class,
      :generated_at,
      :expires_at,
      :status,
      :idempotency_key
    ])
    |> validate_inclusion(:precision_class, ~w(approximate_window coarse_status))
    |> validate_inclusion(:visibility_scope, ~w(group organizer selected))
    |> validate_inclusion(:status, ~w(active expired revoked superseded))
    |> unique_constraint(:idempotency_key)
  end

  def to_public_contract(%__MODULE__{} = e) do
    %{
      "id" => e.id,
      "experience_id" => e.experience_id,
      "owner_user_id" => e.owner_user_id,
      "visibility_scope" => e.visibility_scope,
      "arrival_window_label" => e.arrival_window_label,
      "precision_class" => e.precision_class,
      "status" => e.status,
      "expires_at" => e.expires_at && DateTime.to_iso8601(e.expires_at),
      "no_precise_coordinates" => true,
      "no_route" => true
    }
  end
end
