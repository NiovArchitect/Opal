defmodule OpalCore.Accounts.AccountDeletion do
  @moduledoc """
  Self-serve deletion with shared-truth honesty (spec 4.C6, SURPASS).

  Two modes, one executor - the self-serve route and the support
  route both call `execute/3`, so the semantics can never drift
  (support-path parity):

  - "data": the account's own private data goes - memory it owns,
    its Soul/assistance preferences, its chats with Opal, its saved
    logins and provider connections. The account itself stays.
  - "account": everything "data" removes, plus the account is
    closed: every session is revoked and the identity is anonymized
    IN PLACE (display name "Deleted member", a deleted handle,
    `deleted_at` stamped).

  Shared truth is not yours to erase for others: shared plans and
  shared memories are NOT deleted. The departing account's seat in
  them remains, pointing at the anonymized identity, so a partner
  still sees the plan they share - with "Deleted member" in the
  seat. The departing side's own directed records (their side of
  the relationship rows, their invites) are removed.

  Every execution writes a completion receipt
  (`OpalCore.Accounts.DeletionReceipt`) and returns it.

  Repair #18 hardening - receipt-reference retry: the receipt's
  `DEL-` reference carries a unique index. Generation retries
  bounded times on a reference collision (mirroring
  `OpalCore.Support`'s pattern): each attempt runs as its own
  transaction, so a colliding attempt rolls back whole and a
  collision can never abort - or half-complete - a deletion. If
  every attempt collides, execution returns
  `{:error, :receipt_reference_exhausted}` and NO deletion writes
  have committed: the account and its data stand untouched.
  """

  import Ecto.Query

  alias OpalCore.Accounts.DeletionReceipt
  alias OpalCore.Accounts.User
  alias OpalCore.Invites.Invite
  alias OpalCore.Invites.InviteRedemption
  alias OpalCore.Invites.PersonalCode
  alias OpalCore.OpalConversations.OpalConversation
  alias OpalCore.OpalConversations.OpalMessage
  alias OpalCore.Relationships.RelationshipType
  alias OpalCore.Repo
  alias OpalCore.Settings.SavedLogin
  alias OpalCore.SocialFlow.AssistancePreference
  alias OpalCore.SocialFlow.DeviceSession
  alias OpalCore.SocialFlow.PlanParticipant
  alias OpalCore.SocialFlow.RealWorld.ProviderConnection
  alias OpalCore.SocialFlow.SharedMemory
  alias OpalCore.SocialMemory.PersonMemory

  @modes ~w(data account)

  # Bounded receipt-reference generation attempts (mirrors
  # OpalCore.Support's @max_attempts for its OPAL- references).
  @max_reference_attempts 5

  def modes, do: @modes

  @doc """
  Execute a deletion for `user_id`. `source` is "self_serve" or
  "support" - recorded on the receipt, never a semantic difference.
  """
  def execute(user_id, mode, source \\ "self_serve")

  def execute(user_id, mode, source)
      when is_binary(user_id) and mode in @modes and source in ~w(self_serve support) do
    case Repo.get(User, user_id) do
      nil -> {:error, :user_not_found}
      %User{deleted_at: deleted_at} when not is_nil(deleted_at) -> {:error, :already_deleted}
      %User{} = user -> do_execute(user, mode, source)
    end
  end

  def execute(_, _, _), do: {:error, :invalid}

  defp do_execute(%User{} = user, mode, source) do
    attempt_execute(user, mode, source, @max_reference_attempts)
  end

  # One full deletion attempt per generated receipt reference. A
  # reference collision rolls the attempt's transaction back whole
  # (no half-deleted state) and the next attempt runs the deletion
  # fresh under a regenerated reference. Exhaustion is the named
  # error, returned before any attempt has committed.
  defp attempt_execute(%User{} = user, mode, source, attempts_left) do
    case run_deletion_transaction(user, mode, source) do
      {:ok, receipt} ->
        {:ok, receipt}

      {:error, :receipt_reference_conflict} ->
        if attempts_left > 1 do
          attempt_execute(user, mode, source, attempts_left - 1)
        else
          {:error, :receipt_reference_exhausted}
        end

      {:error, reason} ->
        {:error, reason}
    end
  end

  defp run_deletion_transaction(%User{} = user, mode, source) do
    user_id = user.id

    Repo.transaction(fn ->
      summary = %{}
      summary = Map.put(summary, "memories_removed", delete_owned_memory(user_id))
      summary = Map.put(summary, "soul_removed", delete_soul(user_id))
      summary = Map.put(summary, "opal_chats_removed", delete_opal_chats(user_id))
      summary = Map.put(summary, "saved_logins_removed", delete_all(SavedLogin, user_id))
      summary = Map.put(summary, "connections_removed", delete_all(ProviderConnection, user_id))

      # The SURPASS count: shared truth that STANDS, anonymized in place.
      summary =
        Map.put(summary, "shared_plans_kept_anonymized", count_shared_plans(user_id))

      summary =
        Map.put(summary, "shared_memories_kept_anonymized", count_shared_memories(user_id))

      summary =
        if mode == "account" do
          summary
          |> Map.put("sessions_revoked", revoke_all_sessions(user_id))
          |> Map.put("invites_removed", delete_account_linking(user_id))
          |> Map.put("account_anonymized", anonymize!(user))
        else
          summary
        end

      # Repo.insert/1 (not insert!/1) under the changeset's named
      # reference unique_constraint: a collision is a rollback of
      # THIS attempt only, retried by attempt_execute/4 above -
      # never a raise that aborts the deletion outright.
      case %DeletionReceipt{user_id: user_id, reference: new_reference()}
           |> DeletionReceipt.changeset(%{mode: mode, source: source, summary: summary})
           |> Repo.insert() do
        {:ok, receipt} -> receipt
        {:error, changeset} -> Repo.rollback(receipt_insert_failure(changeset))
      end
    end)
    |> case do
      {:ok, receipt} -> {:ok, receipt}
      {:error, reason} -> {:error, reason}
    end
  end

  # --- private stores ------------------------------------------------

  defp delete_owned_memory(user_id) do
    # RelationshipMemory erasure routes through its declared owner
    # (MP-6): DurablePreferenceMemory.erase_all_for_owner/1.
    memories = OpalCore.SocialFlow.DurablePreferenceMemory.erase_all_for_owner(user_id)

    {person_memories, _} =
      Repo.delete_all(from(m in PersonMemory, where: m.account_id == ^user_id))

    memories + person_memories
  end

  defp delete_soul(user_id) do
    {n, _} = Repo.delete_all(from(p in AssistancePreference, where: p.user_id == ^user_id))
    n
  end

  defp delete_opal_chats(user_id) do
    conversation_ids =
      Repo.all(from(c in OpalConversation, where: c.user_id == ^user_id, select: c.id))

    if conversation_ids != [] do
      Repo.delete_all(from(m in OpalMessage, where: m.conversation_id in ^conversation_ids))
    end

    {n, _} =
      Repo.delete_all(from(c in OpalConversation, where: c.user_id == ^user_id))

    n
  end

  defp delete_all(schema, user_id) do
    {n, _} = Repo.delete_all(from(r in schema, where: r.user_id == ^user_id))
    n
  end

  # --- shared truth: counted, never deleted --------------------------

  defp count_shared_plans(user_id) do
    PlanParticipant
    |> where([p], p.user_id == ^user_id)
    |> Repo.aggregate(:count, :id)
  end

  defp count_shared_memories(user_id) do
    # participant_ids is an array column; count rows whose array holds
    # this user without deleting or rewriting the shared record.
    SharedMemory
    |> where([m], ^user_id in m.participant_ids)
    |> Repo.aggregate(:count, :id)
  end

  # --- account mode ----------------------------------------------------

  defp revoke_all_sessions(user_id) do
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    {n, _} =
      Repo.update_all(
        from(s in DeviceSession, where: s.user_id == ^user_id and s.status == "active"),
        set: [status: "revoked", revoked_at: now, revoked_by_user_id: user_id]
      )

    n
  end

  defp delete_account_linking(user_id) do
    {own_relationships, _} =
      Repo.delete_all(from(r in RelationshipType, where: r.user_id == ^user_id))

    {invites, _} = Repo.delete_all(from(i in Invite, where: i.inviter_id == ^user_id))

    {redemptions, _} =
      Repo.delete_all(
        from(r in InviteRedemption,
          where: r.inviter_user_id == ^user_id or r.redeemer_user_id == ^user_id
        )
      )

    {codes, _} = Repo.delete_all(from(c in PersonalCode, where: c.user_id == ^user_id))

    own_relationships + invites + redemptions + codes
  end

  defp anonymize!(%User{} = user) do
    short = user.id |> String.slice(0, 8)

    user
    |> User.changeset(%{display_name: "Deleted member", handle: "deleted-#{short}"})
    |> Repo.update!()
    |> Ecto.Changeset.change(%{deleted_at: DateTime.utc_now() |> DateTime.truncate(:microsecond)})
    |> Repo.update!()

    true
  end

  # The rollback term for a failed receipt insert: a reference
  # unique-violation is the retryable collision; anything else is
  # the changeset itself, surfaced as the attempt's error.
  defp receipt_insert_failure(changeset) do
    if reference_conflict?(changeset),
      do: :receipt_reference_conflict,
      else: changeset
  end

  defp reference_conflict?(changeset) do
    Enum.any?(changeset.errors, fn
      {:reference, {_message, opts}} ->
        opts[:constraint] == :unique or
          to_string(opts[:constraint_name] || "") == "deletion_receipts_reference_index"

      _ ->
        false
    end)
  end

  defp new_reference do
    # Same override seam as OpalCore.Invites' :invite_code_random:
    # tests may substitute a generator to force a collision.
    fun =
      Application.get_env(:opal_core, :deletion_receipt_reference_fun, &default_new_reference/0)

    fun.()
  end

  defp default_new_reference do
    suffix = :crypto.strong_rand_bytes(5) |> Base.encode32(padding: false)
    "DEL-" <> suffix
  end
end
