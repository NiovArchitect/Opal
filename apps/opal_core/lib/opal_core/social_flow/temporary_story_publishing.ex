defmodule OpalCore.SocialFlow.TemporaryStoryPublishing do
  @moduledoc """
  Temporary Story create/list — durable enough for multi-device; expires from eligibility.
  Story ≠ Memory ≠ Graph. Media may be LOCAL_DEV fixture refs.
  """

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Events.Publisher
  alias OpalCore.Repo

  alias OpalCore.Relationships

  alias OpalCore.SocialFlow.{
    MediaLocalStore,
    RelationshipGraph,
    SocialMomentMedia,
    TemporaryStory
  }

  @default_ttl_hours 24
  # Close circle = the Lives audience law (apps/opal_core/lib/opal_core/lives.ex):
  # an explicit user-set relationship type of one of these, in either direction,
  # on top of friend visibility authority (which already applies blocks).
  @close_circle_types ~w(spouse partner family close_friend)

  def create(author_user_id, attrs) when is_binary(author_user_id) and is_map(attrs) do
    a = stringify(attrs)
    media = a["media_ref"] || a["mediaSrc"] || a["media_src"] || ""
    vis = a["visibility"] || "close_circle"

    cond do
      media == "" and not (is_binary(a["media_id"]) and a["media_id"] != "") ->
        {:error, :media_required}

      vis not in ~w(close_circle friends) ->
        {:error, :invalid_visibility}

      true ->
        # Repair #16 (B2): image media may arrive as a media-store reference
        # ("media:<id>" media_ref, or an explicit media_id) instead of an
        # inline data: URL. The reference is validated BEFORE anything
        # persists — the media must exist, belong to the author, be live,
        # and be an image — exactly the ownership law Repair #15 applied to
        # post media_ids. Anything else claiming to be a media reference is
        # rejected as :invalid_media. Legacy refs (data:, /, https:) are
        # stored unchanged so existing rows keep rendering.
        case stored_media_ref(author_user_id, a, media) do
          {:ok, stored_ref} -> create_with_ttl(author_user_id, a, stored_ref, vis)
          {:error, :invalid_media} -> {:error, :invalid_media}
        end
    end
  end

  defp stored_media_ref(author_user_id, a, media) do
    cond do
      is_binary(a["media_id"]) and a["media_id"] != "" ->
        validate_story_media(author_user_id, a["media_id"])

      is_binary(media) and String.starts_with?(media, "media:") ->
        validate_story_media(author_user_id, String.replace_prefix(media, "media:", ""))

      true ->
        {:ok, media}
    end
  end

  defp validate_story_media(author_user_id, media_id) do
    with {:ok, _uuid} <- Ecto.UUID.cast(media_id),
         %SocialMomentMedia{owner_user_id: ^author_user_id, deleted_at: nil} = media_row <-
           Repo.get(SocialMomentMedia, media_id),
         true <- media_row.mime_type in MediaLocalStore.allowed_mimes() do
      {:ok, "media:" <> media_id}
    else
      _ -> {:error, :invalid_media}
    end
  end

  defp create_with_ttl(author_user_id, a, media, vis) do
    case parse_ttl_hours(a["ttl_hours"]) do
      {:ok, hours} ->
        do_create(author_user_id, a, media, vis, hours)

      :error ->
        {:error, :invalid_ttl}
    end
  end

  # ttl_hours arrives from JSON as a number; a string like "24" used to crash
  # the create with an ArithmeticError (500) and non-positive values produced
  # a story that was born expired yet reported as created. Reject both.
  defp parse_ttl_hours(nil), do: {:ok, @default_ttl_hours}
  defp parse_ttl_hours(h) when is_integer(h) and h >= 1 and h <= 72, do: {:ok, h}
  defp parse_ttl_hours(h) when is_float(h), do: parse_ttl_hours(trunc(h))

  defp parse_ttl_hours(h) when is_binary(h) do
    case Integer.parse(String.trim(h)) do
      {n, ""} -> parse_ttl_hours(n)
      _ -> :error
    end
  end

  defp parse_ttl_hours(_), do: :error

  defp do_create(author_user_id, a, media, vis, hours) do
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

  @doc """
  Repair #16 (B2): public eligibility check — the single authority the
  media byte-serving path consults for story-referenced media. Evaluated
  live on every call, so relationship changes (friend revoked, block,
  type change) and story expiry/deletion take effect immediately.
  """
  def eligible_story?(%TemporaryStory{} = story, viewer_user_id),
    do: eligible?(story, viewer_user_id)

  def eligible_story?(_, _), do: false

  @doc """
  Repair #16 (B2): true when at least one LIVE story (not deleted, not
  expired) references `media_id` (stored ref "media:<id>"), the story's
  author is the media's owner (a tampered row pointing at someone else's
  media never authorizes), and the viewer is eligible for that story.
  Signed-out / non-user viewers are denied.
  """
  def story_media_authorized?(media_id, media_owner_user_id, viewer_user_id)
      when is_binary(media_id) and is_binary(media_owner_user_id) and
             is_binary(viewer_user_id) do
    ref = "media:" <> media_id
    now = DateTime.utc_now()

    from(s in TemporaryStory,
      where:
        s.media_ref == ^ref and s.author_user_id == ^media_owner_user_id and
          is_nil(s.deleted_at) and s.expires_at > ^now
    )
    |> Repo.all()
    |> Enum.any?(fn s -> eligible?(s, viewer_user_id) end)
  end

  def story_media_authorized?(_, _, _), do: false

  defp eligible?(%TemporaryStory{author_user_id: author}, viewer) when author == viewer, do: true

  defp eligible?(%TemporaryStory{visibility: "friends", author_user_id: author}, viewer) do
    # Same law as SocialMomentVisibility friends: never default-true.
    # RelationshipGraph owns friend authority (block overrides).
    RelationshipGraph.friend_visibility_authorized?(author, viewer)
  end

  defp eligible?(%TemporaryStory{visibility: "close_circle", author_user_id: author}, viewer) do
    # Repair #15: this clause used to be `author == viewer`, which made the
    # DEFAULT story audience author-only — a close-circle story reached
    # nobody. Close circle follows the Lives audience law: friend authority
    # (RelationshipGraph, blocks included) AND an explicit relationship type
    # of spouse / partner / family / close_friend in either direction.
    RelationshipGraph.friend_visibility_authorized?(author, viewer) and
      close_circle_member?(author, viewer)
  end

  @doc "True when either party has explicitly typed the other as close circle."
  def close_circle_member?(author_user_id, viewer_user_id)
      when is_binary(author_user_id) and is_binary(viewer_user_id) do
    Relationships.get_type(author_user_id, viewer_user_id) in @close_circle_types or
      Relationships.get_type(viewer_user_id, author_user_id) in @close_circle_types
  end

  def close_circle_member?(_, _), do: false

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
