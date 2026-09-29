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
  @socket_salt "opal.product.socket.v1"
  @max_age_sec 60 * 60 * 24 * 14
  @socket_ticket_max_age_sec 120

  def max_age_sec, do: @max_age_sec
  def socket_ticket_max_age_sec, do: @socket_ticket_max_age_sec
  def cookie_name, do: "opal_session"
  def csrf_cookie_name, do: "opal_csrf"

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
         # R1A.1: reflect actual phone-verify mode — never label production SMS as synthetic.
         provider: phone_verify_provider_label()
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
    result = TrustSafety.revoke_session(%{user_id: user_id, session_id: id})
    _ = disconnect_session_sockets(id)
    result
  end

  def revoke_by_ids(user_id, session_id) do
    result = TrustSafety.revoke_session(%{user_id: user_id, session_id: session_id})
    _ = disconnect_session_sockets(session_id)
    result
  end

  @doc """
  Force-disconnect open Phoenix sockets for a DeviceSession.

  Connect-time auth alone is not enough: a revoked token must not keep
  privileged channel access indefinitely on an already-open socket.
  """
  def disconnect_session_sockets(session_id) when is_binary(session_id) do
    OpalCoreWeb.Endpoint.broadcast("user_session:#{session_id}", "disconnect", %{
      reason: "session_revoked"
    })

    :ok
  end

  def disconnect_session_sockets(_), do: :ok

  defp phone_verify_provider_label do
    case OpalCore.SocialFlow.PhoneVerification.Provider.mode() do
      :production_sms -> "twilio_verify"
      :synthetic_development -> "synthetic_development"
      :disabled -> "disabled"
      _ -> "unknown"
    end
  end

  @doc "True when the DeviceSession row is still active."
  def session_active?(session_id) when is_binary(session_id) do
    case Repo.get(DeviceSession, session_id) do
      %DeviceSession{status: "active"} -> true
      _ -> false
    end
  end

  def session_active?(_), do: false

  def public_user(%User{} = user) do
    %{
      "id" => user.id,
      "display_name" => user.display_name,
      "handle" => user.handle
    }
  end

  @doc """
  Messaging preferences for the signed-in user.

  Read receipts control what other people are told. They do not control
  this user's own unread count.
  """
  def messaging_preferences(%User{} = user) do
    %{
      "read_receipts_enabled" => user.read_receipts_enabled != false,
      "message_notifications_enabled" => user.message_notifications_enabled != false
    }
  end

  def assist_preference(%User{} = user) do
    %{"assist_calls_enabled" => user.assist_calls_enabled}
  end

  def update_assist_preference(%User{} = user, params) when is_map(params) do
    case params["assist_calls_enabled"] do
      value when value in [true, false, "true", "false"] ->
        enabled = value in [true, "true"]

        user
        |> User.changeset(%{assist_calls_enabled: enabled})
        |> Repo.update()

      _ ->
        {:error, :invalid}
    end
  end

  def update_messaging_preferences(%User{} = user, params) when is_map(params) do
    attrs =
      %{}
      |> put_bool(:read_receipts_enabled, params["read_receipts_enabled"])
      |> put_bool(:message_notifications_enabled, params["message_notifications_enabled"])

    user
    |> User.changeset(attrs)
    |> Repo.update()
  end

  defp put_bool(attrs, _key, nil), do: attrs
  defp put_bool(attrs, key, value) when is_boolean(value), do: Map.put(attrs, key, value)
  defp put_bool(attrs, key, "true"), do: Map.put(attrs, key, true)
  defp put_bool(attrs, key, "false"), do: Map.put(attrs, key, false)
  defp put_bool(attrs, _key, _value), do: attrs

  @doc """
  S1 profile setup: update display name and optional handle for the signed-in user.
  Handle uniqueness is real (unique_constraint). Empty handle leaves the existing handle.
  """
  def update_profile(%User{} = user, attrs) when is_map(attrs) do
    display_name =
      case Map.get(attrs, :display_name) || Map.get(attrs, "display_name") do
        name when is_binary(name) -> String.trim(name)
        _ -> user.display_name
      end

    handle_raw = Map.get(attrs, :handle) || Map.get(attrs, "handle")

    handle =
      cond do
        is_binary(handle_raw) and String.trim(handle_raw) != "" ->
          handle_raw
          |> String.trim()
          |> String.replace_leading("@", "")
          |> String.downcase()
          |> String.replace(~r/[^a-z0-9_]/, "")
          |> String.slice(0, 64)

        true ->
          user.handle
      end

    if display_name == "" or is_nil(display_name) do
      {:error, :display_name_required}
    else
      user
      |> User.changeset(%{display_name: display_name, handle: handle})
      |> Repo.update()
      |> case do
        {:ok, updated} -> {:ok, updated}
        {:error, %Ecto.Changeset{} = cs} -> {:error, cs}
        other -> other
      end
    end
  end

  @doc """
  Short-lived socket ticket bound to an active session.
  """
  def issue_socket_ticket(%DeviceSession{} = session) do
    if session.status != "active" do
      {:error, :session_inactive}
    else
      ticket =
        Phoenix.Token.sign(OpalCoreWeb.Endpoint, @socket_salt, %{
          "uid" => session.user_id,
          "sid" => session.id,
          "ref" => session.session_ref,
          "kind" => "socket"
        })

      {:ok, %{ticket: ticket, expires_in: @socket_ticket_max_age_sec}}
    end
  end

  def authenticate_socket_ticket(ticket) when is_binary(ticket) and byte_size(ticket) > 0 do
    case Phoenix.Token.verify(OpalCoreWeb.Endpoint, @socket_salt, ticket,
           max_age: @socket_ticket_max_age_sec
         ) do
      {:ok, %{"uid" => uid, "sid" => sid, "ref" => ref, "kind" => "socket"}} ->
        # Reuse session authenticity (revocation still authoritative).
        case Repo.get(DeviceSession, sid) do
          %DeviceSession{user_id: ^uid, session_ref: ^ref, status: "active"} = session ->
            user = Repo.get(User, uid)

            if user do
              {:ok, %{user: user, session: session, user_id: uid}}
            else
              {:error, :user_not_found}
            end

          %DeviceSession{status: status} when status in ~w(revoked expired) ->
            {:error, :session_revoked}

          _ ->
            {:error, :invalid_ticket}
        end

      {:error, :expired} ->
        {:error, :ticket_expired}

      {:error, _} ->
        {:error, :invalid_ticket}
    end
  end

  def authenticate_socket_ticket(_), do: {:error, :invalid_ticket}

  def new_csrf_token do
    :crypto.strong_rand_bytes(24) |> Base.url_encode64(padding: false)
  end

  defp touch_session(%DeviceSession{} = session) do
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    session
    |> DeviceSession.changeset(%{last_seen_at: now})
    |> Repo.update()
  end
end
