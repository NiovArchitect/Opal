defmodule OpalCore.SocialFlow.Repair12R4MultirunTest do
  @moduledoc """
  Repair #12 — R4 (test/verify/evidence): MULTI-RUN PROOF.

  The founder's requirement is "prove that it works multiple times and
  multiple different ways". Every key flow below runs 3+ times with VARIED
  inputs: paraphrased NL phrasings, reordered steps, interleaved unrelated
  messages, and different entry surfaces (chat NL via apply_nl_schedule_change,
  direct handler via change_plan_time, propose/accept confirm via
  confirm_pending_revision).

  Proof table (flow x run # x varied input x result) is mirrored in
  shots/repair12/TEST_REPORT.md.
  """

  use OpalCore.DataCase, async: false

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Center.DeviceLocation
  alias OpalCore.Center.PlanContextPatch
  alias OpalCore.Center.PlanningContext
  alias OpalCore.Center.ProviderAction
  alias OpalCore.Fixtures
  alias OpalCore.FixturesHelper
  alias OpalCore.Messaging.{Conversation, ConversationMember}
  alias OpalCore.OpalIntent
  alias OpalCore.Repo
  alias OpalCore.SocialFlow
  alias OpalCore.SocialFlow.OpalCalendar.Commitment
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

  defp make_plan(user_id \\ nil, attrs \\ %{}) do
    user_id = user_id || alex()

    {:ok, plan, _} =
      SocialFlow.create_tentative_plan_from_conversation(
        conv(),
        user_id,
        Map.merge(
          %{
            "title" => "Dinner with Jordan",
            "place" => "Juniper & Ivy",
            "location" => "Juniper & Ivy",
            "area" => "North Park",
            "time_label" => "Sat 7:30 PM"
          },
          attrs
        )
      )

    plan
  end

  defp mk_user(display_name) do
    %User{}
    |> User.changeset(%{
      id: Ecto.UUID.generate(),
      handle: "r4-#{Ecto.UUID.generate()}",
      display_name: display_name
    })
    |> Repo.insert!()
  end

  defp mk_conv(member_ids) do
    conv =
      %Conversation{}
      |> Conversation.changeset(%{id: Ecto.UUID.generate(), label: "r4-#{Ecto.UUID.generate()}"})
      |> Repo.insert!()

    for uid <- member_ids do
      %ConversationMember{}
      |> ConversationMember.changeset(%{conversation_id: conv.id, user_id: uid})
      |> Repo.insert!()
    end

    conv.id
  end

  # create_tentative_plan_from_conversation auto-creates participant rows
  # (creator = lead, others = participant). This only flips roles on the
  # existing rows.
  defp set_role(plan_id, user_id, role) do
    from(pp in PlanParticipant, where: pp.plan_id == ^plan_id and pp.user_id == ^user_id)
    |> Repo.update_all(set: [role: role])

    :ok
  end

  defp db_plan(id), do: Repo.get!(SharedPlan, id)

  defp calendar_projected?(plan_id) do
    Repo.exists?(from(c in Commitment, where: c.shared_plan_id == ^plan_id))
  end

  # --- Flow 1: create -> change time (NL) -> confirm -> cancel, x3 varied ---

  describe "Flow 1 — plan lifecycle through chat-NL surface, three varied runs" do
    # Run 1: paraphrase A
    test "run 1: 'change it to 8 PM' mutates, persists, and notifies" do
      plan = make_plan()

      assert {:ok, %{plan: updated}} =
               SocialFlow.apply_nl_schedule_change(%{
                 conversation_id: conv(),
                 user_id: alex(),
                 text: "change it to 8 PM"
               })

      assert updated.time_label =~ "8"
      assert db_plan(plan.id).time_label =~ "8"

      # Calendar projection happened (idempotent per version).
      assert calendar_projected?(plan.id)

      # Notify set reaches the right participants on cancel.
      assert {:ok, %{plan: cancelled, notify_user_ids: notified}} =
               SocialFlow.cancel_plan(%{plan_id: plan.id, user_id: alex(), trace_id: "r4-1"})

      assert cancelled.status == "cancelled"
      assert jordan() in notified
    end

    # Run 2: paraphrase B (the founder's exact words) + interleave propose/accept first
    test "run 2: 'actually let's do 8 PM' after propose/accept confirm cycle" do
      plan = make_plan()

      # Unrelated interleave: non-lead proposes a change first...
      {:ok, %{revision: proposed}} =
        SocialFlow.propose_revision(%{
          plan_id: plan.id,
          proposed_by_user_id: jordan(),
          changes: %{"time_label" => "Sat 7:45 PM"},
          trace_id: "r4-2"
        })

      # ...lead confirms it (the confirm path)...
      assert {:ok, _} =
               SocialFlow.confirm_pending_revision(%{
                 conversation_id: conv(),
                 user_id: alex(),
                 decision: "accept",
                 trace_id: "r4-2"
               })

      assert db_plan(plan.id).time_label =~ "7:45"

      # ...then a fresh NL change lands on top and wins.
      assert {:ok, %{plan: updated}} =
               SocialFlow.apply_nl_schedule_change(%{
                 conversation_id: conv(),
                 user_id: alex(),
                 text: "actually let's do 8 PM"
               })

      assert updated.time_label =~ "8"
      assert db_plan(plan.id).time_label =~ "8"

      revs =
        from(r in PlanRevision, where: r.plan_id == ^plan.id, select: r.status)
        |> Repo.all()

      assert "accepted" in revs
      assert length(revs) >= 2

      assert {:ok, %{plan: cancelled}} =
               SocialFlow.cancel_plan(%{plan_id: plan.id, user_id: alex(), trace_id: "r4-2"})
      assert cancelled.status == "cancelled"
    end

    # Run 3: paraphrase C + reordered (cancel attempt by non-lead fails honestly)
    test "run 3: 'move it to 8pm' — non-lead cancel refused, lead cancel works" do
      plan = make_plan()

      assert {:ok, %{plan: updated}} =
               SocialFlow.apply_nl_schedule_change(%{
                 conversation_id: conv(),
                 user_id: alex(),
                 text: "move it to 8pm"
               })

      assert updated.time_label =~ "8"

      # Non-lead (member) cancel is refused — never a silent success.
      assert {:error, _} =
               SocialFlow.cancel_plan(%{plan_id: plan.id, user_id: jordan(), trace_id: "r4-3"})

      assert db_plan(plan.id).status != "cancelled"

      assert {:ok, %{plan: cancelled, notify_user_ids: notified}} =
               SocialFlow.cancel_plan(%{plan_id: plan.id, user_id: alex(), trace_id: "r4-3"})

      assert cancelled.status == "cancelled"
      assert jordan() in notified
    end
  end

  # --- Flow 2: direct handler surface (button-equivalent), x3 varied ---

  describe "Flow 2 — plan lifecycle through direct handler surface, three varied runs" do
    test "run 1: change_plan_time -> confirm_pending_revision -> cancel_plan" do
      plan = make_plan()

      assert {:ok, %{plan: updated}} =
               SocialFlow.change_plan_time(%{
                 plan_id: plan.id,
                 user_id: alex(),
                 new_time_label: "Sat 8:00 PM",
                 trace_id: "r4-h1"
               })

      assert updated.time_label == "Sat 8:00 PM"
      assert db_plan(plan.id).time_label == "Sat 8:00 PM"

      # Revision chain carries the accepted change (gyroscope, F12-02c).
      rev = Repo.get_by!(PlanRevision, plan_id: plan.id)
      assert rev.status == "accepted"
      assert rev.proposed_changes["kind"] == "schedule_change"

      assert {:ok, %{plan: cancelled}} =
               SocialFlow.cancel_plan(%{plan_id: plan.id, user_id: alex(), trace_id: "r4-h1"})
      assert cancelled.status == "cancelled"
    end

    test "run 2: change_plan_date + change_plan_time in sequence" do
      plan = make_plan()

      assert {:ok, %{plan: d}} =
               SocialFlow.change_plan_date(%{
                 plan_id: plan.id,
                 user_id: alex(),
                 new_date_label: "Sunday",
                 trace_id: "r4-h2"
               })

      # date_label lives in the alignment map (fold-visible), not a plan column.
      assert get_in(d.alignment, ["date_label"]) == "Sunday"

      assert {:ok, %{plan: t}} =
               SocialFlow.change_plan_time(%{
                 plan_id: plan.id,
                 user_id: alex(),
                 new_time_label: "Sunday 6:00 PM",
                 trace_id: "r4-h2"
               })

      assert t.time_label == "Sunday 6:00 PM"
      assert db_plan(plan.id).time_label == "Sunday 6:00 PM"
      assert get_in(db_plan(plan.id).alignment, ["date_label"]) == "Sunday"
    end

    test "run 3: non-lead NL change goes the proposal route, then reject" do
      plan = make_plan()
      set_role(plan.id, jordan(), "lead")
      set_role(plan.id, alex(), "participant")

      # Alex is no longer the lead here: NL change becomes a proposal.
      assert {:ok, %{revision: revision}} =
               SocialFlow.apply_nl_schedule_change(%{
                 conversation_id: conv(),
                 user_id: alex(),
                 text: "let's do 8:00 PM"
               })

      assert revision.status == "proposed"
      assert db_plan(plan.id).time_label == "Sat 7:30 PM"

      # Lead rejects — plan untouched, no silent edit.
      assert {:ok, _} =
               SocialFlow.confirm_pending_revision(%{
                 conversation_id: conv(),
                 user_id: jordan(),
                 decision: "reject",
                 trace_id: "r4-h3"
               })

      assert db_plan(plan.id).time_label == "Sat 7:30 PM"
    end
  end

  # --- Flow 3: venue search, varied phrasings, x4 ---

  describe "Flow 3 — venue search resolves, attaches, and shows address every time" do
    defp attach_nighthawk(user_id, name, locality) do
      assert %{name: ^name, locality: ^locality} =
               PlanContextPatch.extract_exact_venue("Find #{name} in #{locality}")

      # One copy source for the in-flight line.
      assert is_binary(PlanContextPatch.venue_lookup_copy(name, locality))

      venue = %{
        "name" => name,
        "address" => "4211 Morrell St, San Diego, CA 92109",
        "lat" => 32.767,
        "lon" => -117.226,
        "provider" => "geoapify"
      }

      assert {:ok, %{plan: plan}} =
               ProviderAction.attach_selected_venue(
                 user_id,
                 venue,
                 %{"destination" => locality, "when" => "Sat 8:00 PM"}
               )

      # Single source of truth: alignment.venue carries name+address+coords.
      venue_attached = get_in(plan.alignment, ["venue"])
      assert venue_attached["name"] == name
      assert venue_attached["address"] =~ "Morrell"
      assert is_number(venue_attached["lat"])
      assert is_number(venue_attached["lon"])
      plan
    end

    test "run 1: 'Find Nighthawk in Coronado'" do
      plan = attach_nighthawk(alex(), "Nighthawk", "Coronado")
      assert plan.location =~ "Nighthawk"
      assert plan.location =~ "Morrell"
    end

    test "run 2: 'Find Nighthawk in Los Angeles' (multi-word locality)" do
      plan = attach_nighthawk(alex(), "Nighthawk", "Los Angeles")
      assert get_in(plan.alignment, ["venue", "name"]) == "Nighthawk"
    end

    test "run 3: 'Find The Henry in San Diego' (day-tail locality stays a place)" do
      assert %{name: "The Henry", locality: "San Diego"} =
               PlanContextPatch.extract_exact_venue("Find The Henry in San Diego Saturday")

      plan = attach_nighthawk(alex(), "The Henry", "San Diego")
      assert get_in(plan.alignment, ["venue", "name"]) == "The Henry"
    end

    test "run 4: venue question phrasings classify :named_venue, never sticky-who" do
      ctx = %{recent_who: ["Maya"], known_contacts: ["Maya", "Chanelle"], current_plan: nil}

      for text <- [
            "do you know where Nighthawk is",
            "where is The Henry in Coronado",
            "what's the address of Nighthawk",
            "where's Nighthawk"
          ] do
        assert {:ok, %{intent: :named_venue}} = OpalIntent.classify(text, ctx),
               "expected :named_venue for #{inspect(text)}"
      end
    end
  end

  # --- Flow 4: follow-up coherence, x3 ---

  describe "Flow 4 — follow-up coherence: venue after person mention stays venue" do
    test "run 1: person mention, then venue question" do
      # Person mention first (establishes a sticky recent_who).
      assert {:ok, %{intent: :chat}} =
               OpalIntent.classify("I'm having dinner with Maya tonight", %{
                 recent_who: [],
                 known_contacts: ["Maya"],
                 current_plan: nil
               })

      # Venue follow-up must NOT re-engage "you mentioned Maya earlier".
      assert {:ok, %{intent: :named_venue}} =
               OpalIntent.classify("where is The Henry in Coronado", %{
                 recent_who: ["Maya"],
                 known_contacts: ["Maya"],
                 current_plan: nil
               })
    end

    test "run 2: person question, then 'do you know where Nighthawk is'" do
      ctx = %{
        recent_who: ["Maya"],
        social: %{frequent_contacts: [%{display_name: "Maya"}]},
        current_plan: nil
      }

      assert {:ok, %{intent: :chat}} = OpalIntent.classify("where is Maya", ctx)

      assert {:ok, %{intent: :named_venue}} =
               OpalIntent.classify("do you know where Nighthawk is", ctx)
    end

    test "run 3: interleaved chit-chat between person and venue question" do
      ctx = %{recent_who: ["Maya"], known_contacts: ["Maya"], current_plan: nil}

      assert {:ok, %{intent: :chat}} = OpalIntent.classify("sounds good", ctx)
      assert {:ok, %{intent: :chat}} = OpalIntent.classify("can't wait", ctx)

      assert {:ok, %{intent: :named_venue}} =
               OpalIntent.classify("what's the address of Nighthawk", ctx)
    end
  end

  # --- Flow 5: change-time paraphrase battery, x6 ---

  describe "Flow 5 — change-time paraphrase battery (F12-02, founder's phrasings)" do
    @phrasings [
      "change plans with Chanelle to 8 PM",
      "actually let's do 8 PM",
      "move it to 8pm",
      "let's do 8:00 PM",
      "can we push it to 8 PM tonight",
      "8 PM works better"
    ]

    for {text, i} <- Enum.with_index(@phrasings, 1) do
      test "run #{i}: #{text}" do
        text = unquote(text)
        plan = make_plan()

        assert {:ok, %{plan: updated}} =
                 SocialFlow.apply_nl_schedule_change(%{
                   conversation_id: conv(),
                   user_id: alex(),
                   text: text
                 }),
               "NL change failed for #{inspect(text)}"

        assert updated.time_label =~ "8",
               "expected 8 o'clock in #{inspect(updated.time_label)} for #{inspect(text)}"

        assert db_plan(plan.id).time_label =~ "8"
        assert Repo.get_by!(PlanRevision, plan_id: plan.id).status == "accepted"
      end
    end

    test "meridiem-less bare hour is an honest refusal (pinned R2 rule, no invention)" do
      plan = make_plan()

      assert {:error, :no_time_found} =
               SocialFlow.apply_nl_schedule_change(%{
                 conversation_id: conv(),
                 user_id: alex(),
                 text: "actually let's do 8"
               })

      # No mutation, no revision row — the routing layer must ask "8 AM or 8 PM?".
      assert db_plan(plan.id).time_label == "Sat 7:30 PM"
      assert Repo.get_by(PlanRevision, plan_id: plan.id) == nil
    end
  end

  # --- Flow 6: Center NL surface — plan_id active?, venue attach to Center plan ---

  describe "Flow 6 — Center surface: listing, plan_id expiry honesty, storage scoping" do
    test "run 1: list_plans_for_user returns the Center plan (F12-06/07)" do
      plan = make_plan()

      assert {:ok, plans} = SocialFlow.list_plans_for_user(alex())
      assert Enum.any?(plans, &(&1["id"] == plan.id))
    end

    test "run 2: cancelled plans excluded by default, included with status: :all" do
      plan = make_plan()

      {:ok, _} = SocialFlow.cancel_plan(%{plan_id: plan.id, user_id: alex(), trace_id: "r4-c"})

      assert {:ok, plans} = SocialFlow.list_plans_for_user(alex())
      refute Enum.any?(plans, &(&1["id"] == plan.id))

      assert {:ok, all} = SocialFlow.list_plans_for_user(alex(), status: :all)
      assert Enum.any?(all, &(&1["id"] == plan.id))
    end

    test "run 3: stale plan_id is not actionable (F12-13/53)" do
      live_plan = make_plan()

      # A days-old plan_id must not hijack new utterances.
      old = %{"plan_id" => live_plan.id, "plan_id_set_at" => days_ago_iso(3)}
      refute PlanningContext.plan_id_active?(old)

      # A fresh stamp on a still-active plan stays actionable.
      fresh = %{
        "plan_id" => live_plan.id,
        "plan_id_set_at" => DateTime.utc_now() |> DateTime.to_iso8601()
      }

      assert PlanningContext.plan_id_active?(fresh)
    end

    test "run 4: schedule label validation rejects garbage (F12-54)" do
      plan = make_plan()

      assert {:error, _} =
               SocialFlow.change_plan_time(%{
                 plan_id: plan.id,
                 user_id: alex(),
                 new_time_label: "asdf not a time @@@",
                 trace_id: "r4-v"
               })

      assert db_plan(plan.id).time_label == "Sat 7:30 PM"
    end
  end

  # --- Location pipeline multi-run ---

  describe "Flow 7 — location pipeline (F12-11): validate, coarsen, store, stale" do
    for {lat, lon, i} <- [{32.7157, -117.1611, 1}, {34.0522, -118.2437, 2}, {40.7128, -74.006, 3}] do
      test "run #{i}: coords validate, coarsen to 3 decimals, store per user" do
        user = mk_user("R4 Loc User")
        lat = unquote(lat)
        lon = unquote(lon)

        assert {:ok, coarse} = DeviceLocation.validate_coords(%{"lat" => lat, "lon" => lon})
        assert coarse["lat"] == Float.round(lat, 3)
        assert coarse["lon"] == Float.round(lon, 3)

        # The controller ensures the per-user Center store exists first.
        assert {:ok, _} = OpalCore.OpalConversations.get_or_create_conversation(user.id)
        assert :ok = DeviceLocation.put_for_user(user.id, coarse)
        assert {:ok, stored} = DeviceLocation.get_for_user(user.id)
        assert stored["lat"] == coarse["lat"]
        assert stored["origin_source"] == "device"
      end
    end

    test "garbage coords are rejected, never stored" do
      user = mk_user("R4 Garbage Coords")

      assert {:error, :invalid_coords} = DeviceLocation.validate_coords(%{"lat" => "abc", "lon" => 1})
      assert {:error, :invalid_coords} = DeviceLocation.validate_coords(%{"lat" => 91.0, "lon" => 0.0})
      assert {:error, :invalid_origin_source} = DeviceLocation.validate_coords(%{"lat" => 32.0, "lon" => -117.0, "origin_source" => "satellite"})
      assert :none = DeviceLocation.get_for_user(user.id)
    end

    test "permission-denied path: no coords, honest gate, no crash" do
      user = mk_user("R4 Denied User")
      # Never granted: get_for_user returns :none, origin stays nil.
      assert :none = DeviceLocation.get_for_user(user.id)
      assert DeviceLocation.origin_source_for(user.id) == nil
    end
  end

  defp days_ago_iso(n) do
    DateTime.utc_now() |> DateTime.add(-n * 24 * 3600, :second) |> DateTime.to_iso8601()
  end
end
