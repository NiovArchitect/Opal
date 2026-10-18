defmodule OpalCoreWeb.JourneyController do
  use OpalCoreWeb, :controller

  alias OpalCore.SocialFlow
  alias OpalCore.SocialFlow.JourneyAuthority
  alias OpalCore.SocialFlow.PlanRevision

  @doc """
  B1 - convert this plan's place type (physical <-> virtual).

  Solo plans apply directly; shared plans return applied: false with
  the proposed revision - the plan does not move until the other
  participants accept through the respond endpoint. The response is
  the plan_payload (the one projection) plus the revision contract.
  """
  def convert_place_type(conn, %{"id" => id} = params) do
    user_id = conn.assigns.current_user_id

    case SocialFlow.convert_plan_place_type(%{
           plan_id: id,
           user_id: user_id,
           to_plan_type: params["to_plan_type"] || params["plan_type"],
           meeting_link: params["meeting_link"],
           meeting_provider: params["meeting_provider"],
           trace_id: params["trace_id"]
         }) do
      {:ok, %{plan: plan, revision: revision, applied: applied}} ->
        json(conn, %{
          "plan" => SocialFlow.plan_payload(plan),
          "revision" => revision && PlanRevision.to_contract(revision),
          "applied" => applied
        })

      {:error, :not_found} ->
        conn |> put_status(:not_found) |> json(%{"error" => "not_found"})

      {:error, reason} when reason in [:forbidden, :not_a_member, :not_authorized] ->
        conn |> put_status(:forbidden) |> json(%{"error" => to_string(reason)})

      {:error, reason} ->
        conn |> put_status(:unprocessable_entity) |> json(%{"error" => to_string(reason)})
    end
  end

  @doc """
  B1 - respond to a plan revision over HTTP (the revision channel
  already offered this over the socket; the conversion accept path
  needs the same action on the REST surface the clients use).
  """
  def respond_revision(conn, %{"id" => id, "revision_id" => revision_id} = params) do
    user_id = conn.assigns.current_user_id
    decision = params["decision"]

    if decision in ["accept", "reject"] do
      case SocialFlow.respond_to_revision(%{
             revision_id: revision_id,
             user_id: user_id,
             decision: decision,
             trace_id: params["trace_id"]
           }) do
        {:ok, %{plan: plan, revision: revision}} ->
          json(conn, %{
            "plan" => SocialFlow.plan_payload(plan),
            "revision" => PlanRevision.to_contract(revision),
            "applied" => true
          })

        {:ok, %PlanRevision{} = revision} ->
          json(conn, %{
            "plan_id" => id,
            "revision" => PlanRevision.to_contract(revision),
            "applied" => revision.status == "accepted"
          })

        {:error, :not_found} ->
          conn |> put_status(:not_found) |> json(%{"error" => "not_found"})

        {:error, reason} when reason in [:forbidden, :not_a_member, :not_authorized] ->
          conn |> put_status(:forbidden) |> json(%{"error" => to_string(reason)})

        {:error, reason} ->
          conn |> put_status(:unprocessable_entity) |> json(%{"error" => to_string(reason)})
      end
    else
      conn |> put_status(:unprocessable_entity) |> json(%{"error" => "invalid_decision"})
    end
  end

  def activate(conn, params) do
    user_id = conn.assigns.current_user_id

    case JourneyAuthority.activate(Map.put(params, "user_id", user_id)) do
      {:ok, journey} -> json(conn, %{"journey" => journey})
      {:error, :forbidden} -> conn |> put_status(:forbidden) |> json(%{"error" => "DENIED"})
      {:error, reason} -> conn |> put_status(:unprocessable_entity) |> json(%{"error" => to_string(reason)})
    end
  end

  def show(conn, %{"id" => id}) do
    user_id = conn.assigns.current_user_id

    case JourneyAuthority.get(id, user_id) do
      {:ok, journey} -> json(conn, %{"journey" => journey})
      {:error, :forbidden} -> conn |> put_status(:forbidden) |> json(%{"error" => "DENIED"})
      {:error, :not_journey} -> conn |> put_status(:conflict) |> json(%{"error" => "not_journey"})
      {:error, :not_found} -> conn |> put_status(:not_found) |> json(%{"error" => "not_found"})
      {:error, reason} -> conn |> put_status(:unprocessable_entity) |> json(%{"error" => to_string(reason)})
    end
  end

  @doc """
  I'm going — accept ONLY current PlanParticipant on existing SharedPlan.
  Never activates Journey navigation. Never accept-all. Never fabricates plan.
  """
  def accept_going(conn, %{"id" => id}) do
    user_id = conn.assigns.current_user_id

    case JourneyAuthority.accept_going(id, user_id) do
      {:ok, body} ->
        json(conn, body)

      {:error, :forbidden} ->
        conn |> put_status(:forbidden) |> json(%{"error" => "DENIED"})

      {:error, :not_found} ->
        conn |> put_status(:not_found) |> json(%{"error" => "not_found"})

      {:error, :stale_invitation} ->
        conn |> put_status(:conflict) |> json(%{"error" => "stale_invitation"})

      {:error, reason} ->
        conn |> put_status(:unprocessable_entity) |> json(%{"error" => to_string(reason)})
    end
  end

  def cant_make_it(conn, %{"id" => id} = params) do
    user_id = conn.assigns.current_user_id

    case JourneyAuthority.cant_make_it(id, user_id, params) do
      {:ok, body} -> json(conn, body)
      {:error, :forbidden} -> conn |> put_status(:forbidden) |> json(%{"error" => "DENIED"})
      {:error, :not_found} -> conn |> put_status(:not_found) |> json(%{"error" => "not_found"})
      {:error, reason} -> conn |> put_status(:unprocessable_entity) |> json(%{"error" => to_string(reason)})
    end
  end

  def material_change(conn, %{"id" => id} = params) do
    user_id = conn.assigns.current_user_id

    case JourneyAuthority.material_change(id, user_id, params) do
      {:ok, body} -> json(conn, body)
      {:error, :forbidden} -> conn |> put_status(:forbidden) |> json(%{"error" => "DENIED"})
      {:error, :not_found} -> conn |> put_status(:not_found) |> json(%{"error" => "not_found"})
      {:error, :stale_revision} ->
        conn |> put_status(:conflict) |> json(%{"error" => "stale_revision"})
      {:error, reason} -> conn |> put_status(:unprocessable_entity) |> json(%{"error" => to_string(reason)})
    end
  end

  def reconfirm(conn, %{"id" => id}) do
    user_id = conn.assigns.current_user_id

    case JourneyAuthority.reconfirm(id, user_id) do
      {:ok, journey} -> json(conn, %{"journey" => journey})
      {:error, :forbidden} -> conn |> put_status(:forbidden) |> json(%{"error" => "DENIED"})
      {:error, :not_found} -> conn |> put_status(:not_found) |> json(%{"error" => "not_found"})
      {:error, :stale_invitation} ->
        conn |> put_status(:conflict) |> json(%{"error" => "stale_invitation"})
      {:error, :not_pending_reconfirm} ->
        conn |> put_status(:conflict) |> json(%{"error" => "not_pending_reconfirm"})
      {:error, reason} -> conn |> put_status(:unprocessable_entity) |> json(%{"error" => to_string(reason)})
    end
  end

  def add_people(conn, %{"id" => id} = params) do
    user_id = conn.assigns.current_user_id
    peers = List.wrap(params["peer_user_ids"] || params["member_user_ids"] || [])

    case JourneyAuthority.add_people(id, user_id, peers) do
      {:ok, body} -> json(conn, body)
      {:error, :forbidden} -> conn |> put_status(:forbidden) |> json(%{"error" => "DENIED"})
      {:error, :not_found} -> conn |> put_status(:not_found) |> json(%{"error" => "not_found"})
      {:error, reason} -> conn |> put_status(:unprocessable_entity) |> json(%{"error" => to_string(reason)})
    end
  end

  def assign_co_lead(conn, %{"id" => id} = params) do
    user_id = conn.assigns.current_user_id
    peer = params["peer_user_id"]

    case JourneyAuthority.assign_co_lead(id, user_id, peer) do
      {:ok, journey} -> json(conn, %{"journey" => journey})
      {:error, :forbidden} -> conn |> put_status(:forbidden) |> json(%{"error" => "DENIED"})
      {:error, reason} -> conn |> put_status(:unprocessable_entity) |> json(%{"error" => to_string(reason)})
    end
  end

  def handoff_lead(conn, %{"id" => id} = params) do
    user_id = conn.assigns.current_user_id
    peer = params["peer_user_id"]

    case JourneyAuthority.handoff_lead(id, user_id, peer) do
      {:ok, journey} -> json(conn, %{"journey" => journey})
      {:error, :forbidden} -> conn |> put_status(:forbidden) |> json(%{"error" => "DENIED"})
      {:error, reason} -> conn |> put_status(:unprocessable_entity) |> json(%{"error" => to_string(reason)})
    end
  end
end
