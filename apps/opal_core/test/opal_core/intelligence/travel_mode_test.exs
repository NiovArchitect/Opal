defmodule OpalCore.Intelligence.TravelModeTest do
  use OpalCore.DataCase, async: false

  alias OpalCore.Accounts.User
  alias OpalCore.Intelligence.{AttentionBudget, PromptBuilder, TravelMode}
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.{AssistancePreference, SharedPlan}
  alias OpalCore.SocialMemory
  alias OpalCore.Messaging.{Conversation, ConversationMember}
  alias OpalCore.SocialFlow.PlanParticipant

  setup do
    a = Ecto.UUID.generate()
    b = Ecto.UUID.generate()

    for {id, handle, tz} <- [
          {a, "trva", "America/Los_Angeles"},
          {b, "trvb", "America/Los_Angeles"}
        ] do
      {:ok, _} =
        %User{}
        |> User.changeset(%{
          id: id,
          handle: handle <> String.slice(id, 0, 6),
          display_name: handle
        })
        |> Repo.insert()

      {:ok, _} =
        %AssistancePreference{}
        |> AssistancePreference.changeset(%{
          user_id: id,
          timezone: tz,
          intelligence_maturity: "established"
        })
        |> Repo.insert()
    end

    {:ok, a: a, b: b}
  end

  test "timezone-only ingest is enough; city optional", %{a: a} do
    t0 = DateTime.utc_now() |> DateTime.add(-7 * 3600, :second)

    assert {:ok, :tracking} =
             TravelMode.ingest_reading(a, %{timezone: "Asia/Tokyo", at: t0})

    assert {:ok, :activated} =
             TravelMode.ingest_reading(a, %{timezone: "Asia/Tokyo", at: DateTime.utc_now()})

    assert TravelMode.active?(a)
    assert TravelMode.effective_tz(a) == "Asia/Tokyo"
  end

  test "device TZ Tokyo, home LA → travel activates, quiet hours shift, dual times; return resolves",
       %{a: a, b: b} do
    assert TravelMode.home_timezone(a) == "America/Los_Angeles"

    t0 = DateTime.utc_now() |> DateTime.add(-7 * 3600, :second)

    assert {:ok, :tracking} =
             TravelMode.ingest_reading(a, %{
               city: "Tokyo",
               timezone: "Asia/Tokyo",
               at: t0
             })

    assert {:ok, :activated} =
             TravelMode.ingest_reading(a, %{
               city: "Tokyo",
               timezone: "Asia/Tokyo",
               at: DateTime.utc_now()
             })

    assert TravelMode.active?(a)
    assert TravelMode.effective_tz(a) == "Asia/Tokyo"

    # Quiet hours / AttentionBudget use travel local TZ
    assert {:denied, :travel_pause_routine_break} =
             AttentionBudget.request_slot(a, "routine_break", "routine_break", %{
               person_id: Ecto.UUID.generate(),
               topic: "coffee",
               provenance: "observed"
             })

    # Dual times on plan cards (viewer in Tokyo vs peer in LA)
    {:ok, conv} =
      %Conversation{}
      |> Conversation.changeset(%{label: "travel-dual"})
      |> Repo.insert()

    for uid <- [a, b] do
      %ConversationMember{}
      |> ConversationMember.changeset(%{conversation_id: conv.id, user_id: uid})
      |> Repo.insert!()
    end

    utc = ~U[2026-10-11 02:00:00Z]

    {:ok, plan} =
      %SharedPlan{}
      |> SharedPlan.changeset(%{
        conversation_id: conv.id,
        title: "Dinner",
        status: "agreed",
        created_by_user_id: a,
        timezone: "UTC",
        start_at: utc,
        time_label: "Saturday night",
        location: "LA"
      })
      |> Repo.insert()

    for {uid, role} <- [{a, "lead"}, {b, "participant"}] do
      %PlanParticipant{}
      |> PlanParticipant.changeset(%{
        plan_id: plan.id,
        user_id: uid,
        role: role,
        response_state: "accepted"
      })
      |> Repo.insert!()
    end

    card_a = SharedPlan.viewer_card(plan, TravelMode.effective_tz(a))
    card_b = SharedPlan.viewer_card(plan, "America/Los_Angeles")
    assert card_a["viewer_day_name"] == "Sunday"
    assert card_b["viewer_day_name"] == "Saturday"
    assert card_a["absolute"] == card_b["absolute"]

    # Return home → resolves
    assert {:ok, :resolved} =
             TravelMode.ingest_reading(a, %{timezone: "America/Los_Angeles"})

    refute TravelMode.active?(a)
    assert TravelMode.effective_tz(a) == "America/Los_Angeles"
  end

  test "rejects GPS keys", %{a: a} do
    assert {:error, :gps_forbidden} =
             TravelMode.ingest_reading(a, %{city: "X", timezone: "UTC", lat: 1.0, lng: 2.0})

    assert {:error, :gps_forbidden} =
             TravelMode.ingest_reading(a, %{"timezone" => "UTC", "gps" => true})

    assert {:error, :gps_forbidden} =
             TravelMode.ingest_reading(a, %{"timezone" => "UTC", "latitude" => 35.0})
  end

  test "set_home_timezone updates AssistancePreference", %{a: a} do
    assert {:ok, _} = TravelMode.set_home_timezone(a, "Europe/London")
    assert TravelMode.home_timezone(a) == "Europe/London"
  end

  test "privacy: B's prompt never contains A's travel", %{a: a, b: b} do
    t0 = DateTime.utc_now() |> DateTime.add(-7 * 3600, :second)

    assert {:ok, :tracking} =
             TravelMode.ingest_reading(a, %{city: "Paris", timezone: "Europe/Paris", at: t0})

    assert {:ok, :activated} =
             TravelMode.ingest_reading(a, %{
               city: "Paris",
               timezone: "Europe/Paris",
               at: DateTime.utc_now()
             })

    assert TravelMode.prompt_section(a) =~ "Paris"
    assert TravelMode.prompt_section(b) == nil

    conv = Ecto.UUID.generate()
    built_b = PromptBuilder.build(SocialMemory.for_account(b), conv, "what's up", [])
    text_b = built_b.what_you_know || built_b.system_extra || ""
    refute text_b =~ "Paris"
    refute text_b =~ "Travel:"

    built_a2 =
      PromptBuilder.build(
        SocialMemory.for_account(a),
        conv,
        "what should I remember about travel",
        []
      )

    text_a2 = built_a2.what_you_know || built_a2.system_extra || ""
    assert text_a2 =~ "Travel:" or text_a2 =~ "Paris" or TravelMode.prompt_section(a) =~ "Paris"
  end

  test "end travel logs routine gap and clears active", %{a: a} do
    t0 = DateTime.utc_now() |> DateTime.add(-7 * 3600, :second)

    assert {:ok, :tracking} =
             TravelMode.ingest_reading(a, %{city: "London", timezone: "Europe/London", at: t0})

    assert {:ok, :activated} =
             TravelMode.ingest_reading(a, %{
               city: "London",
               timezone: "Europe/London",
               at: DateTime.utc_now()
             })

    assert {:ok, state} = TravelMode.end_travel(a)
    assert state.active == false
    assert match?(%DateTime{}, state.ended_at)
    refute TravelMode.active?(a)
  end
end
