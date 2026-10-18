defmodule OpalCore.SocialFlow.CheckinResponse do
  @moduledoc """
  Repair #18 B3 - one member's response row inside a check-in sweep.

  Rows are PRE-CREATED for every askable target in status "asked"
  inside the sweep creation transaction (design section 4.1), so an
  unanswered member is a stored state, never an absence. The five
  statuses of section 4.2 are the whole vocabulary; nothing
  auto-transitions "asked" - time passing changes only the sweep.

  Answer fields hold the member's stated words verbatim. No LLM ever
  paraphrases or scores them, and they are never admitted to memory
  (design sections 2.3 and 5.6).
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @statuses ~w(asked answered declined passed withdrawn)
  @okay_values ~w(ok not_ok unstated)
  @answer_sources ~w(card center_text)
  @delivery_states ~w(deliverable undeliverable)

  schema "checkin_responses" do
    field :status, :string, default: "asked"
    field :okay, :string
    field :where_text, :string
    field :needs_text, :string
    field :free_text, :string
    field :shared_area, :map
    field :answer_source, :string
    field :delivery_state, :string, default: "deliverable"
    field :responded_at, :utc_datetime_usec

    belongs_to :sweep, OpalCore.SocialFlow.CheckinSweep, foreign_key: :sweep_id
    belongs_to :member_user, OpalCore.Accounts.User, foreign_key: :member_user_id

    timestamps(type: :utc_datetime_usec)
  end

  def statuses, do: @statuses
  def okay_values, do: @okay_values
  def terminal_statuses, do: ~w(answered declined passed withdrawn)

  def changeset(response, attrs) do
    response
    |> cast(attrs, [
      :sweep_id,
      :member_user_id,
      :status,
      :okay,
      :where_text,
      :needs_text,
      :free_text,
      :shared_area,
      :answer_source,
      :delivery_state,
      :responded_at
    ])
    |> validate_required([:sweep_id, :member_user_id, :status])
    |> validate_inclusion(:status, @statuses)
    |> validate_inclusion(:okay, @okay_values)
    |> validate_inclusion(:answer_source, @answer_sources)
    |> validate_inclusion(:delivery_state, @delivery_states)
    |> validate_length(:where_text, max: 280)
    |> validate_length(:needs_text, max: 280)
    |> validate_length(:free_text, max: 2000)
    |> unique_constraint([:sweep_id, :member_user_id])
    |> foreign_key_constraint(:sweep_id)
    |> foreign_key_constraint(:member_user_id)
  end
end
