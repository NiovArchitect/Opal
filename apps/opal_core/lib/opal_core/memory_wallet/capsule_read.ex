defmodule OpalCore.MemoryWallet.CapsuleRead do
  @moduledoc """
  GYRO-01 kernel + W-GAP-05 first form - the ONE mediated read
  facade for the personal-memory capsule class.

  Every read of a capsule in the covered class goes through this
  module: new capsule rows AND existing durable-preference fragments
  (read through `PersonalMemoryCapsule.from_durable_fragment/1`,
  fetched via the declared owner module - this facade adds no direct
  query against the fragment table). It enforces, on every read:

  - OWNER - a capsule is admissible only to its one owner account.
    Memory is namespaced to exactly one account; there is no
    cross-account form of any read here, including aggregates -
    counts and lists are computed from the owner's rows only.
  - SCOPE - the capsule's scope kind must be a recognized kind, and
    a scoped capsule (relationship / conversation / group / plan /
    activity_type / zone / time_horizon) is admissible only in a
    context naming the same kind and the same id. An UNRECOGNIZED
    scope - on the capsule or in the request - FAILS CLOSED: the
    capsule is never returned (GYRO-06 closing condition for this
    class; the old evaluator's allow-all fall-through does not
    exist here).
  - PURPOSE - when a read names a purpose, a capsule whose policy
    names a different purpose is not admissible.
  - EXPIRY - a capsule past its `expires_at` is never admissible.

  Registered in the gyroscope audit: see
  `OpalCore.SocialFlow.PlanProjection.capsule_read_functions/0` and
  `capsule_read_files/0` (the PlanProjection read-registry pattern).
  No module outside this facade, the capsule store modules, and the
  owner's durable path may query the capsule table; the SM test
  suite pins that by source scan.
  """

  import Ecto.Query

  alias OpalCore.MemoryWallet
  alias OpalCore.MemoryWallet.{MemoryCapsule, PersonalMemoryCapsule}
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.DurablePreferenceMemory

  @personal_scope_kinds ~w(user personal)

  # ------------------------------------------------------------------
  # Write leg for NEW personal memories (the capsule table only).
  # ------------------------------------------------------------------

  @doc """
  Remember a NEW personal memory as a capsule in the owner's wallet.

  Required attrs: `summary`. Optional: `purpose`, `scope_kind`,
  `scope_id`, `counterpart_user_id`, `expires_at`, `review_at`,
  `source_kind`, `source_label`. The scope policy is built as data
  by the one builder (`PersonalMemoryCapsule.scope_policy/1`).
  """
  def remember(owner_user_id, attrs) when is_binary(owner_user_id) and is_map(attrs) do
    a = stringify(attrs)
    summary = a["summary"] || a["value"]

    cond do
      not is_binary(summary) or String.trim(summary) == "" ->
        {:error, :summary_required}

      true ->
        with {:ok, wallet} <- MemoryWallet.ensure_wallet(owner_user_id) do
          scope_kind = a["scope_kind"] || "user"
          purpose = a["purpose"] || "personal_memory"

          policy =
            PersonalMemoryCapsule.scope_policy(%{
              scope_kind: scope_kind,
              scope_id: a["scope_id"],
              purpose: purpose,
              counterpart_user_id: a["counterpart_user_id"],
              expires_at: a["expires_at"],
              review_at: a["review_at"]
            })

          %MemoryCapsule{}
          |> MemoryCapsule.changeset(%{
            wallet_id: wallet.id,
            owner_user_id: owner_user_id,
            payload: %{
              "summary" => String.trim(summary),
              "value" => String.trim(summary),
              "kind" => a["kind"] || "personal_memory"
            },
            provenance: %{
              "source_kind" => a["source_kind"] || "told_opal",
              "source_label" => a["source_label"] || "You told Opal",
              "learned_from_kind" => a["learned_from_kind"] || "explicit_fact",
              "stored_at" => DateTime.utc_now() |> DateTime.to_iso8601()
            },
            scope_policy: policy,
            scope_kind: scope_kind,
            scope_id: a["scope_id"],
            purpose: purpose,
            expires_at: a["expires_at"],
            review_at: a["review_at"],
            status: "active"
          })
          |> Repo.insert()
          |> case do
            {:ok, row} -> {:ok, PersonalMemoryCapsule.from_capsule_row(row)}
            {:error, changeset} -> {:error, changeset}
          end
        end
    end
  end

  def remember(_, _), do: {:error, :invalid}

  # ------------------------------------------------------------------
  # The mediated reads.
  # ------------------------------------------------------------------

  @doc """
  Strict mediated read - the assembly form. Returns only capsules
  admissible to `owner_user_id` under `opts`:

  - `purpose:` - when set, only capsules whose policy purpose
    matches (or names no purpose) are admissible.
  - `scope_kind:` / `scope_id:` - the context the read is for.
    User/personal-scoped capsules are admissible in any owner
    context; any other capsule needs an exact kind + id match.
    With no context named, only user/personal capsules are
    admissible. An unrecognized requested kind returns [] (fail
    closed).
  - `now:` - the instant expiry is judged at (tests pin it).
  """
  def list_for_owner(owner_user_id, opts \\ [])

  def list_for_owner(owner_user_id, opts)
      when is_binary(owner_user_id) and is_list(opts) do
    requested_kind = Keyword.get(opts, :scope_kind)

    if requested_kind != nil and not MemoryCapsule.recognized_scope_kind?(requested_kind) do
      []
    else
      now = Keyword.get(opts, :now) || DateTime.utc_now()
      purpose = Keyword.get(opts, :purpose)
      context = %{kind: requested_kind, id: Keyword.get(opts, :scope_id)}

      owner_user_id
      |> all_owner_capsules()
      |> Enum.filter(&admissible?(&1, owner_user_id, purpose, context, now))
    end
  end

  def list_for_owner(_, _), do: []

  @doc """
  The owner's own browse read - the Settings Memory card form. Still
  mediated (owner + active + not expired), but browsing your own
  wallet is not a scoped assembly, so no context filter applies: the
  owner sees every capsule they hold, grouped by nothing but truth.
  Another account's capsules are never in this list - the query is
  owner-scoped before any capsule exists in memory.
  """
  def list_for_owner_browse(owner_user_id) when is_binary(owner_user_id) do
    now = DateTime.utc_now()

    owner_user_id
    |> all_owner_capsules()
    |> Enum.filter(fn capsule ->
      capsule.owner_user_id == owner_user_id and not expired?(capsule, now)
    end)
  end

  def list_for_owner_browse(_), do: []

  @doc "One capsule by id, through the same mediation. Foreign, expired, or out-of-scope reads are `:not_found` - existence never leaks."
  def read_one(owner_user_id, capsule_id, opts \\ [])

  def read_one(owner_user_id, capsule_id, opts)
      when is_binary(owner_user_id) and is_binary(capsule_id) and is_list(opts) do
    owner_user_id
    |> list_for_owner_browse()
    |> Enum.find(&(&1.id == capsule_id))
    |> case do
      nil ->
        {:error, :not_found}

      capsule ->
        now = Keyword.get(opts, :now) || DateTime.utc_now()
        purpose = Keyword.get(opts, :purpose)
        context = %{kind: Keyword.get(opts, :scope_kind), id: Keyword.get(opts, :scope_id)}

        if admissible?(capsule, owner_user_id, purpose, context, now) or
             Keyword.get(opts, :browse) == true do
          {:ok, capsule}
        else
          {:error, :not_found}
        end
    end
  end

  def read_one(_, _, _), do: {:error, :not_found}

  # ------------------------------------------------------------------
  # Forget - withdrawal that truly deletes (SM-TRU-01 for this class).
  # ------------------------------------------------------------------

  @doc """
  Forget one capsule for its owner. This TRULY deletes:

  - a capsule-table capsule is hard-deleted from the owner's wallet;
  - a durable-preference fragment is erased through the owner's
    durable path (`DurablePreferenceMemory.erase_one_for_owner/2`,
    the MP-6 discipline of `erase_all_for_owner/1` scoped to one
    row) - the row is gone, not soft-marked.

  A foreign id is `:not_found` and deletes nothing.
  """
  def forget(owner_user_id, capsule_id)
      when is_binary(owner_user_id) and is_binary(capsule_id) do
    cond do
      capsule_row = Repo.get(MemoryCapsule, capsule_id) ->
        if capsule_row.owner_user_id == owner_user_id do
          case Repo.delete(capsule_row) do
            {:ok, _} -> {:ok, :forgotten, :capsule}
            {:error, changeset} -> {:error, changeset}
          end
        else
          {:error, :not_found}
        end

      true ->
        case DurablePreferenceMemory.erase_one_for_owner(owner_user_id, capsule_id) do
          1 -> {:ok, :forgotten, :durable_preference}
          0 -> {:error, :not_found}
        end
    end
  end

  def forget(_, _), do: {:error, :invalid}

  # ------------------------------------------------------------------
  # Internals - the only capsule-table query sites for reads.
  # ------------------------------------------------------------------

  defp all_owner_capsules(owner_user_id) do
    rows =
      from(c in MemoryCapsule,
        where: c.owner_user_id == ^owner_user_id and c.status == "active",
        order_by: [desc: c.inserted_at]
      )
      |> Repo.all()
      |> Enum.map(&PersonalMemoryCapsule.from_capsule_row/1)

    fragments =
      [owner_user_id]
      |> DurablePreferenceMemory.list_for_owners()
      |> Enum.map(&PersonalMemoryCapsule.from_durable_fragment/1)

    rows ++ fragments
  end

  defp admissible?(capsule, owner_user_id, purpose, context, now) do
    capsule.owner_user_id == owner_user_id and
      not expired?(capsule, now) and
      purpose_admissible?(capsule, purpose) and
      scope_admissible?(capsule, context)
  end

  defp expired?(%PersonalMemoryCapsule{expires_at: nil}, _now), do: false

  defp expired?(%PersonalMemoryCapsule{expires_at: %DateTime{} = expires_at}, now) do
    DateTime.compare(expires_at, now) != :gt
  end

  defp expired?(_, _), do: false

  defp purpose_admissible?(_capsule, nil), do: true

  defp purpose_admissible?(capsule, purpose) do
    case PersonalMemoryCapsule.purpose(capsule) do
      nil -> true
      ^purpose -> true
      _ -> false
    end
  end

  defp scope_admissible?(capsule, context) do
    kind = PersonalMemoryCapsule.scope_kind(capsule)

    cond do
      # FAIL CLOSED: an unrecognized scope on the capsule is never
      # admissible, in any context, including the owner's own
      # assembly. (The owner's browse read above is the one place a
      # held capsule stays visible to its owner, so they can forget
      # it - visibility to the owner is not admissibility to a
      # consumer.)
      not MemoryCapsule.recognized_scope_kind?(kind) ->
        false

      kind in @personal_scope_kinds ->
        true

      context.kind == nil ->
        false

      true ->
        context.kind == kind and
          is_binary(context.id) and
          context.id == PersonalMemoryCapsule.scope_id(capsule)
    end
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
