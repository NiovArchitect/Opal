defmodule OpalCoreWeb.GraphPeopleController do
  @moduledoc """
  Repair #18 adoption wave 1 - graph/people cluster HTTP surface.

  Every action is owner-scoped to the session user and renders the
  ONE projection from `OpalCore.GraphPeople` /
  `OpalCore.SocialFlow.PlanHistory` verbatim; this controller derives
  nothing.

  Routes (under /api/v1/product, product_auth):
  - GET    /graph/intentions            POST /graph/intentions
  - DELETE /graph/intentions/:id        POST /graph/intentions/:id/surfaced
  - GET    /graph/goals                 POST /graph/goals
  - DELETE /graph/goals/:id
  - POST   /graph/goals/:id/link        POST /graph/goals/:id/unlink
  - GET    /graph/shelf                 POST /graph/shelf/:plan_id/promote
  - GET    /opal/plans/:id/history      GET  /opal/holding
  """

  use OpalCoreWeb, :controller

  alias OpalCore.GraphPeople
  alias OpalCore.SocialFlow.PlanHistory

  # --- ST-A intentions ---------------------------------------------------

  def list_intentions(conn, _params) do
    user_id = conn.assigns.current_user_id
    json(conn, %{"intentions" => GraphPeople.list_intentions(user_id)})
  end

  def create_intention(conn, params) do
    user_id = conn.assigns.current_user_id

    case GraphPeople.create_intention(user_id, params) do
      {:ok, projection} ->
        conn |> put_status(201) |> json(%{"intention" => projection})

      {:error, %Ecto.Changeset{} = cs} ->
        unprocessable(conn, cs)

      {:error, reason} ->
        conn
        |> put_status(422)
        |> json(%{"error_code" => to_string(reason), "error" => to_string(reason)})
    end
  end

  def delete_intention(conn, %{"id" => id}) do
    user_id = conn.assigns.current_user_id

    case GraphPeople.delete_intention(user_id, id) do
      {:ok, _} -> json(conn, %{"ok" => true})
      {:error, :not_found} -> not_found(conn)
    end
  end

  def surfaced_intention(conn, %{"id" => id}) do
    user_id = conn.assigns.current_user_id

    case GraphPeople.mark_missed_surfaced(user_id, id) do
      {:ok, projection} ->
        json(conn, %{"intention" => projection})

      {:error, :not_found} ->
        not_found(conn)

      {:error, reason} ->
        conn
        |> put_status(422)
        |> json(%{"error_code" => to_string(reason), "error" => to_string(reason)})
    end
  end

  # --- 4.C10 goals ---------------------------------------------------------

  def list_goals(conn, _params) do
    user_id = conn.assigns.current_user_id
    json(conn, %{"goals" => GraphPeople.list_goals(user_id)})
  end

  def create_goal(conn, params) do
    user_id = conn.assigns.current_user_id

    case GraphPeople.create_goal(user_id, params) do
      {:ok, projection} ->
        conn |> put_status(201) |> json(%{"goal" => projection})

      {:error, %Ecto.Changeset{} = cs} ->
        unprocessable(conn, cs)

      {:error, reason} ->
        conn
        |> put_status(422)
        |> json(%{"error_code" => to_string(reason), "error" => to_string(reason)})
    end
  end

  def delete_goal(conn, %{"id" => id}) do
    user_id = conn.assigns.current_user_id

    case GraphPeople.delete_goal(user_id, id) do
      {:ok, _} -> json(conn, %{"ok" => true})
      {:error, :not_found} -> not_found(conn)
    end
  end

  def link_goal(conn, %{"id" => id, "plan_id" => plan_id}) do
    user_id = conn.assigns.current_user_id

    case GraphPeople.link_goal_plan(user_id, id, plan_id) do
      {:ok, projection} ->
        json(conn, %{"goal" => projection})

      {:error, :not_found} ->
        not_found(conn)

      {:error, reason} ->
        conn
        |> put_status(422)
        |> json(%{"error_code" => to_string(reason), "error" => to_string(reason)})
    end
  end

  def link_goal(conn, _params) do
    conn
    |> put_status(422)
    |> json(%{"error_code" => "plan_id_required", "error" => "plan_id_required"})
  end

  def unlink_goal(conn, %{"id" => id, "plan_id" => plan_id}) do
    user_id = conn.assigns.current_user_id

    case GraphPeople.unlink_goal_plan(user_id, id, plan_id) do
      {:ok, projection} ->
        json(conn, %{"goal" => projection})

      {:error, :not_found} ->
        not_found(conn)

      {:error, reason} ->
        conn
        |> put_status(422)
        |> json(%{"error_code" => to_string(reason), "error" => to_string(reason)})
    end
  end

  def unlink_goal(conn, _params) do
    conn
    |> put_status(422)
    |> json(%{"error_code" => "plan_id_required", "error" => "plan_id_required"})
  end

  # --- ST-B shelf ----------------------------------------------------------

  def shelf(conn, _params) do
    user_id = conn.assigns.current_user_id
    json(conn, GraphPeople.shelf(user_id))
  end

  def promote_spark(conn, %{"plan_id" => plan_id} = params) do
    user_id = conn.assigns.current_user_id

    case GraphPeople.promote_spark(user_id, plan_id, params) do
      {:ok, spark, plan} ->
        conn |> put_status(201) |> json(%{"spark" => spark, "plan" => plan})

      {:error, :not_found} ->
        not_found(conn)

      {:error, reason} ->
        conn
        |> put_status(422)
        |> json(%{"error_code" => to_string(reason), "error" => to_string(reason)})
    end
  end

  # --- ST-G plan history ---------------------------------------------------

  def plan_history(conn, %{"id" => id}) do
    user_id = conn.assigns.current_user_id

    case PlanHistory.for_plan(id, user_id) do
      {:ok, projection} ->
        json(conn, projection)

      {:error, :not_found} ->
        not_found(conn)

      {:error, reason} when reason in [:forbidden, :not_a_member] ->
        conn |> put_status(:forbidden) |> json(%{"error" => to_string(reason)})

      {:error, _} ->
        not_found(conn)
    end
  end

  # --- 4.C1 holding ----------------------------------------------------------

  def holding(conn, _params) do
    user_id = conn.assigns.current_user_id
    json(conn, GraphPeople.holding(user_id))
  end

  defp not_found(conn) do
    conn |> put_status(404) |> json(%{"error_code" => "not_found", "error" => "not_found"})
  end

  defp unprocessable(conn, %Ecto.Changeset{} = cs) do
    errors =
      Ecto.Changeset.traverse_errors(cs, fn {msg, opts} ->
        Enum.reduce(opts, msg, fn {k, v}, acc ->
          String.replace(acc, "%{#{k}}", to_string(v))
        end)
      end)

    conn
    |> put_status(422)
    |> json(%{"error_code" => "invalid", "errors" => errors})
  end
end
