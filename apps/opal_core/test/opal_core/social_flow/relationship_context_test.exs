defmodule OpalCore.SocialFlow.RelationshipContextTest do
  use ExUnit.Case, async: true

  alias OpalCore.SocialFlow.ConversationAlignment
  alias OpalCore.SocialFlow.RelationshipPresentation

  test "unknown and inferred relationships stay blank" do
    assert RelationshipPresentation.label_for(%{}, "viewer-a") == nil

    assert RelationshipPresentation.label_for(
             %{
               "status" => "candidate",
               "explicit" => false,
               "canonical_type" => "girlfriend",
               "source" => "inferred",
               "labels" => %{"viewer-a" => "Girlfriend"}
             },
             "viewer-a"
           ) == nil
  end

  test "a parent and a child see different confirmed labels" do
    edge = %{
      "status" => "confirmed",
      "explicit" => true,
      "canonical_type" => "parent_child",
      "source" => "explicit",
      "privacy" => "participants",
      "labels" => %{"parent" => "Daughter", "child" => "Dad"}
    }

    assert RelationshipPresentation.label_for(edge, "parent") == "Daughter"
    assert RelationshipPresentation.label_for(edge, "child") == "Dad"
  end

  test "a private label does not leak to the other person" do
    edge = %{
      "status" => "confirmed",
      "explicit" => true,
      "canonical_type" => "dating",
      "source" => "explicit",
      "privacy" => "private",
      "labels" => %{"a" => "Girlfriend"}
    }

    assert RelationshipPresentation.label_for(edge, "a") == "Girlfriend"
    assert RelationshipPresentation.label_for(edge, "b") == nil
  end

  test "romantic status is not confirmed from inference" do
    edge = %{
      "status" => "confirmed",
      "explicit" => true,
      "canonical_type" => "girlfriend",
      "source" => "inferred",
      "privacy" => "participants",
      "labels" => %{"a" => "Girlfriend"}
    }

    assert RelationshipPresentation.label_for(edge, "a") == nil
  end

  test "a later plan edit does not rewrite the first plan-set summary" do
    original = %{
      "commitment" => "execution_ready",
      "plan_lines" => ["Tuesday · Sep 29", "7:30 PM", "Fort Oak"]
    }

    frozen = ConversationAlignment.freeze_plan_set_event(original, nil)
    changed = Map.put(original, "plan_lines", ["Tuesday · Sep 29", "8:00 PM", "Fort Oak"])
    kept = ConversationAlignment.freeze_plan_set_event(changed, frozen)

    assert frozen["plan_set_event"]["summary"] == "Tuesday · Sep 29 · 7:30 PM · Fort Oak"
    assert kept["plan_set_event"]["summary"] == "Tuesday · Sep 29 · 7:30 PM · Fort Oak"
    assert kept["plan_lines"] == ["Tuesday · Sep 29", "8:00 PM", "Fort Oak"]
  end
end
