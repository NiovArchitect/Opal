defmodule OpalCore.SocialFlow.Repair15FamilyProfileTest do
  @moduledoc """
  Repair #15 — Track B (family taxonomy) + Track C (progressive profile).

  Track B oracle:
  * The RU-1 enum stays at 7. Family structure is a SUBTYPE dimension on
    the same row, valid only under type "family" (FamilySubtype slugs:
    parent, child, sibling, grandparent, aunt_uncle, cousin,
    niece_nephew, co_parent).
  * Coordination is IDENTICAL across all subtypes: the R14 1:1 plan
    lifecycle (create → revision handshake → time change → cancel +
    peer notification) produces the same summary for every subtype.
  * Subtype dials refine tone/planning/nudges INSIDE Behavior:
    sibling/child spontaneous (2h), grandparent planned 24h,
    co_parent daily cadence (nudge cap 3), cousin casual style.
  * Minor flag = restraint: no adult-pattern nudges (only time_critical
    / mediation), planning help never gated.

  Track C oracle (QUIET law):
  * Unknown birthday in a birthday flow → exactly ONE in-context ask,
    non-blocking and dismissible; the plan proceeds regardless.
  * Answer → stored via MemoryAdmission/MemoryStore (explicit_fact,
    relationship scope) + durable Celebrations row; next flow is
    `:known`, used silently, no ask.
  * Skip → recorded; never asked again (`proceed_without`/"skipped").
  * Asked-but-unanswered → never re-asked (`already_asked`).
  * Facts never leak across people or across owners.

  Fresh randomized accounts throughout. Machine-proven, pending phone walk.
  """

  use OpalCore.DataCase, async: false

  alias OpalCore.Accounts.User
  alias OpalCore.Celebrations
  alias OpalCore.Messaging.{Conversation, ConversationMember}
  alias OpalCore.Relationships
  alias OpalCore.Relationships.{Behavior, FamilySubtype}
  alias OpalCore.Repo
  alias OpalCore.SocialFlow
  alias OpalCore.SocialFlow.Execution.{MemoryStore, ProfileGap}
  alias OpalCore.SocialFlow.SharedPlan

  @subtypes FamilySubtype.all()

  @names ~w(Avery Blake Casey Drew Ellis Finley Gray Harper Indigo Jules Kai Lane Morgan Noor Parker Quinn Riley Sam Tate Vale Wren Yara Zane)

  defp rand_name,
    do: Enum.random(@names) <> "-" <> (:crypto.strong_rand_bytes(2) |> Base.encode16())

  defp mk_user do
    %User{}
    |> User.changeset(%{
      id: Ecto.UUID.generate(),
      handle: "r15-#{Ecto.UUID.generate()}",
      display_name: rand_name()
    })
    |> Repo.insert!()
  end

  defp mk_conv(member_ids) do
    conv =
      %Conversation{}
      |> Conversation.changeset(%{id: Ecto.UUID.generate(), label: "r15-#{Ecto.UUID.generate()}"})
      |> Repo.insert!()

    for uid <- member_ids do
      %ConversationMember{}
      |> ConversationMember.changeset(%{conversation_id: conv.id, user_id: uid})
      |> Repo.insert!()
    end

    conv.id
  end

  defp db_plan(id), do: Repo.get!(SharedPlan, id)

  defp make_plan(conv_id, owner_id) do
    {:ok, plan, _} =
      SocialFlow.create_tentative_plan_from_conversation(conv_id, owner_id, %{
        "title" => "Birthday dinner",
        "place" => "Somewhere",
        "time_label" => "Sat 7:30 PM"
      })

    plan
  end

  defp mk_family(owner, peer, subtype, opts \\ []) do
    assert {:ok, _} = Relationships.set_type(owner.id, peer.id, "family")
    assert {:ok, _} = Relationships.set_family_subtype(owner.id, peer.id, subtype, opts)
  end

  # ── Track B: taxonomy shape ─────────────────────────────────────────────

  describe "B1 - subtype taxonomy shape" do
    test "enum stays at 7; subtype slugs are exactly the founder's family structure" do
      assert Relationships.allowed_types() ==
               ~w(spouse partner family close_friend friend business acquaintance)

      assert Enum.sort(@subtypes) ==
               Enum.sort(
                 ~w(parent child sibling grandparent aunt_uncle cousin niece_nephew co_parent)
               )

      for s <- @subtypes do
        assert FamilySubtype.valid?(s)
        assert is_binary(FamilySubtype.label(s))
      end

      refute FamilySubtype.valid?("relative")
      refute FamilySubtype.valid?("grandma")
      refute FamilySubtype.valid?(nil)
    end

    test "subtype is stored, read back, and cleared; minor flag round-trips" do
      owner = mk_user()
      peer = mk_user()
      mk_family(owner, peer, "grandparent", minor: false)

      assert %{subtype: "grandparent", minor: false} =
               Relationships.get_family_subtype(owner.id, peer.id)

      assert {:ok, _} = Relationships.set_family_subtype(owner.id, peer.id, "sibling")
      assert %{subtype: "sibling"} = Relationships.get_family_subtype(owner.id, peer.id)

      assert {:ok, _} = Relationships.set_family_subtype(owner.id, peer.id, nil)
      assert Relationships.get_family_subtype(owner.id, peer.id) == nil
    end

    test "subtype fails closed: unknown slug, non-family type, missing row" do
      owner = mk_user()
      peer = mk_user()
      assert {:ok, _} = Relationships.set_type(owner.id, peer.id, "family")

      assert {:error, %Ecto.Changeset{}} =
               Relationships.set_family_subtype(owner.id, peer.id, "grandma")

      biz = mk_user()
      assert {:ok, _} = Relationships.set_type(owner.id, biz.id, "business")
      assert {:error, :not_family} = Relationships.set_family_subtype(owner.id, biz.id, "parent")

      stranger = mk_user()

      assert {:error, :not_family} =
               Relationships.set_family_subtype(owner.id, stranger.id, "parent")
    end

    test "changing type away from family clears the subtype; re-setting family keeps it" do
      owner = mk_user()
      peer = mk_user()
      mk_family(owner, peer, "cousin")

      assert {:ok, _} = Relationships.set_type(owner.id, peer.id, "family")
      assert %{subtype: "cousin"} = Relationships.get_family_subtype(owner.id, peer.id)

      assert {:ok, _} = Relationships.set_type(owner.id, peer.id, "friend")
      assert Relationships.get_family_subtype(owner.id, peer.id) == nil

      contract =
        Relationships.to_contract(
          Repo.get_by(OpalCore.Relationships.RelationshipType,
            user_id: owner.id,
            contact_user_id: peer.id
          )
        )

      assert contract["family_subtype"] == nil
      assert contract["type"] == "friend"
    end

    test "subtypes never leak across accounts" do
      owner = mk_user()
      other_owner = mk_user()
      peer = mk_user()
      mk_family(owner, peer, "parent", minor: true)

      assert Relationships.get_family_subtype(other_owner.id, peer.id) == nil

      assert Behavior.nudge_allowed_for_pair?(other_owner.id, peer.id, "proactive_thread") ==
               false
    end
  end

  # ── Track B: coordination identical across subtypes ─────────────────────

  describe "B2 - coordination is identical across every family subtype" do
    test "1:1 plan lifecycle summary is the same for all 8 subtypes + plain family" do
      summaries =
        for subtype <- [nil | @subtypes] do
          owner = mk_user()
          peer = mk_user()
          conv = mk_conv([owner.id, peer.id])

          assert {:ok, _} = Relationships.set_type(owner.id, peer.id, "family")

          if subtype,
            do: assert({:ok, _} = Relationships.set_family_subtype(owner.id, peer.id, subtype))

          :ok = Phoenix.PubSub.subscribe(OpalCore.PubSub, "social_flow:conversation:#{conv}")

          plan = make_plan(conv, owner.id)
          created_status = db_plan(plan.id).status

          assert {:ok, %{revision: rev}} =
                   SocialFlow.propose_revision(%{
                     plan_id: plan.id,
                     proposed_by_user_id: peer.id,
                     changes: %{"time_label" => "Sat 7:45 PM"},
                     trace_id: "r15-confirm-#{subtype}"
                   })

          assert rev.status == "proposed"

          assert {:ok, %{revision: applied}} =
                   SocialFlow.respond_to_revision(%{
                     revision_id: rev.id,
                     user_id: owner.id,
                     decision: "accept",
                     trace_id: "r15-accept-#{subtype}"
                   })

          assert applied.status == "accepted"
          confirmed_time = db_plan(plan.id).time_label

          assert {:ok, %{plan: changed}} =
                   SocialFlow.change_plan_time(%{
                     plan_id: plan.id,
                     user_id: owner.id,
                     new_time_label: "Sat 8:00 PM",
                     trace_id: "r15-change-#{subtype}"
                   })

          assert changed.time_label == "Sat 8:00 PM"

          assert {:ok, %{plan: cancelled, notify_user_ids: notified}} =
                   SocialFlow.cancel_plan(%{
                     plan_id: plan.id,
                     user_id: owner.id,
                     trace_id: "r15-cancel-#{subtype}"
                   })

          assert cancelled.status == "cancelled"
          assert peer.id in notified

          :ok = Phoenix.PubSub.unsubscribe(OpalCore.PubSub, "social_flow:conversation:#{conv}")

          %{
            created_status: created_status,
            confirmed_time: confirmed_time,
            changed_time: db_plan(plan.id).time_label,
            final_status: cancelled.status,
            peer_notified: peer.id in notified
          }
        end

      assert Enum.uniq(summaries) |> length() == 1,
             "plan lifecycle diverged across family subtypes: #{inspect(summaries)}"

      [first | _] = summaries
      assert first.confirmed_time == "Sat 7:45 PM"
      assert first.changed_time == "Sat 8:00 PM"
      assert first.final_status == "cancelled"
      assert first.peer_notified == true
    end

    test "non-lead cancel is refused for every subtype (guard is subtype-invariant)" do
      for subtype <- @subtypes do
        owner = mk_user()
        peer = mk_user()
        conv = mk_conv([owner.id, peer.id])
        mk_family(owner, peer, subtype)

        plan = make_plan(conv, owner.id)

        assert {:error, _} =
                 SocialFlow.cancel_plan(%{
                   plan_id: plan.id,
                   user_id: peer.id,
                   trace_id: "r15-refuse-#{subtype}"
                 })

        assert db_plan(plan.id).status != "cancelled"
      end
    end
  end

  # ── Track B: subtype dials ──────────────────────────────────────────────

  describe "B3 - subtype dials inside the one Behavior engine" do
    test "planning dials: sibling/child spontaneous, grandparent 24h, co_parent 0h planned" do
      assert Behavior.enforce_planning("family", 1, "sibling") == :ok
      assert Behavior.enforce_planning("family", 1, "child") == :ok
      assert Behavior.enforce_planning("family", 1, nil) == {:needs_lead_time, 12}
      assert Behavior.enforce_planning("family", 13, "grandparent") == {:needs_lead_time, 24}
      assert Behavior.enforce_planning("family", 25, "grandparent") == :ok
      assert Behavior.enforce_planning("family", 0, "co_parent") == :ok
      assert Behavior.lead_time_hours("family", "niece_nephew") == 24
      # Non-family types ignore subtype entirely (fail closed to R14 dials).
      assert Behavior.lead_time_hours("business", "sibling") == 48
      assert Behavior.defaults_for("business", "sibling") == Behavior.defaults_for("business")
    end

    test "nudge dials: co_parent daily cadence, grandparent weekly, cousin casual style" do
      assert Behavior.nudge_daily_cap_for("family", "co_parent") == 3
      assert Behavior.nudge_daily_cap_for("family", "grandparent") == 1
      assert Behavior.nudge_allowed?("family", "proactive_thread", subtype: "co_parent")
      assert Behavior.nudge_allowed?("family", "proactive_thread", subtype: "grandparent")
      assert Behavior.style_for("family", "cousin") == "casual"
      assert Behavior.style_for("family", "grandparent") == "warm"
      assert Behavior.planning_for("family", "sibling") == "spontaneous"
    end

    test "proposal copy carries subtype dials (lead time + spontaneity), same copy shapes" do
      gp = Behavior.plan_proposal_copy("family", subtype: "grandparent", who: "Grandma")
      assert gp.lead_time_hours == 24
      assert gp.spontaneity == "planned"
      assert gp.tone == "warm"

      sib = Behavior.plan_proposal_copy("family", subtype: "sibling", who: "my brother")
      assert sib.spontaneity == "spontaneous"
      assert sib.lead_time_hours == 2

      plain = Behavior.plan_proposal_copy("family", who: "them")
      assert plain.lead_time_hours == 12
    end

    test "resolved_bounds layer subtype between type defaults and stored bounds" do
      owner = mk_user()
      peer = mk_user()
      mk_family(owner, peer, "co_parent")

      bounds = Behavior.resolved_bounds(owner.id, peer.id)
      # set_type stored the family defaults; subtype frequency wins for the dial.
      assert Behavior.nudge_allowed_for_pair?(owner.id, peer.id, "proactive_thread") == true
      assert bounds["style"] == "warm"
    end
  end

  # ── Track B: minors ─────────────────────────────────────────────────────

  describe "B4 - minor restraint" do
    test "minor flag denies adult-pattern nudges but never planning help" do
      for priority <- ~w(nudge proactive_thread routine_break) do
        refute Behavior.nudge_allowed?("family", priority, subtype: "child", minor: true),
               "minor must not receive #{priority}"
      end

      assert Behavior.nudge_allowed?("family", "time_critical", subtype: "child", minor: true)
      assert Behavior.nudge_allowed?("family", "mediation", subtype: "niece_nephew", minor: true)

      # Planning help is not a nudge: lead-time enforcement is unchanged.
      assert Behavior.enforce_planning("family", 3, "child") == :ok

      # Same subtype WITHOUT the minor flag keeps normal family nudges.
      assert Behavior.nudge_allowed?("family", "proactive_thread", subtype: "child", minor: false)
    end

    test "minor restraint reads from the stored row (pair-level gate)" do
      owner = mk_user()
      kid = mk_user()
      mk_family(owner, kid, "child", minor: true)

      refute Behavior.nudge_allowed_for_pair?(owner.id, kid.id, "proactive_thread")
      refute Behavior.nudge_allowed_for_pair?(owner.id, kid.id, "routine_break")
      assert Behavior.nudge_allowed_for_pair?(owner.id, kid.id, "time_critical")

      adult_child = mk_user()
      mk_family(owner, adult_child, "child")
      assert Behavior.nudge_allowed_for_pair?(owner.id, adult_child.id, "proactive_thread")
    end
  end

  # ── Track C: progressive profile ────────────────────────────────────────

  describe "C1 - birthday gap: ask once, in context, never a gate" do
    test "unknown birthday → one ask; second assess never re-asks; plan proceeds throughout" do
      owner = mk_user()
      person = mk_user()
      name = person.display_name

      first = ProfileGap.birthday_plan_context(owner.id, person.id, person_name: name)
      assert first["status"] == "ask"
      assert first["plan_proceeds"] == true
      ask = first["ask"]
      assert ask["fact_key"] == "birthday"
      assert ask["blocking"] == false
      assert ask["dismissible"] == true
      assert String.contains?(ask["prompt"], name)
      assert String.contains?(String.downcase(ask["prompt"]), "skip")

      assert %OpalCore.SocialFlow.Execution.ProfileGapAsk{status: "asked"} =
               ProfileGap.ledger_row(owner.id, person.id, "birthday")

      second = ProfileGap.birthday_plan_context(owner.id, person.id, person_name: name)
      assert second["status"] == "proceed_without"
      assert second["reason"] == "already_asked"
      assert second["ask"] == nil
      assert second["plan_proceeds"] == true
    end

    test "unknown fact keys fail closed: no ask invented, flow proceeds" do
      owner = mk_user()
      person = mk_user()
      result = ProfileGap.assess(owner.id, person.id, "favorite_color")
      assert result["status"] == "proceed_without"
      assert result["reason"] == "unknown_fact"
      assert ProfileGap.ledger_row(owner.id, person.id, "favorite_color") == nil
    end
  end

  describe "C2 - answer is stored through memory admission and reused silently" do
    test "answer → known next time via memory + durable Celebrations row; no second ask" do
      owner = mk_user()
      person = mk_user()
      name = person.display_name

      assert ProfileGap.birthday_plan_context(owner.id, person.id, person_name: name)["status"] ==
               "ask"

      assert {:ok, fact} =
               ProfileGap.answer(owner.id, person.id, "birthday", "2014-03-05", person_name: name)

      # Stored through the real admission path: explicit_fact, relationship scope.
      assert fact["admitted"] == true
      assert fact["kind"] == "explicit_fact"
      assert fact["dimension"] == "birthday"
      assert fact["scope"] == "relationship"
      assert fact["value"] == "2014-03-05"
      assert MemoryStore.get(fact["id"])["value"] == "2014-03-05"

      assert %OpalCore.SocialFlow.Execution.ProfileGapAsk{status: "answered"} =
               ProfileGap.ledger_row(owner.id, person.id, "birthday")

      # Durable celebration the existing birthday flows read.
      {:ok, celebrations} = Celebrations.list_for_user(owner.id)
      assert Enum.any?(celebrations, &(&1.person_name == name and &1.month == 3 and &1.day == 5))

      # Next flow: fact used silently — known, no ask payload at all.
      next_time = ProfileGap.birthday_plan_context(owner.id, person.id, person_name: name)
      assert next_time["status"] == "known"
      assert next_time["value"] == "2014-03-05"
      assert next_time["ask"] == nil
    end

    test "pre-existing Celebrations birthday is known silently without any memory write" do
      owner = mk_user()
      person = mk_user()
      name = person.display_name

      assert {:ok, _} =
               Celebrations.create(owner.id, %{
                 "person_name" => name,
                 "kind" => "birthday",
                 "month" => 11,
                 "day" => 20
               })

      result = ProfileGap.birthday_plan_context(owner.id, person.id, person_name: name)
      assert result["status"] == "known"
      assert result["value"] == "annual:11-20"
      assert result["ask"] == nil
      # Never asked → no ledger row created for a known fact.
      assert ProfileGap.ledger_row(owner.id, person.id, "birthday") == nil
    end

    test "invalid answers store nothing and do not resolve the ledger" do
      owner = mk_user()
      person = mk_user()
      _ = ProfileGap.birthday_plan_context(owner.id, person.id, person_name: person.display_name)

      assert {:error, :invalid_birthday} =
               ProfileGap.answer(owner.id, person.id, "birthday", "not-a-date")

      assert %OpalCore.SocialFlow.Execution.ProfileGapAsk{status: "asked"} =
               ProfileGap.ledger_row(owner.id, person.id, "birthday")

      assert ProfileGap.birthday_plan_context(owner.id, person.id)["status"] == "proceed_without"
    end
  end

  describe "C3 - skip path: proceeds, and the ask never returns" do
    test "skip → proceed_without/skipped forever; a later answer still lands" do
      owner = mk_user()
      person = mk_user()
      name = person.display_name

      assert ProfileGap.birthday_plan_context(owner.id, person.id, person_name: name)["status"] ==
               "ask"

      assert {:ok, _} = ProfileGap.skip(owner.id, person.id, "birthday")

      skipped = ProfileGap.birthday_plan_context(owner.id, person.id, person_name: name)
      assert skipped["status"] == "proceed_without"
      assert skipped["reason"] == "skipped"
      assert skipped["plan_proceeds"] == true

      # Skipping is not a lockout of the fact itself: if the user later
      # volunteers it in conversation, it stores and is used silently.
      assert {:ok, _} =
               ProfileGap.answer(owner.id, person.id, "birthday", "1990-07-04", person_name: name)

      assert ProfileGap.birthday_plan_context(owner.id, person.id, person_name: name)["status"] ==
               "known"
    end
  end

  describe "C4 - no leakage across people or owners" do
    test "one person's birthday and ask state never surface for another person or owner" do
      owner = mk_user()
      other_owner = mk_user()
      person_a = mk_user()
      person_b = mk_user()

      assert {:ok, _} =
               ProfileGap.answer(owner.id, person_a.id, "birthday", "2012-01-15",
                 person_name: person_a.display_name
               )

      # Same owner, different person: still unknown → gets their own single ask.
      assert ProfileGap.birthday_plan_context(owner.id, person_b.id,
               person_name: person_b.display_name
             )[
               "status"
             ] == "ask"

      # Different owner, same person: unknown → their own ask, no shared fact.
      assert ProfileGap.birthday_plan_context(other_owner.id, person_a.id,
               person_name: person_a.display_name
             )["status"] == "ask"

      assert ProfileGap.birthday_plan_context(owner.id, person_a.id,
               person_name: person_a.display_name
             )[
               "status"
             ] == "known"
    end
  end
end
