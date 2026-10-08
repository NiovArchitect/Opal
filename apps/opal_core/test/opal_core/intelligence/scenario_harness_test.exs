defmodule OpalCore.Intelligence.ScenarioHarnessTest do
  @moduledoc """
  Paste F Phase 7 — seven narrative scenarios against real ProductSurface / owners.

  Tagged `:scenario`. Idempotent setup (UUID fixtures per test).
  """
  use OpalCore.DataCase, async: false

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Events.EventOutbox
  alias OpalCore.Intelligence.{BroadcastChoreography, GroupCoordinator, ProductSurface}
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.AttentionCenterItem

  alias OpalCore.SocialMemory.{
    GroupDecisionState,
    PersonMemory,
    TemporalAnchor,
    WeeklyBriefing
  }

  alias OpalCore.SocialMemory.Workers.WeeklyBriefingWorker

  setup do
    owner_id = Ecto.UUID.generate()

    {:ok, _} =
      %User{}
      |> User.changeset(%{
        id: owner_id,
        handle: "sc_owner_" <> String.slice(owner_id, 0, 6),
        display_name: "Owner"
      })
      |> Repo.insert()

    {:ok, _} =
      %OpalCore.SocialFlow.AssistancePreference{}
      |> OpalCore.SocialFlow.AssistancePreference.changeset(%{
        user_id: owner_id,
        timezone: "America/Los_Angeles",
        intelligence_maturity: "established"
      })
      |> Repo.insert()

    {:ok, owner_id: owner_id}
  end

  defp insert_person(display_name) do
    id = Ecto.UUID.generate()

    {:ok, _} =
      %User{}
      |> User.changeset(%{
        id: id,
        handle: String.downcase(display_name) <> "_" <> String.slice(id, 0, 4),
        display_name: display_name
      })
      |> Repo.insert()

    id
  end

  defp seed_maya_memory(owner_id) do
    maya_id = insert_person("Maya")

    {:ok, pm} =
      %PersonMemory{}
      |> PersonMemory.changeset(%{
        account_id: owner_id,
        person_id: maya_id,
        relationship_type: "close_friend",
        known_facts: %{
          "birthday" => %{
            "value" => "June 14",
            "provenance" => "stated",
            "confidence" => 0.9,
            "source_note" => "you mentioned this in March"
          },
          "cuisine" => %{"value" => "quiet Italian", "provenance" => "observed", "confidence" => 0.7}
        },
        open_loops: [%{"id" => Ecto.UUID.generate(), "summary" => "Saturday dinner unconfirmed"}]
      })
      |> Repo.insert()

    {maya_id, pm}
  end

  @tag :scenario
  test "1 — Owner opens Maya person memory transparency", %{owner_id: owner_id} do
    {maya_id, _} = seed_maya_memory(owner_id)
    assert {:ok, view} = ProductSurface.get_person_memory(owner_id, maya_id)
    assert view["display_name"] == "Maya"
    assert Enum.any?(view["known_facts"], &(&1["key"] == "birthday" and &1["provenance"] == "stated"))
    assert is_list(view["rhythms"])
    assert is_list(view["important_dates"])
  end

  @tag :scenario
  test "2 — Owner corrects Maya birthday fact", %{owner_id: owner_id} do
    {maya_id, _} = seed_maya_memory(owner_id)

    assert {:ok, fact} =
             ProductSurface.patch_fact(owner_id, maya_id, "birthday", "June 15",
               source_note: "corrected by owner"
             )

    assert fact["value"] == "June 15"
    assert fact["provenance"] == "stated"
  end

  @tag :scenario
  test "3 — Owner archives a wrong cuisine fact", %{owner_id: owner_id} do
    {maya_id, _} = seed_maya_memory(owner_id)
    assert {:ok, _} = ProductSurface.delete_fact(owner_id, maya_id, "cuisine", true)
    assert {:ok, view} = ProductSurface.get_person_memory(owner_id, maya_id)
    refute Enum.any?(view["known_facts"], &(&1["key"] == "cuisine"))
  end

  @tag :scenario
  test "4 — Owner confirms inferred fact / marks wrong", %{owner_id: owner_id} do
    {maya_id, _} = seed_maya_memory(owner_id)

    assert {:ok, _} =
             ProductSurface.patch_fact(owner_id, maya_id, "hobby", "surfing",
               source_note: "guess"
             )

    # Force inferred
    pm = Repo.get_by!(PersonMemory, account_id: owner_id, person_id: maya_id)
    facts = Map.put(pm.known_facts, "hobby", %{"value" => "surfing", "provenance" => "inferred"})
    {:ok, _} = pm |> PersonMemory.changeset(%{known_facts: facts}) |> Repo.update()

    assert {:ok, fact} = ProductSurface.confirm_fact(owner_id, maya_id, "hobby", "confirm")
    assert fact["provenance"] == "stated"

    assert {:ok, _} = ProductSurface.confirm_fact(owner_id, maya_id, "hobby", "wrong")
    assert {:ok, view} = ProductSurface.get_person_memory(owner_id, maya_id)
    refute Enum.any?(view["known_facts"], &(&1["key"] == "hobby"))
  end

  @tag :scenario
  test "5 — Group blocked → mediation send records outbox owner_draft", %{owner_id: owner_id} do
    conv = insert_group!(owner_id, [insert_person("Sam"), insert_person("Alex")])

    {:ok, state} =
      %GroupDecisionState{}
      |> GroupDecisionState.changeset(%{
        account_id: owner_id,
        conversation_id: conv,
        topic: "Saturday dinner",
        consensus_status: "blocked",
        proposals: [
          %{"proposal_text" => "Rooftop", "supporters" => [owner_id], "opponents" => []},
          %{"proposal_text" => "Juniper", "supporters" => [Ecto.UUID.generate()], "opponents" => []}
        ],
        last_activity_at: DateTime.utc_now() |> DateTime.truncate(:microsecond),
        mediation_meta: %{"draft" => "Split — pick a lane?", "card_state" => "pending"}
      })
      |> Repo.insert()

    assert {:ok, result} = ProductSurface.send_mediation(owner_id, state.id, "Owner edited draft")
    assert result.delivered_via == :owner_draft
    assert result.item["card_state"] == "sent"

    assert Repo.exists?(
             from(o in EventOutbox, where: o.event_type == "intelligence.mediation.sent")
           )
  end

  @tag :scenario
  test "6 — Mediation dismiss suppresses 7 days", %{owner_id: owner_id} do
    conv = Ecto.UUID.generate()

    {:ok, state} =
      %GroupDecisionState{}
      |> GroupDecisionState.changeset(%{
        account_id: owner_id,
        conversation_id: conv,
        topic: "brunch",
        consensus_status: "blocked",
        proposals: [
          %{"proposal_text" => "A", "supporters" => [owner_id], "opponents" => []},
          %{"proposal_text" => "B", "supporters" => [Ecto.UUID.generate()], "opponents" => []}
        ],
        last_activity_at: DateTime.utc_now() |> DateTime.truncate(:microsecond)
      })
      |> Repo.insert()

    assert {:ok, item} = ProductSurface.dismiss_mediation(owner_id, state.id)
    assert item["card_state"] == "dismissed"

    updated = Repo.get!(GroupDecisionState, state.id)
    assert match?(%DateTime{}, updated.mediation_dismissed_until)
    assert {:suppressed, :dismissed} = GroupCoordinator.maybe_mediate_to_owner(updated)
  end

  @tag :scenario
  test "7 — Weekly briefing + consensus channel owner isolation + temporal enrichment", %{
    owner_id: owner_id
  } do
    # Briefing
    assert {:ok, %WeeklyBriefing{} = briefing} = WeeklyBriefingWorker.generate_for(owner_id)
    assert {:ok, contract} = ProductSurface.get_briefing(owner_id, briefing.id)
    assert contract["header"] == "Your week ahead"
    assert is_map(contract["question"])

    # Channel isolation: owner gets weekly_briefing; foreign does not
    foreign = Ecto.UUID.generate()
    Phoenix.PubSub.subscribe(OpalCore.PubSub, "user:#{owner_id}")
    Phoenix.PubSub.subscribe(OpalCore.PubSub, "user:#{foreign}")

    assert :ok =
             BroadcastChoreography.broadcast_named(
               "intelligence:weekly_briefing",
               owner_id,
               %{"briefing_id" => briefing.id, "summary" => "week"}
             )

    assert_receive %Phoenix.Socket.Broadcast{
                     topic: topic,
                     event: "intelligence:weekly_briefing"
                   },
                   500

    assert topic == "user:#{owner_id}"
    refute_receive %Phoenix.Socket.Broadcast{topic: "user:" <> ^foreign}, 100

    # Consensus lock-in payload + channel
    conv = insert_group!(owner_id, [insert_person("Jordan"), insert_person("Alex")])

    {:ok, state} =
      %GroupDecisionState{}
      |> GroupDecisionState.changeset(%{
        account_id: owner_id,
        conversation_id: conv,
        topic: "dinner",
        consensus_status: "reached",
        proposals: [
          %{
            "proposal_text" => "Juniper 7:30",
            "supporters" => [owner_id, Ecto.UUID.generate(), Ecto.UUID.generate()],
            "opponents" => []
          }
        ],
        last_activity_at: DateTime.utc_now() |> DateTime.truncate(:microsecond)
      })
      |> Repo.insert()

    assert {:ok, payload} = ProductSurface.lock_in_plan(owner_id, state.id)
    assert payload["winning_proposal"] == "Juniper 7:30"

    assert {:ok, created} =
             ProductSurface.create_plan_from_mediation(owner_id, state.id, %{
               "title" => "Juniper 7:30"
             })

    assert created["created"] == true
    assert is_map(created["plan"])

    # Temporal attention enrichment
    maya_id = insert_person("Maya")
    date = Date.add(Date.utc_today(), 3)

    {:ok, anchor} =
      %TemporalAnchor{}
      |> TemporalAnchor.changeset(%{
        account_id: owner_id,
        person_id: maya_id,
        anchor_type: "birthday",
        date: date,
        confidence: 0.9,
        confirmed: true,
        provenance: "stated"
      })
      |> Repo.insert()

    {:ok, item} =
      %AttentionCenterItem{}
      |> AttentionCenterItem.changeset(%{
        owner_user_id: owner_id,
        dedupe_key: "temporal:#{anchor.id}",
        section: "needs_you",
        title: "Maya's birthday",
        status: "active",
        source_type: "temporal_anchor",
        action_required: true,
        badge_eligible: true,
        metadata: %{"anchor_id" => anchor.id, "person_id" => maya_id, "source_id" => anchor.id}
      })
      |> Repo.insert()

    contract = AttentionCenterItem.to_contract(item)
    assert contract["lifecycle"] in ["upcoming", "day_of", "planned", "passed_unplanned"]
    assert contract["person_id"] == maya_id
    assert contract["anchor_type"] == "birthday"
    assert contract["days_until"] == 3
    assert contract["plan_status"] in ["none", "planned"]
  end

  defp insert_group!(owner_id, peer_ids) when is_list(peer_ids) do
    assert {:ok, result} =
             OpalCore.Messages.create_group_conversation(owner_id, peer_ids, label: "scenario")

    result.conversation_id || result[:conversation_id] || result.id
  end
end
