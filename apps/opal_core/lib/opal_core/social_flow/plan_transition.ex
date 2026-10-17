defmodule OpalCore.SocialFlow.PlanTransition do
  @moduledoc """
  Gyroscope — the single state-transition gate for the SocialFlow domain
  (Repair #13, W6: structural prevention).

  Every plan / proposal / revision STATUS mutation must pass through this
  module. The transition tables below are the only legal moves; an illegal
  transition (accept-on-cancelled, change-on-completed, convert-on-dismissed,
  confirm-without-proposal, ...) is refused by the GATE — `{:error,
  :illegal_transition}` — not by a scattered guard at one call site.

  Two integration shapes:

  1. `transition/3` — pure predicate: `{:ok, to_status}` or
     `{:error, :illegal_transition}`. Use it wherever a path already holds the
     row and needs to decide whether the move is legal.
  2. `guard_changeset/3` — wraps an `Ecto.Changeset` that intends a status
     write: `(entity, action)`. The gate owns the target: the attempted
     status must equal the table's answer for `(from, action)` — a writer
     naming any other target is a contradiction and the changeset is
     invalid. A non-status write passes through untouched, so attribute-only
     writers (title, venue, alignment) need no changes. An illegal move
     adds a changeset error, so `Repo.update/insert` returns
     `{:error, changeset}` and the row is never committed.

  Creation is a transition too: from `nil` via `:create` / `:create_agreed` /
  `:propose` / `:accept_direct`. There is no way to birth a row in a status
  the table does not allow.

  Call-site registry (every writer wired, Repair #13):

  | Entity | Writer | Action |
  |---|---|---|
  | plan | SocialFlow.cancel_plan/1 | :cancel |
  | plan | SocialFlow.apply_locked_revision/6 (accept path) | :change / :cancel |
  | plan | SocialFlow.change_plan_schedule/1 | :change |
  | plan | SocialFlow.create_shared_plan* / create_tentative_plan_from_* | :create |
  | plan | SocialFlow.maybe_create_shared_plan_from_option/1 | :create_agreed |
  | plan | SocialFlow.ConversationAlignment.upsert_plan/2 | :create |
  | plan | SocialFlow.ConversationAlignment.reconcile_conversation_plans/1 | :cancel |
  | plan | SocialFlow.JourneyAuthority (material change) | :change |
  | plan | SocialFlow.JourneyAuthority.create_journey_plan/1 | :create_agreed |
  | plan | Trips.do_agree_trip_leg_plan/1 | :agree |
  | proposal | SocialFlow.insert_plan_proposal/1 | :create |
  | proposal | SocialFlow.approve_coordination/1 | :approve |
  | proposal | SocialFlow.dismiss_proposal/1 | :dismiss |
  | proposal | SocialFlow.maybe_create_shared_plan_from_option/1 | :convert |
  | proposal | SocialFlow.supersede_open_proposals!/1 | :supersede |
  | proposal | SocialFlow.persist_expired_mark/1 | :expire |
  | revision | SocialFlow.insert_revision_tx/6 | :propose |
  | revision | SocialFlow.respond_to_revision/1 | :accept / :reject |
  | revision | SocialFlow.change_plan_schedule/1 (lead direct edit) | :accept_direct |
  | revision | SocialFlow.JourneyAuthority (material change) | :accept_direct |

  F12-62 ("terminal plans are terminal") is the prototype this generalizes:
  `cancelled` and `completed` plans have no outbound transitions, so a stale
  accept can never resurrect them — structurally, not by one more `if`.

  NOTE (honest): `expired` / `superseded` on PlanRevision and `completed` on
  SharedPlan are declared statuses with no current writers. They have no
  legal INBOUND transitions here — a future writer adds a table entry AND a
  test before it can exist. Declaring the status without the transition is a
  bug the gate catches, by design.
  """

  alias Ecto.Changeset

  @type entity :: :plan | :proposal | :revision
  @type action :: atom()

  # {entity, from_status, action} => to_status.
  # from_status nil = row creation.
  @transitions %{
    # --- plan ---
    {:plan, nil, :create} => "tentative",
    {:plan, nil, :create_agreed} => "agreed",
    {:plan, "tentative", :agree} => "agreed",
    {:plan, "tentative", :change} => "changed",
    {:plan, "tentative", :cancel} => "cancelled",
    {:plan, "agreed", :change} => "changed",
    {:plan, "agreed", :cancel} => "cancelled",
    {:plan, "agreed", :complete} => "completed",
    {:plan, "changed", :change} => "changed",
    {:plan, "changed", :cancel} => "cancelled",
    {:plan, "changed", :complete} => "completed",
    # Repair #18 (Division A, F18-06) - stale tentative plans gain the
    # gated terminal handling proposals already had: :expire is legal
    # ONLY from tentative (agreed/changed are commitments and never
    # auto-expire), and :revive is the stated recovery path back.
    {:plan, "tentative", :expire} => "expired",
    {:plan, "expired", :revive} => "tentative",
    # --- proposal ---
    {:proposal, nil, :create} => "visible",
    {:proposal, "proposed", :approve} => "approved_for_coordination",
    {:proposal, "visible", :approve} => "approved_for_coordination",
    {:proposal, "proposed", :dismiss} => "dismissed",
    {:proposal, "visible", :dismiss} => "dismissed",
    {:proposal, "approved_for_coordination", :dismiss} => "dismissed",
    {:proposal, "proposed", :convert} => "converted",
    {:proposal, "visible", :convert} => "converted",
    {:proposal, "approved_for_coordination", :convert} => "converted",
    {:proposal, "proposed", :supersede} => "superseded",
    {:proposal, "visible", :supersede} => "superseded",
    {:proposal, "proposed", :expire} => "expired",
    {:proposal, "visible", :expire} => "expired",
    {:proposal, "approved_for_coordination", :expire} => "expired",
    # --- revision ---
    {:revision, nil, :propose} => "proposed",
    {:revision, nil, :accept_direct} => "accepted",
    {:revision, "proposed", :accept} => "accepted",
    {:revision, "proposed", :reject} => "rejected"
  }

  @terminal %{
    plan: ~w(cancelled completed expired),
    proposal: ~w(dismissed expired superseded converted),
    revision: ~w(accepted rejected expired superseded)
  }

  @doc """
  The gate. `{:ok, to_status}` when `(from, action)` is a legal move for the
  entity, `{:error, :illegal_transition}` otherwise.

      iex> PlanTransition.transition(:plan, "cancelled", :change)
      {:error, :illegal_transition}

      iex> PlanTransition.transition(:plan, "agreed", :cancel)
      {:ok, "cancelled"}
  """
  @spec transition(entity(), String.t() | nil, action()) ::
          {:ok, String.t()} | {:error, :illegal_transition}
  def transition(entity, from, action)
      when entity in [:plan, :proposal, :revision] and is_atom(action) do
    case Map.fetch(@transitions, {entity, from, action}) do
      {:ok, to} -> {:ok, to}
      :error -> {:error, :illegal_transition}
    end
  end

  @doc "True when the status is terminal for the entity (no legal outbound moves)."
  @spec terminal?(entity(), String.t() | nil) :: boolean()
  def terminal?(entity, status)
      when entity in [:plan, :proposal, :revision] do
    status in Map.get(@terminal, entity, [])
  end

  @doc """
  Every action legal from `from` for the entity. Used for honest error copy
  ("a cancelled plan cannot be changed — legal actions: none") and for
  LLM-facing introspection; the gate remains the decider.
  """
  @spec legal_actions(entity(), String.t() | nil) :: [action()]
  def legal_actions(entity, from) when entity in [:plan, :proposal, :revision] do
    @transitions
    |> Enum.filter(fn {{e, f, _a}, _to} -> e == entity and f == from end)
    |> Enum.map(fn {{_e, _f, a}, _to} -> a end)
    |> Enum.uniq()
    |> Enum.sort()
  end

  @doc """
  Every `from` status from which `action` is legal — the honest filter for
  `update_all`-style writers that cannot pass a changeset through the gate.
  """
  @spec from_statuses(entity(), action()) :: [String.t()]
  def from_statuses(entity, action)
      when entity in [:plan, :proposal, :revision] and is_atom(action) do
    @transitions
    |> Enum.filter(fn {{e, _f, a}, _to} -> e == entity and a == action end)
    |> Enum.map(fn {{_e, f, _a}, _to} -> f end)
    |> Enum.reject(&is_nil/1)
    |> Enum.uniq()
  end

  @doc """
  The target status for a legal move, or nil. Same data as `transition/3`,
  for writers that must name the target inside `update_all`.
  """
  @spec target_for(entity(), String.t() | nil, action()) :: String.t() | nil
  def target_for(entity, from, action) do
    case transition(entity, from, action) do
      {:ok, to} -> to
      {:error, _} -> nil
    end
  end

  @doc """
  Gate an `Ecto.Changeset` that intends a status write. The gate owns the
  target: the changeset's attempted status must EQUAL the table's answer for
  `(from, action)` — a writer naming any other target is a contradiction and
  the changeset is marked invalid. Non-status writes pass through untouched.
  Creation (data.status == nil) is gated too — `:create` etc.
  """
  @spec guard_changeset(Changeset.t(), entity(), action()) :: Changeset.t()
  def guard_changeset(%Changeset{} = changeset, entity, action)
      when entity in [:plan, :proposal, :revision] and is_atom(action) do
    case Changeset.get_change(changeset, :status) do
      nil ->
        # Not a status write; the gate has nothing to say.
        changeset

      attempted ->
        from = changeset.data && changeset.data.status

        case transition(entity, from, action) do
          {:ok, ^attempted} ->
            changeset

          {:ok, to} ->
            Changeset.add_error(
              changeset,
              :status,
              "illegal transition: #{entity} #{action} from #{inspect(from)} " <>
                "yields #{inspect(to)}, not #{inspect(attempted)}"
            )

          {:error, :illegal_transition} ->
            Changeset.add_error(
              changeset,
              :status,
              "illegal transition: #{entity} cannot #{action} from #{inspect(from)}"
            )
        end
    end
  end

  @doc "The full transition table (for GYROSCOPE.md and introspection)."
  @spec tables() :: map()
  def tables, do: @transitions

  @doc "Terminal statuses per entity."
  @spec terminals() :: map()
  def terminals, do: @terminal
end
