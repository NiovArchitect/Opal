defmodule OpalCore.SocialFlow.PlanPrivacyMark do
  @moduledoc """
  Founder Polish Wave (Cluster C, P3) - PER-VIEWER plan privacy.

  One row = one viewer has moved one plan into THEIR OWN private
  vault ("My private graphs"). This replaces the W7 reading of
  `shared_plans.is_private` as a plan-global flag: under the
  founder's owner-vault spec, hiding is PER-VIEWER -

  - the mark governs the MARKING viewer's surfaces only: the plan
    leaves their plan-awareness strips, chats list, thread, call
    log, Center deck, search results, Home and orbit rows, and
    lives only inside their "My private graphs" behind the
    passcode (GraphLock). Un-marking restores its presence on
    each of those surfaces respectively (both directions).
  - other parties to the same plan keep their own view, unchanged:
    no exclusion, no sealing, and the mark itself (and the plan's
    `is_private` contract field, which is computed PER VIEWER)
    never leaks to them - their contracts carry `is_private: false`
    for a plan someone else marked.
  - a mark is NOT an access gate: it never denies the marker (the
    vault opens the plan) and never denies anyone else. Access
    stays the membership law in `SocialFlow.ensure_plan_access/2`
    and `JourneyAuthority`.

  The legacy `shared_plans.is_private` column is preserved (backend
  machinery preserved; additive-only): the migration that created
  this table copied every legacy global-private plan into a mark
  for its creator, and no code writes or reads the global flag as
  an exclusion anymore.
  """

  use Ecto.Schema
  import Ecto.Query

  alias OpalCore.Repo

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "plan_privacy_marks" do
    field :user_id, :binary_id
    field :plan_id, :binary_id

    timestamps(type: :utc_datetime_usec)
  end

  @doc "True when this viewer has this plan in their own vault."
  def marked?(user_id, plan_id) when is_binary(user_id) and is_binary(plan_id) do
    Repo.exists?(
      from(m in __MODULE__, where: m.user_id == ^user_id and m.plan_id == ^plan_id)
    )
  end

  def marked?(_, _), do: false

  @doc "The set of plan ids this viewer has marked private (their vault)."
  def marked_plan_ids(user_id) when is_binary(user_id) do
    from(m in __MODULE__, where: m.user_id == ^user_id, select: m.plan_id)
    |> Repo.all()
    |> MapSet.new()
  end

  def marked_plan_ids(_), do: MapSet.new()

  @doc """
  Set or clear the viewer's own mark. Idempotent; returns :ok.
  Authorization (the caller must actually have the plan in their
  world) is the caller's job - see `SocialFlow.set_plan_private/3`.
  """
  def set_mark(user_id, plan_id, true)
      when is_binary(user_id) and is_binary(plan_id) do
    %__MODULE__{user_id: user_id, plan_id: plan_id}
    |> Repo.insert(on_conflict: :nothing, conflict_target: [:user_id, :plan_id])

    :ok
  end

  def set_mark(user_id, plan_id, false)
      when is_binary(user_id) and is_binary(plan_id) do
    from(m in __MODULE__, where: m.user_id == ^user_id and m.plan_id == ^plan_id)
    |> Repo.delete_all()

    :ok
  end

  def set_mark(_, _, _), do: {:error, :invalid}
end
