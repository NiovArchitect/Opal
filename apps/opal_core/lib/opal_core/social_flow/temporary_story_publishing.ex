defmodule OpalCore.SocialFlow.TemporaryStoryPublishing do
  @moduledoc """
  Temporary Story create/list — durable enough for multi-device; expires from eligibility.
  Story ≠ Memory ≠ Graph. Media may be LOCAL_DEV fixture refs.
  """

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Events.Publisher
  alias OpalCore.Repo

  alias OpalCore.SocialFlow.{
    RelationshipGraph,
    TemporaryStory
  }

  @default_ttl_hours 24

  def create(author_user_id, attrs) when is_binary(author_user_id) and is_map(attrs) do
    a = stringify(attrs)
    media = a["media_ref"] || a["mediaSrc"] || a["media_src"] || ""
    vis = a["visibility"] || "close_circle"
    hours = a["ttl_hours"] || @default_ttl_hours

    if media == "" do
      {:error, :media_required}
    else
      expires =
        DateTime.utc_now()
        |> DateTime.add(hours * 3600, :second)
        |> DateTime.truncate(:microsecond)

      %TemporaryStory{}
      |> TemporaryStory.changeset(%{
        author_user_id: author_user_id,
        media_ref: media,
        caption: a["caption"] || "",
        visibility: vis,
        expires_at: expires
      })
      |> Repo.insert()
      |> case do
        {:ok, story} ->
          _ =
            Publisher.record(%{
              event_type: "temporary_story.created",
              aggregate_type: "temporary_story",
              aggregate_id: story.id,
              partition_key: story.id,
              privacy_class: "shared_authorized",
              purpose: "temporary_story",
              payload: %{"story_id" => story.id, "author_user_id" => author_user_id}
            })

          {:ok, TemporaryStory.contract(story, display_name(author_user_id))}

        err ->
          err
      end
    end
  end

  def list_for_viewer(viewer_user_id, opts \\ []) do
    limit = Keyword.get(opts, :limit, 40)
    now = DateTime.utc_now()

    from(s in TemporaryStory,
      where: is_nil(s.deleted_at) and s.expires_at > ^now,
      order_by: [desc: s.inserted_at],
      limit: ^limit
    )
    |> Repo.all()
    |> Enum.filter(fn s -> eligible?(s, viewer_user_id) end)
    |> Enum.map(fn s -> TemporaryStory.contract(s, display_name(s.author_user_id)) end)
  end

  defp eligible?(%TemporaryStory{author_user_id: author}, viewer) when author == viewer, do: true

  defp eligible?(%TemporaryStory{visibility: "friends", author_user_id: author}, viewer) do
    # Same law as SocialMomentVisibility friends: never default-true.
    # RelationshipGraph owns friend authority (block overrides).
    RelationshipGraph.friend_visibility_authorized?(author, viewer)
  end

  defp eligible?(%TemporaryStory{visibility: "close_circle", author_user_id: author}, viewer) do
    author == viewer
  end

  defp eligible?(_, _), do: false

  @doc "Author soft-deletes their Story — removes from all viewer eligibility."
  def delete_own(author_user_id, story_id)
      when is_binary(author_user_id) and is_binary(story_id) do
    case Repo.get(TemporaryStory, story_id) do
      %TemporaryStory{author_user_id: ^author_user_id, deleted_at: nil} = story ->
        now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

        story
        |> TemporaryStory.changeset(%{deleted_at: now})
        |> Repo.update()
        |> case do
          {:ok, _} -> :ok
          err -> err
        end

      %TemporaryStory{author_user_id: ^author_user_id} ->
        :ok

      %TemporaryStory{} ->
        {:error, :forbidden}

      nil ->
        {:error, :not_found}
    end
  end

  def delete_own(_, _), do: {:error, :invalid}

  defp display_name(user_id) do
    case Repo.get(User, user_id) do
      %User{display_name: name} when is_binary(name) and name != "" -> name
      %User{handle: h} when is_binary(h) and h != "" -> h
      _ -> "Someone"
    end
  end

  defp stringify(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
