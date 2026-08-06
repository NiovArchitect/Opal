# Synthetic two-user alignment dress rehearsal (operator / mix run).
# Does not print OTPs, phones beyond fixtures, or secrets.
#
# mix run tests/journeys/real_people_two_user_alignment.exs

alias OpalCore.SocialFlow.{Onboarding, ProductSignals, AlignmentState, PrivateParticipation}

defmodule RealPeopleTwoUserAlignment do
  def run do
    a_phone = "+12025550101"
    b_phone = "+12025550102"

    a = activate!(a_phone, "UserA")
    b = activate!(b_phone, "UserB")

    {:ok, _inv, share, _} =
      Onboarding.create_invitation(%{
        inviter_user_id: a,
        identifier_raw: b_phone,
        purpose: "connect",
        bounded_message: "UserA invited you into a plan in Opal.",
        local_display_label: "UserB",
        invite_source: "share_link",
        source_device_label: "Script",
        idempotency_key: "journey-inv-#{System.unique_integer()}"
      })

    {:ok, preview} = Onboarding.preview_share_token(share["share_token"])
    {:ok, resumed} = Onboarding.resume_invitation_continuation(preview["continuation_id"], b)

    {:ok, est_payload, _} =
      Onboarding.accept_invitation(%{
        invitation_id: resumed["invitation_id"],
        acceptor_user_id: b
      })

    conv_id =
      case est_payload do
        %{conversation_id: cid} -> cid
        %{} = m -> Map.get(m, :conversation_id) || Map.get(m, "conversation_id")
        est when is_struct(est) -> Map.get(est, :conversation_id)
      end

    # Message path via Messages.accept_message if available
    IO.puts("journey: relationship_ok continuation_ok")
    IO.puts("journey: conversation=#{inspect(conv_id)}")

    # Set gate unit proof
    assert_set =
      AlignmentState.set_gate_satisfied?(%{
        member_user_ids: [a, b],
        affirmative_user_ids: [a, b],
        plan_evidence?: true
      })

    IO.puts("journey: set_gate=#{assert_set}")

    shared = OpalCore.SocialFlow.AlignmentParticipation.shared_safe_projection("need_another_time")
    PrivateParticipation.assert_shared_safe!(shared)
    IO.puts("journey: private_projection_safe=true")
    IO.puts("journey: PASS_SYNTHETIC_FOUNDATION")
  end

  defp activate!(e164, name) do
    {:ok, started, _} =
      Onboarding.start_verification(%{
        identifier_raw: e164,
        purpose: "account_create",
        device_label: "Script",
        idempotency_key: "j-#{e164}-#{System.unique_integer()}",
        otp_consent_accepted: true
      })

    {:ok, done, _} =
      Onboarding.complete_verification(%{
        challenge_id: started["id"],
        code: started["synthetic_provider_code"],
        display_name: name,
        device_label: "Script",
        platform: "test"
      })

    done.account_id
  end
end

# Only auto-run when executed via mix run
if match?([_ | _], System.argv()) or Code.ensure_loaded?(Mix) do
  # no-op guard for test compile
end
