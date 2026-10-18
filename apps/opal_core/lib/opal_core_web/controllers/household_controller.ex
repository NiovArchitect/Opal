defmodule OpalCoreWeb.HouseholdController do
  @moduledoc """
  Repair #18 Division B (B5) — household pod + planning-context HTTP
  surface. Every action renders exactly one explicit projection from
  Households / HouseholdContext; the front end renders outputs only.

  Routes: pods (declare/invite/accept/leave/primary), the supply
  suggestion accept/dismiss, plan creation from a named context, and
  the viewer's own context projection (pod / household / solo /
  connected) including the proactive-thread opt-in that the solo
  check-in rhythm rides.
  """

  use OpalCoreWeb, :controller

  alias OpalCore.Intelligence.AttentionBudget
  alias OpalCore.Intelligence.ProactiveConversation
  alias OpalCore.SocialFlow.HouseholdContext
  alias OpalCore.SocialFlow.Households

  # --- Pods ---

  def index(conn, _params) do
    user_id = conn.assigns.current_user_id
    json(conn, %{"households" => Households.list_for_user(user_id)})
  end

  def create(conn, params) do
    user_id = conn.assigns.current_user_id

    case Households.create_household(user_id, params) do
      {:ok, household} ->
        conn
        |> put_status(:created)
        |> json(%{"household" => Households.to_contract(household, user_id)})

      {:error, reason} ->
        unprocessable(conn, reason)
    end
  end

  def show(conn, %{"id" => id}) do
    user_id = conn.assigns.current_user_id

    case Households.get_for_user(id, user_id) do
      {:ok, contract} -> json(conn, %{"household" => contract})
      {:error, :not_found} -> not_found(conn)
    end
  end

  def accept(conn, %{"id" => id}) do
    user_id = conn.assigns.current_user_id

    case Households.accept(id, user_id) do
      {:ok, _} -> respond_pod(conn, id, user_id)
      {:error, :not_found} -> not_found(conn)
      {:error, reason} -> unprocessable(conn, reason)
    end
  end

  def decline(conn, %{"id" => id}) do
    user_id = conn.assigns.current_user_id

    case Households.decline(id, user_id) do
      {:ok, _} -> json(conn, %{"ok" => true})
      {:error, :not_found} -> not_found(conn)
      {:error, reason} -> unprocessable(conn, reason)
    end
  end

  def leave(conn, %{"id" => id}) do
    user_id = conn.assigns.current_user_id

    case Households.leave(id, user_id) do
      {:ok, _} -> json(conn, %{"ok" => true})
      {:error, :not_found} -> not_found(conn)
      {:error, reason} -> unprocessable(conn, reason)
    end
  end

  def primary(conn, %{"id" => id}) do
    user_id = conn.assigns.current_user_id

    case Households.set_primary(id, user_id) do
      {:ok, _} -> respond_pod(conn, id, user_id)
      {:error, :not_found} -> not_found(conn)
      {:error, reason} -> unprocessable(conn, reason)
    end
  end

  defp respond_pod(conn, id, user_id) do
    case Households.get_for_user(id, user_id) do
      {:ok, contract} -> json(conn, %{"household" => contract})
      {:error, :not_found} -> not_found(conn)
    end
  end

  # --- Supply suggestion ---

  def accept_supply(conn, %{"id" => _id}) do
    user_id = conn.assigns.current_user_id

    case Households.accept_supply(user_id) do
      {:ok, plan} ->
        conn |> put_status(:created) |> json(%{"plan" => plan})

      {:error, reason} ->
        unprocessable(conn, reason)
    end
  end

  def dismiss_supply(conn, %{"id" => _id}) do
    user_id = conn.assigns.current_user_id

    case Households.dismiss_supply(user_id) do
      :ok -> json(conn, %{"ok" => true})
      {:error, reason} -> unprocessable(conn, reason)
    end
  end

  # --- Plans from a context ---

  def create_plan_from_context(conn, params) do
    user_id = conn.assigns.current_user_id

    case Households.create_plan_from_context(user_id, params) do
      {:ok, plan} ->
        conn |> put_status(:created) |> json(%{"plan" => plan})

      {:error, reason} ->
        unprocessable(conn, reason)
    end
  end

  # --- Viewer context projection ---

  @doc "The viewer's planning context + today's granted attention slots (their own record only)."
  def context(conn, _params) do
    user_id = conn.assigns.current_user_id

    context =
      HouseholdContext.context_for(user_id)
      |> Map.put(
        "attention_slots_used_today",
        AttentionBudget.used_today(user_id, DateTime.to_date(OpalCore.SocialFlow.Clock.utc_now()))
      )
      |> Map.put("proactive_threads_enabled", ProactiveConversation.threads_enabled?(user_id))

    json(conn, %{"context" => context})
  end

  def suggestion_order(conn, _params) do
    user_id = conn.assigns.current_user_id
    json(conn, HouseholdContext.suggestion_order(user_id))
  end

  @doc "The proactive-thread opt-in the solo rhythm rides (existing flag, existing setter)."
  def proactive_opt_in(conn, %{"enabled" => enabled}) do
    user_id = conn.assigns.current_user_id
    :ok = ProactiveConversation.set_threads_enabled(user_id, enabled == true)
    json(conn, %{"proactive_threads_enabled" => ProactiveConversation.threads_enabled?(user_id)})
  end

  def proactive_opt_in(conn, _params), do: unprocessable(conn, :invalid)

  defp not_found(conn), do: conn |> put_status(:not_found) |> json(%{"error" => "not_found"})

  defp unprocessable(conn, reason) do
    conn
    |> put_status(:unprocessable_entity)
    |> json(%{"error" => error_string(reason)})
  end

  defp error_string(reason) when is_atom(reason), do: Atom.to_string(reason)
  defp error_string(reason) when is_binary(reason), do: reason
  defp error_string(%Ecto.Changeset{}), do: "invalid"
  defp error_string(reason), do: inspect(reason)
end
