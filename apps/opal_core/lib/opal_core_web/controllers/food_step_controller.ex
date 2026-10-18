defmodule OpalCoreWeb.FoodStepController do
  @moduledoc """
  Repair #18 (B2) — at-home food step actions on the plan's existing
  participant gate (SocialFlow.get_plan_for_user / ensure_plan_access).

  HONESTY LAW: these endpoints compose a group order LIST and start a
  per-person HANDOFF. They never place an order, never return a
  confirmation, tracking status, ETA, or total, and payment is always
  the provider's rail (Stripe stays OFF; Opal charges nothing).
  Recipient actions are scoped to the CALLER's own entry: there is no
  parameter by which a caller can name another user — a `user_id` in
  the body that is not the caller is rejected outright (adversarial
  confirm-for-other probe).
  """

  use OpalCoreWeb, :controller

  alias OpalCore.SocialFlow
  alias OpalCore.SocialFlow.Execution.FoodHandoff

  @doc "The food capability matrix — handoff-only truth, readable by any signed-in user."
  def capability(conn, _params) do
    json(conn, FoodHandoff.capability_matrix())
  end

  def show(conn, %{"id" => plan_id}) do
    user_id = conn.assigns.current_user_id

    case SocialFlow.food_step_for_user(plan_id, user_id) do
      {:ok, _plan, step} -> json(conn, %{"food_step" => step})
      {:error, :not_found} -> err(conn, 404, "not_found")
      {:error, _} -> err(conn, 403, "forbidden")
    end
  end

  def items(conn, %{"id" => plan_id} = params) do
    user_id = conn.assigns.current_user_id

    items =
      params["items"] ||
        params["items_text"] |> then(fn t -> if is_binary(t), do: [t], else: [] end)

    respond(conn, SocialFlow.food_add_items(plan_id, user_id, List.wrap(items)))
  end

  def household(conn, %{"id" => plan_id} = params) do
    user_id = conn.assigns.current_user_id
    other = params["with_user_id"]

    if is_binary(other) do
      respond(conn, SocialFlow.food_declare_household(plan_id, user_id, other))
    else
      err(conn, 422, "with_user_id_required")
    end
  end

  def handoff(conn, %{"id" => plan_id} = params) do
    user_id = conn.assigns.current_user_id

    case SocialFlow.food_start_handoff(plan_id, user_id, params) do
      {:ok, started} -> json(conn, started)
      {:error, :not_found} -> err(conn, 404, "not_found")
      {:error, :not_a_recipient} -> err(conn, 403, "not_a_recipient")
      {:error, reason} -> err(conn, 422, to_string(reason))
    end
  end

  def self_confirm(conn, %{"id" => plan_id} = params) do
    user_id = conn.assigns.current_user_id

    # Adversarial guard: a body naming someone else is a forge attempt.
    if params["user_id"] && params["user_id"] != user_id do
      err(conn, 403, "cannot_confirm_for_another_person")
    else
      respond(conn, SocialFlow.food_self_confirm(plan_id, user_id))
    end
  end

  def not_ordering(conn, %{"id" => plan_id}) do
    respond(conn, SocialFlow.food_not_ordering(plan_id, conn.assigns.current_user_id))
  end

  def could_not_deliver(conn, %{"id" => plan_id} = params) do
    user_id = conn.assigns.current_user_id
    alternate = params["alternate_restaurant"]
    respond(conn, SocialFlow.food_could_not_deliver(plan_id, user_id, alternate))
  end

  def restaurant(conn, %{"id" => plan_id} = params) do
    respond(
      conn,
      SocialFlow.food_select_restaurant(plan_id, conn.assigns.current_user_id, params)
    )
  end

  def composed(conn, %{"id" => plan_id} = params) do
    offset = params["target_offset_minutes"]
    respond(conn, SocialFlow.food_mark_composed(plan_id, conn.assigns.current_user_id, offset))
  end

  def answer_ask(conn, %{"id" => plan_id} = params) do
    accept = params["accept"] == true
    respond(conn, SocialFlow.food_answer_ask(plan_id, conn.assigns.current_user_id, accept))
  end

  defp respond(conn, result) do
    case result do
      {:ok, step, _} -> json(conn, %{"food_step" => step})
      {:ok, step} -> json(conn, %{"food_step" => step})
      {:error, :not_found} -> err(conn, 404, "not_found")
      {:error, :not_a_recipient} -> err(conn, 403, "not_a_recipient")
      {:error, :organizer_only} -> err(conn, 403, "organizer_only")
      {:error, :no_food_step} -> err(conn, 422, "no_food_step")
      {:error, reason} -> err(conn, 422, to_string(reason))
    end
  end

  defp err(conn, status, code), do: conn |> put_status(status) |> json(%{"error_code" => code})
end
