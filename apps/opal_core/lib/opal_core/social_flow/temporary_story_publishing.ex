defmodule OpalCore.SocialFlow.TemporaryStoryPublishing do
  @moduledoc """
  Temporary Story create/list — durable enough for multi-device; expires from eligibility.
  Story ≠ Memory. Media may be LOCAL_DEV fixture refs.

  Repair #24 WS-2 — graph stories: a create may carry a graph anchor
  (`graph_plan_id`, alias `plan_id` / `graph_id`) naming a SharedPlan
  the author is a party to. Parties are exactly the plan-media
  precedent (SharedPlan.plan_media_authorized?/2): the plan's creator
  plus its PlanParticipant rows. An anchored story's stored
  visibility is "graph" and its audience is exactly those parties —
  the anchor overrides the person-story visibility branches, and the
  same 24h expiry law applies unchanged. A non-party post is
  rejected ({:error, :not_graph_party}) and an unknown anchor is
  {:error, :graph_not_found}; nothing persists in either case.

  Gyroscope: this module reads the single plan store
  (shared_plans / plan_participants) only to answer party standing;
  it renders no plan state. Registered in
  PlanProjection.read_files/0.
  """

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Events.Publisher
  alias OpalCore.Repo

  alias OpalCore.Relationships

  alias OpalCore.SocialFlow.{
    MediaLocalStore,
    PlanParticipant,
    RelationshipGraph,
    SharedPlan,
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
        with {:ok, stored_ref} <- stored_media_ref(author_user_id, a, media),
             {:ok, graph_plan_id} <- resolve_graph_anchor(author_user_id, a) do
          # An anchored story's audience is the graph itself: the
          # stored visibility is "graph" whatever person visibility
          # the client sent alongside the anchor, so the contract
          # never claims a wider audience than the parties who can
          # actually read it.
          vis = if graph_plan_id, do: "graph", else: vis

          create_with_ttl(author_user_id, a, stored_ref, vis, graph_plan_id: graph_plan_id)
        else
          {:error, reason} -> {:error, reason}
        end
    end
  end

  # Repair #24 WS-2: the graph anchor, resolved BEFORE anything
  # persists. No anchor key (or an empty one) is the person story.
  # A present anchor must name a real plan and the author must be a
  # party to it - a guessed or foreign id never creates a story.
  defp resolve_graph_anchor(author_user_id, a) do
    raw = a["graph_plan_id"] || a["plan_id"] || a["graph_id"]

    cond do
      is_nil(raw) or raw == "" ->
        {:ok, nil}

      not is_binary(raw) or not OpalCore.IdShape.uuid?(raw) ->
        {:error, :graph_not_found}

      true ->
        case Repo.get(SharedPlan, raw) do
          %SharedPlan{} = plan ->
            if graph_party?(plan, author_user_id) do
              {:ok, plan.id}
            else
              {:error, :not_graph_party}
            end

          nil ->
            {:error, :graph_not_found}
        end
    end
  end

  @doc """
  Repair #24 WS-2: true when `user_id` is a party to the graph (plan):
  its creator or one of its PlanParticipant rows — the exact party law
  SharedPlan.plan_media_authorized?/2 applies to plan media. Response
  state does not narrow party standing (a pending participant is a
  party, as in the media precedent). Evaluated live on every call, so
  a participant added later gains the graph's stories and nothing is
  cached.
  """
  def graph_party?(%SharedPlan{} = plan, user_id) when is_binary(user_id) do
    plan.created_by_user_id == user_id or
      Repo.exists?(
        from(pp in PlanParticipant,
          where: pp.plan_id == ^plan.id and pp.user_id == ^user_id
        )
      )
  end

  def graph_party?(_, _), do: false

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

  defp create_with_ttl(author_user_id, a, media, vis, opts \\ []) do
    case parse_ttl_hours(a["ttl_hours"]) do
      {:ok, hours} ->
        case validate_mentions(author_user_id, a["mentioned_user_ids"], vis) do
          {:ok, mention_ids} ->
            do_create(author_user_id, a, media, vis, hours, mention_ids, opts)

          {:error, :invalid_mention} ->
            {:error, :invalid_mention}
        end

      :error ->
        {:error, :invalid_ttl}
    end
  end

  # Repair #24 (WS-1): story mentions are explicit user ids named
  # by the author at create time - never parsed out of caption
  # text (a display name is not an identity). Every named user
  # must exist and must be eligible for a story of this visibility
  # by this author: you cannot mention someone into a story they
  # cannot see. Any invalid entry rejects the whole create and
  # nothing persists.
  defp validate_mentions(_author, nil, _vis), do: {:ok, []}

  defp validate_mentions(author_user_id, ids, vis) when is_list(ids) do
    probe = %TemporaryStory{author_user_id: author_user_id, visibility: vis}

    valid? =
      Enum.all?(ids, fn id ->
        is_binary(id) and OpalCore.IdShape.uuid?(id) and id != author_user_id and
          not is_nil(Repo.get(User, id)) and eligible?(probe, id)
      end)

    if valid?, do: {:ok, Enum.uniq(ids)}, else: {:error, :invalid_mention}
  end

  defp validate_mentions(_, _, _), do: {:error, :invalid_mention}

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

  defp do_create(author_user_id, a, media, vis, hours, mention_ids, opts) do
    graph_plan_id = Keyword.get(opts, :graph_plan_id)
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
      expires_at: expires,
      graph_plan_id: graph_plan_id
    })
    |> Repo.insert()
    |> case do
      {:ok, story} ->
        # Repair #24 (WS-1): the author's create-time mentions land
        # as mention rows on the engagement record - the same rows
        # the POST /stories/:id/mentions endpoint writes.
        for target_id <- mention_ids do
          {:ok, _} =
            %OpalCore.SocialFlow.TemporaryStoryEngagementRecord{}
            |> OpalCore.SocialFlow.TemporaryStoryEngagementRecord.changeset(%{
              story_id: story.id,
              actor_user_id: author_user_id,
              target_user_id: target_id,
              kind: "mention"
            })
            |> Repo.insert()
        end

        payload =
          %{"story_id" => story.id, "author_user_id" => author_user_id}
          |> then(fn p ->
            if graph_plan_id, do: Map.put(p, "graph_plan_id", graph_plan_id), else: p
          end)

        _ =
          Publisher.record(%{
            event_type: "temporary_story.created",
            aggregate_type: "temporary_story",
            aggregate_id: story.id,
            partition_key: story.id,
            privacy_class: "shared_authorized",
            purpose: "temporary_story",
            payload: payload
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
    |> Enum.map(fn s ->
      # Repair #24 (WS-1): the server-computed attention flags ride
      # the story contract - computed here, from the engagement
      # record, per viewer. The client renders the rail's
      # ATTENTION glow from these flags and never guesses.
      flags = OpalCore.SocialFlow.TemporaryStoryEngagement.attention_flags(s.id, viewer_user_id)

      TemporaryStory.contract(s, display_name(s.author_user_id))
      |> Map.merge(flags)
    end)
  end

  @doc """
  Repair #24 (WS-1): fetch a story for a viewer under the story
  visibility law - the story must exist, be undeleted and
  unexpired, and the viewer must be eligible for it. This is the
  single gate story engagement reads and writes route through,
  exactly as moment engagement routes through
  SocialMomentPublishing.get_for_viewer/2. An ineligible or
  expired story reads as :not_found: the viewer learns nothing
  about a story they may not see.
  """
  def get_for_viewer(story_id, viewer_user_id)
      when is_binary(story_id) and is_binary(viewer_user_id) do
    story_id = if OpalCore.IdShape.uuid?(story_id), do: story_id, else: nil
    now = DateTime.utc_now()

    case story_id && Repo.get(TemporaryStory, story_id) do
      %TemporaryStory{deleted_at: nil} = story ->
        cond do
          DateTime.compare(story.expires_at, now) != :gt -> {:error, :not_found}
          eligible?(story, viewer_user_id) -> {:ok, story}
          true -> {:error, :not_found}
        end

      _ ->
        {:error, :not_found}
    end
  end

  def get_for_viewer(_, _), do: {:error, :not_found}

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

  # Repair #24 WS-2: an anchored story answers to the graph alone.
  # This clause sits ahead of the person visibility branches so the
  # anchor overrides them even on a row whose stored visibility says
  # friends / close_circle: the audience is exactly the graph's
  # parties (creator + participants), never the author's wider
  # relationship audience.
  defp eligible?(%TemporaryStory{graph_plan_id: plan_id}, viewer)
       when is_binary(plan_id) do
    case Repo.get(SharedPlan, plan_id) do
      %SharedPlan{} = plan -> graph_party?(plan, viewer)
      nil -> false
    end
  end

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
    # FR-11-08: a junk story id is a guessed id - :not_found, never a
    # CastError out of Repo.get/2 against :binary_id.
    story_id = if OpalCore.IdShape.uuid?(story_id), do: story_id, else: nil

    case story_id && Repo.get(TemporaryStory, story_id) do
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
