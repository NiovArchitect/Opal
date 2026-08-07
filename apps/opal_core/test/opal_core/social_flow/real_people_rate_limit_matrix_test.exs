defmodule OpalCore.SocialFlow.RealPeopleRateLimitMatrixTest do
  @moduledoc """
  Rate-limit matrix for OTP challenges, invitations, and independent actors.
  """

  use OpalCore.DataCase

  alias OpalCore.SocialFlow.Onboarding

  defp start_challenges(e164, n, device \\ "device-rl") do
    Enum.map(1..n, fn i ->
      Onboarding.start_verification(%{
        identifier_raw: e164,
        purpose: "account_create",
        device_label: device,
        idempotency_key: "rl-#{e164}-#{device}-#{i}-#{System.unique_integer()}",
        otp_consent_accepted: true
      })
    end)
  end

  test "OTP challenge hits per-phone digest rate limit" do
    e164 = "+12025550401"
    results = start_challenges(e164, 12)
    assert Enum.any?(results, &match?({:error, :rate_limited}, &1))
    # Public error shape only — no raw phone
    {:error, :rate_limited} = Enum.find(results, &match?({:error, :rate_limited}, &1))
  end

  test "different phone digests remain independent" do
    a = "+12025550402"
    b = "+12025550403"

    # Exhaust A
    _ = start_challenges(a, 12)

    # B still allowed
    assert {:ok, started, _} =
             Onboarding.start_verification(%{
               identifier_raw: b,
               purpose: "account_create",
               device_label: "device-b",
               idempotency_key: "rl-ind-#{System.unique_integer()}",
               otp_consent_accepted: true
             })

    assert is_binary(started["id"])
    refute Map.has_key?(started, "phone")
  end

  test "invitation creation rate-limits same inviter" do
    a = activate!("+12025550410", "RLA")
    b = activate!("+12025550411", "RLB")

    results =
      Enum.map(1..12, fn i ->
        Onboarding.create_invitation(%{
          inviter_user_id: a,
          intended_recipient_user_id: b,
          purpose: "connect",
          bounded_message: "Study together?",
          local_display_label: "Friend",
          invite_source: "share_link",
          source_device_label: "Test",
          idempotency_key: "rl-inv-#{i}-#{System.unique_integer()}"
        })
      end)

    assert Enum.any?(results, &match?({:error, :rate_limited}, &1))
  end

  test "alignment_response rate limit per user and proposal" do
    user = activate!("+12025550430", "AlignRL")
    conv = Ecto.UUID.generate()
    proposal = "prop-rl"

    results =
      Enum.map(1..12, fn _ ->
        Onboarding.check_rate_limit("alignment_response", user, "#{conv}:#{proposal}")
      end)

    assert Enum.any?(results, &match?({:error, :rate_limited}, &1))
  end

  test "rate limit bucket keys never embed raw e164" do
    e164 = "+12025550420"
    _ = start_challenges(e164, 3)

    keys =
      OpalCore.Repo.all(OpalCore.SocialFlow.RateLimitBucket)
      |> Enum.map(& &1.bucket_key)

    refute Enum.any?(keys, &String.contains?(&1, e164))
    refute Enum.any?(keys, &String.contains?(&1, "202555"))
  end

  defp activate!(e164, name) do
    {:ok, started, _} =
      Onboarding.start_verification(%{
        identifier_raw: e164,
        purpose: "account_create",
        device_label: "Test",
        idempotency_key: "rl-act-#{e164}-#{System.unique_integer()}",
        otp_consent_accepted: true
      })

    {:ok, done, _} =
      Onboarding.complete_verification(%{
        challenge_id: started["id"],
        code: started["synthetic_provider_code"],
        display_name: name,
        device_label: "Test",
        platform: "test"
      })

    done.account_id
  end
end
