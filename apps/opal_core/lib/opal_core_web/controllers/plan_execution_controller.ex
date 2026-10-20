defmodule OpalCoreWeb.PlanExecutionController do
  @moduledoc """
  SharedPlan → execution readiness / authorize / execute surface.

  LIVE partner booking is NOT claimed.
  """

  use OpalCoreWeb, :controller

  import Ecto.Query

  alias OpalCore.Messages
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.PlanExecution
  alias OpalCore.SocialFlow.PlanParticipant
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
        cond do
          # Polish C P3 (per-viewer vault): vault marks never gate
          # execution reads - membership is the whole rule.
          plan_member?(plan, user_id) ->
            {:ok, plan}

          true ->
            {:error, :forbidden}
        end

      nil ->
        {:error, :not_found}
    end
  end

  # Repair #18 fix wave (RF-1) — a Center-born plan has NO conversation:
  # membership lives on the plan's own rows (its creator plus its
  # PlanParticipant rows), the same access law SocialFlow's
  # ensure_plan_access/2 applies to conversation-less plans. The old
  # code passed the plan's nil conversation_id straight into
  # Messages.member_user_ids/1, which only accepts a binary — the
  # execution projection 500'd (FunctionClauseError) for exactly the
  # plans Center creates. An empty member context is a legal state
  # here, never a crash.
  defp plan_member?(%SharedPlan{conversation_id: nil} = plan, user_id) do
    plan.created_by_user_id == user_id or
      Repo.exists?(
        from(pp in PlanParticipant,
          where: pp.plan_id == ^plan.id and pp.user_id == ^user_id
        )
      )
  end

  defp plan_member?(%SharedPlan{conversation_id: conversation_id}, user_id)
       when is_binary(conversation_id) do
    user_id in Messages.member_user_ids(conversation_id)
  end
end
