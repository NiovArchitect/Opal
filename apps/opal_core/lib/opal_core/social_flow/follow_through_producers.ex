defmodule OpalCore.SocialFlow.FollowThroughProducers do
  @moduledoc """
  Repair #16 (W4, P4) — TemporalFollowThrough producers for the kinds
  Repair #15 left unproduced (`waiting_on` / `open_question` /
  `execution`), wired ONLY from explicit structured in-product actions.

  TFT's own law (and the QUIET law): weak intent must not create a
  reminder. Nothing here reads chat text, guesses at commitments, or
  registers from extraction candidates. Each producer fires from a
  committed, structured user action that IS a commitment:

  | Kind | Explicit action | Call site (post-commit) |
  |---|---|---|
  | `waiting_on` | A user taps "Add as my commitment" — `SocialFlow.confirm_commitment/1` flips a `PlanCommitment` to confirmed. The other participants are now waiting on the owner to deliver by the deadline. | `SocialFlow.confirm_commitment/1` success branch; completed by `FollowThrough.complete_commitment/1` |
  | `open_question` | A user proposes a plan revision — `SocialFlow.propose_revision/1` / `propose_cancel_revision/1` create a `PlanRevision` naming `required_approvals`: those people owe an answer before the plan can move. One loop per required approver. | propose success branches; completed per-answer and on settle in `SocialFlow.respond_to_revision/1` |
  | `execution` | A reservation execution is actually requested — `ReservationExecution` writes a durable execution row whose status IS the execution state (provider result applied / timeout / cancel). | `ReservationExecution.apply_provider_result/2`, `mark_timeout/1`, `cancel/2` |

  Refusals are part of the contract (asserted in tests, never faked):
  - `waiting_on` with no derivable deadline (no `due_at` on the
    commitment and no canonical plan start) → `{:skipped, :no_deadline}`.
    The deadline is a structured fact — the commitment's own `due_at`,
    else the plan's canonical start (the commitment is fulfilled BY the
    plan) — never a phrase parsed out of a message.
  - `open_question` for a revision with no required approvers →
    `{:skipped, :no_required_approvers}` (nobody owes an answer).
  - `execution` for pre-execution record states (checking / available /
    selected / authorized — availability is not execution) →
    `{:skipped, :not_execution_status}`.

  All registration goes through `TemporalFollowThrough.register/1`
  (idempotent per key), so replaying a producer never duplicates a loop.
  AttentionAuthority remains the only interruption decider: a loop is an
  input, not a notification.
  """

  import Ecto.Query

  alias OpalCore.Messaging.ConversationMember
  alias OpalCore.Repo

  alias OpalCore.SocialFlow.{
    PlanCommitment,
    PlanParticipant,
    PlanRevision,
    PlanStateArbitration,
    ReservationExecutionRecord,
    SharedPlan,
    TemporalFollowThrough,
    TemporalFollowThroughLoop
  }

  # --- waiting_on -----------------------------------------------------------

  @doc """
  Register the `waiting_on` loop for a freshly CONFIRMED commitment.
  Called post-commit from `SocialFlow.confirm_commitment/1`.
  """
  def register_waiting_on_commitment(%PlanCommitment{} = commitment, %SharedPlan{} = plan) do
    deadline = commitment.due_at || canonical_start(plan)
    deadline_source = if commitment.due_at, do: "commitment_due_at", else: "plan_start"

    if match?(%DateTime{}, deadline) do
      TemporalFollowThrough.register(%{
        "kind" => "waiting_on",
        "source_id" => commitment.id,
        "conversation_id" => plan.conversation_id,
        "plan_id" => plan.id,
        "plan_version" => plan_version(plan),
        "owner_user_id" => commitment.owner_user_id,
        "responsibility_user_id" => commitment.owner_user_id,
        "participant_ids" => participant_ids(plan),
        "timezone" => plan.timezone || "America/Los_Angeles",
        "semantic_deadline_at" => deadline,
        "metadata" => %{
          "copy" => "Still waiting on a commitment: #{commitment.description}",
          "commitment_id" => commitment.id,
          "commitment_description" => commitment.description,
          "deadline_source" => deadline_source
        },
        "idempotency_key" => "waiting-on:commitment:#{commitment.id}"
      })
    else
      {:skipped, :no_deadline}
    end
  rescue
    e -> {:error, e}
  end

  def register_waiting_on_commitment(_, _), do: {:error, :invalid}

  @doc "Complete the waiting_on loop when the commitment is completed."
  def complete_waiting_on_commitment(commitment_id) when is_binary(commitment_id) do
    case Repo.get_by(TemporalFollowThroughLoop,
           idempotency_key: "waiting-on:commitment:#{commitment_id}"
         ) do
      %TemporalFollowThroughLoop{status: "open"} = loop ->
        TemporalFollowThrough.complete(loop, %{"note" => "commitment_completed"})

      %TemporalFollowThroughLoop{} = loop ->
        {:ok, loop}

      nil ->
        {:skipped, :no_loop}
    end
  rescue
    e -> {:error, e}
  end

  def complete_waiting_on_commitment(_), do: {:error, :invalid}

  # --- open_question --------------------------------------------------------

  @doc """
  Register one `open_question` loop per required approver of a freshly
  proposed revision. Called post-commit from the propose paths.
  """
  def register_open_questions(%PlanRevision{} = revision, %SharedPlan{} = plan) do
    approvers = Enum.filter(revision.required_approvals || [], &is_binary/1)

    if approvers == [] do
      {:skipped, :no_required_approvers}
    else
      results =
        Enum.map(approvers, fn approver ->
          TemporalFollowThrough.register(%{
            "kind" => "open_question",
            "source_id" => revision.id,
            "conversation_id" => plan.conversation_id,
            "plan_id" => plan.id,
            "plan_version" => plan_version(plan),
            "owner_user_id" => approver,
            "responsibility_user_id" => approver,
            "participant_ids" => participant_ids(plan),
            "timezone" => plan.timezone || "America/Los_Angeles",
            "plan_start_at" => canonical_start(plan),
            "metadata" => %{
              "blocking" => true,
              "copy" => "Needs your answer",
              "question" => "A change to #{plan.title || "the plan"} needs your answer",
              "revision_id" => revision.id
            },
            "idempotency_key" => "open-question:revision:#{revision.id}:#{approver}"
          })
        end)

      {:ok, results}
    end
  rescue
    e -> {:error, e}
  end

  def register_open_questions(_, _), do: {:error, :invalid}

  @doc """
  Complete open_question loops for a revision. With `only_user_id`, only
  that approver's loop completes (they answered; others still owe one).
  Without it, every open loop for the revision completes (settled).
  """
  def complete_open_questions(revision_id, only_user_id \\ nil)

  def complete_open_questions(revision_id, only_user_id)
      when is_binary(revision_id) do
    query =
      from(l in TemporalFollowThroughLoop,
        where: l.kind == "open_question" and l.source_id == ^revision_id and l.status == "open"
      )

    query =
      if is_binary(only_user_id) do
        from(l in query, where: l.responsibility_user_id == ^only_user_id)
      else
        query
      end

    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    {count, _} =
      Repo.update_all(query,
        set: [status: "completed", maturity: "resolved", last_evaluated_at: now, updated_at: now]
      )

    {:ok, count}
  rescue
    e -> {:error, e}
  end

  def complete_open_questions(_, _), do: {:error, :invalid}

  # --- execution ------------------------------------------------------------

  # ReservationExecutionRecord statuses that ARE an execution state, in
  # TFT's execution vocabulary. Pre-execution states (checking /
  # available / selected / authorized) are deliberately absent:
  # availability and authorization are not execution (ReservationExecution
  # truth separation), so they register nothing.
  @execution_status_map %{
    "authorization_required" => "authorization_required",
    "requested" => "submitted",
    "held" => "submitted",
    "reconciling" => "submitted",
    "failed" => "failed",
    "confirmed" => "confirmed"
  }

  @doc """
  Sync the `execution` loop to a reservation execution row's current
  status. Called after every committed status write in
  ReservationExecution (provider result applied, timeout, cancel).
  Idempotent per execution row; a confirmed execution resolves its loop,
  a cancelled/expired one cancels it.
  """
  def sync_execution_loop(%ReservationExecutionRecord{} = row) do
    key = "execution:#{row.id}"
    existing = Repo.get_by(TemporalFollowThroughLoop, idempotency_key: key)

    cond do
      row.status in ~w(cancelled expired) ->
        case existing do
          %TemporalFollowThroughLoop{status: "cancelled"} = loop ->
            {:ok, loop}

          %TemporalFollowThroughLoop{} = loop ->
            # Mirror the row's terminal state even if the loop had
            # already resolved (e.g. confirmed, then cancelled): the
            # loop's record must not keep claiming a confirmed
            # execution that no longer exists.
            now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

            loop
            |> TemporalFollowThroughLoop.changeset(%{
              status: "cancelled",
              maturity: "resolved",
              execution_status: "cancelled",
              last_evaluated_at: now
            })
            |> Repo.update()

          nil ->
            {:skipped, :no_loop}
        end

      mapped = @execution_status_map[row.status] ->
        {:ok, loop, _origin} =
          TemporalFollowThrough.register(%{
            "kind" => "execution",
            "source_id" => row.id,
            "conversation_id" => row.reality_id,
            "owner_user_id" => row.actor_user_id,
            "responsibility_user_id" => row.actor_user_id,
            "participant_ids" => List.wrap(row.actor_user_id),
            "execution_status" => mapped,
            "provider_observed_at" => row.updated_at,
            "metadata" => %{
              "provider" => row.provider,
              "place_display_name" => row.place_display_name,
              "execution_status" => mapped
            },
            "idempotency_key" => key
          })

        loop =
          if loop.execution_status != mapped do
            {:ok, updated} =
              loop
              |> TemporalFollowThroughLoop.changeset(%{
                execution_status: mapped,
                provider_observed_at: row.updated_at,
                metadata: Map.merge(loop.metadata || %{}, %{"execution_status" => mapped})
              })
              |> Repo.update()

            updated
          else
            loop
          end

        if mapped == "confirmed" and loop.status == "open" do
          TemporalFollowThrough.complete(loop, %{"note" => "execution_confirmed"})
        else
          {:ok, loop, :synced}
        end

      true ->
        {:skipped, :not_execution_status}
    end
  rescue
    e -> {:error, e}
  end

  def sync_execution_loop(_), do: {:error, :invalid}

  # --- helpers --------------------------------------------------------------

  # Same canonical-start derivation PlanCompletion uses (gyroscope: the
  # arbitration authority over the plan row, never a second source).
  defp canonical_start(%SharedPlan{} = plan) do
    alignment = plan.alignment || %{}

    attrs =
      alignment
      |> Map.put("start_at", plan.start_at && DateTime.to_iso8601(plan.start_at))
      |> Map.put_new("timezone", plan.timezone)

    PlanStateArbitration.canonical_start(attrs)
  end

  defp plan_version(%SharedPlan{} = plan) do
    to_string((plan.alignment || %{})["plan_version"] || 0)
  end

  defp participant_ids(%SharedPlan{} = plan) do
    ids =
      from(p in PlanParticipant, where: p.plan_id == ^plan.id, select: p.user_id)
      |> Repo.all()
      |> Enum.filter(&is_binary/1)

    ids =
      if ids == [] and is_binary(plan.conversation_id) do
        from(m in ConversationMember,
          where: m.conversation_id == ^plan.conversation_id,
          select: m.user_id
        )
        |> Repo.all()
        |> Enum.filter(&is_binary/1)
      else
        ids
      end

    ids = if plan.created_by_user_id, do: [plan.created_by_user_id | ids], else: ids
    Enum.uniq(ids)
  end
end
