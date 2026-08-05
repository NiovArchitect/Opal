defmodule OpalCoreWeb.OpportunityController do
  use OpalCoreWeb, :controller

  alias OpalCore.SocialFlow.DynamicIntelligence.Durable
  alias OpalCore.SocialFlow.DynamicIntelligence.Fixtures
  alias OpalCore.SocialFlow.DynamicIntelligence.Outcome

  def show(conn, %{"id" => conversation_id}) do
    user_id = conn.assigns.current_user_id

    case Durable.get_for_user(conversation_id, user_id) do
      {:ok, payload} ->
        json(conn, %{"opportunity" => payload})

      {:error, :not_a_member} ->
        error(conn, 403, "not_a_member", "You are not in this conversation")
    end
  end

  def evaluate(conn, %{"id" => conversation_id} = params) do
    user_id = conn.assigns.current_user_id

    attrs = %{
      conversation_id: conversation_id,
      requester_user_id: user_id,
      use_dinner_fixture: Map.get(params, "use_dinner_fixture", true) != false,
      member_ids: params["member_ids"] || Fixtures.member_ids(),
      messages: params["messages"],
      participants: params["participants"],
      venues: params["venues"],
      time_window: params["time_window"],
      idempotency_key: params["idempotency_key"]
    }

    case Durable.evaluate_and_persist(attrs) do
      {:ok, payload, origin} ->
        conn
        |> put_status(if(origin == :created, do: 201, else: 200))
        |> json(%{"opportunity" => payload, "origin" => to_string(origin)})

      {:error, :not_a_member} ->
        error(conn, 403, "not_a_member", "You are not in this conversation")

      {:error, :participant_not_member} ->
        error(conn, 422, "participant_not_member", "Participants must be conversation members")

      {:error, reason} ->
        error(conn, 422, "evaluation_failed", to_string(reason))
    end
  end

  def participation(conn, %{"id" => conversation_id} = params) do
    user_id = conn.assigns.current_user_id
    action = params["action"] || params["state"]
    private_reason = params["private_reason"]

    case Durable.record_participation(conversation_id, user_id, action,
           private_reason: private_reason
         ) do
      {:ok, payload} ->
        json(conn, %{"opportunity" => payload})

      {:error, :not_a_member} ->
        error(conn, 403, "not_a_member", "You are not in this conversation")

      {:error, :invalid_action} ->
        error(conn, 422, "invalid_action", "Unsupported participation action")
    end
  end

  def correction(conn, %{"id" => conversation_id} = params) do
    user_id = conn.assigns.current_user_id
    text = params["text"] || params["correction"] || ""

    case Durable.record_correction(conversation_id, user_id, text) do
      {:ok, correction} ->
        # After correction, active opportunity may be quiet.
        {:ok, opportunity} = Durable.get_for_user(conversation_id, user_id)

        json(conn, %{"correction" => correction, "opportunity" => opportunity})

      {:error, :not_a_member} ->
        error(conn, 403, "not_a_member", "You are not in this conversation")

      {:error, :invalid_correction} ->
        error(conn, 422, "invalid_correction", "Correction could not be recorded")
    end
  end

  def dismiss(conn, %{"id" => conversation_id} = params) do
    user_id = conn.assigns.current_user_id
    reason = params["reason"] || "not_this_time"

    case Durable.dismiss(conversation_id, user_id, reason) do
      {:ok, payload} ->
        json(conn, %{"opportunity" => payload})

      {:error, :not_a_member} ->
        error(conn, 403, "not_a_member", "You are not in this conversation")
    end
  end

  def complete(conn, %{"id" => conversation_id} = params) do
    user_id = conn.assigns.current_user_id

    case Outcome.complete(%{
           conversation_id: conversation_id,
           user_id: user_id,
           opportunity_id: params["opportunity_id"],
           idempotency_key:
             params["idempotency_key"] || "complete-#{System.unique_integer([:positive])}",
           evidence_class: params["evidence_class"] || "explicit_confirmation",
           continuity_label: params["continuity_label"] || "Happened"
         }) do
      {:ok, payload, origin} ->
        conn
        |> put_status(if(origin == :created, do: 201, else: 200))
        |> json(%{"completion" => payload, "origin" => to_string(origin)})

      {:error, :not_a_member} ->
        error(conn, 403, "not_a_member", "You are not in this conversation")

      {:error, :time_alone_cannot_complete} ->
        error(conn, 422, "time_alone_cannot_complete", "Time alone cannot complete an experience")

      {:error, reason} ->
        error(conn, 422, "complete_failed", to_string(reason))
    end
  end

  def reflection(conn, %{"id" => conversation_id} = params) do
    user_id = conn.assigns.current_user_id

    case Outcome.maybe_surface_reflection(%{
           conversation_id: conversation_id,
           user_id: user_id,
           opportunity_id: params["opportunity_id"],
           low_learning_value: params["low_learning_value"] == true,
           force_suppress: params["force_suppress"] == true
         }) do
      {:ok, payload, origin} ->
        json(conn, %{"reflection" => payload, "origin" => to_string(origin)})

      {:error, :not_a_member} ->
        error(conn, 403, "not_a_member", "You are not in this conversation")

      {:error, :not_completed} ->
        error(conn, 422, "not_completed", "Complete the experience before reflection")

      {:error, reason} ->
        error(conn, 422, "reflection_failed", to_string(reason))
    end
  end

  def reflection_respond(conn, %{"id" => conversation_id} = params) do
    user_id = conn.assigns.current_user_id

    case Outcome.respond_to_reflection(%{
           conversation_id: conversation_id,
           user_id: user_id,
           reflection_id: params["reflection_id"],
           response: params["response"]
         }) do
      {:ok, payload} ->
        json(conn, payload)

      {:error, :not_a_member} ->
        error(conn, 403, "not_a_member", "You are not in this conversation")

      {:error, reason} ->
        error(conn, 422, "reflection_respond_failed", inspect(reason))
    end
  end

  defp error(conn, status, code, message) do
    conn
    |> put_status(status)
    |> json(%{"error" => %{"code" => code, "message" => message}})
  end
end
