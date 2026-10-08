defmodule OpalCore.SocialFlow.OAuthSecurityTest do
  @moduledoc "Phase 1 OAuth security pass before real credentials."
  use OpalCore.DataCase

  alias OpalCore.Accounts.User
  alias OpalCore.Repo

  alias OpalCore.SocialFlow.RealWorld.{
    OAuthNonceStore,
    OAuthState,
    ProviderConnections,
    TokenVault
  }

  alias OpalCore.SocialFlow.RealWorld.Calendar.{Aggregation, DecisionTrace, GoogleAdapter}

  setup do
    OAuthNonceStore.reset()
    uid = System.unique_integer([:positive])

    {:ok, user} =
      %User{}
      |> User.changeset(%{display_name: "O", handle: "oa-#{uid}"})
      |> Repo.insert()

    {:ok, other} =
      %User{}
      |> User.changeset(%{display_name: "X", handle: "ox-#{uid}"})
      |> Repo.insert()

    %{user: user, other: other}
  end

  test "state is signed and bound to user; forged state rejected", %{user: user} do
    assert {:ok, state, meta} = OAuthState.mint(user.id)
    assert is_binary(meta.code_verifier)
    assert meta.code_challenge_method == "S256"

    assert {:ok, verified} = OAuthState.verify(state, user.id)
    assert verified.user_id == user.id
    assert verified.code_verifier == meta.code_verifier
  end

  test "tampered state rejected", %{user: user} do
    assert {:ok, state, _} = OAuthState.mint(user.id)
    tampered = state <> "x"
    assert {:error, :state_forged} = OAuthState.verify(tampered, user.id)
  end

  test "wrong user cannot use another user's state", %{user: user, other: other} do
    assert {:ok, state, _} = OAuthState.mint(user.id)
    assert {:error, :user_mismatch} = OAuthState.verify(state, other.id)
  end

  test "state is single-use (replay rejected)", %{user: user} do
    assert {:ok, state, _} = OAuthState.mint(user.id)
    assert {:ok, _} = OAuthState.verify(state, user.id)
    assert {:error, :state_replay} = OAuthState.verify(state, user.id)
  end

  test "expired state rejected", %{user: user} do
    assert {:ok, state, _} = OAuthState.mint(user.id)
    # max_age 0 forces expiry
    assert {:error, :state_expired} = OAuthState.verify(state, user.id, max_age: 0)
  end

  test "session binding mismatch rejected", %{user: user} do
    assert {:ok, state, _} = OAuthState.mint(user.id, session_id: "sess-a")

    assert {:error, :session_mismatch} =
             OAuthState.verify(state, user.id, session_id: "sess-b")
  end

  test "PKCE challenge is S256 of verifier", %{user: user} do
    assert {:ok, _state, meta} = OAuthState.mint(user.id)
    assert OAuthState.pkce_challenge(meta.code_verifier) == meta.code_challenge
  end

  test "authorize_url includes PKCE params when challenge provided" do
    Application.put_env(:opal_core, :google_calendar_client_id, "cid")
    on_exit(fn -> Application.delete_env(:opal_core, :google_calendar_client_id) end)

    assert {:ok, url} =
             GoogleAdapter.authorize_url("signed-state", code_challenge: "abcChallenge")

    assert url =~ "code_challenge=abcChallenge"
    assert url =~ "code_challenge_method=S256"
    assert url =~ "state=signed-state"
    # Paste G — consent lists calendar.readonly + gmail.readonly
    assert url =~ "calendar.readonly"
    assert url =~ "gmail.readonly"
  end

  test "token vault encrypt/decrypt; weak secrets rejected" do
    assert {:error, :secret_too_short} = TokenVault.validate_secret("short")

    assert {:error, :secret_too_weak} =
             TokenVault.validate_secret("dev-only-provider-token-secret-32b!")

    assert :ok = TokenVault.validate_secret(String.duplicate("aB3$", 10))

    assert {:ok, ct} = TokenVault.encrypt("tok-abc")
    refute ct =~ "tok-abc"
    assert {:ok, "tok-abc"} = TokenVault.decrypt(ct)
    assert TokenVault.redact_for_log("tok-abc") == "[redacted-token]"
  end

  test "public status never includes tokens", %{user: user} do
    assert {:ok, _} =
             ProviderConnections.upsert_tokens(user.id, "google_calendar", %{
               access_token: "secret-access",
               refresh_token: "secret-refresh",
               token_expires_at: DateTime.add(DateTime.utc_now(), 3600, :second),
               scopes: [GoogleAdapter.preferred_scope()]
             })

    pub = ProviderConnections.public_status(user.id, "google_calendar")
    assert pub["connected"]
    assert is_nil(pub["access_token"])
    assert is_nil(pub["refresh_token"])
    refute inspect(pub) =~ "secret-access"
  end

  test "revoke removes calendar authority; wrong user cannot use connection", %{
    user: user,
    other: other
  } do
    assert {:ok, _} =
             ProviderConnections.upsert_tokens(user.id, "google_calendar", %{
               access_token: "a",
               refresh_token: "r",
               token_expires_at: DateTime.add(DateTime.utc_now(), 3600, :second),
               scopes: [GoogleAdapter.preferred_scope()]
             })

    assert ProviderConnections.connected?(user.id, "google_calendar")
    refute ProviderConnections.connected?(other.id, "google_calendar")

    assert {:ok, _} = ProviderConnections.revoke(user.id, "google_calendar")
    refute ProviderConnections.connected?(user.id, "google_calendar")
    row = ProviderConnections.get(user.id, "google_calendar")
    assert row.status == "revoked"
    assert is_nil(row.access_token_ciphertext)
  end

  test "multi-calendar busy-on-any aggregation" do
    cals = %{
      "personal" => %{
        "busy" => [%{"start" => "2026-08-14T15:00:00Z", "end" => "2026-08-14T16:00:00Z"}]
      },
      "work" => %{
        "busy" => [%{"start" => "2026-08-14T18:00:00Z", "end" => "2026-08-14T19:00:00Z"}]
      }
    }

    assert {:ok, busy} = Aggregation.merge_busy(cals)
    assert length(busy) == 2

    free_slot = ~U[2026-08-14 16:30:00Z]
    free_end = ~U[2026-08-14 17:30:00Z]
    assert Aggregation.free_during?(busy, free_slot, free_end)

    busy_slot = ~U[2026-08-14 15:15:00Z]
    busy_end = ~U[2026-08-14 15:45:00Z]
    refute Aggregation.free_during?(busy, busy_slot, busy_end)
  end

  test "decision trace has no leakage" do
    t =
      DecisionTrace.build(%{
        gap: "time",
        calendar_fact: "present",
        calendar_fresh: true,
        technically_free: true,
        willingness: "unknown",
        peer_signal: "Thursday",
        decision: "needs_confirmation",
        should_ask_time: false
      })

    assert t["decision"] == "needs_confirmation"
    assert t["authorizes_set"] == false
    assert :ok = DecisionTrace.assert_safe!(t)
  end

  test "oauth failure path leaves manual availability intact", %{user: user} do
    # No connection; FreeBusyStore still usable
    alias OpalCore.SocialFlow.RealWorld.Calendar.FreeBusyStore
    FreeBusyStore.grant_permission(user.id)
    FreeBusyStore.put_busy(user.id, [])
    assert {:ok, %{"granted" => true}} = FreeBusyStore.calendar_permission(user.id)
  end
end
