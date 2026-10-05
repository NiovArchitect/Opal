defmodule OpalCore.FinancialProfilesTest do
  use OpalCore.DataCase, async: false

  alias OpalCore.Accounts.User
  alias OpalCore.FinancialProfiles
  alias OpalCore.FixturesHelper
  alias OpalCore.OpalContext
  alias OpalCore.OpalResponse
  alias OpalCore.Repo
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

  defp grant_trusted!(user_id) do
    assert {:ok, _} = TrustTiers.grant_tier(user_id, "known", "system")
    assert {:ok, _} = TrustTiers.grant_tier(user_id, "trusted", "system")
  end

  test "set_profile validates comfort_level" do
    u = fresh_user!("fp_lvl")
    grant_trusted!(u.id)

    assert {:error, %Ecto.Changeset{} = cs} =
             FinancialProfiles.set_profile(u.id, %{"comfort_level" => "ultra"})

    assert %{comfort_level: _} = errors_on(cs)
  end

  test "set_profile validates ranges min < max" do
    u = fresh_user!("fp_rng")
    grant_trusted!(u.id)

    assert {:error, %Ecto.Changeset{} = cs} =
             FinancialProfiles.set_profile(u.id, %{
               "comfort_level" => "moderate",
               "dining_range" => %{"min" => 80, "max" => 40}
             })

    assert %{dining_range: _} = errors_on(cs)
  end

  test "set_profile succeeds for valid attrs" do
    u = fresh_user!("fp_ok")
    grant_trusted!(u.id)

    assert {:ok, p} =
             FinancialProfiles.set_profile(u.id, %{
               "comfort_level" => "budget",
               "dining_range" => %{"min" => 10, "max" => 25},
               "notes" => "saving for wedding"
             })

    assert p.comfort_level == "budget"
    assert p.dining_range["min"] == 10
    assert p.dining_range["max"] == 25
    assert p.notes == "saving for wedding"
  end

  test "get_profile returns nil for below-trusted user" do
    u = fresh_user!("fp_gate")
    # Insert raw row then ensure gate hides it
    assert {:ok, _} = TrustTiers.grant_tier(u.id, "known", "system")

    # Force a row via Repo while still below trusted
    {:ok, _} =
      %OpalCore.FinancialProfiles.FinancialProfile{}
      |> OpalCore.FinancialProfiles.FinancialProfile.changeset(%{
        user_id: u.id,
        comfort_level: "moderate"
      })
      |> Repo.insert()

    assert FinancialProfiles.get_profile(u.id) == nil
  end

  test "get_profile returns nil when no record for trusted user" do
    u = fresh_user!("fp_none")
    grant_trusted!(u.id)
    assert FinancialProfiles.get_profile(u.id) == nil
  end

  test "get_profile returns profile for trusted user" do
    u = fresh_user!("fp_get")
    grant_trusted!(u.id)

    assert {:ok, _} =
             FinancialProfiles.set_profile(u.id, %{"comfort_level" => "comfortable"})

    p = FinancialProfiles.get_profile(u.id)
    assert p.comfort_level == "comfortable"
  end

  test "set_profile forbidden below trusted" do
    u = fresh_user!("fp_forbid")
    assert {:error, :forbidden} =
             FinancialProfiles.set_profile(u.id, %{"comfort_level" => "moderate"})
  end

  test "delete_profile wipes data" do
    u = fresh_user!("fp_del")
    grant_trusted!(u.id)

    assert {:ok, _} =
             FinancialProfiles.set_profile(u.id, %{"comfort_level" => "luxury"})

    assert {:ok, :deleted} = FinancialProfiles.delete_profile(u.id)
    assert FinancialProfiles.get_profile(u.id) == nil
  end

  test "delete_profile absent is ok" do
    u = fresh_user!("fp_absent")
    grant_trusted!(u.id)
    assert {:ok, :absent} = FinancialProfiles.delete_profile(u.id)
  end

  test "spending_hint returns nil without profile" do
    u = fresh_user!("fp_hint")
    grant_trusted!(u.id)
    assert FinancialProfiles.spending_hint(u.id) == nil
  end

  test "spending_hint uses defaults when ranges nil" do
    u = fresh_user!("fp_hint2")
    grant_trusted!(u.id)

    assert {:ok, _} =
             FinancialProfiles.set_profile(u.id, %{"comfort_level" => "budget"})

    hint = FinancialProfiles.spending_hint(u.id)
    assert hint.level == "budget"
    assert hint.dining == {0, 25}
  end

  test "context includes financial only for trusted+ with profile" do
    u = fresh_user!("fp_ctx")

    assert {:ok, ctx_new} = OpalContext.assemble(u.id, "hello")
    assert ctx_new.financial == nil

    grant_trusted!(u.id)
    assert {:ok, ctx_empty} = OpalContext.assemble(u.id, "hello")
    assert ctx_empty.financial == nil

    assert {:ok, _} =
             FinancialProfiles.set_profile(u.id, %{
               "comfort_level" => "moderate",
               "dining_range" => %{"min" => 25, "max" => 55},
               "notes" => "secret note"
             })

    assert {:ok, ctx} = OpalContext.assemble(u.id, "hello")
    assert ctx.financial.level == "moderate"
    assert ctx.financial.dining_range["min"] == 25
    assert ctx.financial.dining_range["max"] == 55
    refute Map.has_key?(ctx.financial, :notes)
    refute Map.has_key?(ctx.financial, "notes")
  end

  test "OC-4 recommend respects dining_range — budget skips luxury" do
    ctx = %{
      user: %{id: "x", display_name: "Alex", handle: "a", timezone: "America/Los_Angeles"},
      taste: %{vibes: [], cuisines: [], price_comfort: nil},
      temporal: %{recent_plans: [], upcoming_celebrations: [], active_conversation_count: 0},
      social: %{frequent_contacts: [], group_patterns: []},
      relationships: %{},
      trust_tier: "trusted",
      financial: %{level: "budget", dining_range: %{"min" => 0, "max" => 25}},
      message: %{text: "recommend a place for dinner", length: 10, sent_at: "x"}
    }

    intent = %{
      intent: :recommend,
      confidence: :high,
      entities: %{},
      raw_text: "recommend a place for dinner"
    }

    assert {:ok, text} = OpalResponse.generate(intent, ctx)
    refute text =~ "tasting"
    refute text =~ "polished"
    assert text =~ "taco" or text =~ "fit" or text =~ "spot"
  end

  test "OC-4 recommend asks for budget when trusted without profile" do
    ctx = %{
      user: %{id: "x", display_name: "Alex", handle: "a", timezone: "America/Los_Angeles"},
      taste: %{vibes: ["quiet"], cuisines: [], price_comfort: nil},
      temporal: %{recent_plans: [], upcoming_celebrations: [], active_conversation_count: 0},
      social: %{frequent_contacts: [], group_patterns: []},
      relationships: %{},
      trust_tier: "trusted",
      financial: nil,
      message: %{text: "recommend dinner", length: 10, sent_at: "x"}
    }

    intent = %{
      intent: :recommend,
      confidence: :high,
      entities: %{},
      raw_text: "recommend dinner"
    }

    assert {:ok, text} = OpalResponse.generate(intent, ctx)
    assert text =~ "budget preferences"
    refute text =~ "tier"
  end

  test "context_slice never includes notes" do
    u = fresh_user!("fp_notes")
    grant_trusted!(u.id)

    assert {:ok, _} =
             FinancialProfiles.set_profile(u.id, %{
               "comfort_level" => "luxury",
               "notes" => "splurge on birthdays"
             })

    slice = FinancialProfiles.context_slice(u.id)
    assert slice.level == "luxury"
    refute Map.has_key?(slice, :notes)
  end

  test "upsert updates existing profile" do
    u = fresh_user!("fp_upd")
    grant_trusted!(u.id)

    assert {:ok, p1} =
             FinancialProfiles.set_profile(u.id, %{"comfort_level" => "moderate"})

    assert {:ok, p2} =
             FinancialProfiles.set_profile(u.id, %{"comfort_level" => "comfortable"})

    assert p1.id == p2.id
    assert p2.comfort_level == "comfortable"
  end
end
