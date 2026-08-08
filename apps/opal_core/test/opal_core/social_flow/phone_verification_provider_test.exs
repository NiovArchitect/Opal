defmodule OpalCore.SocialFlow.PhoneVerification.ProviderTest do
  use ExUnit.Case, async: false

  alias OpalCore.SocialFlow.PhoneVerification.Provider
  alias OpalCore.SocialFlow.PhoneVerification.SyntheticAdapter

  setup do
    previous = Application.get_env(:opal_core, :phone_verify_mode)

    on_exit(fn ->
      if previous do
        Application.put_env(:opal_core, :phone_verify_mode, previous)
      else
        Application.delete_env(:opal_core, :phone_verify_mode)
      end
    end)

    :ok
  end

  test "synthetic mode starts challenge with provider reference and code" do
    Application.put_env(:opal_core, :phone_verify_mode, :synthetic_development)

    assert {:ok, result} = Provider.start_challenge("+12025550101", %{})
    assert result.provider == "synthetic_development"
    assert String.starts_with?(result.provider_reference, "synthetic-sms-")
    assert result.synthetic_code == "111111"
  end

  test "disabled mode rejects challenges" do
    Application.put_env(:opal_core, :phone_verify_mode, :disabled)

    assert {:error, :verification_disabled} = Provider.start_challenge("+12025550101", %{})
  end

  test "fixture detection" do
    assert SyntheticAdapter.fixture_number?("+12025550101")
    refute SyntheticAdapter.fixture_number?("+15551234567")
  end

  test "production mode does not use synthetic adapter" do
    Application.put_env(:opal_core, :phone_verify_mode, :production_sms)
    assert Provider.adapter() == OpalCore.SocialFlow.PhoneVerification.TwilioVerifyAdapter
    # Without Twilio env, start fails closed — never synthetic.
    assert {:error, :provider_not_configured} =
             Provider.start_challenge("+15551234567", %{})
  end
end
