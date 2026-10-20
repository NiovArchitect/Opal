defmodule OpalCore.SocialFlow.PlanParticipant do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  # Repair #18 (Division A, plan truth): ONE canonical response-state
  # vocabulary for every surface that reads or counts participation:
  # "accepted" (going), "pending" (invited / interested, not yet answered),
  # "declined" (not going). Legacy stored values ("proposed", "tentative",
  # "withdrawn") remain writable by the paths that still produce them, but
  # every READ goes through canonical_response_state/1 - the single
  # translation point - so no surface translates privately.
  @canonical_response_states ~w(accepted pending declined)

  # pending = trip-leg-created invite; not yet agreed (Phase 4E)
  @response_states ~w(proposed pending accepted declined tentative withdrawn)

  @doc "The one canonical response-state vocabulary: accepted / pending / declined."
  def canonical_response_states, do: @canonical_response_states

  @doc """
  Translate any stored response_state into the canonical vocabulary.
  This is the ONLY translation site; counters and projections call it.
  Returns nil for values outside the vocabulary.
  """
  def canonical_response_state("accepted"), do: "accepted"
  def canonical_response_state(state) when state in ~w(pending proposed tentative), do: "pending"
  def canonical_response_state(state) when state in ~w(declined withdrawn), do: "declined"
  def canonical_response_state(_), do: nil

  @doc "True when the stored state is canonically pending (invited, unanswered)."
  def pending_state?(state), do: canonical_response_state(state) == "pending"

  @doc "True when the stored state is canonically accepted (going)."
  def accepted_state?(state), do: canonical_response_state(state) == "accepted"

  schema "plan_participants" do
    field :role, :string, default: "participant"
    field :response_state, :string
    field :responded_at, :utc_datetime_usec
    field :authority_source, :string, default: "user_action"
    # P14 (additive): the creator-opt-in response window, as data on
    # the request. Nil = no window was set. Written ONLY through
    # NonResponseEtiquette.set_response_window/2 (relationship-gated).
    field :response_window_seconds, :integer
    field :response_window_closes_at, :utc_datetime_usec

    belongs_to :plan, OpalCore.SocialFlow.SharedPlan
    belongs_to :user, OpalCore.Accounts.User

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(p, attrs) do
    p
    |> cast(attrs, [
      :plan_id,
      :user_id,
      :role,
      :response_state,
      :responded_at,
      :authority_source,
      :response_window_seconds,
      :response_window_closes_at
    ])
    |> validate_required([:plan_id, :user_id, :response_state])
    |> validate_inclusion(:response_state, @response_states)
    |> unique_constraint([:plan_id, :user_id])
  end

  def to_contract(%__MODULE__{} = p) do
    %{
      "id" => p.id,
      "plan_id" => p.plan_id,
      "user_id" => p.user_id,
      "role" => p.role,
      "response_state" => p.response_state,
      "authority_source" => p.authority_source,
      # P14: the window truth rides the contract additively so surfaces
      # render it from the record, never re-derive it. Nil when unset.
      "response_window_seconds" => Map.get(p, :response_window_seconds),
      "response_window_closes_at" =>
        case Map.get(p, :response_window_closes_at) do
          %DateTime{} = dt -> DateTime.to_iso8601(dt)
          _ -> nil
        end
    }
  end
end
