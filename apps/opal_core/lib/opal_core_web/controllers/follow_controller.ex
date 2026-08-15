defmodule OpalCoreWeb.FollowController do
  @moduledoc """
  Thin product API over durable FollowGraph (Pass 27).

  FOLLOW ≠ FRIEND. Never grants Reality, calendar, location, or group access.
  """

  use OpalCoreWeb, :controller

  alias OpalCore.Accounts.User
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.{FollowGraph, RelationshipGraph}

  @doc "POST /follows — body: creator_user_id"
  def create(conn, params) do
    follower_id = conn.assigns.current_user_id
    creator_id = params["creator_user_id"] || params["user_id"]

    cond do
      not is_binary(creator_id) or creator_id == "" ->
        error(conn, 422, "missing_creator", "creator_user_id is required")

      is_nil(Repo.get(User, creator_id)) ->
        error(conn, 404, "user_not_found", "User not found")

      true ->
        case FollowGraph.follow_durable(follower_id, creator_id) do
          {:ok, row, origin} ->
            conn
            |> put_status(if(origin == :created, do: 201, else: 200))
            |> json(follow_contract(row, origin, follower_id, creator_id))

          {:error, :cannot_follow_self} ->
            error(conn, 422, "cannot_follow_self", "You cannot follow yourself")

          {:error, reason} ->
            error(conn, 422, "follow_failed", inspect(reason))
        end
    end
  end

  @doc "DELETE /follows/:creator_user_id"
  def delete(conn, %{"creator_user_id" => creator_id}) do
    follower_id = conn.assigns.current_user_id

    case FollowGraph.unfollow_durable(follower_id, creator_id) do
      {:ok, status} ->
        json(conn, %{
          "following" => false,
          "status" => to_string(status),
          "grants_friend_visibility" => false,
          "permission_matrix" => FollowGraph.permission_matrix()
        })

      {:error, reason} ->
        error(conn, 422, "unfollow_failed", inspect(reason))
    end
  end

  @doc "GET /follows/status?creator_user_id="
  def status(conn, params) do
    follower_id = conn.assigns.current_user_id
    creator_id = params["creator_user_id"] || params["user_id"]

    if not is_binary(creator_id) or creator_id == "" do
      error(conn, 422, "missing_creator", "creator_user_id is required")
    else
      following? = FollowGraph.following_durable?(follower_id, creator_id)

      # RelationshipGraph is separate — report for honesty, never from FollowGraph
      friends? = RelationshipGraph.friend_visibility_authorized?(creator_id, follower_id)

      json(conn, %{
        "following" => following?,
        "creator_user_id" => creator_id,
        "follower_user_id" => follower_id,
        "grants_friend_visibility" => false,
        "is_friend_via_relationship_graph" => friends? == true,
        "follow_is_not_friend" => true,
        "permission_matrix" => FollowGraph.permission_matrix()
      })
    end
  end

  @doc "GET /follows — list creators I follow (bounded, no vanity fanout)"
  def index(conn, _params) do
    follower_id = conn.assigns.current_user_id
    ids = FollowGraph.durable_following_ids(follower_id)

    # Cap list surface — product discovery, not push fanout
    ids = Enum.take(ids, 200)

    json(conn, %{
      "following_user_ids" => ids,
      "count" => length(ids),
      "capped" => true,
      "cap" => 200,
      "not_relationship_graph" => true,
      "grants_friend_visibility" => false,
      "no_synchronous_fanout" => true
    })
  end

  defp follow_contract(row, origin, follower_id, creator_id) do
    %{
      "following" => true,
      "origin" => to_string(origin),
      "follower_user_id" => follower_id,
      "creator_user_id" => creator_id,
      "edge_id" => row.id,
      "status" => row.status,
      "grants_friend_visibility" => false,
      "follow_is_not_friend" => true,
      "permission_matrix" => FollowGraph.permission_matrix(),
      "not_relationship_graph" => true
    }
  end

  defp error(conn, status, code, message) do
    conn
    |> put_status(status)
    |> json(%{"error_code" => code, "message" => message})
  end
end
