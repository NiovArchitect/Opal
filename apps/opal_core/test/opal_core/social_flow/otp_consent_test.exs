defmodule OpalCore.SocialFlow.OtpConsentTest do
  use OpalCore.DataCase, async: false

  alias OpalCore.SocialFlow.Onboarding

  test "challenge requires otp consent" do
    assert {:error, :otp_consent_required} =
             Onboarding.start_verification(%{
               identifier_raw: "+12025550101",
               purpose: "account_create",
               device_label: "Test",
               idempotency_key: "consent-missing-#{System.unique_integer()}"
             })
  end

  test "challenge succeeds with consent and records flow" do
    assert {:ok, started, :created} =
             Onboarding.start_verification(%{
               identifier_raw: "+12025550101",
               purpose: "account_create",
               device_label: "Test",
               idempotency_key: "consent-ok-#{System.unique_integer()}",
               otp_consent_accepted: true,
               otp_consent_policy_version: Onboarding.otp_consent_policy_version()
             })

    assert is_binary(started["id"])
    assert started["synthetic_provider_code"] == "111111"
  end
end
