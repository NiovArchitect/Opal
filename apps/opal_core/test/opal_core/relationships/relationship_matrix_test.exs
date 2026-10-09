defmodule OpalCore.Relationships.RelationshipMatrixTest do
  @moduledoc """
  Paste I Phase 0 — relationship type → live behavior matrix.
  """
  use OpalCore.DataCase, async: false

  import OpalCore.MultiuserHarness

  alias OpalCore.Intelligence.AttentionBudget
  alias OpalCore.Relationships.Behavior

  @moduletag :relationship_matrix

  @types ~w(spouse partner family close_friend friend business acquaintance)

  # ── 0.1 Per-type defaults, planning, nudges, AttentionBudget ─────────────

  describe "0.1 defaults / planning / nudges / AttentionBudget" do
    test "defaults_for has style/planning/frequency for each of 7 types" do
      for type <- @types do
        d = Behavior.defaults_for(type)
        assert is_binary(d["style"]), "missing style for #{type}"
        assert is_binary(d["planning"]), "missing planning for #{type}"
        assert is_binary(d["frequency"]), "missing frequency for #{type}"
      end
    end

    test "plan_proposal_copy spouse vs business — warm/spontaneous vs formal/planned; copies differ" do
      spouse = Behavior.plan_proposal_copy("spouse", who: "Alex", when: "tonight")
      business = Behavior.plan_proposal_copy("business", who: "Alex", when: "tonight")

      assert spouse.tone == "warm"
      assert spouse.spontaneity == "spontaneous"
      assert business.tone == "formal"
      assert business.spontaneity == "planned"
      assert spouse.copy != business.copy
    end

    test "enforce_planning — spouse ok with 1h ahead; business needs 48h" do
      assert Behavior.enforce_planning("spouse", 1) == :ok
      assert Behavior.enforce_planning("business", 1) == {:needs_lead_time, 48}
      assert Behavior.enforce_planning("business", 48) == :ok
    end

    test "nudge_allowed? — close_friend allows proactive_thread; acquaintance denies; both allow time_critical" do
      assert Behavior.nudge_allowed?("close_friend", "proactive_thread")
      refute Behavior.nudge_allowed?("acquaintance", "proactive_thread")
      assert Behavior.nudge_allowed?("close_friend", "time_critical")
      assert Behavior.nudge_allowed?("acquaintance", "time_critical")
    end

    test "AttentionBudget.request_slot — acquaintance + priority nudge → :relationship_bounds; close_friend grants" do
      # Asia/Tokyo + established keeps CI daytime and past maturity gate
      owner =
        account!(%{timezone: "Asia/Tokyo", maturity: "established", display_name: "Owner"})

      assert {:denied, :relationship_bounds} =
               AttentionBudget.request_slot(owner.id, "nudge", "nudge", %{
                 person_id: Ecto.UUID.generate(),
                 topic: "acquaintance_nudge",
                 provenance: "stated",
                 relationship_type: "acquaintance"
               })

      assert {:granted, _slot_id} =
               AttentionBudget.request_slot(owner.id, "nudge", "nudge", %{
                 person_id: Ecto.UUID.generate(),
                 topic: "close_friend_nudge",
                 provenance: "stated",
                 relationship_type: "close_friend"
               })
    end
  end

  # ── 0.2 Type variants ────────────────────────────────────────────────────

  describe "0.2 type variants" do
    test "T1-like: dual_timezone_proposal + plan_proposal_copy spouse vs business" do
      utc = ~U[2026-10-10 01:00:00Z]
      dual = Behavior.dual_timezone_proposal(utc, "America/Los_Angeles", "Asia/Tokyo", who_b: "Jordan")

      assert is_binary(dual.for_a)
      assert is_binary(dual.for_b)
      assert dual.for_a != dual.for_b
      assert String.contains?(dual.copy_a, "Jordan")

      spouse = Behavior.plan_proposal_copy("spouse")
      business = Behavior.plan_proposal_copy("business")
      assert spouse.tone == "warm"
      assert business.tone == "formal"
      assert spouse.copy != business.copy
      assert spouse.lead_time_hours < business.lead_time_hours
    end

    test "G1-like: mediation_copy family vs business — formality warm vs formal" do
      family = Behavior.mediation_copy("family", "dinner venue")
      business = Behavior.mediation_copy("business", "dinner venue")

      assert family.formality == :warm
      assert family.tone == "warm"
      assert business.formality == :formal
      assert business.tone == "formal"
      assert family.draft != business.draft
    end

    test "M1-like: split_ask_copy close_friend vs acquaintance — tone differs; shows_balance false both" do
      close = Behavior.split_ask_copy("close_friend", 4200, "tacos")
      acq = Behavior.split_ask_copy("acquaintance", 4200, "tacos")

      assert close.tone == "casual"
      assert acq.tone == "formal"
      assert close.body != acq.body
      assert close.shows_balance == false
      assert acq.shows_balance == false
    end

    test "I1-like: invite_copy close_friend vs business — body differs" do
      close = Behavior.invite_copy("close_friend", "Sam")
      business = Behavior.invite_copy("business", "Sam")

      assert close.tone == "casual"
      assert business.tone == "formal"
      assert close.body != business.body
      assert close.shame_free
      assert business.shame_free
    end

    test "E3-like: reminder_copy partner vs acquaintance — warmth differs" do
      partner = Behavior.reminder_copy("partner", "call Mom")
      acq = Behavior.reminder_copy("acquaintance", "call Mom")

      assert partner.tone == "warm"
      assert acq.tone == "formal"
      assert partner.body != acq.body
      assert String.contains?(partner.body, "Hey love")
      refute String.contains?(acq.body, "Hey love")
    end

    test "P2: privacy — seed_private_memory! ex facts stay out of mediation draft; assert_no_leak!" do
      owner = account!(%{display_name: "Owner"})
      viewer = account!(%{display_name: "Viewer"})
      ex_person = Ecto.UUID.generate()

      seed_private_memory!(owner.id, ex_person, %{
        "ex_name" => "Jamie ExPartner",
        "breakup_reason" => "cheated-in-2023",
        "sensitive_note" => "never-mention-tahoe-cabin"
      })

      draft = Behavior.mediation_copy("family", "weekend plans", silent_note: "Pat")

      refute String.contains?(draft.draft, "Jamie ExPartner")
      refute String.contains?(draft.draft, "cheated-in-2023")
      refute String.contains?(draft.draft, "never-mention-tahoe-cabin")

      assert_no_leak!(viewer.id, owner.id, [
        "Jamie ExPartner",
        "cheated-in-2023",
        "never-mention-tahoe-cabin"
      ])
    end
  end

  # ── 0.3 Group composition ────────────────────────────────────────────────

  describe "0.3 group composition" do
    test "same 4 member types — family vacation vs quarterly offsite formality/planning differ" do
      members = ["family", "spouse", "close_friend", "friend"]

      vacation = Behavior.group_context(members, label: "family vacation")
      offsite = Behavior.group_context(members, label: "quarterly offsite")

      assert vacation.formality == :warm
      assert vacation.planning == "spontaneous"
      assert offsite.formality == :formal
      assert offsite.planning == "planned"
      assert vacation.formality != offsite.formality
      assert vacation.planning != offsite.planning
    end
  end
end
