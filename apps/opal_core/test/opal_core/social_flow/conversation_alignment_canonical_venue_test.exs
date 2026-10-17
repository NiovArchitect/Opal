defmodule OpalCore.SocialFlow.ConversationAlignmentCanonicalVenueTest do
  @moduledoc """
  Repair #15 (Track G) — canonical venue surgery regression tests.

  Old semantics: `canonical_from_text/1` recognized only three hardcoded
  San Diego restaurants (Juniper & Ivy, Herb & Wood, Fort Oak). Every other
  place — including the catalog's own coffee / active / quiet candidates —
  could not be proposed, locked, restored, or nominated.

  New semantics: a place locks because participants confirmed it through
  the fold's existing mechanics (peer confirm, both-selected, convergence,
  change-accept, restore of an already-locked value), and it is recognized
  through the real pipelines (CandidateProvider catalog, explicit
  structured actions, the plan's own state), never a 3-name list.

  Per-call-site coverage:
  1. note_place (chat extraction) — catalog + generic named places;
     guards against times/activities/people becoming places.
  2. place_propose action replay — any plausible structured name; garbage
     values still ignored.
  3. place_lock action replay (restore) — any plausible name restores.
  4. apply_accepted_change (place) — generic names lock on accept.
  5. maybe_synth_place (locked-state synthesis) — covered in the DB file
     (repair15_canonical_venue_db_test.exs) via sync_conversation.
  6. nominate_place / canonical_place — covered in the DB file.
  """
  use ExUnit.Case, async: true

  alias OpalCore.SocialFlow.ConversationAlignment

  defp msg(id, body, sender \\ "user-a"), do: %{id: id, body: body, sender_user_id: sender}

  defp act(kind, actor, value, seq, truth \\ "proposed") do
    %{
      "kind" => kind,
      "actor_user_id" => actor,
      "value" => value,
      "seq" => seq,
      "truth" => truth,
      "explicit" => true
    }
  end

  defp dinner_messages do
    [
      msg("1", "Can you meet tomorrow?"),
      msg("2", "Any time after 6 works.", "user-b"),
      msg("3", "Let's do 6:30.")
    ]
  end

  defp dinner_actions(extra \\ []) do
    [act("activity_lock", "user-a", "dinner", 10, "user_stated")] ++ extra
  end

  # --- Call site 2 + lock mechanics: non-dinner catalog places lock -------

  test "coffee catalog place (Bird Rock Coffee) proposes and locks on peer confirm" do
    state =
      ConversationAlignment.fold(dinner_messages(), ["user-a", "user-b"], [
        act("activity_lock", "user-a", "coffee", 10, "user_stated"),
        act("place_propose", "user-a", "Bird Rock Coffee", 11),
        act("place_confirm", "user-b", "Bird Rock Coffee", 12, "agreed")
      ])

    assert state["place"]["state"] == "locked"
    assert state["place"]["value"] == "Bird Rock Coffee"
    assert state["place"]["lock_reason"] == "confirmed"
  end

  test "active catalog place (Torrey Pines) locks when both select it" do
    state =
      ConversationAlignment.fold(dinner_messages(), ["user-a", "user-b"], [
        act("activity_lock", "user-a", "something active", 10, "user_stated"),
        act("place_propose", "user-a", "Torrey Pines", 11),
        act("place_propose", "user-b", "Torrey Pines", 12)
      ])

    assert state["place"]["state"] == "locked"
    assert state["place"]["value"] == "Torrey Pines"
    assert state["place"]["lock_reason"] == "both_selected"
  end

  test "garbage place_propose values are still ignored (no regression to anything-goes)" do
    for bad <- ["6:30 PM", "", "dinner", "7"] do
      state =
        ConversationAlignment.fold(
          dinner_messages(),
          ["user-a", "user-b"],
          dinner_actions([act("place_propose", "user-a", bad, 11)])
        )

      assert state["place"]["state"] == "unknown",
             "expected #{inspect(bad)} to be ignored, got #{inspect(state["place"])}"
    end
  end

  # --- Call site 3: restore ------------------------------------------------

  test "place_lock restores a non-catalog place verbatim" do
    state =
      ConversationAlignment.fold(
        dinner_messages(),
        ["user-a", "user-b"],
        dinner_actions([act("place_lock", "user-a", "Harbor Table", 11, "locked")])
      )

    assert state["place"]["state"] == "locked"
    assert state["place"]["value"] == "Harbor Table"
    assert state["place"]["lock_reason"] == "restored"
  end

  test "place_lock still normalizes a partial catalog mention" do
    state =
      ConversationAlignment.fold(
        dinner_messages(),
        ["user-a", "user-b"],
        dinner_actions([act("place_lock", "user-a", "juniper", 11, "locked")])
      )

    assert state["place"]["value"] == "Juniper & Ivy"
  end

  # --- Call site 1: chat extraction ----------------------------------------

  test "chat: 'Let's do Harbor Table' proposes a generic place; peer 'yes' locks it" do
    state =
      ConversationAlignment.fold(
        dinner_messages() ++
          [msg("4", "Let's do Harbor Table", "user-a"), msg("5", "yes", "user-b")],
        ["user-a", "user-b"],
        dinner_actions()
      )

    assert state["place"]["state"] == "locked"
    assert state["place"]["value"] == "Harbor Table"
    assert state["place"]["lock_reason"] == "confirmed"
  end

  test "chat: generic place with trailing talk stops at the name ('Fort Oak for the venue' shape)" do
    state =
      ConversationAlignment.fold(
        dinner_messages() ++ [msg("4", "Let's do Contramar for the venue", "user-a")],
        ["user-a", "user-b"],
        dinner_actions()
      )

    assert state["place"]["state"] == "candidate"
    assert state["place"]["value"] == "Contramar"
  end

  test "chat: partial catalog mention still resolves ('Let's do Juniper')" do
    state =
      ConversationAlignment.fold(
        dinner_messages() ++ [msg("4", "Let's do Juniper", "user-a")],
        ["user-a", "user-b"],
        dinner_actions()
      )

    assert state["place"]["value"] == "Juniper & Ivy"
  end

  test "chat: catalog places beyond dinner are recognized (Bird Rock Coffee)" do
    state =
      ConversationAlignment.fold(
        dinner_messages() ++ [msg("4", "Let's do Bird Rock Coffee", "user-a")],
        ["user-a", "user-b"],
        [act("activity_lock", "user-a", "coffee", 10, "user_stated")]
      )

    assert state["place"]["state"] == "candidate"
    assert state["place"]["value"] == "Bird Rock Coffee"
  end

  test "chat guards: times, activities, days and people never become places" do
    for body <- [
          "Let's do 6:30.",
          "Let's do dinner",
          "Make it Saturday",
          "Actually make it 7",
          "Actually Maya said she is coming"
        ] do
      state =
        ConversationAlignment.fold(
          dinner_messages() ++ [msg("4", body, "user-b")],
          ["user-a", "user-b"],
          dinner_actions()
        )

      assert state["place"]["state"] == "unknown",
             "expected no place from #{inspect(body)}, got #{inspect(state["place"])}"
    end
  end

  test "chat: retargeting a locked generic place reopens only the place" do
    state =
      ConversationAlignment.fold(
        dinner_messages() ++
          [%{id: "4", body: "Actually Contramar", sender_user_id: "user-b", seq: 20}],
        ["user-a", "user-b"],
        dinner_actions([
          act("place_propose", "user-a", "Harbor Table", 11),
          act("place_confirm", "user-b", "Harbor Table", 12, "agreed")
        ])
      )

    assert state["place"]["state"] == "candidate"
    assert state["place"]["value"] == "Contramar"
    assert state["exact_time"]["state"] == "locked"
  end

  test "conflict and convergence work for generic places" do
    conflicted =
      ConversationAlignment.fold(
        dinner_messages(),
        ["user-a", "user-b"],
        dinner_actions([
          act("place_propose", "user-a", "Harbor Table", 11),
          act("place_propose", "user-b", "Contramar", 12)
        ])
      )

    assert conflicted["place"]["state"] == "conflicted"
    assert Enum.map(conflicted["conflict_options"], & &1["name"]) == ["Harbor Table", "Contramar"]

    converged =
      ConversationAlignment.fold(
        dinner_messages(),
        ["user-a", "user-b"],
        dinner_actions([
          act("place_propose", "user-a", "Harbor Table", 11),
          act("place_propose", "user-b", "Contramar", 12),
          act("place_propose", "user-a", "Contramar", 13)
        ])
      )

    assert converged["place"]["state"] == "locked"
    assert converged["place"]["value"] == "Contramar"
    assert converged["place"]["lock_reason"] == "converged"
  end

  # --- Call site 4: accepted committed change ------------------------------

  test "accepted place change locks a generic place" do
    propose = %{
      "kind" => "change_propose",
      "actor_user_id" => "user-b",
      "value" => "Harbor Table",
      "field" => "place",
      "seq" => 20,
      "truth" => "proposed",
      "explicit" => true
    }

    accept = %{
      "kind" => "change_accept",
      "actor_user_id" => "user-a",
      "value" => "Harbor Table",
      "field" => "place",
      "seq" => 21,
      "truth" => "agreed",
      "explicit" => true
    }

    state =
      ConversationAlignment.fold(
        dinner_messages(),
        ["user-a", "user-b"],
        dinner_actions([
          act("place_propose", "user-a", "Juniper & Ivy", 11),
          act("place_confirm", "user-b", "Juniper & Ivy", 12, "agreed"),
          propose,
          accept
        ])
      )

    assert state["place"]["state"] == "locked"
    assert state["place"]["value"] == "Harbor Table"
    assert state["place"]["lock_reason"] == "change_accepted"
  end

  # --- Catalog recognition is provider-owned -------------------------------

  test "CandidateProvider.catalog_match covers the whole catalog and nothing else" do
    alias OpalCore.SocialFlow.CandidateProvider

    assert CandidateProvider.catalog_match("let's do juniper") == "Juniper & Ivy"
    assert CandidateProvider.catalog_match("herb and wood tonight") == "Herb & Wood"
    assert CandidateProvider.catalog_match("fort oak") == "Fort Oak"
    assert CandidateProvider.catalog_match("bird rock coffee") == "Bird Rock Coffee"
    assert CandidateProvider.catalog_match("torrey pines") == "Torrey Pines"
    assert CandidateProvider.catalog_match("meditation gardens") == "Meditation Gardens"
    assert CandidateProvider.catalog_match("harbor table") == nil
    assert CandidateProvider.catalog_match("") == nil
    assert CandidateProvider.catalog_match(nil) == nil
  end
end
