defmodule OpalCore.SocialFlow.Tranche2PhoneIdentityTest do
  use OpalCore.DataCase

  alias OpalCore.SocialFlow.Onboarding
  alias OpalCore.FixturesHelper

  setup do
    FixturesHelper.seed!()
    :ok
  end

  test "formatting variants normalize to the same E.164" do
    assert {:ok, "+17605550199"} = Onboarding.normalize_e164("(760) 555-0199")
    assert {:ok, "+17605550199"} = Onboarding.normalize_e164("760-555-0199")
    assert {:ok, "+17605550199"} = Onboarding.normalize_e164("+1 760 555 0199")
    assert {:ok, "+17605550199"} = Onboarding.normalize_e164("17605550199")
  end

  test "invalid and unsupported regions fail closed" do
    assert {:error, :invalid_identifier} = Onboarding.normalize_e164("123")
    assert {:error, :invalid_identifier} = Onboarding.normalize_e164("")
    assert {:ok, e164} = Onboarding.normalize_e164("+441234567890")
    refute Onboarding.supported_region?(e164)
  end

  test "same phone digest for formatting variants (identity key)" do
    {:ok, a} = Onboarding.normalize_e164("(202) 555-0101")
    {:ok, b} = Onboarding.normalize_e164("+12025550101")
    assert a == b
    assert Onboarding.lookup_digest(a) == Onboarding.lookup_digest(b)
  end
end
