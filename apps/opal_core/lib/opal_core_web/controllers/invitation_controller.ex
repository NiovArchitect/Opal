defmodule OpalCoreWeb.InvitationController do
  use OpalCoreWeb, :controller

  require Logger

  alias OpalCore.Accounts.User
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.Onboarding
  alias OpalCore.SocialFlow.RelationshipEstablishment
  alias OpalCore.SocialFlow.RelationshipInvitation
  alias OpalCore.SocialFlow.Sms.TwilioSmsAdapter

  def create(conn, params) do
    user_id = conn.assigns.current_user_id
    attrs = base_invite_attrs(user_id, params) |> maybe_resolve_phone(user_id, params)

    case Onboarding.create_invitation(attrs) do
      {:ok, inv, share, origin} ->
        delivery = maybe_deliver_sms(user_id, params, share, origin)

        conn
        |> put_status(if(origin == :idempotent, do: 200, else: 201))
        |> json(%{
          "invitation" => RelationshipInvitation.to_contract(inv),
          "share" => public_share(share, origin),
          "product_status" => RelationshipInvitation.product_status(inv.status),
          "delivery" => delivery,
          "product_delivery_label" => product_delivery_label(delivery, share, origin),
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

  # Delivery honesty: share-link is always the durable channel.
  # SMS only when Twilio From/Messaging Service is configured AND inviter supplied a phone.
  defp maybe_deliver_sms(user_id, params, share, origin) do
    base = delivery_base(share, origin)
    phone = params["phone"]

    cond do
      origin == :idempotent ->
        # One SMS per invitation — never re-send on idempotent replay.
        Map.merge(base, %{
          "sms_sent" => false,
          "sms_adapter" => adapter_label(),
          "sms_skipped" => "idempotent_replay"
        })

      not (is_binary(phone) and String.trim(phone) != "") ->
        Map.merge(base, %{
          "sms_sent" => false,
          "sms_adapter" => adapter_label(),
          "sms_skipped" => "no_phone_provided"
        })

      TwilioSmsAdapter.readiness() != :ready ->
        reason =
          case TwilioSmsAdapter.readiness() do
            {:disabled, r} -> r
            _ -> :disabled
          end

        Logger.warning("invitation.sms_disabled reason=#{reason}")

        Map.merge(base, %{
          "sms_sent" => false,
          "sms_adapter" => "disabled",
          "sms_disabled_reason" => to_string(reason),
          "honest_no_production_sms" => true
        })

      true ->
        send_invitation_sms(user_id, phone, params, share, base)
    end
  end

  defp send_invitation_sms(user_id, phone, params, share, base) do
    with {:ok, e164} <- Onboarding.normalize_e164(phone),
         body <- invitation_sms_body(user_id, params, share),
         {:ok, sid} <- TwilioSmsAdapter.send(e164, body) do
      Map.merge(base, %{
        "channel" => "sms",
        "sms_sent" => true,
        "sms_adapter" => "twilio",
        "sms_provider_sid" => sid,
        "honest_no_production_sms" => false,
        "labels" => %{
          "invite_ready" => true,
          "sent" => true,
          "opened" => false,
          "connected" => false,
          "could_not_send" => false
        }
      })
    else
      {:error, :invalid_identifier} ->
        Map.merge(base, %{
          "sms_sent" => false,
          "sms_adapter" => "twilio",
          "sms_error" => "invalid_number",
          "labels" => label_could_not_send(base)
        })

      {:error, {:twilio, code, message}} ->
        Logger.warning(
          "invitation.sms_twilio_error code=#{code || "none"} message=#{inspect(message)}"
        )

        Map.merge(base, %{
          "sms_sent" => false,
          "sms_adapter" => "twilio",
          "sms_error" => "twilio_#{code || "unknown"}",
          "sms_error_code" => code,
          "sms_error_message" => message,
          "honest_no_production_sms" => true,
          "labels" => label_could_not_send(base)
        })

      {:error, reason} ->
        Logger.warning("invitation.sms_failed reason=#{inspect(reason)}")

        Map.merge(base, %{
          "sms_sent" => false,
          "sms_adapter" => adapter_label(),
          "sms_error" => to_string(reason),
          "honest_no_production_sms" => true,
          "labels" => label_could_not_send(base)
        })
    end
  end

  defp delivery_base(share, origin) do
    link_ready =
      is_map(share) and (is_binary(share["share_token"]) or is_binary(share["share_path"]))

    %{
      "channel" => "secure_share_link",
      "share_link_ready" => link_ready or origin in [:created, :idempotent],
      "sms_sent" => false,
      "sms_adapter" => adapter_label(),
      "honest_no_production_sms" => TwilioSmsAdapter.readiness() != :ready,
      "labels" => %{
        "invite_ready" => true,
        "sent" => false,
        "opened" => false,
        "connected" => false,
        "could_not_send" => false
      }
    }
  end

  defp adapter_label do
    case TwilioSmsAdapter.readiness() do
      :ready -> "twilio"
      _ -> "disabled"
    end
  end

  defp label_could_not_send(base) do
    Map.merge(base["labels"] || %{}, %{
      "invite_ready" => true,
      "sent" => false,
      "could_not_send" => true
    })
  end

  defp invitation_sms_body(user_id, params, share) do
    name = inviter_display_name(user_id, params)
    link = invite_link(share)
    # Plain language + carrier opt-out note. Truncation handled in adapter.
    "#{name} invited you to Opal — #{link}\nReply STOP to opt out."
  end

  defp inviter_display_name(user_id, params) do
    cond do
      is_binary(params["inviter_display_name"]) and String.trim(params["inviter_display_name"]) != "" ->
        String.trim(params["inviter_display_name"])

      true ->
        case Repo.get(User, user_id) do
          %User{display_name: name} when is_binary(name) and name != "" -> name
          _ -> "Someone"
        end
    end
  end

  defp invite_link(share) when is_map(share) do
    token = share["share_token"]
    path = share["share_path"]

    base =
      System.get_env("OPAL_PUBLIC_WEB_URL") ||
        System.get_env("OPAL_WEB_ORIGIN") ||
        ""

    base = String.trim_trailing(to_string(base), "/")

    cond do
      is_binary(token) and token != "" and base != "" ->
        "#{base}/?invite=#{URI.encode_www_form(token)}"

      is_binary(token) and token != "" ->
        # No public web origin configured — still include token path (honest, clickable only with host).
        "/?invite=#{URI.encode_www_form(token)}"

      is_binary(path) and path != "" and base != "" ->
        "#{base}#{path}"

      is_binary(path) and path != "" ->
        path

      true ->
        "Opal"
    end
  end

  defp invite_link(_), do: "Opal"

  defp product_delivery_label(delivery, share, origin) when is_map(delivery) do
    cond do
      delivery["sms_sent"] == true -> "sent"
      delivery["labels"]["could_not_send"] == true and delivery["sms_error"] -> "could_not_send"
      is_map(share) or origin in [:created, :idempotent] -> "invite_ready"
      true -> "could_not_send"
    end
  end

  defp product_delivery_label(_delivery, share, origin) do
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
        # Generic denial — no account/oracle distinction.
        error(conn, 404, "not_found", "This invitation is no longer available")
    end
  end

  def continue(conn, params) do
    user_id = conn.assigns.current_user_id
    continuation_id = params["continuation_id"]

    case Onboarding.resume_invitation_continuation(continuation_id, user_id) do
      {:ok, payload} ->
        json(conn, payload)

      {:error, :expired} ->
        error(conn, 410, "expired", "This invitation is no longer available")

      {:error, :used} ->
        error(conn, 410, "used", "This invitation is no longer available")

      {:error, :forbidden} ->
        error(conn, 403, "forbidden", "This invitation is no longer available")

      {:error, :blocked} ->
        error(conn, 403, "blocked", "This invitation is no longer available")

      {:error, _} ->
        error(conn, 404, "not_found", "This invitation is no longer available")
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

  def accept(conn, %{"id" => id} = params) do
    case Onboarding.accept_invitation(%{
           invitation_id: id,
           acceptor_user_id: conn.assigns.current_user_id
         }) do
      {:ok, %{establishment: est, conversation_id: cid} = payload, origin} ->
        maybe_consume_continuation(params["continuation_id"])

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
        maybe_consume_continuation(params["continuation_id"])

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

  defp maybe_consume_continuation(nil), do: :ok
  defp maybe_consume_continuation(""), do: :ok

  defp maybe_consume_continuation(raw) when is_binary(raw) do
    Onboarding.consume_invitation_continuation(raw)
  end

  def decline(conn, %{"id" => id} = params) do
    case Onboarding.decline_invitation(%{
           invitation_id: id,
           decliner_user_id: conn.assigns.current_user_id
         }) do
      {:ok, %{invitation: inv}} ->
        maybe_consume_continuation(params["continuation_id"])
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
