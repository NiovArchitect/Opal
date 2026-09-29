defmodule OpalCore.SocialFlow.TemporalFollowThroughLoop do
  @moduledoc """
  Durable open-loop state for temporal follow-through (Track A7).

  Survives server restart. Semantic deadline ≠ delivery scheduling.
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @kinds ~w(waiting_on commitment open_question execution plan_approach explicit_timed memory_silence pattern_silence)
  @statuses ~w(open completed cancelled superseded resolved)
  @maturities ~w(not_yet approaching due resolved)
  @precisions ~w(date_only datetime approximate unspecified)

  schema "temporal_follow_through_loops" do
    field :kind, :string
    field :source_id, :string
    field :conversation_id, :string
    field :plan_id, :string
    field :plan_version, :string
    field :owner_user_id, :string
    field :responsibility_user_id, :string
    field :previous_owner_user_id, :string
    field :participant_ids, {:array, :string}, default: []
    field :timezone, :string, default: "America/Los_Angeles"
    field :precision, :string, default: "unspecified"
    field :semantic_deadline_date, :date
    field :semantic_deadline_at, :utc_datetime_usec
    field :plan_start_at, :utc_datetime_usec
    field :status, :string, default: "open"
    field :maturity, :string, default: "not_yet"
    field :attention_dedupe_key, :string
    field :provider_observed_at, :utc_datetime_usec
    field :provider_fresh_hours, :integer
    field :execution_status, :string
    field :destination_coords_known, :boolean, default: false
    field :travel_known, :boolean, default: false
    field :location_permission, :boolean, default: false
    field :metadata, :map, default: %{}
    field :idempotency_key, :string
    field :last_evaluated_at, :utc_datetime_usec

    timestamps(type: :utc_datetime_usec)
  end

  def kinds, do: @kinds
  def statuses, do: @statuses
  def maturities, do: @maturities
  def precisions, do: @precisions

  def changeset(loop, attrs) do
    loop
    |> cast(attrs, [
      :kind,
      :source_id,
      :conversation_id,
      :plan_id,
      :plan_version,
      :owner_user_id,
      :responsibility_user_id,
      :previous_owner_user_id,
      :participant_ids,
      :timezone,
      :precision,
      :semantic_deadline_date,
      :semantic_deadline_at,
      :plan_start_at,
      :status,
      :maturity,
      :attention_dedupe_key,
      :provider_observed_at,
      :provider_fresh_hours,
      :execution_status,
      :destination_coords_known,
      :travel_known,
      :location_permission,
      :metadata,
      :idempotency_key,
      :last_evaluated_at
    ])
    |> validate_required([:kind, :source_id, :attention_dedupe_key, :idempotency_key, :status, :maturity])
    |> validate_inclusion(:kind, @kinds)
    |> validate_inclusion(:status, @statuses)
    |> validate_inclusion(:maturity, @maturities)
    |> validate_inclusion(:precision, @precisions)
    |> unique_constraint(:idempotency_key)
  end
end
