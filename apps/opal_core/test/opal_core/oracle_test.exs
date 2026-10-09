defmodule OpalCore.OracleTest do
  @moduledoc """
  Paste J Phase 2 — Oracle awareness. Grounded Q&A from real fixtures.
  """
  use OpalCore.DataCase, async: false

  import OpalCore.MultiuserHarness

  alias OpalCore.OpalConversations
  alias OpalCore.OpalIntent
  alias OpalCore.Oracle
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.SharedPlan
  alias OpalCore.SocialMemory.PersonMemory
  alias OpalCore.Trips
  alias OpalCore.TrustTiers
  alias OpalCore.Wallets

  @moduletag :oracle

  setup do
    owner = account!(%{display_name: "Alex Oracle", timezone: "Etc/UTC"})
    maya = account!(%{display_name: "Maya Chen", timezone: "Etc/UTC"})
    chanel = account!(%{display_name: "Chanel Brooks", timezone: "Etc/UTC"})
    john = account!(%{display_name: "John Smith", timezone: "Etc/UTC"})

    set_type!(owner.id, maya.id, "close_friend")
    set_type!(owner.id, chanel.id, "close_friend")
    set_type!(owner.id, john.id, "friend")

    TrustTiers.grant_tier(owner.id, "known", "system")
    TrustTiers.grant_tier(owner.id, "trusted", "system")

    ctx = %{
      user: %{
        id: owner.id,
        display_name: owner.display_name,
        handle: owner.handle,
        timezone: "Etc/UTC"
      },
      social: %{
        frequent_contacts: [
          %{user_id: maya.id, display_name: maya.display_name},
          %{user_id: chanel.id, display_name: chanel.display_name},
          %{user_id: john.id, display_name: john.display_name}
        ],
        group_patterns: []
      },
      temporal: %{recent_plans: [], upcoming_celebrations: [], active_conversation_count: 0},
      conversation_history: [],
      trust_tier: "trusted",
      message: %{text: "", length: 0, sent_at: DateTime.to_iso8601(DateTime.utc_now())}
    }

    %{owner: owner, maya: maya, chanel: chanel, john: john, ctx: ctx}
  end

  defp saturday_utc do
    # Test env may be utc_only — seed Saturday in UTC so Oracle date match is stable.
    today = Date.utc_today()
    sat = Date.add(today, rem(6 - Date.day_of_week(today) + 7, 7))
    DateTime.new!(sat, ~T[19:00:00], "Etc/UTC")
  end

  test "classifies the seven oracle questions + gossip anti", %{ctx: ctx} do
    assert Oracle.classify("What am I doing Saturday?") == :saturday_plans
    assert Oracle.classify("When did I last see Maya?") == :last_saw
    assert Oracle.classify("What's the status of the Tokyo trip?") == :trip_status
    assert Oracle.classify("Who haven't I talked to in a while?") == :stale_contacts
    assert Oracle.classify("Find me a time for dinner with Chanel next week") == :find_time
    assert Oracle.classify("What did we decide about the venue?") == :venue_decision
    assert Oracle.classify("How much have I spent on plans this month?") == :spend_month
    assert Oracle.classify("What did Maya say about me to John?") == :gossip_probe

    assert {:ok, %{intent: :oracle, entities: %{kind: :saturday_plans}}} =
             OpalIntent.classify("What am I doing Saturday?", ctx)
  end

  test "Saturday plans answer is grounded in SharedPlan start_at", %{
    owner: owner,
    maya: maya,
    ctx: ctx
  } do
    start_at = saturday_utc()

    plan =
      create_shared_plan!(owner.id, [maya.id], %{
        title: "Saturday dinner at Fort Oak",
        time_label: "Saturday 7pm",
        status: "agreed",
        location: "Fort Oak"
      })

    {:ok, plan} =
      plan
      |> SharedPlan.changeset(%{"start_at" => start_at})
      |> Repo.update()

    assert {:ok, %{kind: :saturday_plans, text: text, grounded: true, sources: sources}} =
             Oracle.answer(owner.id, "What am I doing Saturday?", ctx)

    assert text =~ "Saturday"
    assert text =~ "Fort Oak" or text =~ plan.title
    assert Enum.any?(sources, &String.contains?(&1, plan.id))
    refute text =~ "—"
  end

  test "last saw Maya uses PersonMemory last_contact_at", %{owner: owner, maya: maya, ctx: ctx} do
    at = ~U[2026-09-12 18:30:00.000000Z]

    {:ok, pm} =
      %PersonMemory{}
      |> PersonMemory.changeset(%{
        account_id: owner.id,
        person_id: maya.id,
        relationship_type: "close_friend",
        last_contact_at: at,
        cadence_status: "stable",
        known_facts: %{}
      })
      |> Repo.insert()

    assert {:ok, %{kind: :last_saw, text: text, sources: sources}} =
             Oracle.answer(owner.id, "When did I last see Maya?", ctx)

    assert text =~ "Maya"
    assert text =~ "Sep" or text =~ "2026"
    assert Enum.any?(sources, &String.contains?(&1, pm.id))
  end

  test "Tokyo trip status from Trips.list_trips_for_user", %{owner: owner, maya: maya, ctx: ctx} do
    assert {:ok, trip} =
             Trips.create_trip(owner.id, %{
               "title" => "Tokyo trip",
               "destination_label" => "Tokyo",
               "starts_on" => "2026-11-01",
               "ends_on" => "2026-11-08",
               "user_ids" => [maya.id]
             })

    assert {:ok, %{kind: :trip_status, text: text, sources: sources}} =
             Oracle.answer(owner.id, "What's the status of the Tokyo trip?", ctx)

    assert text =~ "Tokyo"
    assert text =~ "people" or text =~ "stops"
    assert Enum.any?(sources, &String.contains?(&1, trip.id))
  end

  test "stale contacts from cooling PersonMemory", %{
    owner: owner,
    maya: maya,
    chanel: chanel,
    ctx: ctx
  } do
    old = DateTime.add(DateTime.utc_now(), -40 * 86_400, :second)

    for {peer, _} <- [{maya, "Maya"}, {chanel, "Chanel"}] do
      {:ok, _} =
        %PersonMemory{}
        |> PersonMemory.changeset(%{
          account_id: owner.id,
          person_id: peer.id,
          relationship_type: "close_friend",
          last_contact_at: old,
          cadence_status: "cooling",
          contact_frequency_days: 7.0,
          known_facts: %{}
        })
        |> Repo.insert()
    end

    assert {:ok, %{kind: :stale_contacts, text: text}} =
             Oracle.answer(owner.id, "Who haven't I talked to in a while?", ctx)

    assert text =~ "Maya" or text =~ "Chanel"
    assert text =~ "while" or text =~ "haven't"
  end

  test "find time is honest when calendar disconnected", %{owner: owner, chanel: chanel, ctx: ctx} do
    assert {:ok, %{kind: :find_time, text: text, sources: sources}} =
             Oracle.answer(
               owner.id,
               "Find me a time for dinner with Chanel next week",
               ctx
             )

    assert text =~ "Chanel"
    assert text =~ "calendar" or text =~ "Connect"
    assert "calendar:disconnected" in sources
    refute text =~ chanel.id
  end

  test "venue decision from conversation_history", %{owner: owner, ctx: ctx} do
    ctx =
      Map.put(ctx, :conversation_history, [
        %{role: "user", body: "Let's do Fort Oak for the venue"},
        %{role: "opal", body: "Got it. Fort Oak locked in."}
      ])

    assert {:ok, %{kind: :venue_decision, text: text, sources: sources}} =
             Oracle.answer(owner.id, "What did we decide about the venue?", ctx)

    assert text =~ "Fort Oak"
    assert "conversation_history" in sources
  end

  test "spend this month from wallet ledger (trusted)", %{owner: owner, ctx: ctx} do
    {:ok, wallet} = Wallets.get_or_create_wallet(owner.id)

    {:ok, _} =
      Wallets.load(wallet, 10_000, "pi_oracle_load", "oracle-load-1", allow_test_load: true)

    {:ok, wallet} = Wallets.get_or_create_wallet(owner.id)

    {:ok, _} =
      Wallets.spend(wallet, 2500, "plan:oracle", "oracle-spend-1", explicit_confirm: true)

    assert {:ok, %{kind: :spend_month, text: text}} =
             Oracle.answer(owner.id, "How much have I spent on plans this month?", ctx)

    assert text =~ "$25.00" or text =~ "25"
    assert text =~ "month"
  end

  test "anti: Maya→John gossip never invents or leaks", %{owner: owner, maya: maya, john: john, ctx: ctx} do
    seed_private_memory!(maya.id, owner.id, %{
      "secret_about_alex" => "Alex hates jazz",
      "said_to_john" => "Alex is unreliable"
    })

    assert {:ok, %{kind: :gossip_probe, text: text, grounded: true}} =
             Oracle.answer(owner.id, "What did Maya say about me to John?", ctx)

    down = String.downcase(text)
    assert down =~ "don't know" or down =~ "i don't know" or down =~ "only see"
    refute text =~ "jazz"
    refute text =~ "unreliable"
    refute text =~ maya.id
    refute text =~ john.id

    # Full Center path
    assert {:ok, {_c, _u, opal}} =
             OpalConversations.create_user_message(
               owner.id,
               "What did Maya say about me to John?"
             )

    assert opal.body =~ "don't know" or opal.body =~ "only see"
    refute opal.body =~ "jazz"
    refute opal.body =~ "system prompt"
  end

  test "Center create_user_message answers Saturday from real plan", %{
    owner: owner,
    maya: maya
  } do
    start_at = saturday_utc()

    plan =
      create_shared_plan!(owner.id, [maya.id], %{
        title: "Farmers market walk",
        time_label: "Saturday morning",
        status: "agreed"
      })

    {:ok, _} =
      plan
      |> SharedPlan.changeset(%{"start_at" => start_at})
      |> Repo.update()

    assert {:ok, {_c, _u, opal}} =
             OpalConversations.create_user_message(owner.id, "What am I doing Saturday?")

    assert opal.metadata["intent"]["intent"] == "oracle"
    assert opal.body =~ "Farmers market" or opal.body =~ "Saturday"
    refute opal.body =~ "—"
  end
end
