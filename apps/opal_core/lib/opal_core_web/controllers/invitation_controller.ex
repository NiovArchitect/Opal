defmodule OpalCoreWeb.InvitationController do
  use OpalCoreWeb, :controller

  alias OpalCore.SocialFlow.Onboarding
  alias OpalCore.SocialFlow.RelationshipEstablishment
  alias OpalCore.SocialFlow.RelationshipInvitation

  def create(conn, params) do
    user_id = conn.assigns.current_user_id
    attrs = base_invite_attrs(user_id, params) |> maybe_resolve_phone(user_id, params)

    case Onboarding.create_invitation(attrs) do
      {:ok, inv, share, origin} ->
        conn
        |> put_status(if(origin == :idempotent, do: 200, else: 201))
        |> json(%{
          "invitation" => RelationshipInvitation.to_contract(inv),
          "share" => public_share(share, origin),
          "product_status" => RelationshipInvitation.product_status(inv.status),
          "delivery" => delivery_status(share, origin),
          "product_delivery_label" => product_delivery_label(share, origin),
          "origin" => to_string(origin)
        })

      {:error, :blocked} ->
        error(conn, 403, "could_not_invite", "Could not invite this person")

      {:error, :recipient_required} ->
        error(conn, 422, "recipient_required", "Choose someone to invite")

      {:error, :rate_limited} ->
        error(conn, 429, "rate_limited", "Too many invitations. Try again later")

      {:error, _reason} ->
        error(conn, 422, "could_not_invite", "Could not invite this person")
    end
  end

  defp public_share(share, :created) when is_map(share) do
    # Only return raw token on create (once). Never put phone/session in URL.
    %{
      "token" => share["share_token"],
      "path" => share["share_path"],
      "no_phone_in_url" => true,
      "no_session_in_url" => true,
      "requires_acceptance" => true
    }
  end

  defp public_share(share, _) when is_map(share) do
    %{
      "path" => share["share_path"],
      "no_phone_in_url" => true,
      "no_session_in_url" => true,
      "requires_acceptance" => true
    }
  end

  defp public_share(_, _), do: %{}

  # Delivery honesty: "Invite ready" is not "Sent". SMS stays disabled until a separate adapter.
  defp delivery_status(share, origin) do
    link_ready = is_map(share) and (is_binary(share["share_token"]) or is_binary(share["share_path"]))

    %{
      "channel" => "secure_share_link",
      "share_link_ready" => link_ready or origin in [:created, :idempotent],
      "sms_sent" => false,
      "sms_adapter" => "disabled",
      "honest_no_production_sms" => true,
      "labels" => %{
        "invite_ready" => true,
        "sent" => false,
        "opened" => false,
        "connected" => false,
        "could_not_send" => false
      }
    }
  end

  defp product_delivery_label(share, origin) do
    if is_map(share) or origin in [:created, :idempotent] do
      "invite_ready"
    else
      "could_not_send"
    end
  end

  defp base_invite_attrs(user_id, params) do
    purpose = params["purpose"] || "connect"
    default_msg = params["message"] || invite_purpose_copy(params["label"], purpose)

    %{
      inviter_user_id: user_id,
      intended_recipient_user_id: params["recipient_user_id"],
      intended_identifier_digest: params["identifier_digest"],
      purpose: purpose,
      bounded_message: default_msg,
      source_device_label: params["device_label"] || "WebBrowser",
      relationship_context_type: params["relationship_context_type"] || "adult_1to1",
      idempotency_key: params["idempotency_key"],
      local_display_label: params["label"],
      invite_source: params["invite_source"] || "manual",
      trace_id: params["trace_id"] || "trace-invite"
    }
  end

  defp invite_purpose_copy(label, _purpose) do
    name = if is_binary(label) and label != "", do: label, else: "Someone"
    "#{name} invited you into a plan in Opal."
  end

  defp maybe_resolve_phone(attrs, _user_id, _params)
       when is_binary(attrs.intended_recipient_user_id) or
              is_binary(attrs.intended_identifier_digest),
       do: attrs

  defp maybe_resolve_phone(attrs, user_id, params) do
    phone = params["phone"]

    if is_binary(phone) and phone != "" do
      resolve_phone_attrs(attrs, user_id, phone, params)
    else
      attrs
    end
  end

  defp resolve_phone_attrs(attrs, user_id, phone, params) do
    case Onboarding.resolve_contact(%{
           requester_user_id: user_id,
           identifier_raw: phone,
           local_display_label: params["label"],
           idempotency_key: params["resolve_idempotency_key"] || "cr-#{:erlang.phash2(phone)}"
         }) do
      {:ok, res, _} -> apply_resolution(attrs, res, phone)
      _ -> attrs
    end
  end

  defp apply_resolution(attrs, res, phone) do
    matched = res["matched_user_id"]

    if matched do
      Map.merge(attrs, %{
        intended_recipient_user_id: matched,
        intended_identifier_digest: nil
      })
    else
      e164 =
        case Onboarding.normalize_e164(phone) do
          {:ok, e} -> e
          _ -> phone
        end

      Map.put(attrs, :intended_identifier_digest, Onboarding.lookup_digest(e164))
    end
  end

  def incoming(conn, _params) do
    invites =
      conn.assigns.current_user_id
      |> Onboarding.list_incoming()
      |> Enum.map(&RelationshipInvitation.to_contract/1)

    json(conn, %{"invitations" => invites})
  end

  def outgoing(conn, _params) do
    invites =
      conn.assigns.current_user_id
      |> Onboarding.list_outgoing()
      |> Enum.map(&RelationshipInvitation.to_contract/1)

    json(conn, %{"invitations" => invites})
  end

  def people(conn, _params) do
    json(conn, Onboarding.people_summary(conn.assigns.current_user_id))
  end

  def preview_share(conn, %{"token" => token}) do
    case Onboarding.preview_share_token(token) do
      {:ok, preview} ->
        json(conn, preview)

      {:error, :expired} ->
        error(conn, 410, "expired", "This invitation is no longer available")

      {:error, _} ->
        error(conn, 404, "not_found", "Invitation not found")
    end
  end

  def show(conn, %{"id" => id}) do
    user_id = conn.assigns.current_user_id

    case Onboarding.view_invitation(id, user_id) do
      {:ok, inv} ->
        json(conn, %{"invitation" => RelationshipInvitation.to_contract(inv)})

      {:error, :forbidden} ->
        error(conn, 403, "forbidden", "You cannot view this invitation")

      {:error, :not_found} ->
        error(conn, 404, "not_found", "Invitation not found")
    end
  end

  def accept(conn, %{"id" => id}) do
    case Onboarding.accept_invitation(%{
           invitation_id: id,
           acceptor_user_id: conn.assigns.current_user_id
         }) do
      {:ok, %{establishment: est, conversation_id: cid} = payload, origin} ->
        json(conn, %{
          "establishment" => %{
            "status" => est.status,
            "conversation_id" => cid,
            "relationship_id" => est.id
          },
          "no_historical_messages" => Map.get(payload, :no_historical_messages, true),
          "first_social_moment" => Map.get(payload, :first_social_moment),
          "origin" => to_string(origin)
        })

      {:ok, %RelationshipEstablishment{} = est, origin} ->
        json(conn, %{
          "establishment" => %{
            "status" => est.status,
            "conversation_id" => est.conversation_id,
            "relationship_id" => est.id
          },
          "no_historical_messages" => true,
          "origin" => to_string(origin)
        })

      {:error, :forbidden} ->
        error(conn, 403, "forbidden", "You cannot accept this invitation")

      {:error, :not_found} ->
        error(conn, 404, "not_found", "Invitation not found")

      {:error, :blocked} ->
        error(conn, 403, "blocked", "This connection is blocked")

      {:error, reason} ->
        error(conn, 422, "accept_failed", inspect(reason))
    end
  end

  def decline(conn, %{"id" => id}) do
    case Onboarding.decline_invitation(%{
           invitation_id: id,
           decliner_user_id: conn.assigns.current_user_id
         }) do
      {:ok, %{invitation: inv}} ->
        json(conn, %{"invitation" => RelationshipInvitation.to_contract(inv)})

      {:error, reason} ->
        error(conn, 422, "decline_failed", inspect(reason))
    end
  end

  defp error(conn, status, code, message) do
    conn
    |> put_status(status)
    |> json(%{"error_code" => code, "message" => message})
  end
end
