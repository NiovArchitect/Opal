defmodule OpalCore.SocialFlow.PlanTransitionTest do
  @moduledoc """
  Repair #13 (W6 gyroscope) — the transition gate's own contract.

  These tests pin the table as DATA: every legal (from, action) resolves to
  its target, and every other combination is refused. Adding a new legal
  transition means adding a table entry AND its justification here — the
  gate cannot be quietly widened by a call site.
  """

  use ExUnit.Case, async: true

  alias OpalCore.SocialFlow.PlanRevision
  alias OpalCore.SocialFlow.PlanTransition
  alias OpalCore.SocialFlow.Proposal
  alias OpalCore.SocialFlow.SharedPlan

  @plan_statuses ~w(tentative agreed changed cancelled completed)
  @proposal_statuses ~w(proposed visible approved_for_coordination dismissed expired superseded converted)
  @revision_statuses ~w(proposed accepted rejected expired superseded)

  # --- transition/3: the table resolves -------------------------------------

  describe "transition/3 resolves every legal move" do
    test "the whole table round-trips" do
      for {{entity, from, action}, to} <- PlanTransition.tables() do
        assert {:ok, ^to} = PlanTransition.transition(entity, from, action),
               "expected #{entity} #{inspect(from)} + #{action} -> #{to}"
      end
    end

    test "every declared legal move is covered by the table (no missing rows)" do
      expected = [
        {:plan, nil, :create, "tentative"},
        {:plan, nil, :create_agreed, "agreed"},
        {:plan, "tentative", :agree, "agreed"},
        {:plan, "tentative", :change, "changed"},
        {:plan, "tentative", :cancel, "cancelled"},
        {:plan, "agreed", :change, "changed"},
        {:plan, "agreed", :cancel, "cancelled"},
        {:plan, "agreed", :complete, "completed"},
        {:plan, "changed", :change, "changed"},
        {:plan, "changed", :cancel, "cancelled"},
        {:plan, "changed", :complete, "completed"},
        {:proposal, nil, :create, "visible"},
        {:proposal, "proposed", :approve, "approved_for_coordination"},
        {:proposal, "visible", :approve, "approved_for_coordination"},
        {:proposal, "proposed", :dismiss, "dismissed"},
        {:proposal, "visible", :dismiss, "dismissed"},
        {:proposal, "approved_for_coordination", :dismiss, "dismissed"},
        {:proposal, "proposed", :convert, "converted"},
        {:proposal, "visible", :convert, "converted"},
        {:proposal, "approved_for_coordination", :convert, "converted"},
        {:proposal, "proposed", :supersede, "superseded"},
        {:proposal, "visible", :supersede, "superseded"},
        {:proposal, "proposed", :expire, "expired"},
        {:proposal, "visible", :expire, "expired"},
        {:proposal, "approved_for_coordination", :expire, "expired"},
        {:revision, nil, :propose, "proposed"},
        {:revision, nil, :accept_direct, "accepted"},
        {:revision, "proposed", :accept, "accepted"},
        {:revision, "proposed", :reject, "rejected"}
      ]

      table = PlanTransition.tables()

      for {entity, from, action, to} <- expected do
        assert Map.get(table, {entity, from, action}) == to,
               "missing table row: #{entity} #{inspect(from)} + #{action} -> #{to}"
      end

      assert map_size(table) == length(expected),
             "table has rows not declared above — widen the gate deliberately, with a test"
    end
  end

  # --- illegal moves are structurally refused --------------------------------

  describe "transition/3 refuses everything the table does not allow" do
    test "F12-62 class: terminal plans are terminal (no resurrection)" do
      for status <- ~w(cancelled completed),
          action <- [:agree, :change, :cancel, :complete, :create] do
        assert {:error, :illegal_transition} = PlanTransition.transition(:plan, status, action),
               "expected refusal: plan #{status} + #{action}"
      end
    end

    test "terminal proposals and revisions are terminal" do
      for status <- ~w(dismissed expired superseded converted),
          action <- [:approve, :dismiss, :convert, :supersede, :expire] do
        assert {:error, :illegal_transition} =
                 PlanTransition.transition(:proposal, status, action),
               "expected refusal: proposal #{status} + #{action}"
      end

      for status <- ~w(accepted rejected expired superseded),
          action <- [:accept, :reject, :expire, :supersede] do
        assert {:error, :illegal_transition} =
                 PlanTransition.transition(:revision, status, action),
               "expected refusal: revision #{status} + #{action}"
      end
    end

    test "confirm-without-proposal is unrepresentable: accept only from proposed" do
      # A revision that was never proposed (born accepted, rejected, ...) has
      # no accept path — the two-user confirm flow always goes proposed first.
      assert {:error, :illegal_transition} =
               PlanTransition.transition(:revision, "rejected", :accept)

      assert {:error, :illegal_transition} =
               PlanTransition.transition(:revision, "accepted", :accept)

      assert {:error, :illegal_transition} = PlanTransition.transition(:revision, nil, :accept)
    end

    test "exhaustive: every (status x action) not in the table is refused" do
      table = PlanTransition.tables()

      combos = [
        {:plan, @plan_statuses ++ [nil],
         [:create, :create_agreed, :agree, :change, :cancel, :complete]},
        {:proposal, @proposal_statuses ++ [nil],
         [:create, :approve, :dismiss, :convert, :supersede, :expire]},
        {:revision, @revision_statuses ++ [nil],
         [:propose, :accept_direct, :accept, :reject, :expire, :supersede]}
      ]

      for {entity, statuses, actions} <- combos,
          from <- statuses,
          action <- actions,
          not Map.has_key?(table, {entity, from, action}) do
        assert {:error, :illegal_transition} = PlanTransition.transition(entity, from, action),
               "expected refusal: #{entity} #{inspect(from)} + #{action}"
      end
    end
  end

  # --- terminal?/2 + legal_actions/2 + from_statuses/2 ------------------------

  describe "terminal?/2" do
    test "terminal statuses have no legal outbound actions" do
      assert PlanTransition.terminal?(:plan, "cancelled")
      assert PlanTransition.terminal?(:plan, "completed")
      refute PlanTransition.terminal?(:plan, "agreed")

      for status <- ~w(dismissed expired superseded converted),
          do: assert(PlanTransition.terminal?(:proposal, status))

      refute PlanTransition.terminal?(:proposal, "visible")

      for status <- ~w(accepted rejected expired superseded),
          do: assert(PlanTransition.terminal?(:revision, status))

      refute PlanTransition.terminal?(:revision, "proposed")
    end

    test "a terminal status reports zero legal actions" do
      assert PlanTransition.legal_actions(:plan, "cancelled") == []
      assert PlanTransition.legal_actions(:proposal, "converted") == []
      assert PlanTransition.legal_actions(:revision, "accepted") == []
    end

    test "legal_actions lists the table's moves from a live status" do
      assert PlanTransition.legal_actions(:plan, "agreed") == [:cancel, :change, :complete]

      assert PlanTransition.legal_actions(:proposal, "visible") == [
               :approve,
               :convert,
               :dismiss,
               :expire,
               :supersede
             ]

      assert PlanTransition.legal_actions(:revision, "proposed") == [:accept, :reject]
    end
  end

  describe "from_statuses/2" do
    test "update_all-style writers derive their filters from the gate" do
      assert Enum.sort(PlanTransition.from_statuses(:proposal, :supersede)) ==
               ["proposed", "visible"]

      assert Enum.sort(PlanTransition.from_statuses(:proposal, :expire)) ==
               ["approved_for_coordination", "proposed", "visible"]

      assert PlanTransition.from_statuses(:plan, :cancel) ==
               ["agreed", "changed", "tentative"]
    end
  end

  # --- guard_changeset/3 ------------------------------------------------------

  describe "guard_changeset/3" do
    defp plan_changeset(from_status, attempted_status) do
      %SharedPlan{
        status: from_status,
        title: "Dinner",
        created_by_user_id: Ecto.UUID.generate(),
        timezone: "UTC",
        conversation_id: Ecto.UUID.generate()
      }
      |> SharedPlan.changeset(%{status: attempted_status})
    end

    test "legal move passes when the named target agrees with the gate" do
      cs =
        plan_changeset("agreed", "cancelled")
        |> PlanTransition.guard_changeset(:plan, :cancel)

      assert cs.valid?
      assert Ecto.Changeset.get_change(cs, :status) == "cancelled"
    end

    test "a writer naming a target that contradicts the action is refused" do
      # The caller asks for :cancel but names "changed" — a contradiction.
      # The gate refuses loudly instead of silently correcting, so a logic
      # bug at the call site can never hide behind the gate.
      cs =
        plan_changeset("agreed", "changed")
        |> PlanTransition.guard_changeset(:plan, :cancel)

      refute cs.valid?
      assert {:status, {"illegal transition" <> _, _}} = hd(cs.errors)
    end

    test "illegal move marks the changeset invalid — the row can never commit" do
      cs =
        plan_changeset("cancelled", "changed")
        |> PlanTransition.guard_changeset(:plan, :change)

      refute cs.valid?
      assert {:status, {"illegal transition" <> _, _}} = hd(cs.errors)
    end

    test "non-status writes pass through untouched" do
      cs =
        %SharedPlan{
          status: "cancelled",
          title: "Old",
          created_by_user_id: Ecto.UUID.generate(),
          timezone: "UTC",
          conversation_id: Ecto.UUID.generate()
        }
        |> SharedPlan.changeset(%{title: "New"})
        |> PlanTransition.guard_changeset(:plan, :change)

      assert cs.valid?
      assert Ecto.Changeset.get_change(cs, :status) == nil
      assert Ecto.Changeset.get_change(cs, :title) == "New"
    end

    test "creation is gated: :create births tentative, :create_agreed births agreed" do
      cs =
        %SharedPlan{
          title: "Dinner",
          created_by_user_id: Ecto.UUID.generate(),
          timezone: "UTC",
          conversation_id: Ecto.UUID.generate()
        }
        |> SharedPlan.changeset(%{status: "tentative"})
        |> PlanTransition.guard_changeset(:plan, :create)

      assert cs.valid?
      assert Ecto.Changeset.get_change(cs, :status) == "tentative"

      cs2 =
        %SharedPlan{
          title: "Dinner",
          created_by_user_id: Ecto.UUID.generate(),
          timezone: "UTC",
          conversation_id: Ecto.UUID.generate()
        }
        |> SharedPlan.changeset(%{status: "agreed"})
        |> PlanTransition.guard_changeset(:plan, :create_agreed)

      assert cs2.valid?
      assert Ecto.Changeset.get_change(cs2, :status) == "agreed"
    end

    test "a row cannot be born terminal" do
      cs =
        %SharedPlan{
          title: "Dinner",
          created_by_user_id: Ecto.UUID.generate(),
          timezone: "UTC",
          conversation_id: Ecto.UUID.generate()
        }
        |> SharedPlan.changeset(%{status: "cancelled"})
        |> PlanTransition.guard_changeset(:plan, :create)

      refute cs.valid?
    end

    test "proposal and revision changesets are gated the same way" do
      pcs =
        %Proposal{status: "converted", conversation_id: Ecto.UUID.generate(), capability: "x"}
        |> Proposal.changeset(%{status: "dismissed"})
        |> PlanTransition.guard_changeset(:proposal, :dismiss)

      refute pcs.valid?
      assert {:status, {"illegal transition" <> _, _}} = hd(pcs.errors)

      # A rejected revision can never be accepted: from=rejected is a real
      # status change attempt, and the gate refuses it.
      rcs =
        %PlanRevision{
          status: "rejected",
          plan_id: Ecto.UUID.generate(),
          proposed_by_user_id: Ecto.UUID.generate(),
          proposed_changes: %{}
        }
        |> PlanRevision.changeset(%{status: "accepted"})
        |> PlanTransition.guard_changeset(:revision, :accept)

      refute rcs.valid?
      assert {:status, {"illegal transition" <> _, _}} = hd(rcs.errors)
    end
  end
end
