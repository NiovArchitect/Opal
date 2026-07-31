# Synthetic Slice 1 seeds — no real PII.

alias OpalCore.Repo
alias OpalCore.Fixtures
alias OpalCore.Accounts.User
alias OpalCore.Messaging.{Conversation, ConversationMember}
alias OpalCore.Consent.ConsentProof

now = DateTime.utc_now() |> DateTime.truncate(:microsecond)
future = DateTime.add(now, 365 * 24 * 3600, :second)
past = DateTime.add(now, -7 * 24 * 3600, :second)

users = [
  %{id: Fixtures.user_alex_id(), handle: "user-alex", display_name: "Alex (synthetic)"},
  %{id: Fixtures.user_jordan_id(), handle: "user-jordan", display_name: "Jordan (synthetic)"},
  %{id: Fixtures.user_taylor_id(), handle: "user-taylor", display_name: "Taylor (synthetic)"}
]

for attrs <- users do
  %User{}
  |> User.changeset(attrs)
  |> Repo.insert!(on_conflict: :nothing, conflict_target: :id)
end

conversations = [
  %{id: Fixtures.conv_alex_jordan_id(), label: "Alex-Jordan"},
  %{id: Fixtures.conv_alex_taylor_id(), label: "Alex-Taylor"}
]

for attrs <- conversations do
  %Conversation{}
  |> Conversation.changeset(attrs)
  |> Repo.insert!(on_conflict: :nothing, conflict_target: :id)
end

members = [
  %{conversation_id: Fixtures.conv_alex_jordan_id(), user_id: Fixtures.user_alex_id()},
  %{conversation_id: Fixtures.conv_alex_jordan_id(), user_id: Fixtures.user_jordan_id()},
  %{conversation_id: Fixtures.conv_alex_taylor_id(), user_id: Fixtures.user_alex_id()},
  %{conversation_id: Fixtures.conv_alex_taylor_id(), user_id: Fixtures.user_taylor_id()}
]

for attrs <- members do
  exists =
    Repo.get_by(ConversationMember,
      conversation_id: attrs.conversation_id,
      user_id: attrs.user_id
    )

  unless exists do
    %ConversationMember{}
    |> ConversationMember.changeset(attrs)
    |> Repo.insert!()
  end
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
    evidence_reference: "seed:user-alex:ai_echo:granted"
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
    evidence_reference: "seed:user-jordan:ai_echo:denied"
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
    evidence_reference: "seed:user-alex:ai_echo:revoked"
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
    evidence_reference: "seed:user-taylor:ai_echo:expired"
  }
]

for attrs <- consents do
  case Repo.get(ConsentProof, attrs.id) do
    nil ->
      %ConsentProof{}
      |> ConsentProof.changeset(attrs)
      |> Repo.insert!()

    _ ->
      :ok
  end
end

IO.puts("Seeded synthetic users, conversations, and consent proofs.")
