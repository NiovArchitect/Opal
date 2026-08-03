defmodule OpalCore.Auth.ProductSession do
  @moduledoc """
  Product-facing session tokens backed by DeviceSession.

  Tokens are Phoenix.Token signed payloads. Authority remains Elixir:
  revoked or missing DeviceSession records fail authentication.
  """

  alias OpalCore.Accounts.User
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.DeviceSession
  alias OpalCore.SocialFlow.TrustSafety

  @salt "opal.product.session.v1"
  @max_age_sec 60 * 60 * 24 * 14

  def max_age_sec, do: @max_age_sec

  @doc """
  Issues a product token for an active DeviceSession.
  """
  def issue(%DeviceSession{} = session) do
    if session.status != "active" do
      {:error, :session_inactive}
    else
      token =
        Phoenix.Token.sign(OpalCoreWeb.Endpoint, @salt, %{
          "uid" => session.user_id,
          "sid" => session.id,
          "ref" => session.session_ref
        })

      {:ok,
       %{
         access_token: token,
         token_type: "Bearer",
         expires_in: @max_age_sec,
         session_id: session.id,
         session_ref: session.session_ref,
         user_id: session.user_id,
         device_label: session.device_label,
         platform: session.platform,
         provider: "synthetic_development"
       }}
    end
  end

  @doc """
  Authenticates a Bearer token. Returns user_id and session.
  """
  def authenticate(token) when is_binary(token) and byte_size(token) > 0 do
    case Phoenix.Token.verify(OpalCoreWeb.Endpoint, @salt, token, max_age: @max_age_sec) do
      {:ok, %{"uid" => uid, "sid" => sid, "ref" => ref}} ->
        case Repo.get(DeviceSession, sid) do
          %DeviceSession{
            user_id: ^uid,
            session_ref: ^ref,
            status: "active"
          } = session ->
            touch_session(session)
            user = Repo.get(User, uid)

            if user do
              {:ok, %{user: user, session: session, user_id: uid}}
            else
              {:error, :user_not_found}
            end

          %DeviceSession{status: status} when status in ~w(revoked expired) ->
            {:error, :session_revoked}

          %DeviceSession{} ->
            {:error, :session_mismatch}

          nil ->
            {:error, :session_not_found}
        end

      {:error, :expired} ->
        {:error, :token_expired}

      {:error, _} ->
        {:error, :invalid_token}
    end
  end

  def authenticate(_), do: {:error, :invalid_token}

  def revoke(%{user_id: user_id, session: %DeviceSession{id: id}}) do
    TrustSafety.revoke_session(%{user_id: user_id, session_id: id})
  end

  def revoke_by_ids(user_id, session_id) do
    TrustSafety.revoke_session(%{user_id: user_id, session_id: session_id})
  end

  def public_user(%User{} = user) do
    %{
      "id" => user.id,
      "display_name" => user.display_name,
      "handle" => user.handle
    }
  end

  defp touch_session(%DeviceSession{} = session) do
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    session
    |> DeviceSession.changeset(%{last_seen_at: now})
    |> Repo.update()
  end
end
