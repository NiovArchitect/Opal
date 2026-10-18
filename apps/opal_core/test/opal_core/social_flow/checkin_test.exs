defmodule OpalCore.SocialFlow.CheckinTest do
  @moduledoc """
  Repair #18 B3 - circle check-in sweep, context-level proof of the
  design (coordination/repair18/track-b3-checkin-sweep.md sections
  1.6, 2, 4, 5): snapshot resolution R1-R7, one summary projection,
  unanswered as a stored visible state, privacy matrix, quiet law,
  withdrawal erasure, free-text consumption, and the non-admission
  of answers to memory / pipeline outputs.

  The HTTP real-path legs live in
  test/opal_core_web/controllers/checkin_controller_test.exs and in
  shots/regression/cases/frb3-*.case.mjs.
  """
  use OpalCore.DataCase, async: false

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Center.PlanningContext
  alias OpalCore.Messages
  alias OpalCore.Messaging.{ConversationMember, Message}
  alias OpalCore.OpalConversations
  alias OpalCore.Relationships
  alias OpalCore.Repo

  alias OpalCore.SocialFlow.{
    Checkin,
    CheckinResponse,
    CheckinSweep,
    Clock,
    PlanParticipant,
    SafetyBlock,
    SharedPlan
  }

  defp fresh_user(name) do
    n = System.unique_integer([:positive])

    %User{}
    |> User.changeset(%{
      id: Ecto.UUID.generate(),
      handle: "b3-#{String.downcase(String.replace(name, " ", "-"))}-#{n}",
      display_name: name
    })
    |> Repo.insert!()
  end

  defp group!(organizer, members, label \\ "Saturday Crew") do
    {:ok, result} =
      Messages.create_group_conversation(organizer.id, Enum.map(members, & &1.id), label: label)

    result.conversation_id
  end

  defp create!(organizer_id, source, opts \\ []) do
    opts = Keyword.put_new(opts, :idempotency_key, "k-#{Ecto.UUID.generate()}")
    {:ok, sweep, :created} = Checkin.create_sweep(organizer_id, source, opts)
    sweep
  end

  defp summary!(sweep, viewer_id) do
    {:ok, summary} = Checkin.summary_for(sweep.id, viewer_id)
    summary
  end

  defp row(summary, user_id), do: Enum.find(summary["members"], &(&1["user_id"] == user_id))

  describe "Scenario A - relationship_set family circle" do
    setup do
      org = fresh_user("Olivia Organizer")

      members =
        for name <- ["Parent Pam", "Sibling Sam", "Sibling Sue", "Grandma Gail", "Coparent Carl"],
            do: fresh_user(name)

      for m <- members, do: {:ok, _} = Relationships.set_type(org.id, m.id, "family")
      %{org: org, members: members}
    end

    test "snapshot, pre-created asked rows, rollup, unanswered visible", %{
      org: org,
      members: members
    } do
      sweep =
        create!(org.id, %{"kind" => "relationship_set", "filter" => %{"type" => "family"}},
          prompt_theme: "with the power out",
          expires_in_hours: 48
        )

      assert sweep.circle_label == "Family"
      assert length(sweep.member_ids) == 5

      rows = Repo.all(from r in CheckinResponse, where: r.sweep_id == ^sweep.id)
      assert length(rows) == 5
      assert Enum.all?(rows, &(&1.status == "asked"))

      s = summary!(sweep, org.id)
      assert s["counts"]["asked_total"] == 5
      assert s["counts"]["still_waiting"] == 5
      assert s["copy"]["still_waiting_line"] =~ "Not answering is not the same as being okay"
      assert s["copy"]["still_waiting_line"] =~ "Pam"

      [pam, sam, sue, _gail, _carl] = members

      assert {:ok, _} =
               Checkin.respond(sweep.id, pam.id, %{"okay" => "ok", "where_text" => "home"})

      assert {:ok, _} =
               Checkin.respond(sweep.id, sam.id, %{
                 "okay" => "ok",
                 "where_text" => "at my sister's in Carlsbad"
               })

      assert {:ok, _} = Checkin.respond(sweep.id, sue.id, %{"decline" => true})

      s = summary!(sweep, org.id)
      assert s["counts"]["answered"] == 2
      assert s["counts"]["declined_or_passed"] == 1
      assert s["counts"]["still_waiting"] == 2
      assert row(s, sue.id)["response_status"] == "declined"
      assert row(s, sue.id)["where_text"] == nil

      # Members see only their own view; outsiders get not_found.
      {:ok, member_view} = Checkin.summary_for(sweep.id, pam.id)
      assert member_view["view"] == "member"
      refute Map.has_key?(member_view, "members")
      assert member_view["my_response"]["where_text"] == "home"
      assert member_view["ask"]["body"] =~ "go only to Olivia"
      assert member_view["ask"]["theme_line"] == "They said: with the power out"

      outsider = fresh_user("Outsider")
      assert {:error, :not_found} = Checkin.summary_for(sweep.id, outsider.id)
      assert {:error, :not_found} = Checkin.respond(sweep.id, outsider.id, %{"okay" => "ok"})
    end

    test "ask delivery: one private Opal card per member, no group message", %{
      org: org,
      members: members
    } do
      sweep =
        create!(org.id, %{"kind" => "relationship_set", "filter" => %{"type" => "family"}})

      for m <- members do
        {:ok, conv} = OpalConversations.get_or_create_conversation(m.id)

        asks =
          conv.id
          |> OpalConversations.list_messages()
          |> Enum.filter(
            &(&1.metadata["source"] == "checkin_sweep" and &1.metadata["sweep_id"] == sweep.id)
          )

        assert length(asks) == 1
      end

      assert Repo.aggregate(Message, :count) == 0
    end

    test "share tap coarsens coordinates; location never pulled from stored coords", %{
      org: org,
      members: members
    } do
      sweep = create!(org.id, %{"kind" => "relationship_set", "filter" => %{"type" => "family"}})
      [pam | _] = members

      assert {:ok, row} =
               Checkin.respond(sweep.id, pam.id, %{
                 "okay" => "not_ok",
                 "needs_text" => "insulin is running low",
                 "share_area" => true,
                 "lat" => 33.1581009,
                 "lon" => -117.3509999,
                 "area_label" => "Carlsbad"
               })

      assert row.shared_area["lat"] == 33.158
      assert row.shared_area["lon"] == -117.351
      assert row.shared_area["label"] == "Carlsbad"

      s = summary!(sweep, org.id)
      assert s["counts"]["not_ok"] == 1
      assert row(s, pam.id)["shared_area"]["lat"] == 33.158
    end

    test "spoofed member id in attrs is never the author", %{org: org, members: members} do
      sweep = create!(org.id, %{"kind" => "relationship_set", "filter" => %{"type" => "family"}})
      [pam, sam | _] = members

      assert {:ok, _} =
               Checkin.respond(sweep.id, pam.id, %{
                 "okay" => "ok",
                 "where_text" => "mine",
                 "member_user_id" => sam.id
               })

      s = summary!(sweep, org.id)
      assert row(s, pam.id)["where_text"] == "mine"
      assert row(s, sam.id)["response_status"] == "asked"
    end

    test "subtype filter narrows the derived set and never renders to members", %{
      org: org,
      members: members
    } do
      [_pam, sam, sue | _] = members
      {:ok, _} = Relationships.set_family_subtype(org.id, sam.id, "sibling")
      {:ok, _} = Relationships.set_family_subtype(org.id, sue.id, "sibling")

      sweep =
        create!(org.id, %{
          "kind" => "relationship_set",
          "filter" => %{"type" => "family", "subtype" => "sibling"}
        })

      assert Enum.sort(sweep.member_ids) == Enum.sort([sam.id, sue.id])
      {:ok, view} = Checkin.summary_for(sweep.id, sam.id)
      refute view["ask"]["body"] =~ "sibling"
    end

    test "minor flagged by the organizer is never asked (5.4)", %{org: org, members: members} do
      [pam | _] = members
      {:ok, _} = Relationships.set_family_subtype(org.id, pam.id, "child", minor: true)

      sweep = create!(org.id, %{"kind" => "relationship_set", "filter" => %{"type" => "family"}})

      refute pam.id in sweep.member_ids
      assert pam.id in sweep.minor_ids
      assert Repo.get_by(CheckinResponse, sweep_id: sweep.id, member_user_id: pam.id) == nil

      {:ok, conv} = OpalConversations.get_or_create_conversation(pam.id)
      assert OpalConversations.list_messages(conv.id) == []

      s = summary!(sweep, org.id)
      assert s["minor_note"] =~ "Not asked directly"
      assert s["minor_note"] =~ "Pam"
    end

    test "blocked pair is excluded silently and counted not_askable (R7)", %{
      org: org,
      members: members
    } do
      [pam | _] = members

      %SafetyBlock{}
      |> SafetyBlock.changeset(%{
        blocker_user_id: pam.id,
        blocked_user_id: org.id,
        status: "active",
        idempotency_key: "b3-block-#{Ecto.UUID.generate()}"
      })
      |> Repo.insert!()

      sweep = create!(org.id, %{"kind" => "relationship_set", "filter" => %{"type" => "family"}})
      refute pam.id in sweep.member_ids
      assert pam.id in sweep.not_askable_ids

      s = summary!(sweep, org.id)
      assert s["counts"]["not_askable"] >= 1
      assert s["not_askable_note"] =~ "Could not be asked"
      refute s["not_askable_note"] =~ "block"
    end

    test "answers are never admitted to memory or pipeline stores (5.6)", %{
      org: org,
      members: members
    } do
      sweep = create!(org.id, %{"kind" => "relationship_set", "filter" => %{"type" => "family"}})
      [pam | _] = members
      secret_where = "at the blue house on Elm"
      secret_need = "needs her blue inhaler"

      assert {:ok, _} =
               Checkin.respond(sweep.id, pam.id, %{
                 "okay" => "not_ok",
                 "where_text" => secret_where,
                 "needs_text" => secret_need
               })

      # The strings exist in exactly one place: the response row.
      hits =
        Repo.all(
          from r in CheckinResponse,
            where: r.sweep_id == ^sweep.id and not is_nil(r.where_text),
            select: {r.where_text, r.needs_text}
        )

      assert hits == [{secret_where, secret_need}]

      memory_tables =
        Repo.query!(
          "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND (table_name LIKE '%memor%' OR table_name LIKE '%person_fact%')"
        ).rows
        |> List.flatten()

      for table <- memory_tables, table not in ~w(memory_hourly_jobs) do
        cols =
          Repo.query!(
            "SELECT column_name FROM information_schema.columns WHERE table_name=$1 AND data_type IN ('text','character varying')",
            [table]
          ).rows
          |> List.flatten()

        for col <- cols do
          found =
            Repo.query!(
              "SELECT count(*) FROM #{table} WHERE #{col} LIKE $1 OR #{col} LIKE $2",
              ["%blue house on Elm%", "%blue inhaler%"]
            ).rows

          assert found == [[0]], "sweep answer leaked into #{table}.#{col}"
        end
      end
    end
  end

  describe "Scenario B - conversation source" do
    setup do
      org = fresh_user("Olivia Organizer")
      members = for name <- ["Ann", "Ben", "Cid"], do: fresh_user(name)
      conv_id = group!(org, members)
      %{org: org, members: members, conv_id: conv_id}
    end

    test "one marker, snapshot frozen against a late joiner, muted member still asked",
         %{org: org, members: members, conv_id: conv_id} do
      [ann, ben, _cid] = members

      # Mute the conversation for Ben - delivery must not consult it.
      member_row = Repo.get_by(ConversationMember, conversation_id: conv_id, user_id: ben.id)
      member_row |> Ecto.Changeset.change(%{notifications_muted: true}) |> Repo.update!()

      sweep = create!(org.id, %{"kind" => "conversation", "ref_id" => conv_id})

      markers =
        Repo.all(
          from m in Message,
            where: m.conversation_id == ^conv_id and like(m.body, "%check in with everyone%")
        )

      assert length(markers) == 1
      assert hd(markers).sender_user_id == org.id

      {:ok, ben_conv} = OpalConversations.get_or_create_conversation(ben.id)

      assert Enum.any?(
               OpalConversations.list_messages(ben_conv.id),
               &(&1.metadata["source"] == "checkin_sweep")
             )

      # Late joiner is not a target (snapshot law).
      late = fresh_user("Late Joiner")
      assert {:ok, _, :created} = Messages.add_conversation_member(conv_id, org.id, late.id)
      refute late.id in sweep.member_ids
      assert {:error, :not_found} = Checkin.respond(sweep.id, late.id, %{"okay" => "ok"})
      assert {:error, :not_found} = Checkin.summary_for(sweep.id, late.id)

      # A group reply is not an answer.
      assert {:ok, _, _} =
               Messages.accept_message(%{
                 conversation_id: conv_id,
                 sender_user_id: ann.id,
                 client_message_id: "grp-#{Ecto.UUID.generate()}",
                 body: "all good here"
               })

      s = summary!(sweep, org.id)
      assert row(s, ann.id)["response_status"] == "asked"
    end

    test "non-member organizer cannot sweep a conversation", %{members: members, conv_id: conv_id} do
      outsider = fresh_user("Outsider Org")

      assert {:error, :not_a_member} =
               Checkin.create_sweep(outsider.id, %{"kind" => "conversation", "ref_id" => conv_id},
                 idempotency_key: "k-#{Ecto.UUID.generate()}"
               )

      assert members != []
    end
  end

  describe "Scenario C - plan source and R4 fallback" do
    test "participants are targets regardless of RSVP state; outsider participant included" do
      org = fresh_user("Olivia Organizer")
      p1 = fresh_user("Accepted Ana")
      p2 = fresh_user("Declined Dan")
      p3 = fresh_user("Outside Ola")

      plan =
        %SharedPlan{}
        |> SharedPlan.changeset(%{
          title: "Lockdown dinner",
          status: "agreed",
          timezone: "America/Los_Angeles",
          created_by_user_id: org.id,
          source: "center",
          plan_type: "in_person"
        })
        |> Repo.insert!()

      for {user, state} <- [{p1, "accepted"}, {p2, "declined"}, {p3, "pending"}] do
        %PlanParticipant{}
        |> PlanParticipant.changeset(%{plan_id: plan.id, user_id: user.id, response_state: state})
        |> Repo.insert!()
      end

      sweep = create!(org.id, %{"kind" => "plan", "ref_id" => plan.id})
      assert sweep.circle_label == "Lockdown dinner"
      assert Enum.sort(sweep.member_ids) == Enum.sort([p1.id, p2.id, p3.id])

      {:ok, ola_conv} = OpalConversations.get_or_create_conversation(p3.id)

      assert Enum.any?(
               OpalConversations.list_messages(ola_conv.id),
               &(&1.metadata["source"] == "checkin_sweep")
             )
    end

    test "fold-born plan with zero participants falls back to conversation members (R4)" do
      org = fresh_user("Olivia Organizer")
      members = for name <- ["Ann", "Ben", "Cid"], do: fresh_user(name)
      conv_id = group!(org, members)

      plan =
        %SharedPlan{}
        |> SharedPlan.changeset(%{
          title: "Fold-born plan",
          status: "tentative",
          timezone: "America/Los_Angeles",
          created_by_user_id: org.id,
          source: "conversation",
          conversation_id: conv_id
        })
        |> Repo.insert!()

      sweep = create!(org.id, %{"kind" => "plan", "ref_id" => plan.id})
      assert sweep.source_filter["fallback"] == "conversation_members"
      assert Enum.sort(sweep.member_ids) == Enum.sort(Enum.map(members, & &1.id))

      s = summary!(sweep, org.id)
      assert s["sweep"]["source_fallback"] == "conversation_members"
    end

    test "conversation-less plan with no participants fails named, never an empty sweep" do
      org = fresh_user("Olivia Organizer")

      plan =
        %SharedPlan{}
        |> SharedPlan.changeset(%{
          title: "Empty plan",
          status: "tentative",
          timezone: "UTC",
          created_by_user_id: org.id,
          source: "center"
        })
        |> Repo.insert!()

      assert {:error, :no_targets} =
               Checkin.create_sweep(org.id, %{"kind" => "plan", "ref_id" => plan.id},
                 idempotency_key: "k-#{Ecto.UUID.generate()}"
               )
    end
  end

  describe "quiet law and lifecycle" do
    setup do
      org = fresh_user("Olivia Organizer")
      members = for name <- ["Ann", "Ben", "Cid"], do: fresh_user(name)
      conv_id = group!(org, members)
      %{org: org, members: members, conv_id: conv_id}
    end

    test "one open sweep per circle; second create returns it and re-notifies nobody",
         %{org: org, members: members, conv_id: conv_id} do
      sweep = create!(org.id, %{"kind" => "conversation", "ref_id" => conv_id})
      [ann | _] = members

      count_asks = fn ->
        {:ok, conv} = OpalConversations.get_or_create_conversation(ann.id)

        conv.id
        |> OpalConversations.list_messages()
        |> Enum.count(&(&1.metadata["source"] == "checkin_sweep"))
      end

      assert count_asks.() == 1

      for _ <- 1..3 do
        assert {:ok, again, :already_open} =
                 Checkin.create_sweep(org.id, %{"kind" => "conversation", "ref_id" => conv_id},
                   idempotency_key: "k-#{Ecto.UUID.generate()}"
                 )

        assert again.id == sweep.id
      end

      assert count_asks.() == 1
      assert Repo.aggregate(CheckinSweep, :count) == 1
    end

    test "expiry closes silently for members; late answer refused and stores nothing; cooldown enforced",
         %{org: org, members: members, conv_id: conv_id} do
      Clock.freeze(~U[2026-06-01 19:00:00Z])
      on_exit(fn -> Clock.unfreeze() end)

      sweep =
        create!(org.id, %{"kind" => "conversation", "ref_id" => conv_id}, expires_in_hours: 24)

      [ann | _] = members
      {:ok, ann_conv} = OpalConversations.get_or_create_conversation(ann.id)
      asks_before = length(OpalConversations.list_messages(ann_conv.id))

      Clock.advance(25 * 3600)
      s = summary!(sweep, org.id)
      assert s["sweep"]["status"] == "closed"
      assert s["sweep"]["close_reason"] == "expired"
      assert row(s, ann.id)["response_status"] == "asked"

      # Zero additional member contact at expiry.
      assert length(OpalConversations.list_messages(ann_conv.id)) == asks_before

      assert {:error, :sweep_closed} = Checkin.respond(sweep.id, ann.id, %{"okay" => "ok"})
      s = summary!(sweep, org.id)
      assert row(s, ann.id)["response_status"] == "asked"

      # Cooldown: 24h from close.
      assert {:error, :sweep_quiet_window, next} =
               Checkin.create_sweep(org.id, %{"kind" => "conversation", "ref_id" => conv_id},
                 idempotency_key: "k-#{Ecto.UUID.generate()}"
               )

      assert DateTime.compare(next, Clock.utc_now()) == :gt

      Clock.advance(24 * 3600)

      assert {:ok, _sweep2, :created} =
               Checkin.create_sweep(org.id, %{"kind" => "conversation", "ref_id" => conv_id},
                 idempotency_key: "k-#{Ecto.UUID.generate()}"
               )
    end

    test "all-terminal completes the sweep; answers freeze; withdrawal still erases",
         %{org: org, members: members, conv_id: conv_id} do
      sweep = create!(org.id, %{"kind" => "conversation", "ref_id" => conv_id})
      [ann, ben, cid] = members

      assert {:ok, _} =
               Checkin.respond(sweep.id, ann.id, %{"okay" => "ok", "where_text" => "home"})

      assert {:ok, _} = Checkin.respond(sweep.id, ben.id, %{"decline" => true})
      assert {:ok, _} = Checkin.respond(sweep.id, cid.id, %{"pass" => true})

      s = summary!(sweep, org.id)
      assert s["sweep"]["status"] == "complete"
      assert s["sweep"]["close_reason"] == "complete"

      assert {:error, :sweep_closed} =
               Checkin.respond(sweep.id, ann.id, %{"okay" => "ok", "where_text" => "changed"})

      # Withdrawal after close is still honored for content (5.6).
      assert {:ok, _} = Checkin.withdraw(sweep.id, ann.id)
      s = summary!(sweep, org.id)
      assert row(s, ann.id)["response_status"] == "withdrawn"
      assert row(s, ann.id)["where_text"] == nil
    end

    test "amend keeps one row and the first responded_at", %{
      org: org,
      members: members,
      conv_id: conv_id
    } do
      sweep = create!(org.id, %{"kind" => "conversation", "ref_id" => conv_id})
      [ann | _] = members

      {:ok, first} = Checkin.respond(sweep.id, ann.id, %{"okay" => "ok", "where_text" => "home"})

      {:ok, second} =
        Checkin.respond(sweep.id, ann.id, %{"okay" => "ok", "where_text" => "at home now"})

      assert first.id == second.id
      assert second.responded_at == first.responded_at
      assert second.where_text == "at home now"
      assert Repo.aggregate(CheckinResponse, :count) == 3
    end

    test "circle larger than 20 targets fails named, never truncated" do
      org = fresh_user("Olivia Organizer")
      members = for i <- 1..21, do: fresh_user("Member #{i}")
      for m <- members, do: {:ok, _} = Relationships.set_type(org.id, m.id, "family")

      assert {:error, :circle_too_large} =
               Checkin.create_sweep(
                 org.id,
                 %{"kind" => "relationship_set", "filter" => %{"type" => "family"}},
                 idempotency_key: "k-#{Ecto.UUID.generate()}"
               )
    end
  end

  describe "free-text Center consumption (2.3 secondary path)" do
    setup do
      org = fresh_user("Olivia Organizer")
      members = for name <- ["Ann", "Ben", "Cid"], do: fresh_user(name)
      conv_id = group!(org, members)
      sweep = create!(org.id, %{"kind" => "conversation", "ref_id" => conv_id})
      %{org: org, members: members, conv_id: conv_id, sweep: sweep}
    end

    test "text answer lands verbatim with okay unstated", %{
      org: org,
      members: members,
      sweep: sweep
    } do
      [ann | _] = members

      assert {:ok, row} =
               Checkin.consume_text_answer(ann.id, sweep.id, "at my sister's, bring water")

      assert row.status == "answered"
      assert row.okay == "unstated"
      assert row.free_text == "at my sister's, bring water"
      assert row.answer_source == "center_text"

      s = summary!(sweep, org.id)
      assert row(s, ann.id)["free_text"] == "at my sister's, bring water"
    end

    test "a card answer disarms the free-text capture for that sweep", %{
      members: members,
      sweep: sweep
    } do
      [ann | _] = members

      q = PlanningContext.outstanding_question(PlanningContext.get_for_user(ann.id))
      assert q["kind"] == "checkin_sweep"
      assert q["sweep_id"] == sweep.id

      assert {:ok, _} =
               Checkin.respond(sweep.id, ann.id, %{"okay" => "ok", "where_text" => "home"})

      assert PlanningContext.outstanding_question(PlanningContext.get_for_user(ann.id)) == nil
    end

    test "skip-shaped text records a pass, permanently", %{members: members, sweep: sweep} do
      [ann | _] = members
      assert {:ok, row} = Checkin.consume_text_answer(ann.id, sweep.id, "not now")
      assert row.status == "passed"
    end

    test "sweep never evicts a live planning outstanding question", %{org: org} do
      member = fresh_user("Busy Bea")
      org2 = fresh_user("Second Org")
      {:ok, _} = Relationships.set_type(org2.id, member.id, "family")
      {:ok, _} = Relationships.set_type(org.id, member.id, "family")

      # A planning question can only be outstanding inside the member's
      # live Opal 1:1 conversation - create it first, as the product does.
      {:ok, _} = OpalConversations.get_or_create_conversation(member.id)

      {:ok, _} =
        PlanningContext.set_outstanding_question(member.id, %{
          "kind" => "category",
          "prompt" => "Food or outdoors?"
        })

      q0 = PlanningContext.outstanding_question(PlanningContext.get_for_user(member.id))
      assert q0["kind"] == "category"

      create!(org2.id, %{"kind" => "relationship_set", "filter" => %{"type" => "family"}})

      q = PlanningContext.outstanding_question(PlanningContext.get_for_user(member.id))
      assert q["kind"] == "category"
    end
  end

  describe "projection purity" do
    test "same rows, same contract, twice" do
      org = fresh_user("Olivia Organizer")
      members = for name <- ["Ann", "Ben", "Cid"], do: fresh_user(name)
      conv_id = group!(org, members)
      sweep = create!(org.id, %{"kind" => "conversation", "ref_id" => conv_id})
      [ann | _] = members
      {:ok, _} = Checkin.respond(sweep.id, ann.id, %{"okay" => "ok"})

      assert summary!(sweep, org.id) == summary!(sweep, org.id)
    end
  end
end
