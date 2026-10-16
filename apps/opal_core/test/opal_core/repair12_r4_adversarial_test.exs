defmodule OpalCore.SocialFlow.Repair12R4AdversarialTest do
  @moduledoc """
  Repair #12 — R4 (test/verify/evidence): ADVERSARIAL / SINISTER SUITE.

  Malformed inputs, double-submit races, concurrent conflicting edits from two
  accounts, stale revision confirms, expired proposals, permission-denied
  location, cancel-then-confirm ordering, expired change proposals.

  Every case asserts the system stays honest: no crash, no silent mutation,
  no fake success. Failures here are fixed, never weakened.
  """

  use OpalCore.DataCase, async: false

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Center.DeviceLocation
  alias OpalCore.Center.PlanContextPatch
  alias OpalCore.Center.PlanningContext
  alias OpalCore.Fixtures
  alias OpalCore.FixturesHelper
  alias OpalCore.Repo
  alias OpalCore.SocialFlow
  alias OpalCore.SocialFlow.PlanParticipant
  alias OpalCore.SocialFlow.PlanRevision
  alias OpalCore.SocialFlow.SharedPlan

  setup do
    FixturesHelper.seed!()
    :ok
  end

  defp alex, do: Fixtures.user_alex_id()
  defp jordan, do: Fixtures.user_jordan_id()
  defp taylor, do: Fixtures.user_taylor_id()
  defp conv, do: Fixtures.conv_alex_jordan_id()

  defp make_plan(user_id \\ nil, attrs \\ %{}, conv_id \\ nil) do
    user_id = user_id || alex()
    conv_id = conv_id || conv()

    {:ok, plan, _} =
      SocialFlow.create_tentative_plan_from_conversation(
        conv_id,
        user_id,
        Map.merge(
          %{
            "title" => "Dinner with Jordan",
            "place" => "Juniper & Ivy",
            "time_label" => "Sat 7:30 PM"
          },
          attrs
        )
      )

    plan
  end

  defp mk_conv(member_ids) do
    alias OpalCore.Messaging.{Conversation, ConversationMember}

    conv =
      %Conversation{}
      |> Conversation.changeset(%{id: Ecto.UUID.generate(), label: "adv-#{Ecto.UUID.generate()}"})
      |> Repo.insert!()

    for uid <- member_ids do
      %ConversationMember{}
      |> ConversationMember.changeset(%{conversation_id: conv.id, user_id: uid})
      |> Repo.insert!()
    end

    conv.id
  end

  # --- malformed inputs -----------------------------------------------------

  describe "malformed inputs stay honest (no crash, no mutation, no fake success)" do
    test "empty / whitespace / nil-ish NL change inputs" do
      plan = make_plan()

      for text <- ["", "   ", "\n\t ", "…", "???", "!!!!!!"] do
        assert {:error, _} =
                 SocialFlow.apply_nl_schedule_change(%{
                   conversation_id: conv(),
                   user_id: alex(),
                   text: text
                 }),
               "expected honest error for #{inspect(text)}"
      end

      assert Repo.get!(SharedPlan, plan.id).time_label == "Sat 7:30 PM"
      assert Repo.get_by(PlanRevision, plan_id: plan.id) == nil
    end

    test "SQL-ish and hostile label text never mutates the plan" do
      plan = make_plan()

      for text <- [
            "'; DROP TABLE shared_plans; --",
            "<script>alert(1)</script> 8 PM",
            "../../etc/passwd",
            "8 PM; rm -rf /"
          ] do
        result =
          SocialFlow.apply_nl_schedule_change(%{
            conversation_id: conv(),
            user_id: alex(),
            text: text
          })

        case result do
          {:ok, %{plan: updated}} ->
            # If it parsed a time, the stored label is plain text, never markup.
            refute updated.time_label =~ "<script>"

          {:error, _} ->
            :ok
        end
      end

      # The plans table still exists and the plan is intact.
      assert %SharedPlan{} = Repo.get!(SharedPlan, plan.id)
    end

    test "emoji-only and emoji-mixed change requests" do
      plan = make_plan()

      for text <- ["🍕🍕🍕", "move it to 🕗", "8️⃣ PM"] do
        result =
          SocialFlow.apply_nl_schedule_change(%{
            conversation_id: conv(),
            user_id: alex(),
            text: text
          })

        assert match?({:ok, _}, result) or match?({:error, _}, result)
      end

      assert %SharedPlan{} = Repo.get!(SharedPlan, plan.id)
    end

    test "garbage venue extraction never invents a venue" do
      assert PlanContextPatch.extract_exact_venue("") == nil
      assert PlanContextPatch.extract_exact_venue("find somewhere in Coronado") == nil
      assert PlanContextPatch.extract_exact_venue("!!!!") == nil
      assert PlanContextPatch.extract_venue_question("") == nil
      assert PlanContextPatch.extract_venue_question("where is dinner") == nil
      assert PlanContextPatch.venue_lookup_copy("", "Coronado") == nil
      assert PlanContextPatch.venue_lookup_copy(nil, nil) == nil
    end

    test "non-map / wrong-type args are :invalid, never exceptions" do
      assert {:error, :invalid} = SocialFlow.apply_nl_schedule_change(nil)
      assert {:error, :invalid} = SocialFlow.apply_nl_schedule_change(%{user_id: 123})
      assert {:error, :invalid} = SocialFlow.cancel_plan(%{plan_id: nil, user_id: alex(), trace_id: "x"})
      assert DeviceLocation.validate_coords("nope") == {:error, :invalid_coords}
      assert DeviceLocation.get_for_user(nil) == :none
      assert DeviceLocation.origin_source_for(nil) == nil
    end
  end

  # --- races -----------------------------------------------------------------

  describe "double-submit and concurrent-edit races" do
    test "double NL change submits: both apply serially, final state is one of them, no crash" do
      plan = make_plan()

      t1 =
        Task.async(fn ->
          SocialFlow.apply_nl_schedule_change(%{
            conversation_id: conv(),
            user_id: alex(),
            text: "let's do 8:00 PM"
          })
        end)

      t2 =
        Task.async(fn ->
          SocialFlow.apply_nl_schedule_change(%{
            conversation_id: conv(),
            user_id: alex(),
            text: "let's do 9:00 PM"
          })
        end)

      r1 = Task.await(t1, 15_000)
      r2 = Task.await(t2, 15_000)

      assert match?({:ok, _}, r1)
      assert match?({:ok, _}, r2)

      # One row, one time_label — no duplication, no torn state. The NL path
      # stores the parsed summary verbatim (R1 contract: time_label =~ "8:00 PM").
      db = Repo.get!(SharedPlan, plan.id)
      assert db.time_label in ["8:00 PM", "9:00 PM"]

      revs = from(r in PlanRevision, where: r.plan_id == ^plan.id) |> Repo.all()
      assert length(revs) == 2
      assert Enum.all?(revs, &(&1.status == "accepted"))
    end

    test "concurrent conflicting direct edits: FOR UPDATE serializes, both recorded" do
      plan = make_plan()

      tasks =
        for {label, n} <- [{"Sat 8:00 PM", 1}, {"Sat 9:00 PM", 2}] do
          Task.async(fn ->
            SocialFlow.change_plan_time(%{
              plan_id: plan.id,
              user_id: alex(),
              new_time_label: label,
              trace_id: "race-#{n}"
            })
          end)
        end

      results = Task.await_many(tasks, 15_000)
      assert Enum.all?(results, &match?({:ok, _}, &1))

      db = Repo.get!(SharedPlan, plan.id)
      assert db.time_label in ["Sat 8:00 PM", "Sat 9:00 PM"]

      # Both edits left audit rows; the revision chain is append-only.
      assert from(r in PlanRevision, where: r.plan_id == ^plan.id) |> Repo.aggregate(:count) == 2
    end

    test "double-accept of the same proposal: second is :already_decided" do
      group = Fixtures.conv_group_friends_id()

      {:ok, plan, _} =
        SocialFlow.create_tentative_plan_from_conversation(group, alex(), %{
          "title" => "Group dinner",
          "place" => "Juniper & Ivy",
          "time_label" => "Sat 7:30 PM"
        })

      {:ok, %{revision: _rev}} =
        SocialFlow.propose_revision(%{
          plan_id: plan.id,
          proposed_by_user_id: jordan(),
          changes: %{"time_label" => "Sat 8:00 PM"},
          trace_id: "dbl"
        })

      # First accept by alex: partial (maya/chris still pending), stays proposed.
      assert {:ok, _} =
               SocialFlow.confirm_pending_revision(%{
                 conversation_id: group,
                 user_id: alex(),
                 decision: "accept",
                 trace_id: "dbl"
               })

      assert Repo.get!(SharedPlan, plan.id).time_label == "Sat 7:30 PM"

      # Second accept by the same user is refused honestly — never double-counted.
      assert {:error, :already_decided} =
               SocialFlow.confirm_pending_revision(%{
                 conversation_id: group,
                 user_id: alex(),
                 decision: "accept",
                 trace_id: "dbl"
               })

      # The proposal is still live for the other members, plan untouched.
      assert Repo.get_by!(PlanRevision, plan_id: plan.id).status == "proposed"
      assert Repo.get!(SharedPlan, plan.id).time_label == "Sat 7:30 PM"
    end
  end

  # --- stale / expired -------------------------------------------------------

  describe "stale and expired artifacts are refused honestly" do
    test "stale plan_id (days old) is not actionable (F12-13/53)" do
      stale =
        PlanningContext.plan_id_active?(%{
          "plan_id" => Ecto.UUID.generate(),
          "plan_id_set_at" =>
            DateTime.utc_now() |> DateTime.add(-3 * 24 * 3600, :second) |> DateTime.to_iso8601()
        })

      refute stale
    end

    test "cancelled plan's plan_id is not actionable (F12-53)" do
      plan = make_plan()
      {:ok, _} = SocialFlow.cancel_plan(%{plan_id: plan.id, user_id: alex(), trace_id: "exp"})

      active = %{
        "plan_id" => plan.id,
        "plan_id_set_at" => DateTime.utc_now() |> DateTime.to_iso8601()
      }

      refute PlanningContext.plan_id_active?(active)
    end

    test "expired change_proposal is retired to history, live slot cleared (F12-58)" do
      alias OpalCore.SocialFlow.ConversationAlignment

      stale_iso =
        DateTime.utc_now()
        |> DateTime.add(-25 * 3600, :second)
        |> DateTime.truncate(:second)
        |> DateTime.to_iso8601()

      state = %{
        "change_proposal" => %{
          "field" => "datetime",
          "value" => "Sat 8:00 PM",
          "expires_at" => stale_iso
        },
        "proposal_history" => []
      }

      retired = ConversationAlignment.expire_stale_change_proposal(state)

      # Live slot is gone; the proposal is retired with status "expired".
      refute Map.has_key?(retired, "change_proposal")
      assert [%{"status" => "expired", "field" => "datetime"}] = retired["proposal_history"]

      # A fresh proposal is untouched.
      fresh_iso =
        DateTime.utc_now()
        |> DateTime.add(3600, :second)
        |> DateTime.truncate(:second)
        |> DateTime.to_iso8601()

      fresh_state = %{"change_proposal" => %{"field" => "datetime", "expires_at" => fresh_iso}}
      assert ConversationAlignment.expire_stale_change_proposal(fresh_state) == fresh_state

      # No proposal at all: no-op.
      assert ConversationAlignment.expire_stale_change_proposal(%{}) == %{}
    end

    test "cancel-then-confirm ordering: confirm after cancel is refused" do
      plan = make_plan()

      {:ok, %{revision: rev}} =
        SocialFlow.propose_revision(%{
          plan_id: plan.id,
          proposed_by_user_id: jordan(),
          changes: %{"time_label" => "Sat 8:00 PM"},
          trace_id: "ord"
        })

      {:ok, _} = SocialFlow.cancel_plan(%{plan_id: plan.id, user_id: alex(), trace_id: "ord"})

      # Confirming a proposal on a cancelled plan must not resurrect it.
      result =
        SocialFlow.respond_to_revision(%{
          revision_id: rev.id,
          user_id: alex(),
          decision: "accept",
          trace_id: "ord"
        })

      assert match?({:error, _}, result)
      assert Repo.get!(SharedPlan, plan.id).status == "cancelled"
      assert Repo.get!(SharedPlan, plan.id).time_label == "Sat 7:30 PM"
    end
  end

  # --- permission / session edges -------------------------------------------

  describe "permission and session edges" do
    test "non-member cannot change, propose, confirm, or cancel" do
      plan = make_plan()

      for op <- [
            {:change,
             fn ->
               SocialFlow.change_plan_time(%{
                 plan_id: plan.id,
                 user_id: taylor(),
                 new_time_label: "Sat 8:00 PM",
                 trace_id: "perm"
               })
             end},
            {:nl_change,
             fn ->
               SocialFlow.apply_nl_schedule_change(%{
                 conversation_id: conv(),
                 user_id: taylor(),
                 text: "let's do 8:00 PM"
               })
             end},
            {:confirm,
             fn ->
               SocialFlow.confirm_pending_revision(%{
                 conversation_id: conv(),
                 user_id: taylor(),
                 decision: "accept",
                 trace_id: "perm"
               })
             end},
            {:cancel,
             fn ->
               SocialFlow.cancel_plan(%{plan_id: plan.id, user_id: taylor(), trace_id: "perm"})
             end}
          ] do
        {name, fun} = op
        assert match?({:error, _}, fun.()), "expected refusal for #{name}"
      end

      assert Repo.get!(SharedPlan, plan.id).time_label == "Sat 7:30 PM"
      assert Repo.get!(SharedPlan, plan.id).status != "cancelled"
    end

    test "unknown plan_id is :not_found, never a crash" do
      assert {:error, _} =
               SocialFlow.change_plan_time(%{
                 plan_id: Ecto.UUID.generate(),
                 user_id: alex(),
                 new_time_label: "Sat 8:00 PM",
                 trace_id: "nf"
               })

      assert {:error, _} =
               SocialFlow.cancel_plan(%{
                 plan_id: Ecto.UUID.generate(),
                 user_id: alex(),
                 trace_id: "nf"
               })
    end

    test "change on a cancelled plan is refused (no resurrection)" do
      plan = make_plan()
      {:ok, _} = SocialFlow.cancel_plan(%{plan_id: plan.id, user_id: alex(), trace_id: "rz"})

      assert {:error, _} =
               SocialFlow.change_plan_time(%{
                 plan_id: plan.id,
                 user_id: alex(),
                 new_time_label: "Sat 8:00 PM",
                 trace_id: "rz"
               })

      assert Repo.get!(SharedPlan, plan.id).status == "cancelled"
    end

    test "list_plans_for_user never leaks another user's plans" do
      taylor_conv = mk_conv([taylor()])
      _other = make_plan(taylor(), %{"title" => "Taylor secret plan"}, taylor_conv)
      mine = make_plan(alex(), %{"title" => "Alex plan"})

      assert {:ok, plans} = SocialFlow.list_plans_for_user(alex())
      ids = Enum.map(plans, & &1["id"])
      assert mine.id in ids

      assert {:ok, taylor_plans} = SocialFlow.list_plans_for_user(taylor())
      taylor_ids = Enum.map(taylor_plans, & &1["id"])
      refute mine.id in taylor_ids
    end
  end

  # --- location pipeline adversarial -----------------------------------------

  describe "location pipeline adversarial (F12-11)" do
    test "out-of-range / wrong-type / nil coords rejected; travel 422 untouched" do
      for bad <- [
            %{"lat" => 91.0, "lon" => 0.0},
            %{"lat" => -91.0, "lon" => 0.0},
            %{"lat" => 32.0, "lon" => 181.0},
            %{"lat" => "thirty-two", "lon" => -117.0},
            %{"lat" => nil, "lon" => nil},
            %{},
            %{"lat" => 32.0},
            %{"lat" => :atom_lat, "lon" => -117.0}
          ] do
        assert {:error, _} = DeviceLocation.validate_coords(bad),
               "expected rejection for #{inspect(bad)}"
      end

      # Boundary values are accepted.
      assert {:ok, _} = DeviceLocation.validate_coords(%{"lat" => 90.0, "lon" => 180.0})
      assert {:ok, _} = DeviceLocation.validate_coords(%{"lat" => -90.0, "lon" => -180.0})

      # Haversine never crashes on garbage; returns nil.
      assert DeviceLocation.haversine_km("a", 0, 0, 0) == nil
      assert DeviceLocation.distance_label("a", 0, 0, 0) == nil
    end

    test "client precision is never trusted: server coarsens to 3 decimals" do
      {:ok, coarse} =
        DeviceLocation.validate_coords(%{"lat" => 32.715712345678, "lon" => -117.16119876543})

      assert coarse["lat"] == 32.716
      assert coarse["lon"] == -117.161
    end
  end
end
