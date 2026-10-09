defmodule OpalCore.Relationships.RelationshipAsymmetryTest do
  @moduledoc """
  Paste I Phase 0.5 — one-directional labels + Access A7 asymmetric visibility.
  """
  use OpalCore.DataCase, async: false

  import OpalCore.MultiuserHarness

  alias OpalCore.Relationships
  alias OpalCore.Relationships.{Access, Behavior}

  @moduletag :relationship_matrix

  describe "0.5 + A7 asymmetry" do
    test "A close_friend / B friend — each side uses OWN type; reverse label never leaks" do
      a = account!(%{display_name: "Alex"})
      b = account!(%{display_name: "Blake"})

      set_type!(a.id, b.id, "close_friend")
      set_type!(b.id, a.id, "friend")

      assert Relationships.get_type(a.id, b.id) == "close_friend"
      assert Relationships.get_type(b.id, a.id) == "friend"

      a_copy = Behavior.plan_proposal_copy(Relationships.get_type(a.id, b.id), who: "Blake")
      b_copy = Behavior.plan_proposal_copy(Relationships.get_type(b.id, a.id), who: "Alex")

      assert a_copy.spontaneity == "spontaneous"
      assert b_copy.spontaneity == "planned"
      assert a_copy.copy != b_copy.copy
      assert a_copy.tone == "casual"
      assert b_copy.tone == "casual"

      a_contract = Access.viewer_safe_relationship_contract(a.id, b.id)
      b_contract = Access.viewer_safe_relationship_contract(b.id, a.id)

      assert a_contract["my_type"] == "close_friend"
      assert a_contract["their_type_for_me"] == nil
      assert a_contract["asymmetry_visible"] == false

      assert b_contract["my_type"] == "friend"
      assert b_contract["their_type_for_me"] == nil

      refute Access.leaks_reverse_label?(a_contract, "friend")
      refute Access.leaks_reverse_label?(b_contract, "close_friend")

      a_row = Relationships.for_user(a.id) |> Enum.find(&(&1.contact_user_id == b.id))
      b_row = Relationships.for_user(b.id) |> Enum.find(&(&1.contact_user_id == a.id))

      assert Relationships.to_contract(a_row)["their_type_for_me"] == nil
      assert Relationships.to_contract(b_row)["their_type_for_me"] == nil
      refute Access.leaks_reverse_label?(Relationships.to_contract(a_row), "friend")
      refute Access.leaks_reverse_label?(Relationships.to_contract(b_row), "close_friend")
    end

    test "A7 asymmetric share visibility — close_friend sees family-scoped; friend does not" do
      a = account!(%{display_name: "Alex"})
      b = account!(%{display_name: "Blake"})

      set_type!(a.id, b.id, "close_friend")
      set_type!(b.id, a.id, "friend")

      # B's family reunion — only B is participant; A sees via :inner + :family
      b_family =
        create_shared_plan!(b.id, [], %{
          title: "Family reunion picnic",
          alignment: %{"scope" => "family"}
        })

      # A (close_friend of B) sees B's family-scoped plan without being a participant
      assert Access.can_see_plan?(a.id, b_family)
      # Creator remains a participant → B always sees own plan
      assert Access.can_see_plan?(b.id, b_family)

      # A's family plan — B is only :social toward A → cannot see family scope
      a_family =
        create_shared_plan!(a.id, [], %{
          title: "Family reunion dinner",
          alignment: %{"scope" => "family"}
        })

      refute Access.can_see_plan?(b.id, a_family)
      assert Access.can_see_plan?(a.id, a_family)

      # Reverse labels still absent from safe contracts after share checks
      contract = Access.viewer_safe_relationship_contract(b.id, a.id)
      assert contract["their_type_for_me"] == nil
      refute Access.leaks_reverse_label?(contract, "close_friend")
    end
  end
end
