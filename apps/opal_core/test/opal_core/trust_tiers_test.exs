defmodule OpalCore.TrustTiersTest do
  use OpalCore.DataCase, async: false

  alias OpalCore.Accounts.User
  alias OpalCore.Fixtures
  alias OpalCore.FixturesHelper
  alias OpalCore.OpalContext
  alias OpalCore.OpalConversations
  alias OpalCore.OpalResponse
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.DurablePreferenceMemory
  alias OpalCore.TrustTiers

  setup do
    FixturesHelper.seed!()
    :ok
  end

  defp alex, do: Fixtures.user_alex_id()

  defp fresh_user!(prefix) do
    %User{}
    |> User.changeset(%{
      handle: "#{prefix}_#{System.unique_integer([:positive])}",
      display_name: prefix
    })
    |> Repo.insert!()
  end

  defp backdate_user!(user, days) do
    inserted =
      DateTime.utc_now()
      |> DateTime.add(-days * 24 * 3600, :second)
      |> DateTime.truncate(:microsecond)

    user
    |> Ecto.Changeset.change(%{inserted_at: inserted})
    |> Repo.update!()
  end

  test "get_tier returns new for no record" do
    u = fresh_user!("tt_new")
    assert TrustTiers.get_tier(u.id) == "new"
  end

  test "grant_tier validates progression — cannot skip new→trusted" do
    u = fresh_user!("tt_skip")
    assert {:error, :cannot_skip} = TrustTiers.grant_tier(u.id, "trusted", "system")
  end

  test "grant_tier progresses new→known→trusted" do
    u = fresh_user!("tt_prog")
    assert {:ok, r1} = TrustTiers.grant_tier(u.id, "known", "system")
    assert r1.tier == "known"
    assert {:ok, r2} = TrustTiers.grant_tier(u.id, "trusted", "user")
    assert r2.tier == "trusted"
    assert TrustTiers.get_tier(u.id) == "trusted"
  end

  test "inner_circle requires granted_by user" do
    u = fresh_user!("tt_ic")
    assert {:ok, _} = TrustTiers.grant_tier(u.id, "known", "system")
    assert {:ok, _} = TrustTiers.grant_tier(u.id, "trusted", "system")

    assert {:error, :inner_circle_requires_user} =
             TrustTiers.grant_tier(u.id, "inner_circle", "system")

    assert {:ok, row} = TrustTiers.grant_tier(u.id, "inner_circle", "user")
    assert row.tier == "inner_circle"
    assert row.granted_by == "user"
  end

  test "grant_tier cannot demote" do
    u = fresh_user!("tt_dem")
    assert {:ok, _} = TrustTiers.grant_tier(u.id, "known", "system")
    assert {:error, :cannot_demote} = TrustTiers.grant_tier(u.id, "new", "system")
  end

  test "revoke_inner_circle steps back to trusted" do
    u = fresh_user!("tt_rev")
    assert {:ok, _} = TrustTiers.grant_tier(u.id, "known", "system")
    assert {:ok, _} = TrustTiers.grant_tier(u.id, "trusted", "system")
    assert {:ok, _} = TrustTiers.grant_tier(u.id, "inner_circle", "user")
    assert {:ok, row} = TrustTiers.revoke_inner_circle(u.id)
    assert row.tier == "trusted"
    assert TrustTiers.get_tier(u.id) == "trusted"
  end

  test "revoke_inner_circle rejects when not inner_circle" do
    u = fresh_user!("tt_rev2")
    assert {:ok, _} = TrustTiers.grant_tier(u.id, "known", "system")
    assert {:error, {:not_inner_circle, "known"}} = TrustTiers.revoke_inner_circle(u.id)
  end

  for tier <- ~w(new known trusted inner_circle),
      category <- [:basic, :taste, :celebrations, :plans, :financial, :relationships, :intimate] do
    @tier tier
    @category category
    test "can_access_tier? #{tier} / #{category}" do
      expected =
        case {@tier, @category} do
          {_, :basic} -> true
          {"new", _} -> false
          {"known", c} when c in [:taste, :celebrations, :plans] -> true
          {"known", _} -> false
          {"trusted", c} when c in [:taste, :celebrations, :plans, :financial, :relationships] ->
            true
          {"trusted", :intimate} -> false
          {"inner_circle", _} -> true
        end

      assert TrustTiers.can_access_tier?(@tier, @category) == expected
    end
  end

  test "can_access?/2 uses stored tier" do
    u = fresh_user!("tt_ca")
    assert TrustTiers.can_access?(u.id, :basic)
    refute TrustTiers.can_access?(u.id, :taste)
    assert {:ok, _} = TrustTiers.grant_tier(u.id, "known", "system")
    assert TrustTiers.can_access?(u.id, :taste)
    refute TrustTiers.can_access?(u.id, :financial)
  end

  test "maybe_promote auto-promotes at day thresholds, does not demote" do
    u = fresh_user!("tt_promo")
    backdate_user!(u, 10)
    assert {:ok, _} = TrustTiers.maybe_promote(u.id)
    assert TrustTiers.get_tier(u.id) == "known"

    # Does not demote
    assert {:ok, _} = TrustTiers.maybe_promote(u.id)
    assert TrustTiers.get_tier(u.id) == "known"

    backdate_user!(Repo.get!(User, u.id), 35)
    assert {:ok, _} = TrustTiers.maybe_promote(u.id)
    assert TrustTiers.get_tier(u.id) == "trusted"

    # Never auto inner_circle
    assert {:ok, _} = TrustTiers.maybe_promote(u.id)
    assert TrustTiers.get_tier(u.id) == "trusted"
  end

  test "maybe_promote promotes new→known via 10+ Opal turns" do
    u = fresh_user!("tt_turns")
    assert {:ok, _} = OpalConversations.get_or_create_conversation(u.id)

    for i <- 1..10 do
      assert {:ok, _} = OpalConversations.create_user_message(u.id, "turn #{i}")
    end

    # create_user_message calls maybe_promote — after 10 turns should be known
    assert TrustTiers.get_tier(u.id) == "known"
  end

  test "context respects tier — new user gets empty taste" do
    u = fresh_user!("tt_ctx")

    assert {:ok, _, _} =
             DurablePreferenceMemory.remember_explicit(%{
               "owner_user_id" => u.id,
               "preference" => "taste:vibe:quiet",
               "purpose" => "place_vibe",
               "force_durable" => true
             })

    assert {:ok, ctx} = OpalContext.assemble(u.id, "hello")
    assert ctx.trust_tier == "new"
    assert ctx.taste.vibes == []
    assert ctx.taste.cuisines == []
    assert ctx.temporal.recent_plans == []
    assert ctx.relationships == %{}
  end

  test "context for trusted includes taste" do
    u = fresh_user!("tt_ctx2")

    assert {:ok, _, _} =
             DurablePreferenceMemory.remember_explicit(%{
               "owner_user_id" => u.id,
               "preference" => "taste:vibe:quiet",
               "purpose" => "place_vibe",
               "force_durable" => true
             })

    assert {:ok, _} = TrustTiers.grant_tier(u.id, "known", "system")
    assert {:ok, _} = TrustTiers.grant_tier(u.id, "trusted", "system")
    assert {:ok, ctx} = OpalContext.assemble(u.id, "hello")
    assert ctx.trust_tier == "trusted"
    assert "quiet" in ctx.taste.vibes or Enum.any?(ctx.taste.vibes, &String.contains?(&1, "quiet"))
  end

  test "OC-4 above-tier financial ask is warm, not judgmental" do
    ctx = %{
      user: %{id: alex(), display_name: "Alex", handle: "a", timezone: "America/Los_Angeles"},
      taste: %{vibes: [], cuisines: [], price_comfort: nil},
      temporal: %{recent_plans: [], upcoming_celebrations: [], active_conversation_count: 0},
      social: %{frequent_contacts: [], group_patterns: []},
      relationships: %{},
      trust_tier: "new",
      message: %{text: "Help me with my budget", length: 10, sent_at: "x"}
    }

    intent = %{
      intent: :chat,
      confidence: :high,
      entities: %{},
      raw_text: "Help me with my budget for dinner"
    }

    assert {:ok, text} = OpalResponse.generate(intent, ctx)
    assert text =~ "as we get to know each other"
    refute text =~ "tier"
    refute text =~ "too low"
  end

  test "tier_info contract shape" do
    info = TrustTiers.tier_info(alex())
    assert info["tier"] in ~w(new known trusted inner_circle)
    assert is_list(info["can_access"])
    assert is_binary(info["friendly_name"])
    assert Map.has_key?(info, "next_tier")
    assert Map.has_key?(info, "next_requirements")
  end
end
