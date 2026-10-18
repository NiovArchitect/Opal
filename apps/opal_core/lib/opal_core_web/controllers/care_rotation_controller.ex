defmodule OpalCoreWeb.CareRotationController do
  @moduledoc """
  Repair #18 Division B (B4) — care rotation HTTP surface.

  Member-gated at the context: rotations, ledger, and notes are
  visible to members and nobody else (a visible linked subject gets
  the note-free subject contract). Relationships.Access tiers do not
  widen these routes — a rotation is not a plan.
  """

  use OpalCoreWeb, :controller

  alias OpalCore.SocialFlow.CareRotations

  def index(conn, _params) do
    user_id = conn.assigns.current_user_id
    json(conn, %{"rotations" => CareRotations.list_for_user(user_id)})
  end

  def create(conn, params) do
    user_id = conn.assigns.current_user_id

    case CareRotations.create_rotation(user_id, params) do
      {:ok, rotation} ->
        conn
        |> put_status(:created)
        |> json(%{"rotation" => CareRotations.to_contract(rotation, user_id)})

      {:error, reason} ->
        unprocessable(conn, reason)
    end
  end

  def show(conn, %{"id" => id}) do
    user_id = conn.assigns.current_user_id

    case CareRotations.get_for_user(id, user_id) do
      {:ok, contract} -> json(conn, %{"rotation" => contract})
      {:error, :not_found} -> not_found(conn)
    end
  end

  def accept(conn, %{"id" => id}) do
    user_id = conn.assigns.current_user_id

    case CareRotations.accept_membership(id, user_id) do
      {:ok, rotation} -> json(conn, %{"rotation" => CareRotations.to_contract(rotation, user_id)})
      {:error, :not_invited} -> forbidden(conn)
      {:error, :not_found} -> not_found(conn)
      {:error, reason} -> unprocessable(conn, reason)
    end
  end

  def decline(conn, %{"id" => id}) do
    user_id = conn.assigns.current_user_id

    case CareRotations.decline_membership(id, user_id) do
      {:ok, rotation} -> json(conn, %{"rotation" => CareRotations.to_contract(rotation, user_id)})
      {:error, :not_invited} -> forbidden(conn)
      {:error, :not_found} -> not_found(conn)
      {:error, reason} -> unprocessable(conn, reason)
    end
  end

  def remove_member(conn, %{"id" => id, "user_id" => target_id}) do
    user_id = conn.assigns.current_user_id

    case CareRotations.remove_member(id, user_id, target_id) do
      {:ok, rotation} -> json(conn, %{"rotation" => CareRotations.to_contract(rotation, user_id)})
      {:error, :not_admin} -> forbidden(conn)
      {:error, :not_found} -> not_found(conn)
      {:error, reason} -> unprocessable(conn, reason)
    end
  end

  def complete_check_in(conn, %{"id" => id, "occurrence_key" => key} = params) do
    user_id = conn.assigns.current_user_id

    case CareRotations.complete_check_in(id, key, user_id, params["note"]) do
      {:ok, row} -> json(conn, %{"check_in" => CareRotations.check_in_contract(row)})
      {:error, :not_a_member} -> forbidden(conn)
      {:error, :not_found} -> not_found(conn)
      {:error, reason} -> unprocessable(conn, reason)
    end
  end

  def pass_check_in(conn, %{"id" => id, "occurrence_key" => key} = params) do
    user_id = conn.assigns.current_user_id

    case CareRotations.pass_check_in(id, key, user_id, params["to_user_id"], params["reason"]) do
      {:ok, row} -> json(conn, %{"check_in" => CareRotations.check_in_contract(row)})
      {:error, :not_a_member} -> forbidden(conn)
      {:error, reason} when reason in [:not_assignee, :invalid_target] -> forbidden(conn)
      {:error, :not_found} -> not_found(conn)
      {:error, reason} -> unprocessable(conn, reason)
    end
  end

  def pause(conn, %{"id" => id}), do: lifecycle(conn, id, :pause)
  def resume(conn, %{"id" => id}), do: lifecycle(conn, id, :resume)
  def end_rotation(conn, %{"id" => id}), do: lifecycle(conn, id, :end_rotation)

  defp lifecycle(conn, id, action) do
    user_id = conn.assigns.current_user_id

    result =
      case action do
        :pause -> CareRotations.pause(id, user_id)
        :resume -> CareRotations.resume(id, user_id)
        :end_rotation -> CareRotations.end_rotation(id, user_id)
      end

    case result do
      {:ok, rotation} -> json(conn, %{"rotation" => CareRotations.to_contract(rotation, user_id)})
      {:error, :not_admin} -> forbidden(conn)
      {:error, :not_found} -> not_found(conn)
      {:error, reason} -> unprocessable(conn, reason)
    end
  end

  def propose_subject_link(conn, %{"id" => id} = params) do
    user_id = conn.assigns.current_user_id

    case CareRotations.propose_subject_link(id, user_id, params["subject_user_id"]) do
      {:ok, rotation} -> json(conn, %{"rotation" => CareRotations.to_contract(rotation, user_id)})
      {:error, :not_admin} -> forbidden(conn)
      {:error, :not_found} -> not_found(conn)
      {:error, reason} -> unprocessable(conn, reason)
    end
  end

  def accept_subject_link(conn, %{"id" => id}) do
    user_id = conn.assigns.current_user_id

    case CareRotations.accept_subject_link(id, user_id) do
      {:ok, rotation} -> json(conn, %{"rotation" => CareRotations.to_contract(rotation, user_id)})
      {:error, :not_proposed} -> forbidden(conn)
      {:error, :not_found} -> not_found(conn)
      {:error, reason} -> unprocessable(conn, reason)
    end
  end

  def set_subject_visible(conn, %{"id" => id} = params) do
    user_id = conn.assigns.current_user_id

    case CareRotations.set_subject_visible(id, user_id, params["visible"] == true) do
      {:ok, rotation} -> json(conn, %{"rotation" => CareRotations.to_contract(rotation, user_id)})
      {:error, :not_subject} -> forbidden(conn)
      {:error, :not_found} -> not_found(conn)
      {:error, reason} -> unprocessable(conn, reason)
    end
  end

  defp not_found(conn), do: conn |> put_status(:not_found) |> json(%{"error" => "not_found"})
  defp forbidden(conn), do: conn |> put_status(:forbidden) |> json(%{"error" => "forbidden"})

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
