defmodule OpalCore.SocialFlow.CheckinSweep do
  @moduledoc """
  Repair #18 B3 - one circle check-in sweep: a frozen member snapshot
  resolved at creation from exactly one source (design section 1.6).
  Later membership changes never mutate an open sweep.

  Status is written by exactly one writer (the Checkin context) - the
  gyroscope rule: list surfaces never recompute it differently.
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @source_kinds ~w(conversation plan family_context relationship_set)
  @statuses ~w(open complete closed)
  @close_reasons ~w(expired organizer complete)
  @expiry_hours [24, 48, 168]

  schema "checkin_sweeps" do
    field :source_kind, :string
    field :source_ref_id, :binary_id
    field :source_filter, :map, default: %{}
    field :circle_key, :string
    field :circle_label, :string
    field :member_ids, {:array, :binary_id}, default: []
    field :not_askable_ids, {:array, :binary_id}, default: []
    field :minor_ids, {:array, :binary_id}, default: []
    field :prompt_theme, :string
    field :status, :string, default: "open"
    field :expires_at, :utc_datetime_usec
    field :closed_at, :utc_datetime_usec
    field :close_reason, :string
    field :idempotency_key, :string

    belongs_to :organizer_user, OpalCore.Accounts.User, foreign_key: :organizer_user_id
    has_many :responses, OpalCore.SocialFlow.CheckinResponse, foreign_key: :sweep_id

    timestamps(type: :utc_datetime_usec)
  end

  def source_kinds, do: @source_kinds
  def statuses, do: @statuses
  def expiry_hours, do: @expiry_hours

  def changeset(sweep, attrs) do
    sweep
    |> cast(attrs, [
      :organizer_user_id,
      :source_kind,
      :source_ref_id,
      :source_filter,
      :circle_key,
      :circle_label,
      :member_ids,
      :not_askable_ids,
      :minor_ids,
      :prompt_theme,
      :status,
      :expires_at,
      :closed_at,
      :close_reason,
      :idempotency_key
    ])
    |> validate_required([
      :organizer_user_id,
      :source_kind,
      :circle_key,
      :circle_label,
      :member_ids,
      :status,
      :expires_at,
      :idempotency_key
    ])
    |> validate_inclusion(:source_kind, @source_kinds)
    |> validate_inclusion(:status, @statuses)
    |> validate_inclusion(:close_reason, @close_reasons)
    |> validate_length(:prompt_theme, max: 140)
    |> validate_length(:circle_label, max: 128)
    |> unique_constraint(:idempotency_key)
    |> foreign_key_constraint(:organizer_user_id)
  end
end
