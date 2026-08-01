defmodule OpalCore.FixturesHelper do
  @moduledoc false

  alias OpalCore.Repo
  alias OpalCore.Fixtures
  alias OpalCore.Accounts.User
  alias OpalCore.Messaging.{Conversation, ConversationMember}
  alias OpalCore.Consent.ConsentProof

  def seed! do
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)
    future = DateTime.add(now, 365 * 24 * 3600, :second)
    past = DateTime.add(now, -7 * 24 * 3600, :second)

    for attrs <- [
          %{id: Fixtures.user_alex_id(), handle: "user-alex", display_name: "Alex"},
          %{id: Fixtures.user_jordan_id(), handle: "user-jordan", display_name: "Jordan"},
          %{id: Fixtures.user_taylor_id(), handle: "user-taylor", display_name: "Taylor"},
          %{id: Fixtures.user_maya_id(), handle: "user-maya", display_name: "Maya"},
          %{id: Fixtures.user_chris_id(), handle: "user-chris", display_name: "Chris"},
          %{id: Fixtures.user_marcus_id(), handle: "user-marcus", display_name: "Marcus"},
          %{id: Fixtures.user_evelyn_id(), handle: "user-evelyn", display_name: "Evelyn"},
          %{id: Fixtures.user_olivia_id(), handle: "user-olivia", display_name: "Olivia"},
          %{id: Fixtures.user_noah_id(), handle: "user-noah", display_name: "Noah"},
          %{id: Fixtures.user_victor_id(), handle: "user-victor", display_name: "Victor"}
        ] do
      %User{} |> User.changeset(attrs) |> Repo.insert!()
    end

    for attrs <- [
          %{id: Fixtures.conv_alex_jordan_id(), label: "Alex-Jordan"},
          %{id: Fixtures.conv_alex_taylor_id(), label: "Alex-Taylor"},
          %{id: Fixtures.conv_maya_chris_id(), label: "Maya-Chris"},
          %{id: Fixtures.conv_group_friends_id(), label: "Friends-Group-4"},
          %{id: Fixtures.conv_family_carter_id(), label: "Carter-Family"}
        ] do
      %Conversation{} |> Conversation.changeset(attrs) |> Repo.insert!()
    end

    for {cid, uid} <- [
          {Fixtures.conv_alex_jordan_id(), Fixtures.user_alex_id()},
          {Fixtures.conv_alex_jordan_id(), Fixtures.user_jordan_id()},
          {Fixtures.conv_alex_taylor_id(), Fixtures.user_alex_id()},
          {Fixtures.conv_alex_taylor_id(), Fixtures.user_taylor_id()},
          {Fixtures.conv_maya_chris_id(), Fixtures.user_maya_id()},
          {Fixtures.conv_maya_chris_id(), Fixtures.user_chris_id()},
          {Fixtures.conv_group_friends_id(), Fixtures.user_alex_id()},
          {Fixtures.conv_group_friends_id(), Fixtures.user_jordan_id()},
          {Fixtures.conv_group_friends_id(), Fixtures.user_maya_id()},
          {Fixtures.conv_group_friends_id(), Fixtures.user_chris_id()},
          {Fixtures.conv_family_carter_id(), Fixtures.user_marcus_id()},
          {Fixtures.conv_family_carter_id(), Fixtures.user_evelyn_id()},
          {Fixtures.conv_family_carter_id(), Fixtures.user_olivia_id()}
        ] do
      %ConversationMember{}
      |> ConversationMember.changeset(%{conversation_id: cid, user_id: uid})
      |> Repo.insert!()
    end

    consents = [
      %{
        id: Fixtures.consent_alex_jordan_granted_id(),
        user_id: Fixtures.user_alex_id(),
        conversation_id: Fixtures.conv_alex_jordan_id(),
        capability: "ai_echo",
        status: "granted",
        granted_at: past,
        expires_at: future,
        revoked_at: nil,
        policy_version: Fixtures.policy_version(),
        evidence_type: "synthetic_seed",
        evidence_reference: "seed:granted"
      },
      %{
        id: Fixtures.consent_jordan_denied_id(),
        user_id: Fixtures.user_jordan_id(),
        conversation_id: Fixtures.conv_alex_jordan_id(),
        capability: "ai_echo",
        status: "denied",
        granted_at: nil,
        expires_at: future,
        revoked_at: nil,
        policy_version: Fixtures.policy_version(),
        evidence_type: "synthetic_seed",
        evidence_reference: "seed:denied"
      },
      %{
        id: Fixtures.consent_alex_taylor_revoked_id(),
        user_id: Fixtures.user_alex_id(),
        conversation_id: Fixtures.conv_alex_taylor_id(),
        capability: "ai_echo",
        status: "revoked",
        granted_at: past,
        expires_at: future,
        revoked_at: past,
        policy_version: Fixtures.policy_version(),
        evidence_type: "synthetic_seed",
        evidence_reference: "seed:revoked"
      },
      %{
        id: Fixtures.consent_taylor_expired_id(),
        user_id: Fixtures.user_taylor_id(),
        conversation_id: Fixtures.conv_alex_taylor_id(),
        capability: "ai_echo",
        status: "expired",
        granted_at: past,
        expires_at: past,
        revoked_at: nil,
        policy_version: Fixtures.policy_version(),
        evidence_type: "synthetic_seed",
        evidence_reference: "seed:expired"
      },
      %{
        id: Fixtures.consent_alex_jordan_sf_id(),
        user_id: Fixtures.user_alex_id(),
        conversation_id: Fixtures.conv_alex_jordan_id(),
        capability: "social_flow_plan_extract",
        status: "granted",
        granted_at: past,
        expires_at: future,
        revoked_at: nil,
        policy_version: Fixtures.policy_version(),
        evidence_type: "synthetic_seed",
        evidence_reference: "seed:sf-alex-granted"
      },
      %{
        id: Fixtures.consent_jordan_sf_id(),
        user_id: Fixtures.user_jordan_id(),
        conversation_id: Fixtures.conv_alex_jordan_id(),
        capability: "social_flow_plan_extract",
        status: "granted",
        granted_at: past,
        expires_at: future,
        revoked_at: nil,
        policy_version: Fixtures.policy_version(),
        evidence_type: "synthetic_seed",
        evidence_reference: "seed:sf-jordan-granted"
      }
    ]

    for attrs <- consents do
      %ConsentProof{} |> ConsentProof.changeset(attrs) |> Repo.insert!()
    end

    :ok
  end
end
