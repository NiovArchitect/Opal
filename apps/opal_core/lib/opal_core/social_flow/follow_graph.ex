defmodule OpalCore.SocialFlow.FollowGraph do
  @moduledoc """
  One-way follow / discovery graph (Pass 23 add-on).

  ## Hard separation

  RELATIONSHIP GRAPH (RelationshipGraph):
  mutual social authority — FRIENDS visibility, calendar, Reality membership, etc.

  FOLLOW GRAPH (this module):
  one-way discovery — may see appropriate creator Moments; NOTHING more.

  A follow edge NEVER grants:
  - friend visibility authority
  - calendar / free-busy
  - private memory
  - private relationship context
  - Reality access
  - group access
  - location
  - creator booking identity
  - automatic invitation to creator

  Additive only. Does not replace RelationshipGraph.
  No follower vanity counts required for product.

  Pass 25: durable Postgres edges via FollowEdge (in-memory graph still for pure tests).
  """

  import Ecto.Query

  alias OpalCore.Repo
  alias OpalCore.SocialFlow.FollowEdge

  @doc "Empty follow graph container."
  def new do
    %{
      "schema" => "follow_graph.v1",
      "edges" => [],
      "no_follower_counts_required" => true,
      "not_relationship_graph" => true,
      "durable" => false
    }
  end

  @doc "Durable follow — survives restart. Never grants friend visibility."
  def follow_durable(follower_user_id, creator_user_id, meta \\ %{})

  def follow_durable(follower_user_id, creator_user_id, meta)
      when is_binary(follower_user_id) and is_binary(creator_user_id) do
    if follower_user_id == creator_user_id do
      {:error, :cannot_follow_self}
    else
      case Repo.get_by(FollowEdge,
             follower_user_id: follower_user_id,
             creator_user_id: creator_user_id
           ) do
        %FollowEdge{status: "active"} = e ->
          {:ok, e, :idempotent}

        %FollowEdge{} = e ->
          e
          |> FollowEdge.changeset(%{status: "active", grants_friend_visibility: false})
          |> Repo.update()
          |> case do
            {:ok, row} -> {:ok, row, :reactivated}
            err -> err
          end

        nil ->
          %FollowEdge{}
          |> FollowEdge.changeset(%{
            follower_user_id: follower_user_id,
            creator_user_id: creator_user_id,
            status: "active",
            grants_friend_visibility: false,
            meta: stringify(meta || %{})
          })
          |> Repo.insert()
          |> case do
            {:ok, row} ->
              {:ok, row, :created}

            {:error, %Ecto.Changeset{}} ->
              case Repo.get_by(FollowEdge,
                     follower_user_id: follower_user_id,
                     creator_user_id: creator_user_id
                   ) do
                %FollowEdge{} = e -> {:ok, e, :idempotent}
                nil -> {:error, :insert_failed}
              end
          end
      end
    end
  end

  def follow_durable(_, _, _), do: {:error, :invalid}

  def following_durable?(follower_user_id, creator_user_id)
      when is_binary(follower_user_id) and is_binary(creator_user_id) do
    from(e in FollowEdge,
      where:
        e.follower_user_id == ^follower_user_id and e.creator_user_id == ^creator_user_id and
          e.status == "active"
    )
    |> Repo.exists?()
  end

  def following_durable?(_, _), do: false

  def unfollow_durable(follower_user_id, creator_user_id)
      when is_binary(follower_user_id) and is_binary(creator_user_id) do
    case Repo.get_by(FollowEdge,
           follower_user_id: follower_user_id,
           creator_user_id: creator_user_id
         ) do
      nil ->
        {:ok, :absent}

      %FollowEdge{} = e ->
        e
        |> FollowEdge.changeset(%{status: "revoked"})
        |> Repo.update()
        |> case do
          {:ok, _} -> {:ok, :revoked}
          err -> err
        end
    end
  end

  def unfollow_durable(_, _), do: {:error, :invalid}

  def durable_following_ids(follower_user_id) when is_binary(follower_user_id) do
    from(e in FollowEdge,
      where: e.follower_user_id == ^follower_user_id and e.status == "active",
      select: e.creator_user_id
    )
    |> Repo.all()
  end

  def durable_following_ids(_), do: []

  def durable?, do: true

  @doc """
  Record a follow edge: follower → creator (one-way).

  Does not create mutual friendship.
  """
  def follow(graph, follower_user_id, creator_user_id, meta \\ %{})

  def follow(graph, follower_user_id, creator_user_id, meta)
      when is_map(graph) and is_binary(follower_user_id) and is_binary(creator_user_id) do
    g = stringify(graph)

    cond do
      follower_user_id == creator_user_id ->
        {:error, :cannot_follow_self}

      following?(g, follower_user_id, creator_user_id) ->
        {:ok, g, :idempotent}

      true ->
        edge = %{
          "id" => "follow-#{follower_user_id}-#{creator_user_id}",
          "follower_user_id" => follower_user_id,
          "creator_user_id" => creator_user_id,
          "kind" => "follow",
          "one_way" => true,
          "mutual" => false,
          "grants_friend_visibility" => false,
          "grants_calendar" => false,
          "grants_reality_access" => false,
          "grants_location" => false,
          "grants_private_memory" => false,
          "at" => iso_now(),
          "meta" => stringify(meta || %{})
        }

        {:ok, %{g | "edges" => (g["edges"] || []) ++ [edge]}, :created}
    end
  end

  def follow(_, _, _, _), do: {:error, :invalid}

  def unfollow(graph, follower_user_id, creator_user_id) when is_map(graph) do
    g = stringify(graph)

    edges =
      Enum.reject(g["edges"] || [], fn e ->
        e = stringify(e)
        e["follower_user_id"] == follower_user_id and e["creator_user_id"] == creator_user_id
      end)

    {:ok, %{g | "edges" => edges}}
  end

  def following?(graph, follower_user_id, creator_user_id) when is_map(graph) do
    g = stringify(graph)

    Enum.any?(g["edges"] || [], fn e ->
      e = stringify(e)
      e["follower_user_id"] == follower_user_id and e["creator_user_id"] == creator_user_id
    end)
  end

  def following?(_, _, _), do: false

  def followers_of(graph, creator_user_id) when is_map(graph) do
    g = stringify(graph)

    (g["edges"] || [])
    |> Enum.filter(fn e -> stringify(e)["creator_user_id"] == creator_user_id end)
    |> Enum.map(fn e -> stringify(e)["follower_user_id"] end)
  end

  def following_ids(graph, follower_user_id) when is_map(graph) do
    g = stringify(graph)

    (g["edges"] || [])
    |> Enum.filter(fn e -> stringify(e)["follower_user_id"] == follower_user_id end)
    |> Enum.map(fn e -> stringify(e)["creator_user_id"] end)
  end

  @doc "Hard invariant: follow never implies friend authority."
  def grants_friend_visibility?, do: false

  def grants_calendar?, do: false

  def grants_reality_access?, do: false

  def grants_private_memory?, do: false

  def is_relationship_graph?, do: false

  @doc """
  Permission matrix for a follow edge (always deny privileged social).
  """
  def permission_matrix do
    %{
      "discover_creator_moments" => true,
      "fork_moment_into_own_reality" => true,
      "friend_visibility" => false,
      "calendar_availability" => false,
      "private_memory" => false,
      "private_relationship_context" => false,
      "reality_membership" => false,
      "group_access" => false,
      "location" => false,
      "creator_booking_identity" => false,
      "auto_invite_creator" => false,
      "follower_counts_required" => false
    }
  end

  defp iso_now, do: DateTime.utc_now() |> DateTime.truncate(:second) |> DateTime.to_iso8601()

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
