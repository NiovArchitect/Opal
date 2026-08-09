defmodule OpalCore.SocialFlow.RealWorld.OAuthState do
  @moduledoc """
  Cryptographically integrity-protected OAuth `state` for connector flows.

  Uses Phoenix.Token (HMAC via Endpoint secret_key_base) — not forgeable with
  user_id+nonce alone.

  Properties:
  - unforgeable (signed)
  - short-lived (default 10 minutes)
  - single-use (jti consumed on verify)
  - bound to initiating user (+ optional session_id)
  - carries PKCE code_verifier hash material
  """

  @salt "opal.oauth.state.v1"
  @max_age_sec 600

  def max_age_sec, do: @max_age_sec

  @doc """
  Mint a signed state for the initiating user.

  Returns `{:ok, state_token, meta}` where meta includes plaintext fields
  needed only server-side for PKCE (code_verifier must be kept until callback).
  """
  def mint(user_id, opts \\ []) when is_binary(user_id) do
    jti = Ecto.UUID.generate()
    code_verifier = pkce_verifier()
    code_challenge = pkce_challenge(code_verifier)
    session_id = Keyword.get(opts, :session_id)
    provider = Keyword.get(opts, :provider, "google_calendar")

    payload = %{
      "uid" => user_id,
      "jti" => jti,
      "sid" => session_id,
      "prv" => provider,
      "cc" => code_challenge,
      "iat" => System.system_time(:second)
    }

    token = Phoenix.Token.sign(OpalCoreWeb.Endpoint, @salt, payload)

    # Remember verifier keyed by jti until callback (or expiry)
    :ok =
      OpalCore.SocialFlow.RealWorld.OAuthNonceStore.put_pending(jti, %{
        "user_id" => user_id,
        "session_id" => session_id,
        "code_verifier" => code_verifier,
        "provider" => provider,
        "expires_at" => System.system_time(:second) + @max_age_sec
      })

    {:ok, token,
     %{
       jti: jti,
       code_verifier: code_verifier,
       code_challenge: code_challenge,
       code_challenge_method: "S256"
     }}
  end

  @doc """
  Verify signed state for the authenticated callback user.

  Single-use: succeeds at most once per jti.
  """
  def verify(state, user_id, opts \\ []) when is_binary(state) and is_binary(user_id) do
    max_age = Keyword.get(opts, :max_age, @max_age_sec)

    case Phoenix.Token.verify(OpalCoreWeb.Endpoint, @salt, state, max_age: max_age) do
      {:ok, %{"uid" => ^user_id, "jti" => jti} = payload} ->
        case OpalCore.SocialFlow.RealWorld.OAuthNonceStore.consume(jti) do
          {:ok, pending} ->
            # Optional session binding
            expected_sid = Keyword.get(opts, :session_id)
            pending_sid = pending["session_id"] || payload["sid"]

            cond do
              is_binary(expected_sid) and is_binary(pending_sid) and expected_sid != pending_sid ->
                {:error, :session_mismatch}

              true ->
                {:ok,
                 %{
                   user_id: user_id,
                   jti: jti,
                   provider: payload["prv"] || pending["provider"],
                   code_verifier: pending["code_verifier"],
                   code_challenge: payload["cc"]
                 }}
            end

          {:error, :already_used} ->
            {:error, :state_replay}

          {:error, :not_found} ->
            {:error, :state_unknown}

          {:error, :expired} ->
            {:error, :state_expired}
        end

      {:ok, %{"uid" => other}} when other != user_id ->
        {:error, :user_mismatch}

      {:ok, _} ->
        {:error, :invalid_payload}

      {:error, :expired} ->
        {:error, :state_expired}

      {:error, :invalid} ->
        {:error, :state_forged}

      {:error, _} ->
        {:error, :state_invalid}
    end
  end

  def pkce_verifier do
    :crypto.strong_rand_bytes(32) |> Base.url_encode64(padding: false)
  end

  def pkce_challenge(verifier) when is_binary(verifier) do
    :crypto.hash(:sha256, verifier) |> Base.url_encode64(padding: false)
  end
end
