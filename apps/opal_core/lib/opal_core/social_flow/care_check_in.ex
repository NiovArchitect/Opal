defmodule OpalCore.SocialFlow.CareCheckIn do
  @moduledoc """
  Repair #18 Division B (B4) — the care rotation ledger: one row per
  occurrence, append-only as history (only the outcome fields of its
  own row are ever written). This is the set-visible truth ("who
  checked in Tuesday, what did they say"); the linked
  TemporalFollowThrough loop is the attention state, never the history.

  No per-member counts, streaks, or reliability scores are computed or
  exposed anywhere — the ledger lists occurrences chronologically and
  that is all.
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @statuses ~w(scheduled open done missed covered cancelled)

  schema "care_check_ins" do
    field :rotation_id, :binary_id
    field :occurrence_key, :string
    field :assignee_user_id, :binary_id
    field :slot_user_id, :binary_id
    field :window_start_at, :utc_datetime_usec
    field :window_end_at, :utc_datetime_usec
    field :status, :string, default: "open"
    field :done_by_user_id, :binary_id
    field :done_at, :utc_datetime_usec
    field :note, :string
    field :handoff_from_user_id, :binary_id
    field :handoff_to_user_id, :binary_id
    field :handoff_at, :utc_datetime_usec
    field :handoff_reason, :string
    field :tft_loop_id, :string
    field :missed_surfaced_at, :utc_datetime_usec

    timestamps(type: :utc_datetime_usec)
  end

  def statuses, do: @statuses

  def changeset(check_in, attrs) do
    check_in
    |> cast(attrs, [
      :rotation_id,
      :occurrence_key,
      :assignee_user_id,
      :slot_user_id,
      :window_start_at,
      :window_end_at,
      :status,
      :done_by_user_id,
      :done_at,
      :note,
      :handoff_from_user_id,
      :handoff_to_user_id,
      :handoff_at,
      :handoff_reason,
      :tft_loop_id,
      :missed_surfaced_at
    ])
    |> validate_required([
      :rotation_id,
      :occurrence_key,
      :window_start_at,
      :window_end_at,
      :status
    ])
    |> validate_inclusion(:status, @statuses)
    |> validate_length(:note, max: 500)
    |> unique_constraint([:rotation_id, :occurrence_key],
      name: :care_check_ins_rotation_occurrence_uniq
    )
  end
end
