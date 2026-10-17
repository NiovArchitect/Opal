defmodule OpalCore.Intelligence.ExtractorDynamicTest do
  @moduledoc """
  Repair #14 (H1/H2) — extraction is user-dynamic, not founder-hardcoded.

  Proves:
  - person extraction resolves against the SPEAKING user's actual
    contacts/relationships (arbitrary names, incl. multi-word display
    names the grammar-only path cannot produce);
  - different users get different people for the same-shaped message;
  - the old built-in circle (Maya/Jordan/Chanelle/Alex) has no special
    status: bare mentions with no contact + no grammar cue extract nobody;
  - the generic grammar path still finds arbitrary names with no user;
  - venue candidates are generic (any named venue), resolved downstream
    by the Places gateway — and a person is never mislabeled as a place.
  """
  use OpalCore.DataCase, async: true

  alias OpalCore.Intelligence.{Event, Extractor}
  alias OpalCore.MultiuserHarness, as: H

  defp owner_with_contact(owner_name, contact_name) do
    owner = H.account!(%{display_name: owner_name})
    contact = H.account!(%{display_name: contact_name})
    _rel = H.set_type!(owner.id, contact.id, "close_friend")
    {owner, contact}
  end

  describe "H1 — contacts of the speaking user" do
    test "multi-word contact display name resolves via user_id" do
      {owner, _contact} = owner_with_contact("Renata Ruiz", "Zoe Park")

      {_intent, entities, _vibe} =
        Extractor.classify_message("dinner with Zoe Park saturday", %{user_id: owner.id})

      # The grammar-only path can only yield single tokens ("Zoe"); the full
      # display name proves live contact resolution.
      assert entities["person"] == "Zoe Park"
    end

    test "identity keys from the event context (actor_id / account_id) resolve too" do
      {owner, _contact} = owner_with_contact("Renata Ruiz", "Zoe Park")

      {_i, e1, _v} =
        Extractor.classify_message("dinner with Zoe Park saturday", %{actor_id: owner.id})

      {_i, e2, _v} =
        Extractor.classify_message("dinner with Zoe Park saturday", %{account_id: owner.id})

      assert e1["person"] == "Zoe Park"
      assert e2["person"] == "Zoe Park"
    end

    test "per-user variance: another user's contacts do not leak in" do
      {owner_a, _} = owner_with_contact("Renata Ruiz", "Zoe Park")
      {owner_b, _} = owner_with_contact("Marcus Webb", "Liam Ortiz")

      {_i, ea, _v} =
        Extractor.classify_message("coffee with Liam Ortiz tomorrow", %{user_id: owner_a.id})

      {_i, eb, _v} =
        Extractor.classify_message("coffee with Liam Ortiz tomorrow", %{user_id: owner_b.id})

      # Owner B resolves the full contact name; owner A only gets the
      # generic single-token candidate — never B's contact record.
      assert eb["person"] == "Liam Ortiz"
      assert ea["person"] == "Liam"
    end

    test "event path threads the actor identity into the rules fallback" do
      {owner, _contact} = owner_with_contact("Renata Ruiz", "Zoe Park")

      event = %Event{
        type: "message.sent",
        actor_id: owner.id,
        conversation_id: Ecto.UUID.generate(),
        payload: %{"body" => "dinner with Zoe Park saturday"}
      }

      {_intent, entities, _vibe, _source, _meta} =
        Extractor.extract_message("dinner with Zoe Park saturday", event)

      assert entities["person"] == "Zoe Park"
    end

    test "explicit contacts list in context resolves without any built-in names" do
      {_i, entities, _v} =
        Extractor.classify_message("lunch with Mary Jane friday", %{contacts: ["Mary Jane"]})

      assert entities["person"] == "Mary Jane"
    end

    test "the old built-in circle has no special status" do
      # Bare founder-circle mentions, no contact match, no grammar cue.
      {_i, e1, _v} = Extractor.classify_message("Maya", %{contacts: ["Zoe Park"]})
      {_i, e2, _v} = Extractor.classify_message("Chanelle", %{})

      assert e1["person"] == nil
      assert e2["person"] == nil
    end
  end

  describe "H1 — generic grammar path (no user identity)" do
    test "arbitrary names extract via grammar cues" do
      {_i, e1, _v} = Extractor.classify_message("coffee with Priya tomorrow?")
      {_i, e2, _v} = Extractor.classify_message("remind me to call Dmitri monday")
      {_i, e3, _v} = Extractor.classify_message("Fatima just got engaged!!")

      assert e1["person"] == "Priya"
      assert e2["person"] == "Dmitri"
      assert e3["person"] == "Fatima"
    end

    test "corpus-shaped founder names still extract — as ordinary names" do
      {_i, e1, _v} = Extractor.classify_message("coffee with Alex tomorrow?")
      {_i, e2, _v} = Extractor.classify_message("saturday market with Chanelle?")

      assert e1["person"] == "Alex"
      assert e2["person"] == "Chanelle"
    end

    test "days and months are not people" do
      {_i, e1, _v} = Extractor.classify_message("Saturday is better for me")
      {_i, e2, _v} = Extractor.classify_message("call May tomorrow")

      assert e1["person"] == nil
      assert e2["person"] == nil
    end
  end

  describe "H2 — generic venue candidates" do
    test "any named venue is a candidate, not just a fixed list" do
      {_i, e1, _v} = Extractor.classify_message("Book a table at Chez Nous for 7pm")
      {_i, e2, _v} = Extractor.classify_message("dinner at Contramar tonight?")
      {_i, e3, _v} = Extractor.classify_message("can you reserve a hotel near Soumaya")

      assert e1["place"] == "Chez Nous"
      assert e2["place"] == "Contramar"
      assert e3["place"] == "Soumaya"
    end

    test "leading venue mention resolves and the person is not the place" do
      {_i, entities, _v} = Extractor.classify_message("Quintonil saturday with Maya — yes?")

      assert entities["place"] == "Quintonil"
      assert entities["person"] == "Maya"
    end

    test "no venue named → no place invented" do
      {_i, entities, _v} = Extractor.classify_message("let's do dinner saturday")

      assert entities["place"] == nil
    end

    test "booking verb names the venue; a bare day word is never a place" do
      {_i, e1, _v} = Extractor.classify_message("if Maya free then book Contramar Friday")
      {_i, e2, _v} = Extractor.classify_message("don't book Friday")

      assert e1["place"] == "Contramar"
      assert e2["place"] == nil
    end
  end
end
