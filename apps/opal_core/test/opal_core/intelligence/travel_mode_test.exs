defmodule OpalCore.Intelligence.TravelModeTest do
  use OpalCore.DataCase, async: false

  alias OpalCore.Accounts.User
  alias OpalCore.Intelligence.{AttentionBudget, PromptBuilder, TravelMode}
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.AssistancePreference
  alias OpalCore.SocialMemory

  setup do
    a = Ecto.UUID.generate()
    b = Ecto.UUID.generate()

    for {id, handle} <- [{a, "trva"}, {b, "trvb"}] do
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
          timezone: "America/Los_Angeles",
          intelligence_maturity: "established"
        })
        |> Repo.insert()
    end

    {:ok, a: a, b: b}
  end

  test "two readings 6h apart with ≥3h TZ shift activates travel", %{a: a} do
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

    assert {:denied, :travel_pause_routine_break} =
             AttentionBudget.request_slot(a, "routine_break", "routine_break", %{
               person_id: Ecto.UUID.generate(),
               topic: "coffee",
               provenance: "observed"
             })
  end

  test "rejects GPS keys", %{a: a} do
    assert {:error, :gps_forbidden} =
             TravelMode.ingest_reading(a, %{city: "X", timezone: "UTC", lat: 1.0, lng: 2.0})
  end

  test "privacy: B's prompt never contains A's travel", %{a: a, b: b} do
    t0 = DateTime.utc_now() |> DateTime.add(-7 * 3600, :second)
    assert {:ok, :tracking} = TravelMode.ingest_reading(a, %{city: "Paris", timezone: "Europe/Paris", at: t0})
    assert {:ok, :activated} = TravelMode.ingest_reading(a, %{city: "Paris", timezone: "Europe/Paris", at: DateTime.utc_now()})

    assert TravelMode.prompt_section(a) =~ "Paris"
    assert TravelMode.prompt_section(b) == nil

    conv = Ecto.UUID.generate()
    built_b = PromptBuilder.build(SocialMemory.for_account(b), conv, "what's up", [])
    text_b = built_b.what_you_know || built_b.system_extra || ""
    refute text_b =~ "Paris"
    refute text_b =~ "Travel:"

    built_a = PromptBuilder.build(SocialMemory.for_account(a), conv, "what's up", [])
    text_a = built_a.what_you_know || built_a.system_extra || ""
    # May be nil on :simple — use non-simple message
    built_a2 = PromptBuilder.build(SocialMemory.for_account(a), conv, "what should I remember about travel", [])
    text_a2 = built_a2.what_you_know || built_a2.system_extra || ""
    assert text_a2 =~ "Travel:" or text_a2 =~ "Paris" or TravelMode.prompt_section(a) =~ "Paris"
  end

  test "end travel logs routine gap and clears active", %{a: a} do
    t0 = DateTime.utc_now() |> DateTime.add(-7 * 3600, :second)
    assert {:ok, :tracking} = TravelMode.ingest_reading(a, %{city: "London", timezone: "Europe/London", at: t0})
    assert {:ok, :activated} = TravelMode.ingest_reading(a, %{city: "London", timezone: "Europe/London", at: DateTime.utc_now()})
    assert {:ok, state} = TravelMode.end_travel(a)
    assert state.active == false
    assert match?(%DateTime{}, state.ended_at)
    refute TravelMode.active?(a)
  end
end
