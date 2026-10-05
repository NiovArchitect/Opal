defmodule OpalCore.SocialFlow.SocialMomentEngagement do
  @moduledoc """
  Authoritative Like / Comment / Repost / Save for SocialMoment (Home Memory).

  Client stores may optimistic-cache. BEAM + Postgres are the system of record.
  Visibility is enforced via SocialMomentVisibility / Audience before every mutate/read.
  """

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Events.Publisher
  alias OpalCore.Repo

  alias OpalCore.SocialFlow.{
    SocialMomentAudience,
    SocialMomentComment,
    SocialMomentLike,
    SocialMomentPublishing,
    SocialMomentRealtime,
    SocialMomentRecord,
    SocialMomentRepost,
    SocialMomentSave
  }

  # --- Like ---

  @doc "Idempotent like. Returns viewer_liked + like_count."
  def like(viewer_user_id, moment_id) when is_binary(viewer_user_id) and is_binary(moment_id) do
    with {:ok, moment} <- authorize_interact(moment_id, viewer_user_id) do
      case Repo.get_by(SocialMomentLike, moment_id: moment_id, viewer_user_id: viewer_user_id) do
        %SocialMomentLike{status: "active"} = row ->
          {:ok, summary(moment_id, viewer_user_id) |> Map.put("idempotent", true) |> Map.put("like_id", row.id)}

        %SocialMomentLike{} = row ->
          {:ok, updated} =
            row
            |> SocialMomentLike.changeset(%{status: "active"})
            |> Repo.update()

          _ = emit(moment, viewer_user_id, "social_moment.liked")
          _ = fanout(moment, "social_moment:liked")
          {:ok, summary(moment_id, viewer_user_id) |> Map.put("like_id", updated.id)}

        nil ->
          {:ok, row} =
            %SocialMomentLike{}
            |> SocialMomentLike.changeset(%{
              moment_id: moment_id,
              viewer_user_id: viewer_user_id,
              status: "active"
            })
            |> Repo.insert()

          _ = emit(moment, viewer_user_id, "social_moment.liked")
          _ = fanout(moment, "social_moment:liked")
          {:ok, summary(moment_id, viewer_user_id) |> Map.put("like_id", row.id)}
      end
    end
  end

  def unlike(viewer_user_id, moment_id) when is_binary(viewer_user_id) and is_binary(moment_id) do
    with {:ok, moment} <- authorize_interact(moment_id, viewer_user_id) do
      case Repo.get_by(SocialMomentLike, moment_id: moment_id, viewer_user_id: viewer_user_id) do
        %SocialMomentLike{status: "active"} = row ->
          {:ok, _} =
            row
            |> SocialMomentLike.changeset(%{status: "revoked"})
            |> Repo.update()

          _ = emit(moment, viewer_user_id, "social_moment.unliked")
          _ = fanout(moment, "social_moment:unliked")
          {:ok, summary(moment_id, viewer_user_id)}

        _ ->
          {:ok, summary(moment_id, viewer_user_id) |> Map.put("idempotent", true)}
      end
    end
  end

  # --- Comment ---

  def list_comments(viewer_user_id, moment_id) do
    with {:ok, _moment} <- authorize_view(moment_id, viewer_user_id) do
      comments =
        from(c in SocialMomentComment,
          where: c.moment_id == ^moment_id and is_nil(c.deleted_at),
          order_by: [asc: c.inserted_at]
        )
        |> Repo.all()
        |> Enum.map(fn c -> SocialMomentComment.contract(c, display_name(c.author_user_id)) end)

      {:ok, %{"comments" => comments, "comment_count" => length(comments)}}
    end
  end

  def add_comment(viewer_user_id, moment_id, body)
      when is_binary(viewer_user_id) and is_binary(moment_id) do
    trimmed = body |> to_string() |> String.trim()

    if trimmed == "" do
      {:error, :empty_body}
    else
      with {:ok, moment} <- authorize_interact(moment_id, viewer_user_id) do
        {:ok, comment} =
          %SocialMomentComment{}
          |> SocialMomentComment.changeset(%{
            moment_id: moment_id,
            # Author is always session user — never trust client author_user_id.
            author_user_id: viewer_user_id,
            body: String.slice(trimmed, 0, 2000)
          })
          |> Repo.insert()

        _ = emit(moment, viewer_user_id, "social_moment.commented", %{"comment_id" => comment.id})
        _ = fanout(moment, "social_moment:commented")

        {:ok,
         %{
           "comment" => SocialMomentComment.contract(comment, display_name(viewer_user_id)),
           "comment_count" => comment_count(moment_id)
         }}
      end
    end
  end

  # --- Repost ---

  def repost(viewer_user_id, moment_id) do
    with {:ok, moment} <- authorize_interact(moment_id, viewer_user_id),
         :ok <- repost_allowed?(moment) do
      case Repo.get_by(SocialMomentRepost, moment_id: moment_id, viewer_user_id: viewer_user_id) do
        %SocialMomentRepost{status: "active"} = row ->
          {:ok, summary(moment_id, viewer_user_id) |> Map.put("idempotent", true) |> Map.put("repost_id", row.id)}

        %SocialMomentRepost{} = row ->
          {:ok, updated} =
            row |> SocialMomentRepost.changeset(%{status: "active"}) |> Repo.update()

          _ = emit(moment, viewer_user_id, "social_moment.reposted")
          {:ok, summary(moment_id, viewer_user_id) |> Map.put("repost_id", updated.id)}

        nil ->
          {:ok, row} =
            %SocialMomentRepost{}
            |> SocialMomentRepost.changeset(%{
              moment_id: moment_id,
              viewer_user_id: viewer_user_id,
              status: "active"
            })
            |> Repo.insert()

          _ = emit(moment, viewer_user_id, "social_moment.reposted")
          {:ok, summary(moment_id, viewer_user_id) |> Map.put("repost_id", row.id)}
      end
    end
  end

  def unrepost(viewer_user_id, moment_id) do
    with {:ok, moment} <- authorize_interact(moment_id, viewer_user_id) do
      case Repo.get_by(SocialMomentRepost, moment_id: moment_id, viewer_user_id: viewer_user_id) do
        %SocialMomentRepost{status: "active"} = row ->
          {:ok, _} = row |> SocialMomentRepost.changeset(%{status: "revoked"}) |> Repo.update()
          _ = emit(moment, viewer_user_id, "social_moment.unreposted")
          {:ok, summary(moment_id, viewer_user_id)}

        _ ->
          {:ok, summary(moment_id, viewer_user_id) |> Map.put("idempotent", true)}
      end
    end
  end

  # --- Save (private) ---

  def save(viewer_user_id, moment_id) do
    with {:ok, moment} <- authorize_interact(moment_id, viewer_user_id) do
      case Repo.get_by(SocialMomentSave, moment_id: moment_id, viewer_user_id: viewer_user_id) do
        %SocialMomentSave{status: "active"} = row ->
          {:ok, %{"viewer_saved" => true, "idempotent" => true, "save_id" => row.id}}

        %SocialMomentSave{} = row ->
          {:ok, updated} = row |> SocialMomentSave.changeset(%{status: "active"}) |> Repo.update()
          _ = emit(moment, viewer_user_id, "social_moment.saved")
          {:ok, %{"viewer_saved" => true, "save_id" => updated.id}}

        nil ->
          {:ok, row} =
            %SocialMomentSave{}
            |> SocialMomentSave.changeset(%{
              moment_id: moment_id,
              viewer_user_id: viewer_user_id,
              status: "active"
            })
            |> Repo.insert()

          _ = emit(moment, viewer_user_id, "social_moment.saved")
          {:ok, %{"viewer_saved" => true, "save_id" => row.id}}
      end
    end
  end

  def unsave(viewer_user_id, moment_id) do
    with {:ok, moment} <- authorize_interact(moment_id, viewer_user_id) do
      case Repo.get_by(SocialMomentSave, moment_id: moment_id, viewer_user_id: viewer_user_id) do
        %SocialMomentSave{status: "active"} = row ->
          {:ok, _} = row |> SocialMomentSave.changeset(%{status: "revoked"}) |> Repo.update()
          _ = emit(moment, viewer_user_id, "social_moment.unsaved")
          {:ok, %{"viewer_saved" => false}}

        _ ->
          {:ok, %{"viewer_saved" => false, "idempotent" => true}}
      end
    end
  end

  @doc "List active private saves for the viewer (Saved collection)."
  def list_saved(viewer_user_id) do
    import Ecto.Query

    rows =
      from(s in SocialMomentSave,
        where: s.viewer_user_id == ^viewer_user_id and s.status == "active",
        order_by: [desc: s.updated_at],
        select: s.moment_id
      )
      |> Repo.all()

    moments =
      rows
      |> Enum.map(fn moment_id ->
        case SocialMomentPublishing.get_for_viewer(moment_id, viewer_user_id) do
          {:ok, moment} -> enrich_moment_contract(moment, viewer_user_id)
          _ -> nil
        end
      end)
      |> Enum.reject(&is_nil/1)

    %{"saves" => moments, "count" => length(moments)}
  end

  @doc "Engagement summary for feed/detail cards."
  def summary(moment_id, viewer_user_id) do
    %{
      "viewer_liked" => liked?(moment_id, viewer_user_id),
      "like_count" => like_count(moment_id),
      "viewer_reposted" => reposted?(moment_id, viewer_user_id),
      "repost_count" => repost_count(moment_id),
      "viewer_saved" => saved?(moment_id, viewer_user_id),
      "comment_count" => comment_count(moment_id)
    }
  end

  def enrich_moment_contract(moment_map, viewer_user_id) when is_map(moment_map) do
    id = moment_map["id"]
    Map.merge(moment_map, summary(id, viewer_user_id) |> Map.put("object_type", "memory"))
  end

  # --- auth helpers ---

  defp authorize_view(moment_id, viewer_user_id) do
    case SocialMomentPublishing.get_for_viewer(moment_id, viewer_user_id) do
      {:ok, _} ->
        case Repo.get(SocialMomentRecord, moment_id) do
          %SocialMomentRecord{deleted_at: nil} = m -> {:ok, m}
          _ -> {:error, :not_found}
        end

      {:error, _} ->
        {:error, :denied}
    end
  end

  defp authorize_interact(moment_id, viewer_user_id), do: authorize_view(moment_id, viewer_user_id)

  defp repost_allowed?(%SocialMomentRecord{visibility: vis}) when vis in ~w(friends group) do
    :ok
  end

  defp repost_allowed?(%SocialMomentRecord{visibility: "private"}) do
    {:error, :repost_not_allowed}
  end

  defp repost_allowed?(%SocialMomentRecord{visibility: "specific_people"}) do
    {:error, :repost_not_allowed}
  end

  defp liked?(moment_id, viewer_user_id) do
    !!Repo.get_by(SocialMomentLike,
      moment_id: moment_id,
      viewer_user_id: viewer_user_id,
      status: "active"
    )
  end

  defp reposted?(moment_id, viewer_user_id) do
    !!Repo.get_by(SocialMomentRepost,
      moment_id: moment_id,
      viewer_user_id: viewer_user_id,
      status: "active"
    )
  end

  defp saved?(moment_id, viewer_user_id) do
    !!Repo.get_by(SocialMomentSave,
      moment_id: moment_id,
      viewer_user_id: viewer_user_id,
      status: "active"
    )
  end

  defp like_count(moment_id) do
    from(l in SocialMomentLike, where: l.moment_id == ^moment_id and l.status == "active")
    |> Repo.aggregate(:count, :id)
  end

  defp repost_count(moment_id) do
    from(r in SocialMomentRepost, where: r.moment_id == ^moment_id and r.status == "active")
    |> Repo.aggregate(:count, :id)
  end

  defp comment_count(moment_id) do
    from(c in SocialMomentComment, where: c.moment_id == ^moment_id and is_nil(c.deleted_at))
    |> Repo.aggregate(:count, :id)
  end

  defp display_name(user_id) do
    case Repo.get(User, user_id) do
      %User{display_name: name} when is_binary(name) and name != "" -> name
      %User{handle: h} when is_binary(h) and h != "" -> h
      _ -> "Someone"
    end
  end

  defp emit(%SocialMomentRecord{} = moment, actor_id, event_type, extra \\ %{}) do
    Publisher.record(%{
      event_type: event_type,
      aggregate_type: "social_moment",
      aggregate_id: moment.id,
      partition_key: moment.id,
      privacy_class: "shared_authorized",
      purpose: "social_engagement",
      payload:
        Map.merge(
          %{
            "moment_id" => moment.id,
            "actor_user_id" => actor_id,
            "authorized_viewer_count" => length(SocialMomentAudience.authorized_viewer_ids(moment))
          },
          extra
        )
    })
  rescue
    _ -> {:error, :outbox_unavailable}
  end

  defp fanout(%SocialMomentRecord{} = moment, event) do
    SocialMomentRealtime.publish_moment_event(moment, event)
  rescue
    _ -> :ok
  end
end
