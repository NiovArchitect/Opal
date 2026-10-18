defmodule OpalCore.SocialFlow.HouseholdContextTest do
  use OpalCore.DataCase, async: false

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Intelligence.ProactiveConversation
  alias OpalCore.Repo
  alias OpalCore.Relationships
  alias OpalCore.SocialFlow.Clock
  alias OpalCore.SocialFlow.HouseholdContext
  alias OpalCore.SocialFlow.Households
  alias OpalCore.SocialMemory.ConversationIndex

  setup do
    Clock.unfreeze()
    on_exit(fn -> Clock.unfreeze() end)
    suffix = System.unique_integer([:positive])

    rin =
      %User{}
      |> User.changeset(%{handle: "rin-#{suffix}", display_name: "Rin"})
      |> Repo.insert!()

    peer =
      %User{}
      |> User.changeset(%{handle: "peer-#{suffix}", display_name: "Peer"})
      |> Repo.insert!()

    for u <- [rin, peer] do
      %OpalCore.SocialFlow.AssistancePreference{}
      |> OpalCore.SocialFlow.AssistancePreference.changeset(%{
        user_id: u.id,
        timezone: "America/Los_Angeles",
        intelligence_maturity: "established"
      })
      |> Repo.insert!()
    end

    {:ok, rin: rin, peer: peer}
  end

  defp activate!(user) do
    %ConversationIndex{}
    |> ConversationIndex.changeset(%{
      account_id: user.id,
      conversation_id: Ecto.UUID.generate(),
      message_count: 1,
      message_count_at_summary: 0,
      key_entities: %{},
      open_questions: [],
      last_activity_at: Clock.utc_now()
    })
    |> Repo.insert!()
  end

  test "laws: solo is derived, unlabeled, and reads no travel/activity-volume signals", _ctx do
    refute HouseholdContext.solo_stored_as_trait?()
    refute HouseholdContext.solo_user_facing_label?()
    refute HouseholdContext.solo_reads_travel_state?()
    refute HouseholdContext.solo_infers_from_activity_volume?()
  end

  test "solo predicate: no contacts + no pod; first contact or a pod-of-1 ends it", %{
    rin: rin,
    peer: peer
  } do
    assert HouseholdContext.solo?(rin.id)
    assert HouseholdContext.context_for(rin.id)["context_kind"] == "solo"

    # A declared pod of 1 is a pod context, never solo.
    {:ok, pod} = Households.create_household(rin.id, %{"label" => "My place"})
    refute HouseholdContext.solo?(rin.id)
    assert HouseholdContext.context_for(rin.id)["context_kind"] == "pod"
    assert Households.primary_pod(rin.id).id == pod.id

    {:ok, _} = Households.leave(pod.id, rin.id)
    assert HouseholdContext.solo?(rin.id)

    # First typed contact ends solo too.
    {:ok, _} = Relationships.set_type(rin.id, peer.id, "friend", %{})
    refute HouseholdContext.solo?(rin.id)
    assert HouseholdContext.context_for(rin.id)["context_kind"] == "connected"
  end

  test "copy law: the solo check-in reason carries no banned framing", _ctx do
    copy = String.downcase(ProactiveConversation.solo_reason_copy())

    for banned <- ["lonely", "alone", "solo", "no one", "just checking you", "okay"] do
      refute String.contains?(copy, banned), "solo copy must not contain #{inspect(banned)}"
    end

    assert "solo_check_in" in ProactiveConversation.allowed_triggers()
  end

  test "rhythm: opt-in checked first — total silence without it", %{rin: rin} do
    Clock.freeze(~U[2026-10-19 18:00:00.000000Z])
    activate!(rin)

    for _ <- 1..14 do
      assert {:suppressed, :proactive_threads_not_enabled} =
               ProactiveConversation.maybe_initiate_solo_check_in(rin.id)
    end

    assert Repo.aggregate(
             from(l in OpalCore.SocialMemory.ProactiveThreadLog,
               where: l.account_id == ^rin.id
             ),
             :count
           ) == 0
  end

  test "rhythm: opted in fires once, 7-day gate, then fires again; exit on first contact", %{
    rin: rin,
    peer: peer
  } do
    Clock.freeze(~U[2026-10-19 18:00:00.000000Z])
    activate!(rin)
    ProactiveConversation.set_threads_enabled(rin.id, true)

    assert {:ok, %{status: "initiated"}} =
             ProactiveConversation.maybe_initiate_solo_check_in(rin.id)

    assert {:suppressed, :rhythm_window} =
             ProactiveConversation.maybe_initiate_solo_check_in(rin.id)

    Clock.freeze(~U[2026-10-27 18:00:00.000000Z])
    activate!(rin)

    assert {:ok, %{status: "initiated"}} =
             ProactiveConversation.maybe_initiate_solo_check_in(rin.id)

    {:ok, _} = Relationships.set_type(rin.id, peer.id, "friend", %{})
    Clock.freeze(~U[2026-11-04 18:00:00.000000Z])
    assert {:suppressed, :not_solo} = ProactiveConversation.maybe_initiate_solo_check_in(rin.id)
  end

  test "bias: solo ordering puts group/virtual above 1:1, same batch; non-solo untouched", %{
    rin: rin,
    peer: peer
  } do
    candidates = [
      %{"shape" => "one_to_one", "title" => "a"},
      %{"shape" => "group", "title" => "b"},
      %{"shape" => "virtual", "title" => "c"}
    ]

    ordered = HouseholdContext.order_candidates(rin.id, candidates)
    assert Enum.map(ordered, & &1["shape"]) |> List.last() == "one_to_one"
    assert length(ordered) == 3

    {:ok, _} = Relationships.set_type(rin.id, peer.id, "friend", %{})
    assert HouseholdContext.order_candidates(rin.id, candidates) == candidates
  end
end
