defmodule OpalCore.CelebrationCurationTest do
  use OpalCore.DataCase, async: false

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.CelebrationCuration
  alias OpalCore.Celebrations
  alias OpalCore.Celebrations.CelebrationReminderWorker
  alias OpalCore.FinancialProfiles
  alias OpalCore.FixturesHelper
  alias OpalCore.GroupTastes
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.AssistancePreference
  alias OpalCore.SocialFlow.AttentionCenterItem
  alias OpalCore.SocialFlow.DurablePreferenceMemory
  alias OpalCore.SocialFlow.PlanParticipant
  alias OpalCore.SocialFlow.SharedPlan
  alias OpalCore.TrustTiers

  setup do
    FixturesHelper.seed!()
    :ok
  end

  defp fresh_user!(prefix) do
    %User{}
    |> User.changeset(%{
      handle: "#{prefix}_#{System.unique_integer([:positive])}",
      display_name: prefix
    })
    |> Repo.insert!()
  end

  defp grant_known!(user_id) do
    assert {:ok, _} = TrustTiers.grant_tier(user_id, "known", "system")
  end

  defp grant_trusted!(user_id) do
    grant_known!(user_id)
    assert {:ok, _} = TrustTiers.grant_tier(user_id, "trusted", "system")
  end

  # AttentionBudget maturity gate: :new blocks reminder priority.
  defp grant_learning_maturity!(user_id) do
    case Repo.get_by(AssistancePreference, user_id: user_id) do
      %AssistancePreference{} = pref ->
        assert {:ok, _} =
                 pref
                 |> AssistancePreference.changeset(%{intelligence_maturity: "learning"})
                 |> Repo.update()

      nil ->
        assert {:ok, _} =
                 %AssistancePreference{}
                 |> AssistancePreference.changeset(%{
                   user_id: user_id,
                   timezone: "America/Los_Angeles",
                   intelligence_maturity: "learning"
                 })
                 |> Repo.insert()
    end
  end

  defp celebration!(owner, attrs \\ %{}) do
    {:ok, c} =
      Celebrations.create(
        owner.id,
        Map.merge(
          %{"person_name" => "Maya", "kind" => "birthday", "month" => 10, "day" => 18},
          attrs
        )
      )

    c
  end

  defp remember_taste!(user_id, vibe, cuisine) do
    assert {:ok, _, _} =
             DurablePreferenceMemory.remember_explicit(%{
               "owner_user_id" => user_id,
               "preference" => "taste:vibe:#{vibe}",
               "purpose" => "place_vibe",
               "force_durable" => true
             })

    assert {:ok, _, _} =
             DurablePreferenceMemory.remember_explicit(%{
               "owner_user_id" => user_id,
               "preference" => "taste:cuisine:#{cuisine}",
               "purpose" => "food_preference",
               "force_durable" => true
             })
  end

  defp insert_shared_plan!(title, creator_id, member_ids, opts \\ []) do
    alignment = Keyword.get(opts, :alignment, %{"vibe" => "quiet", "cuisine" => "italian"})
    start_at = Keyword.get(opts, :start_at, DateTime.utc_now() |> DateTime.truncate(:microsecond))
    conv_id = Keyword.get(opts, :conversation_id, OpalCore.Fixtures.conv_alex_jordan_id())

    plan =
      %SharedPlan{}
      |> SharedPlan.changeset(%{
        title: title,
        status: Keyword.get(opts, :status, "agreed"),
        timezone: "America/Los_Angeles",
        created_by_user_id: creator_id,
        source: "conversation",
        conversation_id: conv_id,
        alignment: alignment,
        start_at: start_at
      })
      |> Repo.insert!()

    for uid <- Enum.uniq([creator_id | member_ids]) do
      %PlanParticipant{}
      |> PlanParticipant.changeset(%{
        plan_id: plan.id,
        user_id: uid,
        response_state: "accepted",
        role: if(uid == creator_id, do: "lead", else: "participant")
      })
      |> Repo.insert!()
    end

    plan
  end

  test "curate_for returns full curation for user with rich data" do
    owner = fresh_user!("Alex")
    maya = fresh_user!("Maya")
    grant_known!(owner.id)
    remember_taste!(maya.id, "quiet", "italian")

    insert_shared_plan!("Fort Oak dinner", owner.id, [maya.id],
      alignment: %{"vibe" => "quiet", "cuisine" => "italian"}
    )

    insert_shared_plan!("Pasta night", owner.id, [maya.id],
      alignment: %{"vibe" => "quiet", "cuisine" => "italian"}
    )

    insert_shared_plan!("Wine bar", owner.id, [maya.id],
      alignment: %{"vibe" => "quiet", "cuisine" => "italian"}
    )

    for _ <- 1..3 do
      assert {:ok, _} =
               GroupTastes.record_plan([owner.id, maya.id], %{
                 vibe: "quiet",
                 cuisine: "italian",
                 day_of_week: "friday"
               })
    end

    c = celebration!(owner, %{"person_name" => "Maya"})

    assert {:ok, curation} = CelebrationCuration.curate_for(owner.id, c.id)
    assert curation.mode == :full
    assert curation.celebration.name == "Maya's birthday"
    assert is_integer(curation.celebration.days_until)
    assert curation.recipient_taste.vibes |> Enum.map(&String.downcase/1) |> Enum.member?("quiet")
    assert curation.recipient_taste.cuisines |> Enum.map(&String.downcase/1) |> Enum.member?("italian")
    assert length(curation.shared_history) == 3
    assert curation.group_suggestion
    assert "quiet" in (curation.group_suggestion.vibes || [])
    assert length(curation.gift_ideas) >= 1
    assert length(curation.gift_ideas) <= 3
    assert Enum.any?(curation.gift_ideas, &String.contains?(&1, "cozy"))
    assert Enum.any?(curation.plan_ideas, &String.contains?(String.downcase(&1), "italian"))
    refute Enum.any?(curation.gift_ideas ++ curation.plan_ideas, &String.contains?(&1, "$"))
  end

  test "curate_for returns honest empty ideas when no taste/history" do
    owner = fresh_user!("Solo")
    grant_known!(owner.id)
    c = celebration!(owner, %{"person_name" => "NobodyKnown"})

    assert {:ok, curation} = CelebrationCuration.curate_for(owner.id, c.id)
    assert curation.mode == :full
    assert is_nil(curation.recipient_taste)
    assert curation.shared_history == []
    assert is_nil(curation.group_suggestion)
    # Default gift idea only — not invented recipient prefs
    assert curation.gift_ideas == ["Something thoughtful based on your history together"]
    assert length(curation.plan_ideas) <= 3
  end

  test "curate_for returns {:error, :not_found} for others' celebrations" do
    owner = fresh_user!("Own")
    other = fresh_user!("Oth")
    grant_known!(owner.id)
    grant_known!(other.id)
    c = celebration!(owner)

    assert {:error, :not_found} = CelebrationCuration.curate_for(other.id, c.id)
  end

  test "trust gate: below known → basic only" do
    owner = fresh_user!("Newb")
    maya = fresh_user!("Maya")
    remember_taste!(maya.id, "quiet", "italian")
    c = celebration!(owner, %{"person_name" => "Maya"})

    assert TrustTiers.get_tier(owner.id) == "new"
    assert {:ok, curation} = CelebrationCuration.curate_for(owner.id, c.id)
    assert curation.mode == :basic
    assert curation.gift_ideas == []
    assert curation.plan_ideas == []
    assert curation.reminder =~ "Maya's birthday"
    # Human copy may say "in a week" or "in N days"
    assert curation.reminder =~ ~r/week|days?/
  end

  test "gift ideas reference real taste (not generic)" do
    owner = fresh_user!("Giver")
    maya = fresh_user!("Maya")
    grant_known!(owner.id)
    remember_taste!(maya.id, "lively", "thai")
    c = celebration!(owner, %{"person_name" => "Maya"})

    assert {:ok, curation} = CelebrationCuration.curate_for(owner.id, c.id)
    assert Enum.any?(curation.gift_ideas, &String.contains?(&1, "energetic"))
    assert Enum.any?(curation.gift_ideas, &String.contains?(&1, "Thai"))
    refute Enum.member?(curation.gift_ideas, "A cozy experience for two")
  end

  test "plan ideas combine vibe+group+budget" do
    owner = fresh_user!("Planner")
    maya = fresh_user!("Maya")
    grant_trusted!(owner.id)
    remember_taste!(maya.id, "quiet", "italian")

    assert {:ok, _} =
             FinancialProfiles.set_profile(owner.id, %{"comfort_level" => "moderate"})

    for _ <- 1..3 do
      assert {:ok, _} =
               GroupTastes.record_plan([owner.id, maya.id], %{
                 vibe: "quiet",
                 cuisine: "italian",
                 day_of_week: "friday"
               })
    end

    c = celebration!(owner, %{"person_name" => "Maya"})
    assert {:ok, curation} = CelebrationCuration.curate_for(owner.id, c.id)

    assert curation.budget_note == "Fits your moderate comfort."
    refute curation.budget_note =~ "$"
    assert Enum.any?(curation.plan_ideas, &String.contains?(String.downcase(&1), "quiet"))
    assert Enum.any?(curation.plan_ideas, &String.contains?(String.downcase(&1), "italian"))
  end

  test "budget_note never includes dollar amounts" do
    owner = fresh_user!("Budg")
    maya = fresh_user!("Maya")
    grant_trusted!(owner.id)
    remember_taste!(maya.id, "foodie", "french")

    assert {:ok, _} =
             FinancialProfiles.set_profile(owner.id, %{"comfort_level" => "luxury"})

    c = celebration!(owner, %{"person_name" => "Maya"})
    assert {:ok, curation} = CelebrationCuration.curate_for(owner.id, c.id)
    assert curation.budget_note == "Fits your luxury comfort."
    blob = Jason.encode!(CelebrationCuration.to_contract(curation))
    refute blob =~ "$"
    refute blob =~ "dollar"
  end

  test "foodie vibe yields tasting-menu gift idea" do
    owner = fresh_user!("Food")
    maya = fresh_user!("Maya")
    grant_known!(owner.id)
    remember_taste!(maya.id, "foodie", "japanese")
    c = celebration!(owner, %{"person_name" => "Maya"})

    assert {:ok, curation} = CelebrationCuration.curate_for(owner.id, c.id)
    assert Enum.any?(curation.gift_ideas, &String.contains?(&1, "tasting menu"))
  end

  test "top_plan_idea returns nil below known" do
    owner = fresh_user!("Low")
    c = celebration!(owner)
    assert is_nil(CelebrationCuration.top_plan_idea(owner.id, c.id))
  end

  test "reminder_copy includes curated idea when rich" do
    owner = fresh_user!("Rem")
    maya = fresh_user!("Maya")
    grant_known!(owner.id)
    remember_taste!(maya.id, "quiet", "italian")
    c = celebration!(owner, %{"person_name" => "Maya"})

    copy = CelebrationCuration.reminder_copy(owner.id, c, 14)
    assert is_binary(copy)
    assert copy =~ "14 days"
    assert copy =~ "Maya would love"
    assert copy =~ "want me to plan it"
  end

  test "reminder_copy is nil when no personalization" do
    # Below known → basic mode → nil (worker keeps milestone fallback)
    owner2 = fresh_user!("Plain2")
    c2 = celebration!(owner2)
    assert is_nil(CelebrationCuration.reminder_copy(owner2.id, c2, 14))
  end

  test "worker includes curation in reminder when rich data" do
    owner = fresh_user!("Wrk")
    maya = fresh_user!("Maya")
    grant_known!(owner.id)
    grant_learning_maturity!(owner.id)
    remember_taste!(maya.id, "quiet", "italian")

    # Birthday 14 days from 2026-06-01 → Jun 15
    c = celebration!(owner, %{"person_name" => "Maya", "month" => 6, "day" => 15})

    assert {:ok, 1} = CelebrationReminderWorker.remind_one(c, ~D[2026-06-01])

    items =
      from(i in AttentionCenterItem,
        where: i.owner_user_id == ^owner.id,
        where: i.source_type == "celebration",
        select: i.copy
      )
      |> Repo.all()

    assert length(items) == 1
    copy = hd(items)
    assert copy =~ "14 days" or copy =~ "2 weeks" or copy =~ "Maya"
    assert copy =~ "would love" or copy =~ "Want to plan"
  end

  test "OC-4 check_status includes curated idea" do
    owner = fresh_user!("Chk")
    maya = fresh_user!("Maya")
    grant_known!(owner.id)
    remember_taste!(maya.id, "quiet", "italian")

    today = Date.utc_today()
    day = min(today.day + 5, 28)

    assert {:ok, c} =
             Celebrations.create(owner.id, %{
               "person_name" => "Maya",
               "kind" => "birthday",
               "month" => today.month,
               "day" => day
             })

    assert {:ok, ctx} = OpalCore.OpalContext.assemble(owner.id, "what's coming up?")
    celeb = Enum.find(ctx.temporal.upcoming_celebrations, &(&1.id == c.id))
    assert celeb
    assert is_binary(celeb.top_idea)

    intent = %{
      intent: :check_status,
      confidence: :high,
      entities: %{},
      raw_text: "what's coming up?"
    }

    assert {:ok, text} = OpalCore.OpalResponse.generate(intent, ctx)
    assert text =~ "Maya"
    assert text =~ "would love"
  end

  test "to_contract is JSON-safe and private fields present" do
    owner = fresh_user!("Json")
    maya = fresh_user!("Maya")
    grant_known!(owner.id)
    remember_taste!(maya.id, "quiet", "italian")
    c = celebration!(owner, %{"person_name" => "Maya"})

    assert {:ok, curation} = CelebrationCuration.curate_for(owner.id, c.id)
    contract = CelebrationCuration.to_contract(curation)
    assert contract["mode"] == "full"
    assert is_list(contract["gift_ideas"])
    assert is_list(contract["plan_ideas"])
    assert Jason.encode!(contract)
  end

  test "never invents recipient taste they don't have" do
    owner = fresh_user!("Honest")
    maya = fresh_user!("Maya")
    grant_known!(owner.id)
    # Maya has only quiet — no lively
    remember_taste!(maya.id, "quiet", "mexican")
    c = celebration!(owner, %{"person_name" => "Maya"})

    assert {:ok, curation} = CelebrationCuration.curate_for(owner.id, c.id)
    refute Enum.any?(curation.gift_ideas, &String.contains?(&1, "energetic"))
    assert Enum.any?(curation.gift_ideas, &String.contains?(&1, "cozy"))
  end
end
