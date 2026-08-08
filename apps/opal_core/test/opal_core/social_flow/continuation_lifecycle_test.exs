defmodule OpalCore.SocialFlow.ContinuationLifecycleTest do
  @moduledoc "Continuation resume/consume/expiry/wrong-user lifecycle."
  use OpalCore.DataCase

  alias OpalCore.SocialFlow.Onboarding
  alias OpalCore.SocialFlow.InvitationContinuation
  alias OpalCore.Repo

  defp activate!(e164, name) do
    {:ok, started, _} =
      Onboarding.start_verification(%{
        identifier_raw: e164,
        purpose: "account_create",
        device_label: "Test",
        idempotency_key: "cl-#{e164}-#{System.unique_integer()}",
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

  test "preview mints continuation; wrong user forbidden; consume yields used" do
    a = activate!("+12025550501", "ContA")
    b = activate!("+12025550502", "ContB")
    c = activate!("+12025550503", "ContC")

    assert {:ok, _inv, share, _} =
             Onboarding.create_invitation(%{
               inviter_user_id: a,
               intended_recipient_user_id: b,
               purpose: "connect",
               bounded_message: "Study together.",
               invite_source: "share_link",
               source_device_label: "Test",
               idempotency_key: "cl-inv-#{System.unique_integer()}"
             })

    assert is_binary(share["share_token"])
    assert {:ok, preview} = Onboarding.preview_share_token(share["share_token"])
    cont = preview["continuation_id"]
    assert is_binary(cont)

    assert {:error, :forbidden} = Onboarding.resume_invitation_continuation(cont, c)
    assert {:ok, resumed} = Onboarding.resume_invitation_continuation(cont, b)
    assert resumed["invitation_id"]

    Onboarding.consume_invitation_continuation(cont)
    assert {:error, :used} = Onboarding.resume_invitation_continuation(cont, b)
  end

  test "expired continuation fails closed" do
    a = activate!("+12025550511", "ExpA")
    b = activate!("+12025550512", "ExpB")

    assert {:ok, _inv, share, _} =
             Onboarding.create_invitation(%{
               inviter_user_id: a,
               intended_recipient_user_id: b,
               purpose: "connect",
               bounded_message: "Study.",
               invite_source: "share_link",
               source_device_label: "Test",
               idempotency_key: "cl-exp-#{System.unique_integer()}"
             })

    assert {:ok, preview} = Onboarding.preview_share_token(share["share_token"])
    cont = preview["continuation_id"]
    digest = :crypto.hash(:sha256, cont) |> Base.encode16(case: :lower)
    row = Repo.get_by!(InvitationContinuation, continuation_digest: digest)

    past = DateTime.add(DateTime.utc_now(), -3600, :second) |> DateTime.truncate(:second)

    row
    |> InvitationContinuation.changeset(%{expires_at: past})
    |> Repo.update!()

    assert {:error, :expired} = Onboarding.resume_invitation_continuation(cont, b)
  end
end
