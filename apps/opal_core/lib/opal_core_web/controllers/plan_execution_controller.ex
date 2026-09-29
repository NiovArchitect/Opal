defmodule OpalCoreWeb.PlanExecutionController do
  @moduledoc """
  SharedPlan → execution readiness / authorize / execute surface.

  LIVE partner booking is NOT claimed.
  """

  use OpalCoreWeb, :controller

  alias OpalCore.Messages
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.PlanExecution
  alias OpalCore.SocialFlow.SharedPlan

  def show(conn, %{"id" => plan_id}) do
    user_id = conn.assigns.current_user_id

    with {:ok, plan} <- fetch_member_plan(plan_id, user_id),
         {:ok, body} <- PlanExecution.readiness(plan.id) do
      json(conn, body)
    else
      {:error, :not_found} ->
        conn |> put_status(404) |> json(%{"error_code" => "not_found"})

      {:error, :forbidden} ->
        conn |> put_status(403) |> json(%{"error_code" => "forbidden"})

      {:error, reason} ->
        conn |> put_status(422) |> json(%{"error_code" => to_string(reason)})
    end
  end

  def authorize(conn, %{"id" => plan_id} = params) do
    user_id = conn.assigns.current_user_id

    with {:ok, plan} <- fetch_member_plan(plan_id, user_id),
         {:ok, body} <- PlanExecution.authorize(plan.id, user_id, params) do
      json(conn, body)
    else
      {:error, :not_found} ->
        conn |> put_status(404) |> json(%{"error_code" => "not_found"})

      {:error, :forbidden} ->
        conn |> put_status(403) |> json(%{"error_code" => "forbidden"})

      {:error, reason} ->
        conn |> put_status(422) |> json(%{"error_code" => to_string(reason)})
    end
  end

  def execute(conn, %{"id" => plan_id} = params) do
    user_id = conn.assigns.current_user_id

    with {:ok, plan} <- fetch_member_plan(plan_id, user_id),
         {:ok, body} <- PlanExecution.execute(plan.id, user_id, params) do
      json(conn, body)
    else
      {:error, :not_found} ->
        conn |> put_status(404) |> json(%{"error_code" => "not_found"})

      {:error, :forbidden} ->
        conn |> put_status(403) |> json(%{"error_code" => "forbidden"})

      {:error, :stale_authorization} ->
        conn |> put_status(409) |> json(%{"error_code" => "stale_authorization"})

      {:error, reason} ->
        conn |> put_status(422) |> json(%{"error_code" => to_string(reason)})
    end
  end

  defp fetch_member_plan(plan_id, user_id) do
    case Repo.get(SharedPlan, plan_id) do
      %SharedPlan{} = plan ->
        if user_id in Messages.member_user_ids(plan.conversation_id) do
          {:ok, plan}
        else
          {:error, :forbidden}
        end

      nil ->
        {:error, :not_found}
    end
  end
end
