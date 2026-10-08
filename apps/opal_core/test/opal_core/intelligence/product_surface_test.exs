defmodule OpalCore.Intelligence.ProductSurfaceTest do
  use OpalCore.DataCase, async: false

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Events.EventOutbox
  alias OpalCore.Intelligence.ProductSurface
  alias OpalCore.Repo
  alias OpalCore.SocialMemory.{
    GroupDecisionState,
    PersonMemory,
    Routine,
    TemporalAnchor,
    WeeklyBriefing
  }

  setup do
    account_id = Ecto.UUID.generate()
    other_id = Ecto.UUID.generate()
    maya_id = Ecto.UUID.generate()

    for {id, handle, name} <- [
          {account_id, "own_" <> String.slice(account_id, 0, 6), "Owner"},
          {other_id, "oth_" <> String.slice(other_id, 0, 6), "Other"},
          {maya_id, "maya_" <> String.slice(maya_id, 0, 6), "Maya"}
        ] do
      {:ok, _} =
        %User{}
        |> User.changeset(%{id: id, handle: handle, display_name: name})
        |> Repo.insert()
    end

    {:ok, account_id: account_id, other_id: other_id, maya_id: maya_id}
  end

  test "person memory GET/PATCH/DELETE round-trip + cross-account 404", %{
    account_id: aid,
    other_id: oid,
    maya_id: maya
  } do
    {:ok, _} =
      %PersonMemory{}
      |> PersonMemory.changeset(%{
        account_id: aid,
        person_id: maya,
        relationship_type: "close_friend",
        known_facts: %{
          "birthday" => %{
            "value" => "June 14",
            "provenance" => "stated",
            "confidence" => 0.9,
            "source_note" => "you mentioned this in March"
          }
        },
        open_loops: [
          %{"id" => "loop-1", "summary" => "Saturday dinner unconfirmed", "conversation_id" => Ecto.UUID.generate()}
        ]
      })
      |> Repo.insert()

    sat = Date.add(Date.utc_today(), 3)

    {:ok, _} =
      %TemporalAnchor{}
      |> TemporalAnchor.changeset(%{
        account_id: aid,
        person_id: maya,
        anchor_type: "birthday",
        date: sat,
        confidence: 0.9,
        confirmed: true
      })
      |> Repo.insert()

    {:ok, _} =
      %Routine{}
      |> Routine.changeset(%{
        account_id: aid,
        person_id: maya,
        activity: "coffee",
        cadence: "weekly",
        day_of_week: 2,
        confidence: 0.8,
        detection_count: 8,
        provenance: "observed"
      })
      |> Repo.insert()

    assert {:ok, view} = ProductSurface.get_person_memory(aid, maya)
    assert view["display_name"] == "Maya"
    assert view["relationship_type"] == "close_friend"
    assert Enum.any?(view["known_facts"], &(&1["key"] == "birthday"))
    assert length(view["rhythms"]) == 1
    assert length(view["important_dates"]) == 1
    assert length(view["open_loops"]) == 1

    # Other account → not_found, zero leak
    assert {:error, :not_found} = ProductSurface.get_person_memory(oid, maya)

    assert {:ok, fact} =
             ProductSurface.patch_fact(aid, maya, "birthday", "June 15",
               source_note: "corrected by owner"
             )

    assert fact["value"] == "June 15"
    assert fact["provenance"] == "stated"

    assert {:ok, view2} = ProductSurface.get_person_memory(aid, maya)
    bday = Enum.find(view2["known_facts"], &(&1["key"] == "birthday"))
    assert bday["value"] == "June 15"

    assert {:error, :confirm_required} = ProductSurface.delete_fact(aid, maya, "birthday", false)
    assert {:ok, _} = ProductSurface.delete_fact(aid, maya, "birthday", true)
    assert {:ok, view3} = ProductSurface.get_person_memory(aid, maya)
    refute Enum.any?(view3["known_facts"], &(&1["key"] == "birthday"))

    assert {:error, :not_found} =
             ProductSurface.patch_fact(oid, maya, "birthday", "hack", source_note: "x")
  end

  test "mediation list/send/dismiss + outbox", %{account_id: aid} do
    conv = Ecto.UUID.generate()

    {:ok, state} =
      %GroupDecisionState{}
      |> GroupDecisionState.changeset(%{
        account_id: aid,
        conversation_id: conv,
        topic: "Saturday dinner",
        consensus_status: "blocked",
        proposals: [
          %{"proposal_text" => "Rooftop 8pm", "supporters" => [Ecto.UUID.generate()], "opponents" => []},
          %{"proposal_text" => "Juniper 7:30", "supporters" => [Ecto.UUID.generate()], "opponents" => []}
        ],
        silent_participants: [Ecto.UUID.generate()],
        last_activity_at: DateTime.utc_now() |> DateTime.truncate(:microsecond),
        mediation_meta: %{"draft" => "Let's pick a lane."}
      })
      |> Repo.insert()

    assert {:ok, items} = ProductSurface.list_mediation(aid)
    assert Enum.any?(items, &(&1["id"] == state.id))

    assert {:ok, %{delivered_via: :owner_draft, item: sent}} =
             ProductSurface.send_mediation(aid, state.id, "Edited draft for the group")

    assert sent["card_state"] == "sent"

    outbox =
      from(o in EventOutbox, where: o.aggregate_id == ^state.id)
      |> Repo.all()

    assert Enum.any?(outbox, &(&1.event_type == "intelligence.mediation.sent"))

    assert {:ok, dismissed} = ProductSurface.dismiss_mediation(aid, state.id)
    assert dismissed["card_state"] == "dismissed"
  end

  test "briefing current 404 + next_briefing_at; dismiss", %{account_id: aid} do
    assert {:error, :not_found, %{"next_briefing_at" => next}} =
             ProductSurface.current_briefing(aid)

    assert is_binary(next)

    week_start = Date.beginning_of_week(Date.utc_today(), :monday)

    {:ok, b} =
      %WeeklyBriefing{}
      |> WeeklyBriefing.changeset(%{
        account_id: aid,
        week_start: week_start,
        content: "Confirmed: Maya coffee Tue\nStill open: Saturday dinner?\nWant options?",
        generated_at: DateTime.utc_now() |> DateTime.truncate(:microsecond),
        structured: %{
          "header" => "Your week ahead",
          "confirmed" => [%{"label" => "Maya coffee", "day" => "Tue"}],
          "still_open" => [
            %{"label" => "Saturday dinner", "link" => %{"kind" => "conversation", "id" => "c1"}}
          ],
          "tight_spots" => [],
          "suggestion" => %{"label" => "Leave Thursday free"},
          "question" => %{
            "label" => "Want Opal to draft Saturday options?",
            "link" => %{"kind" => "plan_create", "prefill" => "Draft Saturday dinner options"}
          }
        }
      })
      |> Repo.insert()

    assert {:ok, cur} = ProductSurface.current_briefing(aid)
    assert cur["id"] == b.id
    assert cur["header"] == "Your week ahead"
    assert cur["question"]["link"]["kind"] == "plan_create"

    assert {:ok, _} = ProductSurface.dismiss_briefing(aid, b.id)
    assert {:error, :dismissed, _} = ProductSurface.current_briefing(aid)
  end
end
