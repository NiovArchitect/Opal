defmodule OpalCore.SocialFlow.AlignmentStateAndPrivateTest do
  use OpalCore.DataCase

  alias OpalCore.SocialFlow.{AlignmentState, AlignmentParticipation, PrivateParticipation}

  test "set gate requires two affirmatives and plan evidence" do
    a = Ecto.UUID.generate()
    b = Ecto.UUID.generate()

    refute AlignmentState.set_gate_satisfied?(%{
             member_user_ids: [a, b],
             affirmative_user_ids: [a],
             plan_evidence?: true
           })

    assert AlignmentState.set_gate_satisfied?(%{
             member_user_ids: [a, b],
             affirmative_user_ids: [a, b],
             plan_evidence?: true
           })

    refute AlignmentState.set_gate_satisfied?(%{
             member_user_ids: [a, b],
             affirmative_user_ids: [a, b],
             plan_evidence?: true,
             private_invalidates?: true
           })
  end

  test "shared-safe projection never includes private reason keys" do
    for {key, _} <- AlignmentParticipation.public_action_labels() do
      payload = AlignmentParticipation.shared_safe_projection(key)
      PrivateParticipation.assert_shared_safe!(payload)
      refute Map.has_key?(payload, "response_key")
      refute Map.has_key?(payload, "private_reason")
      refute Map.has_key?(payload, "why")
    end
  end

  test "forbidden public labels exclude booking language" do
    forbidden = AlignmentState.forbidden_public_labels()
    assert "Booked" in forbidden
    assert AlignmentState.public_label(:set) == "Set"
    assert AlignmentState.public_label(:recognized) == "Becoming a plan"
  end
end
