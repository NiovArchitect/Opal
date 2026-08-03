defmodule OpalCoreWeb.InvitationController do
  use OpalCoreWeb, :controller

  import Ecto.Query

  alias OpalCore.Repo
  alias OpalCore.SocialFlow.Onboarding
  alias OpalCore.SocialFlow.RelationshipEstablishment
  alias OpalCore.SocialFlow.RelationshipInvitation

  def create(conn, params) do
    user_id = conn.assigns.current_user_id

    attrs = %{
      inviter_user_id: user_id,
      intended_recipient_user_id: params["recipient_user_id"],
      intended_identifier_digest: params["identifier_digest"],
      purpose: params["purpose"] || "connect",
      bounded_message: params["message"],
      source_device_label: params["device_label"] || "WebBrowser",
      relationship_context_type: params["relationship_context_type"] || "adult_1to1",
      idempotency_key: params["idempotency_key"],
      trace_id: params["trace_id"] || "trace-invite"
    }

    # Convenience: resolve phone then invite matched user or digest path.
    attrs =
      case {attrs.intended_recipient_user_id, attrs.intended_identifier_digest, params["phone"]} do
        {nil, nil, phone} when is_binary(phone) and phone != "" ->
          case Onboarding.resolve_contact(%{
                 requester_user_id: user_id,
                 identifier_raw: phone,
                 local_display_label: params["label"],
                 idempotency_key: params["resolve_idempotency_key"] || "cr-#{:erlang.phash2(phone)}"
               }) do
            {:ok, res, _} ->
              Map.merge(attrs, %{
                intended_recipient_user_id: res["matched_user_id"],
                intended_identifier_digest:
                  res["matched_user_id"] || Onboarding.lookup_digest(
                    case Onboarding.normalize_e164(phone) do
                      {:ok, e} -> e
                      _ -> phone
                    end
                  )
              })
              |> then(fn a ->
                if a.intended_recipient_user_id do
                  Map.put(a, :intended_identifier_digest, nil)
                else
                  a
                end
              end)

            _ ->
              attrs
          end

        _ ->
          attrs
      end

    case Onboarding.create_invitation(attrs) do
      {:ok, inv, origin} ->
        conn
        |> put_status(if(origin == :idempotent, do: 200, else: 201))
        |> json(%{
          "invitation" => RelationshipInvitation.to_contract(inv),
          "origin" => to_string(origin)
        })

      {:error, :blocked} ->
        error(conn, 403, "blocked", "You cannot invite this person")

      {:error, :recipient_required} ->
        error(conn, 422, "recipient_required", "Choose someone to invite")

      {:error, :rate_limited} ->
        error(conn, 429, "rate_limited", "Too many invitations. Try again later")

      {:error, reason} ->
        error(conn, 422, "invite_failed", inspect(reason))
    end
  end

  def incoming(conn, _params) do
    user_id = conn.assigns.current_user_id

    invites =
      from(i in RelationshipInvitation,
        where:
          i.intended_recipient_user_id == ^user_id and
            i.status in ^~w(sent delivered viewed),
        order_by: [desc: i.inserted_at]
      )
      |> Repo.all()
      |> Enum.map(&RelationshipInvitation.to_contract/1)

    json(conn, %{"invitations" => invites})
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
