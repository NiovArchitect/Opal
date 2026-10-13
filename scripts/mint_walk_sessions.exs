# Mix-mint Walk A/B DeviceSessions for coherence proofs under production_sms.
# Usage (from apps/opal_core, with ~/.opal/r1a1.env loaded):
#   mix run ../../scripts/mint_walk_sessions.exs
# Writes /tmp/opal_minted_walk_sessions.json — NEVER commit that file.
# Does not burn SMS.

alias OpalCore.Repo
alias OpalCore.Accounts.User
alias OpalCore.SocialFlow.DeviceSession
alias OpalCore.Auth.ProductSession
import Ecto.Query

walk_ids = [
  {"a", "47aa5856-8c56-4b18-a4d4-6a9b456516a8", "+12025550101", "Walk A"},
  {"b", "b599fcd7-7a97-4736-8221-86e0a6d8dc7a", "+12025550102", "Walk B"}
]

out =
  Enum.map(walk_ids, fn {role, id, phone, name} ->
    user = Repo.get(User, id) || Repo.one(from u in User, where: u.phone_e164 == ^phone, limit: 1)
    unless user, do: raise("missing user #{role} #{id} phone=#{phone}")
    n = System.unique_integer([:positive])
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    session =
      %DeviceSession{}
      |> DeviceSession.changeset(%{
        user_id: user.id,
        device_label: "steward-mint-#{role}",
        platform: "web",
        status: "active",
        session_ref: "ref-steward-#{role}-#{n}",
        refresh_family: "rf-steward-#{role}-#{n}",
        idempotency_key: "idem-steward-#{role}-#{n}",
        last_seen_at: now
      })
      |> Repo.insert!()

    {:ok, payload} = ProductSession.issue(session)

    %{
      role: role,
      phone: phone,
      name: name,
      userId: user.id,
      handle: Map.get(user, :handle),
      token: payload.access_token,
      sessionId: session.id
    }
  end)

path = System.get_env("OPAL_MINTED_SESSIONS_JSON") || "/tmp/opal_minted_walk_sessions.json"
File.write!(path, Jason.encode!(%{minted_at: DateTime.utc_now() |> DateTime.to_iso8601(), sessions: out}))
IO.puts("WROTE #{path} (tokens redacted in log)")
Enum.each(out, fn s -> IO.puts("role=#{s.role} user=#{s.userId} handle=#{s.handle}") end)
