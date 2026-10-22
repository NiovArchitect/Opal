defmodule OpalCore.SocialFlow.TemporaryStoryEngagement do
  @moduledoc """
  Authoritative Comment / Reply / Mention for TemporaryStory -
  Repair #24 (WS-1, audit D-M).

  Mirrors SocialMomentEngagement's law on the story side:
  visibility is enforced via TemporaryStoryPublishing.get_for_viewer/2
  before every read and write, the actor is always the session
  user (never a client-supplied id), and counts are projected for
  the payload but the surfaces render none of them (counts-free
  law). No polling, no plan tables - this module reads only the
  story and engagement tables, so it does not belong in
  PlanProjection.read_files.
  """

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Events.Publisher
  alias OpalCore.Repo

  alias OpalCore.SocialFlow.{
    TemporaryStory,
    TemporaryStoryEngagementRecord,
    TemporaryStoryPublishing
  }

  # --- Comment (mirrors the moment-comments pattern) ---

  def list_comments(viewer_user_id, story_id) do
    with {:ok, _story} <- authorize_view(story_id, viewer_user_id) do
      comments =
        from(e in TemporaryStoryEngagementRecord,
          where:
            e.story_id == ^story_id and e.kind == "comment" and is_nil(e.deleted_at),
          order_by: [asc: e.inserted_at]
        )
        |> Repo.all()
        |> Enum.map(fn e ->
          TemporaryStoryEngagementRecord.contract(e, display_name(e.actor_user_id))
        end)

      {:ok, %{"comments" => comments, "comment_count" => length(comments)}}
    end
  end

  def add_comment(viewer_user_id, story_id, body)
      when is_binary(viewer_user_id) and is_binary(story_id) do
    trimmed = body |> to_string() |> String.trim()

    if trimmed == "" do
      {:error, :empty_body}
    else
      with {:ok, story} <- authorize_view(story_id, viewer_user_id) do
        {:ok, row} =
          %TemporaryStoryEngagementRecord{}
          |> TemporaryStoryEngagementRecord.changeset(%{
            story_id: story_id,
            actor_user_id: viewer_user_id,
            kind: "comment",
            body: String.slice(trimmed, 0, 2000)
          })
          |> Repo.insert()

        _ = emit(story, viewer_user_id, "temporary_story.commented", %{"engagement_id" => row.id})

        {:ok,
         %{
           "comment" =>
             TemporaryStoryEngagementRecord.contract(row, display_name(viewer_user_id)),
           "comment_count" => comment_count(story_id)
         }}
      end
    end
  end

  # --- Reply (a viewer's response to the author) ---

  @doc """
  Record a viewer's response to a story. The target is stamped
  server-side as the story's author. A reply is not a comment: it
  never joins the comments list. The author cannot reply to their
  own story (that is not a response, it is a caption).
  """
  def add_reply(viewer_user_id, story_id, body)
      when is_binary(viewer_user_id) and is_binary(story_id) do
    trimmed = body |> to_string() |> String.trim()

    cond do
      trimmed == "" ->
        {:error, :empty_body}

      true ->
        with {:ok, story} <- authorize_view(story_id, viewer_user_id) do
          if story.author_user_id == viewer_user_id do
            {:error, :own_story}
          else
            {:ok, row} =
              %TemporaryStoryEngagementRecord{}
              |> TemporaryStoryEngagementRecord.changeset(%{
                story_id: story_id,
                actor_user_id: viewer_user_id,
                target_user_id: story.author_user_id,
                kind: "reply",
                body: String.slice(trimmed, 0, 2000)
              })
              |> Repo.insert()

            _ =
              emit(story, viewer_user_id, "temporary_story.replied", %{
                "engagement_id" => row.id
              })

            {:ok,
             %{
               "reply" =>
                 TemporaryStoryEngagementRecord.contract(row, display_name(viewer_user_id)),
               "viewer_has_response" => true
             }}
          end
        end
    end
  end

  @doc """
  Replies on a story, readable ONLY by the story's author and by
  each responder for their own rows: the author sees every reply
  (they are addressed to them); a responder re-reads only their
  own; any other eligible viewer gets an empty list - reply
  bodies are never a public surface.
  """
  def list_replies(viewer_user_id, story_id) do
    with {:ok, story} <- authorize_view(story_id, viewer_user_id) do
      base =
        from(e in TemporaryStoryEngagementRecord,
          where: e.story_id == ^story_id and e.kind == "reply" and is_nil(e.deleted_at),
          order_by: [asc: e.inserted_at]
        )

      rows =
        if story.author_user_id == viewer_user_id do
          Repo.all(base)
        else
          Repo.all(from(e in base, where: e.actor_user_id == ^viewer_user_id))
        end

      {:ok,
       %{
         "replies" =>
           Enum.map(rows, fn e ->
             TemporaryStoryEngagementRecord.contract(e, display_name(e.actor_user_id))
           end)
       }}
    end
  end

  # --- Mention (author mentions a viewer in the story) ---

  @doc """
  The story's author mentions a viewer in the story. The target
  must be eligible for the story - mentioning someone into a
  story they cannot see is refused as :target_not_eligible.
  Idempotent per (story, target): a second mention returns the
  standing row.
  """
  def add_mention(author_user_id, story_id, target_user_id)
      when is_binary(author_user_id) and is_binary(story_id) and is_binary(target_user_id) do
    with {:ok, story} <- authorize_view(story_id, author_user_id) do
      cond do
        story.author_user_id != author_user_id ->
          {:error, :forbidden}

        target_user_id == author_user_id ->
          {:error, :invalid_mention}

        not TemporaryStoryPublishing.eligible_story?(story, target_user_id) ->
          {:error, :target_not_eligible}

        true ->
          case Repo.get_by(TemporaryStoryEngagementRecord,
                 story_id: story_id,
                 kind: "mention",
                 target_user_id: target_user_id
               ) do
            %TemporaryStoryEngagementRecord{deleted_at: nil} = row ->
              {:ok,
               %{
                 "mention" =>
                   TemporaryStoryEngagementRecord.contract(row, display_name(author_user_id)),
                 "idempotent" => true
               }}

            _ ->
              {:ok, row} =
                %TemporaryStoryEngagementRecord{}
                |> TemporaryStoryEngagementRecord.changeset(%{
                  story_id: story_id,
                  actor_user_id: author_user_id,
                  target_user_id: target_user_id,
                  kind: "mention"
                })
                |> Repo.insert()

              _ =
                emit(story, author_user_id, "temporary_story.mentioned", %{
                  "engagement_id" => row.id,
                  "target_user_id" => target_user_id
                })

              {:ok,
               %{
                 "mention" =>
                   TemporaryStoryEngagementRecord.contract(row, display_name(author_user_id))
               }}
          end
      end
    end
  end

  def add_mention(_, _, _), do: {:error, :invalid_mention}

  # --- Attention flags (the rail trigger's server truth) ---

  @doc """
  The two server-computed flags the story contract carries per
  viewer (Repair #24, WS-1):

    viewer_mentioned    - a live mention row on this story
                          targets the viewer.
    viewer_has_response - a live reply row on this story involves
                          the viewer, as the responder or as the
                          author responded to.

  Both read only this story's engagement rows. There is
  deliberately NO interest flag: no interest field exists in the
  story record or the rail path, so the demonstrated-interest
  glow trigger stays unwired rather than fabricated.
  """
  def attention_flags(story_id, viewer_user_id)
      when is_binary(story_id) and is_binary(viewer_user_id) do
    mentioned =
      Repo.exists?(
        from(e in TemporaryStoryEngagementRecord,
          where:
            e.story_id == ^story_id and e.kind == "mention" and
              e.target_user_id == ^viewer_user_id and is_nil(e.deleted_at)
        )
      )

    has_response =
      Repo.exists?(
        from(e in TemporaryStoryEngagementRecord,
          where:
            e.story_id == ^story_id and e.kind == "reply" and is_nil(e.deleted_at) and
              (e.actor_user_id == ^viewer_user_id or e.target_user_id == ^viewer_user_id)
        )
      )

    %{"viewer_mentioned" => mentioned, "viewer_has_response" => has_response}
  end

  def attention_flags(_, _), do: %{"viewer_mentioned" => false, "viewer_has_response" => false}

  # --- auth helpers ---

  defp authorize_view(story_id, viewer_user_id) do
    case TemporaryStoryPublishing.get_for_viewer(story_id, viewer_user_id) do
      {:ok, %TemporaryStory{} = story} -> {:ok, story}
      {:error, _} -> {:error, :not_found}
    end
  end

  defp comment_count(story_id) do
    from(e in TemporaryStoryEngagementRecord,
      where: e.story_id == ^story_id and e.kind == "comment" and is_nil(e.deleted_at)
    )
    |> Repo.aggregate(:count, :id)
  end

  defp display_name(user_id) do
    case Repo.get(User, user_id) do
      %User{display_name: name} when is_binary(name) and name != "" -> name
      %User{handle: h} when is_binary(h) and h != "" -> h
      _ -> "Someone"
    end
  end

  defp emit(%TemporaryStory{} = story, actor_id, event_type, extra) do
    Publisher.record(%{
      event_type: event_type,
      aggregate_type: "temporary_story",
      aggregate_id: story.id,
      partition_key: story.id,
      privacy_class: "shared_authorized",
      purpose: "story_engagement",
      payload:
        Map.merge(
          %{"story_id" => story.id, "actor_user_id" => actor_id},
          extra
        )
    })
  rescue
    _ -> {:error, :outbox_unavailable}
  end
end
