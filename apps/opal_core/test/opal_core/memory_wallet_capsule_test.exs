defmodule OpalCore.MemoryWalletCapsuleTest do
  @moduledoc """
  Repair #18 SM scoped build - unit proofs for W-GAP-01 (wallet
  record), W-GAP-02 first form (capsule as one object), GYRO-01
  kernel / W-GAP-05 first form (the mediated read facade), and the
  soul over the real assistance-preference truth (W-GAP-31 leg).
  The cross-account suite lives in the W-GAP-32 file.
  """
  use OpalCore.DataCase, async: true

  alias OpalCore.Accounts.User
  alias OpalCore.MemoryWallet
  alias OpalCore.MemoryWallet.{CapsuleRead, MemoryCapsule, PersonalMemoryCapsule, Soul}
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.{DurablePreferenceMemory, FollowThrough, PlanProjection}

  defp owner, do: Ecto.UUID.generate()

  # Durable fragments carry a real FK to users, so fragment tests
  # need a real account row.
  defp real_owner do
    {:ok, user} =
      %User{}
      |> User.changeset(%{
        handle: "sm_#{System.unique_integer([:positive])}",
        display_name: "SM Owner"
      })
      |> Repo.insert()

    user.id
  end

  describe "W-GAP-01 wallet record" do
    test "one wallet per account - ensure is idempotent and per-account" do
      a = owner()
      b = owner()

      assert {:ok, w1} = MemoryWallet.ensure_wallet(a)
      assert {:ok, w2} = MemoryWallet.ensure_wallet(a)
      assert w1.id == w2.id
      assert MemoryWallet.wallet_for(a).id == w1.id

      assert {:ok, wb} = MemoryWallet.ensure_wallet(b)
      assert wb.id != w1.id
      assert MemoryWallet.wallet_for(b).owner_user_id == b
    end
  end

  describe "W-GAP-02 capsule as one object" do
    test "a new capsule carries payload + provenance + all scope dimensions as data" do
      a = owner()
      assert {:ok, capsule} = CapsuleRead.remember(a, %{"summary" => "Loves quiet bakeries"})

      assert capsule.payload["summary"] == "Loves quiet bakeries"
      assert capsule.provenance["source_kind"] == "told_opal"
      assert capsule.provenance["source_label"] == "You told Opal"

      for dim <- PersonalMemoryCapsule.scope_dimensions() do
        assert Map.has_key?(capsule.scope_policy, dim), "missing scope dimension #{dim}"
      end

      assert capsule.scope_policy["scope"] == %{"kind" => "user", "id" => nil}
      assert capsule.scope_policy["consent"] == "owner_private"

      contract = PersonalMemoryCapsule.to_contract(capsule)
      assert contract["summary"] == "Loves quiet bakeries"
      assert contract["provenance_label"] == "You told Opal"
      assert contract["because"] == "Because you told Opal: Loves quiet bakeries"
      # The capsule belongs to the account's ONE wallet.
      assert capsule.wallet_id == MemoryWallet.wallet_for(a).id
    end

    test "existing durable fragments read THROUGH the facade, rows untouched" do
      a = real_owner()

      assert {:ok, fragment, :created} =
               DurablePreferenceMemory.remember_explicit(%{
                 "owner_user_id" => a,
                 "preference" => "quiet restaurants"
               })

      capsules = CapsuleRead.list_for_owner_browse(a)
      assert [capsule] = Enum.filter(capsules, &(&1.source == :durable_preference))
      assert capsule.id == fragment.id
      assert PersonalMemoryCapsule.summary(capsule) == "quiet restaurants"
      assert capsule.provenance["source_kind"] == "durable_preference_memory"
      # No data rewrite: the fragment row is exactly as it was.
      assert Repo.get!(OpalCore.SocialFlow.RelationshipMemory, fragment.id).deletion_state ==
               "active"
    end
  end

  describe "GYRO-01 / W-GAP-05 mediated read - scope, purpose, expiry" do
    test "a relationship-scoped capsule is admissible only in its exact context" do
      a = owner()
      person = Ecto.UUID.generate()

      assert {:ok, _} =
               CapsuleRead.remember(a, %{
                 "summary" => "Maya prefers mornings",
                 "scope_kind" => "relationship",
                 "scope_id" => person,
                 "counterpart_user_id" => person
               })

      assert CapsuleRead.list_for_owner(a) == []

      assert CapsuleRead.list_for_owner(a,
               scope_kind: "relationship",
               scope_id: Ecto.UUID.generate()
             ) == []

      assert [%{id: _}] =
               CapsuleRead.list_for_owner(a, scope_kind: "relationship", scope_id: person)

      # The owner browsing their own wallet still sees it.
      assert length(CapsuleRead.list_for_owner_browse(a)) == 1
    end

    test "purpose is enforced when a read names one" do
      a = owner()

      assert {:ok, _} =
               CapsuleRead.remember(a, %{
                 "summary" => "For planning only",
                 "purpose" => "planning"
               })

      assert length(CapsuleRead.list_for_owner(a, purpose: "planning")) == 1
      assert CapsuleRead.list_for_owner(a, purpose: "celebrations") == []
    end

    test "an expired capsule is never admissible, to anyone" do
      a = owner()
      past = DateTime.utc_now() |> DateTime.add(-3600, :second) |> DateTime.truncate(:microsecond)

      assert {:ok, _} =
               CapsuleRead.remember(a, %{"summary" => "Already over", "expires_at" => past})

      assert CapsuleRead.list_for_owner(a) == []
      assert CapsuleRead.list_for_owner_browse(a) == []
    end

    test "an UNRECOGNIZED scope fails closed for this class" do
      a = owner()
      {:ok, wallet} = MemoryWallet.ensure_wallet(a)

      policy =
        PersonalMemoryCapsule.scope_policy(%{
          scope_kind: "martian_scope",
          purpose: "personal_memory"
        })

      {:ok, _row} =
        %MemoryCapsule{}
        |> MemoryCapsule.changeset(%{
          wallet_id: wallet.id,
          owner_user_id: a,
          payload: %{"summary" => "Scoped to nowhere recognized", "kind" => "personal_memory"},
          provenance: %{"source_kind" => "told_opal", "source_label" => "You told Opal"},
          scope_policy: policy,
          scope_kind: "martian_scope",
          purpose: "personal_memory",
          status: "active"
        })
        |> Repo.insert()

      # Not admissible in a plain read, not in a matching-kind
      # request (the request itself is unrecognized), not in any
      # scoped assembly.
      assert CapsuleRead.list_for_owner(a) == []
      assert CapsuleRead.list_for_owner(a, scope_kind: "martian_scope", scope_id: nil) == []
      assert OpalCore.MemoryWallet.ScopedContext.assemble(a).capsule_count == 0
      # The owner can still SEE it in their own browse - and forget
      # it. Visibility to the owner is not admissibility.
      assert length(CapsuleRead.list_for_owner_browse(a)) == 1
    end
  end

  describe "forget truly deletes (SM-TRU-01 for this class)" do
    test "a capsule-table capsule is hard-deleted, not soft-marked" do
      a = owner()
      assert {:ok, capsule} = CapsuleRead.remember(a, %{"summary" => "Forget me"})
      assert {:ok, :forgotten, :capsule} = CapsuleRead.forget(a, capsule.id)
      assert is_nil(Repo.get(MemoryCapsule, capsule.id))
      assert CapsuleRead.list_for_owner_browse(a) == []
    end

    test "a durable fragment is erased through the owner's durable path - row gone" do
      a = real_owner()

      assert {:ok, fragment, :created} =
               DurablePreferenceMemory.remember_explicit(%{
                 "owner_user_id" => a,
                 "preference" => "quiet restaurants"
               })

      assert {:ok, :forgotten, :durable_preference} = CapsuleRead.forget(a, fragment.id)
      assert is_nil(Repo.get(OpalCore.SocialFlow.RelationshipMemory, fragment.id))
    end

    test "a foreign forget deletes nothing" do
      a = owner()
      b = owner()
      assert {:ok, capsule} = CapsuleRead.remember(a, %{"summary" => "Not yours"})
      assert {:error, :not_found} = CapsuleRead.forget(b, capsule.id)
      assert Repo.get(MemoryCapsule, capsule.id)
    end
  end

  describe "gyroscope registration" do
    test "the facade is registered in the PlanProjection-pattern audit" do
      functions = PlanProjection.capsule_read_functions()

      assert {CapsuleRead, :list_for_owner, 2, _} =
               Enum.find(functions, &match?({CapsuleRead, :list_for_owner, 2, _}, &1))

      assert "lib/opal_core/memory_wallet/capsule_read.ex" in PlanProjection.capsule_read_files()
    end

    test "no unmediated capsule read path exists - source scan" do
      patterns = [
        ~r/in MemoryCapsule\b/,
        ~r/Repo\.(get|get_by|all|one|delete)\(\s*MemoryCapsule\b/,
        ~r/%MemoryCapsule\{\}/
      ]

      registered = MapSet.new(PlanProjection.capsule_read_files())

      offenders =
        for file <- Path.wildcard("lib/**/*.ex"),
            file != "lib/opal_core/memory_wallet/memory_capsule.ex",
            src = File.read!(file),
            Enum.any?(patterns, &Regex.match?(&1, src)),
            not MapSet.member?(registered, file) do
          file
        end

      assert offenders == [],
             "unregistered direct capsule readers: #{inspect(offenders)} - route through CapsuleRead"
    end
  end

  describe "soul over the real assistance-preference truth" do
    test "soul edits change the existing store and read back from it - no parallel store" do
      {:ok, user} =
        %User{}
        |> User.changeset(%{
          handle: "soul_#{System.unique_integer([:positive])}",
          display_name: "Soul"
        })
        |> Repo.insert()

      assert {:ok, soul} = Soul.soul_for(user.id)
      assert soul["assistance_level"] == "balanced"

      assert {:ok, edited} =
               Soul.update_soul(user.id, %{
                 "assistance_level" => "proactive",
                 "quiet_hours_start" => "21:30"
               })

      assert edited["assistance_level"] == "proactive"
      assert edited["quiet_hours_start"] == "21:30"

      # Read-back through the pre-existing preference path itself:
      # the very record FollowThrough / AttentionBudget consume.
      assert {:ok, pref} = FollowThrough.get_or_create_preferences(user.id)
      assert pref.assistance_level == "proactive"
      assert pref.quiet_hours_start == "21:30"
      assert {:ok, reread} = Soul.soul_for(user.id)
      assert reread["assistance_level"] == "proactive"
    end
  end
end
