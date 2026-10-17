defmodule OpalCore.PlanProjectionCoherenceTest do
  @moduledoc """
  Repair #13 (W6 gyroscope) — PROJECTION COHERENCE gate.

  The single-projection-store principle (R12 established it for plans):
  every read path that renders plan / proposal / revision state reads the
  single source of truth — the `shared_plans`, `social_flow_proposals`, and
  `plan_revisions` rows — never a per-surface shadow copy.

  Three enforcements:

  1. Read-path registry: the test scans every `lib/**/*.ex` file for real
     plan-table queries and FAILS if a file queries without being registered
     in `PlanProjection.read_files/0`. A new surface must register its
     reader (or remove it) before it ships.
  2. Read coherence: a plan is mutated through the transition gate, then
     read back through every primary read function — all must agree.
  3. Derived-projection invalidation: the SocialMemory recall cache (the one
     ETS cache that derives from plan state) is cleared by every committed
     plan mutation — proven, not assumed.
  """

  use ExUnit.Case, async: false

  alias OpalCore.SocialFlow.PlanProjection

  # --- 1. read-path registry ---------------------------------------------------

  describe "read-path registry: every plan-table reader is registered" do
    test "no unregistered file queries plan tables" do
      files = Path.wildcard("lib/**/*.ex")
      assert files != [], "expected to scan lib/**/*.ex from apps/opal_core"

      patterns = PlanProjection.scan_patterns()
      registered = MapSet.new(PlanProjection.read_files())

      unregistered =
        for file <- files,
            source = File.read!(file),
            Enum.any?(patterns, &Regex.match?(&1, source)),
            not MapSet.member?(registered, file) do
          file
        end

      assert unregistered == [],
             """
             Unregistered plan-table readers (gyroscope violation):

             #{Enum.map_join(unregistered, "\n", &"  - #{&1}")}

             Every read path that renders plan state must read the single
             source. Either register the file in
             OpalCore.SocialFlow.PlanProjection.read_files/0 (after auditing
             that it reads the single store) or remove the query.
             """
    end

    test "every registered file still exists" do
      for file <- PlanProjection.read_files() do
        assert File.exists?(file),
               "registered reader #{file} no longer exists — prune the registry"
      end
    end

    test "no ETS table caches plan state outside the sanctioned derived list" do
      # The only ETS caches in the domain are audited; plan ROWS must never
      # live in ETS. Scan for ets inserts of plan-shaped values.
      offenders =
        for file <- Path.wildcard("lib/**/*.ex"),
            source = File.read!(file),
            String.contains?(source, ":ets.insert"),
            Regex.match?(
              ~r/:ets\.insert.*(SharedPlan|shared_plan|%PlanRevision|PlanRevision)/,
              source
            ) do
          file
        end

      assert offenders == [],
             "plan state cached in ETS (shadow copy): #{inspect(offenders)}"
    end
  end
end

defmodule OpalCore.PlanProjectionReadCoherenceTest do
  @moduledoc """
  Read coherence: mutate through the gate, read through every primary read
  function — all surfaces must agree, because there is exactly one store.
  """

  use OpalCore.DataCase, async: false

  alias OpalCore.Accounts.User
  alias OpalCore.Messaging.{Conversation, ConversationMember}
  alias OpalCore.Repo
  alias OpalCore.SocialFlow
  alias OpalCore.SocialFlow.ConversationAlignment
  alias OpalCore.SocialFlow.JourneyAuthority
  alias OpalCore.SocialFlow.PlanProjection
  alias OpalCore.SocialFlow.SharedPlan
  alias OpalCore.SocialMemory.Cache

  defp mk_user(name) do
    %User{}
    |> User.changeset(%{
      id: Ecto.UUID.generate(),
      handle: "pc-#{Ecto.UUID.generate()}",
      display_name: name
    })
    |> Repo.insert!()
  end

  defp mk_conv(member_ids) do
    conv =
      %Conversation{}
      |> Conversation.changeset(%{id: Ecto.UUID.generate(), label: "pc-#{Ecto.UUID.generate()}"})
      |> Repo.insert!()

    for uid <- member_ids do
      %ConversationMember{}
      |> ConversationMember.changeset(%{conversation_id: conv.id, user_id: uid})
      |> Repo.insert!()
    end

    conv.id
  end

  defp read_all(conv_id, user_id, plan_id) do
    {:ok, sync} = SocialFlow.sync_for_user(conv_id, user_id)
    {:ok, listed} = SocialFlow.list_plans_for_user(user_id)
    {:ok, single} = SocialFlow.get_plan_for_user(plan_id, user_id)

    %{
      sync: Enum.find(sync["plans"], &(&1["id"] == plan_id)),
      list: Enum.find(listed, &(&1["id"] == plan_id)),
      single: SharedPlan.to_contract(single),
      active:
        ConversationAlignment.active_plan_for_conversation(conv_id) |> then(fn p -> p && p.id end)
    }
  end

  test "all primary read functions agree before and after gate mutations" do
    a = mk_user("Iris")
    b = mk_user("Jack")
    conv = mk_conv([a.id, b.id])

    {:ok, plan, _} =
      SocialFlow.create_tentative_plan_from_conversation(conv, a.id, %{
        "title" => "Dinner",
        "place" => "Juniper & Ivy",
        "time_label" => "Sat 7:30 PM"
      })

    before = read_all(conv, a.id, plan.id)
    assert before.sync["status"] == "tentative"
    assert before.list["status"] == "tentative"
    assert before.single["status"] == "tentative"
    assert before.active == plan.id

    # Mutate through the gate: lead schedule change.
    assert {:ok, _} =
             SocialFlow.change_plan_time(%{
               plan_id: plan.id,
               user_id: a.id,
               new_time_label: "Sat 8:00 PM",
               trace_id: "pc"
             })

    during = read_all(conv, a.id, plan.id)
    assert during.sync["time_label"] =~ "8:00"
    assert during.list["time_label"] =~ "8:00"
    assert during.single["time_label"] =~ "8:00"

    # Mutate through the gate: cancel.
    assert {:ok, _} = SocialFlow.cancel_plan(%{plan_id: plan.id, user_id: a.id, trace_id: "pc"})

    # Cancelled plans leave the default list, but the single store still
    # reports "cancelled" everywhere it reports the plan at all.
    assert {:ok, all} = SocialFlow.list_plans_for_user(a.id, status: :all)
    assert Enum.find(all, &(&1["id"] == plan.id))["status"] == "cancelled"

    {:ok, single} = SocialFlow.get_plan_for_user(plan.id, a.id)
    assert single.status == "cancelled"
    assert SharedPlan.to_contract(single)["status"] == "cancelled"
  end

  test "derived projection: the recall cache is invalidated by plan mutations" do
    a = mk_user("Karen")
    b = mk_user("Leo")
    conv = mk_conv([a.id, b.id])

    {:ok, plan, _} =
      SocialFlow.create_tentative_plan_from_conversation(conv, a.id, %{
        "title" => "Dinner",
        "place" => "Juniper & Ivy",
        "time_label" => "Sat 7:30 PM"
      })

    # Seed the cache for both members, as recall_for_conversation would.
    :ok = Cache.put(a.id, conv, %{"stale_marker" => true})
    :ok = Cache.put(b.id, conv, %{"stale_marker" => true})
    assert {:ok, _} = Cache.get(a.id, conv)

    # A committed plan mutation clears it for every member — the next recall
    # recomputes from the single store instead of serving pre-mutation facts.
    assert {:ok, _} =
             SocialFlow.change_plan_time(%{
               plan_id: plan.id,
               user_id: a.id,
               new_time_label: "Sat 8:00 PM",
               trace_id: "pc"
             })

    assert :miss = Cache.get(a.id, conv)
    assert :miss = Cache.get(b.id, conv)

    # Cancel invalidates too.
    :ok = Cache.put(a.id, conv, %{"stale_marker" => true})
    assert {:ok, _} = SocialFlow.cancel_plan(%{plan_id: plan.id, user_id: a.id, trace_id: "pc"})
    assert :miss = Cache.get(a.id, conv)

    # And a refused mutation (change on a cancelled plan) commits nothing —
    # the gate's refusal is itself the coherence guarantee.
    assert {:error, :invalid_status} =
             SocialFlow.change_plan_date(%{
               plan_id: plan.id,
               user_id: a.id,
               new_date_label: "Sunday",
               trace_id: "pc"
             })
  end

  test "derived projection: journey-track mutations invalidate the recall cache too" do
    a = mk_user("Mona")
    b = mk_user("Nate")
    conv = mk_conv([a.id, b.id])

    {:ok, plan, _} =
      SocialFlow.create_tentative_plan_from_conversation(conv, a.id, %{
        "title" => "Dinner",
        "place" => "Juniper & Ivy",
        "time_label" => "Sat 7:30 PM"
      })

    :ok = Cache.put(a.id, conv, %{"stale_marker" => true})
    :ok = Cache.put(b.id, conv, %{"stale_marker" => true})
    assert {:ok, _} = Cache.get(a.id, conv)

    # The journey track never broadcasts — its committed mutations clear
    # derived projections through the same invalidate_derived/2 choke point.
    assert {:ok, %{"material" => true}} =
             JourneyAuthority.material_change(plan.id, a.id, %{"time_label" => "Sat 9:00 PM"})

    assert :miss = Cache.get(a.id, conv)
    assert :miss = Cache.get(b.id, conv)
    assert db_plan(plan.id).time_label =~ "9:00"
  end

  defp db_plan(id), do: Repo.get!(SharedPlan, id)

  test "PlanProjection.read_functions/0 documents real, callable readers" do
    for {mod, fun, arity, _note} <- PlanProjection.read_functions() do
      # function_exported?/3 does not load the module — ensure it first.
      assert {:module, ^mod} = Code.ensure_loaded(mod),
             "registered reader module #{inspect(mod)} could not be loaded"

      assert function_exported?(mod, fun, arity),
             "registered reader #{inspect(mod)}.#{fun}/#{arity} is not exported"
    end
  end
end
