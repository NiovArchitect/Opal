defmodule OpalCore.SocialFlow.SocialMomentPublishing do
  @moduledoc """
  Durable Social Moment publishing (Pass 17).

  Media · visibility · hide/report/delete · group audience.
  Reuses TrustSafety blocks. Does not create feeds, payouts, or notifications by default.
  Storage status: LOCAL_DEV (not production CDN).
  """

  import Ecto.Query

  alias OpalCore.Repo

  alias OpalCore.SocialFlow.{
    MediaLocalStore,
    RelationshipGraph,
    SocialMomentHide,
    SocialMomentMedia,
    SocialMomentRecord,
    SocialMomentReport,
    SocialMomentVisibility
  }

  def media_status do
    %{
      "storage" => MediaLocalStore.status(),
      "production_cdn" => false,
      "upload" => "LOCAL_DEV_BASE64",
      "processing" => "MINIMAL_IMAGE",
      "cdn" => "LOCAL_DEV",
      "moderation" => "MANUAL_STATE_MACHINE",
      "video" => "PARTIAL_FUTURE"
    }
  end

  @doc "Register local_dev media from base64 payload."
  def upload_media(owner_user_id, attrs) when is_binary(owner_user_id) and is_map(attrs) do
    a = stringify(attrs)

    with {:ok, stored} <-
           MediaLocalStore.put_image(owner_user_id, %{
             base64: a["base64"] || a["data"],
             mime_type: a["mime_type"] || "image/jpeg"
           }) do
      %SocialMomentMedia{}
      |> SocialMomentMedia.changeset(%{
        owner_user_id: owner_user_id,
        storage_backend: stored["storage_backend"],
        storage_key: stored["storage_key"],
        mime_type: stored["mime_type"],
        byte_size: stored["byte_size"],
        width: a["width"],
        height: a["height"],
        processing_state: "ready",
        moderation_state: "active",
        exif_stripped: true
      })
      |> Repo.insert()
      |> case do
        {:ok, media} -> {:ok, SocialMomentMedia.contract(media)}
        err -> err
      end
    end
  end

  def upload_media(_, _), do: {:error, :invalid}

  @doc "Publish a Moment. Does not create notification or attribution."
  def publish(author_user_id, attrs) when is_binary(author_user_id) and is_map(attrs) do
    a = stringify(attrs)
    visibility = a["visibility"] || SocialMomentVisibility.default_visibility()

    if visibility not in SocialMomentVisibility.supported_visibilities() do
      {:error, :invalid_visibility}
    else
      place = normalize_place(a["place_ref"] || a["place"] || %{})
      media_ids = List.wrap(a["media_ids"] || [])

      %SocialMomentRecord{}
      |> SocialMomentRecord.changeset(%{
        author_user_id: author_user_id,
        caption: a["caption"] || "",
        social_context: a["social_context"],
        visibility: visibility,
        audience_user_ids: List.wrap(a["audience_user_ids"] || []),
        group_conversation_id: a["group_conversation_id"],
        place_ref: place,
        media_ids: media_ids,
        source_lineage_id: a["source_lineage_id"],
        shared_reality_id: a["shared_reality_id"],
        moderation_state: "active",
        commerce_led: false,
        attribution_eligible: false
      })
      |> Repo.insert()
      |> case do
        {:ok, m} ->
          {:ok,
           %{
             "moment" => SocialMomentRecord.public_contract(m),
             "created_notification" => SocialMomentVisibility.publish_creates_notification?(),
             "created_attribution" => SocialMomentVisibility.publish_creates_attribution?(),
             "media_status" => media_status()
           }}

        err ->
          err
      end
    end
  end

  def publish(_, _), do: {:error, :invalid}

  @doc "Fetch moment for viewer with server visibility enforcement."
  def get_for_viewer(moment_id, viewer_user_id) do
    case Repo.get(SocialMomentRecord, moment_id) do
      nil ->
        {:error, :not_found}

      %SocialMomentRecord{deleted_at: del} = m when not is_nil(del) ->
        if m.author_user_id == viewer_user_id do
          {:ok, SocialMomentRecord.public_contract(m) |> Map.put("deleted", true)}
        else
          {:error, :not_found}
        end

      %SocialMomentRecord{} = m ->
        opts = viewer_opts(m, viewer_user_id)

        if SocialMomentVisibility.can_view?(moment_map(m), viewer_user_id, opts) do
          urls = media_delivery_urls(m, viewer_user_id)
          {:ok, SocialMomentRecord.public_contract(m, include_media_urls: true, media_urls: urls)}
        else
          {:error, :not_found}
        end
    end
  end

  @doc "Authorized discovery list — not Home, not engagement feed."
  def list_for_viewer(viewer_user_id, opts \\ []) do
    limit = Keyword.get(opts, :limit, 20)

    from(m in SocialMomentRecord,
      where: is_nil(m.deleted_at) and m.moderation_state == "active",
      order_by: [desc: m.inserted_at],
      limit: ^limit
    )
    |> Repo.all()
    |> Enum.filter(fn m ->
      SocialMomentVisibility.can_view?(moment_map(m), viewer_user_id, viewer_opts(m, viewer_user_id))
    end)
    # Discovery does not use commission/economics
    |> Enum.reject(fn _ -> SocialMomentVisibility.discovery_uses_commission?() end)
    |> Enum.map(&SocialMomentRecord.public_contract/1)
  end

  def hide(viewer_user_id, moment_id) do
    case Repo.get_by(SocialMomentHide, viewer_user_id: viewer_user_id, moment_id: moment_id) do
      %SocialMomentHide{} ->
        {:ok, %{"hidden" => true, "not_report" => true, "not_block" => true, "idempotent" => true}}

      nil ->
        %SocialMomentHide{}
        |> SocialMomentHide.changeset(%{viewer_user_id: viewer_user_id, moment_id: moment_id})
        |> Repo.insert()
        |> case do
          {:ok, _} -> {:ok, %{"hidden" => true, "not_report" => true, "not_block" => true}}
          {:error, _} = e -> e
        end
    end
  end

  def report(reporter_user_id, moment_id, attrs \\ %{}) do
    a = stringify(attrs)
    idem = a["idempotency_key"] || "smr-#{reporter_user_id}-#{moment_id}-#{a["category"] || "x"}"

    case Repo.get_by(SocialMomentReport, idempotency_key: idem) do
      %SocialMomentReport{} = r ->
        {:ok, %{"id" => r.id, "status" => r.status, "not_auto_delete" => true}}

      nil ->
        %SocialMomentReport{}
        |> SocialMomentReport.changeset(%{
          reporter_user_id: reporter_user_id,
          moment_id: moment_id,
          category: a["category"] || "inappropriate_content",
          note: a["note"],
          status: "submitted",
          idempotency_key: idem
        })
        |> Repo.insert()
        |> case do
          {:ok, r} ->
            {:ok,
             %{
               "id" => r.id,
               "status" => r.status,
               "not_auto_delete" => true,
               "not_equal_hide" => true,
               "not_equal_block" => true
             }}

          err ->
            err
        end
    end
  end

  @doc "Author soft-delete. Downstream realities not destroyed."
  def delete_own(author_user_id, moment_id) do
    case Repo.get(SocialMomentRecord, moment_id) do
      %SocialMomentRecord{author_user_id: ^author_user_id} = m ->
        now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

        {:ok, updated} =
          m
          |> SocialMomentRecord.changeset(%{deleted_at: now, moderation_state: "removed"})
          |> Repo.update()

        # Revoke media access
        Enum.each(m.media_ids || [], fn mid ->
          case Repo.get(SocialMomentMedia, mid) do
            %SocialMomentMedia{owner_user_id: ^author_user_id} = media ->
              _ = MediaLocalStore.delete(media.storage_key)

              media
              |> SocialMomentMedia.changeset(%{deleted_at: now, moderation_state: "removed"})
              |> Repo.update()

            _ ->
              :ok
          end
        end)

        {:ok,
         %{
           "deleted" => true,
           "public_content_removed" => true,
           "downstream_reality_destroyed" => false,
           "lineage_tombstone" => true,
           "source_moment_deleted" => true,
           "moment_id" => updated.id
         }}

      %SocialMomentRecord{} ->
        {:error, :forbidden}

      nil ->
        {:error, :not_found}
    end
  end

  def edit_own(author_user_id, moment_id, attrs) when is_map(attrs) do
    a = stringify(attrs)

    case Repo.get(SocialMomentRecord, moment_id) do
      %SocialMomentRecord{author_user_id: ^author_user_id, deleted_at: nil} = m ->
        now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

        changes =
          %{}
          |> maybe_put("caption", a["caption"])
          |> maybe_put("visibility", a["visibility"])
          |> maybe_put("social_context", a["social_context"])
          |> Map.put("edited_at", now)

        # Audience authority must update on edit — media re-checks current visibility
        changes =
          if Map.has_key?(a, "audience_user_ids") do
            Map.put(changes, "audience_user_ids", List.wrap(a["audience_user_ids"]))
          else
            changes
          end

        changes =
          if Map.has_key?(a, "group_conversation_id") do
            Map.put(changes, "group_conversation_id", a["group_conversation_id"])
          else
            changes
          end

        # Do not silently rewrite place_ref provenance core if place_ref identity changes — record revision via edited_at
        changes =
          if a["place_ref"] do
            Map.put(changes, "place_ref", normalize_place(a["place_ref"]))
          else
            changes
          end

        m
        |> SocialMomentRecord.changeset(atomize_keys(changes))
        |> Repo.update()
        |> case do
          {:ok, updated} -> {:ok, SocialMomentRecord.public_contract(updated)}
          err -> err
        end

      %SocialMomentRecord{} ->
        {:error, :forbidden}

      nil ->
        {:error, :not_found}
    end
  end

  @doc "Serve media bytes only if viewer may access the owning moment."
  def read_media(media_id, viewer_user_id) do
    case Repo.get(SocialMomentMedia, media_id) do
      nil ->
        {:error, :not_found}

      %SocialMomentMedia{deleted_at: d} when not is_nil(d) ->
        {:error, :not_found}

      %SocialMomentMedia{} = media ->
        # Find a moment that references this media
        moment =
          from(m in SocialMomentRecord,
            where: ^media_id in m.media_ids and is_nil(m.deleted_at),
            limit: 1
          )
          |> Repo.one()

        cond do
          media.owner_user_id == viewer_user_id ->
            MediaLocalStore.read(media.storage_key)

          is_nil(moment) ->
            {:error, :not_found}

          SocialMomentVisibility.can_access_media?(
            moment_map(moment),
            viewer_user_id,
            viewer_opts(moment, viewer_user_id)
          ) ->
            MediaLocalStore.read(media.storage_key)

          true ->
            {:error, :not_found}
        end
    end
  end

  # --- internals ---

  defp media_delivery_urls(%SocialMomentRecord{} = m, viewer_user_id) do
    opts = viewer_opts(m, viewer_user_id)

    Enum.map(m.media_ids || [], fn mid ->
      # Controlled delivery path — re-check full authority (no friends?: true bypass)
      if SocialMomentVisibility.can_access_media?(moment_map(m), viewer_user_id, opts) do
        "/api/v1/product/social-moments/media/#{mid}"
      else
        nil
      end
    end)
    |> Enum.reject(&is_nil/1)
  end

  defp viewer_opts(%SocialMomentRecord{} = m, viewer_user_id) do
    [
      hidden?: hidden?(viewer_user_id, m.id),
      friends?: RelationshipGraph.friend_visibility_authorized?(m.author_user_id, viewer_user_id),
      member_of_group?:
        RelationshipGraph.group_visibility_authorized?(m.group_conversation_id, viewer_user_id)
    ]
  end

  defp moment_map(%SocialMomentRecord{} = m) do
    %{
      "author_user_id" => m.author_user_id,
      "visibility" => m.visibility,
      "audience_user_ids" => m.audience_user_ids,
      "group_conversation_id" => m.group_conversation_id,
      "moderation_state" => m.moderation_state,
      "deleted_at" => m.deleted_at
    }
  end

  defp hidden?(viewer, moment_id) do
    from(h in SocialMomentHide,
      where: h.viewer_user_id == ^viewer and h.moment_id == ^moment_id
    )
    |> Repo.exists?()
  end

  defp normalize_place(p) when is_map(p) do
    p = stringify(p)

    %{
      "display_name" => p["display_name"] || p["name"],
      "name" => p["name"] || p["display_name"],
      "provider_place_id" => p["provider_place_id"] || p["id"],
      "provider" => p["provider"] || "unknown",
      "area_label" => p["area_label"] || p["area"],
      "bookability" => "unknown",
      "execution" => "none"
    }
  end

  defp normalize_place(_), do: %{}

  defp maybe_put(map, _k, nil), do: map
  defp maybe_put(map, k, v), do: Map.put(map, k, v)

  defp atomize_keys(map) do
    Map.new(map, fn
      {k, v} when is_binary(k) -> {String.to_existing_atom(k), v}
      {k, v} -> {k, v}
    end)
  rescue
    _ ->
      Map.new(map, fn
        {"caption", v} -> {:caption, v}
        {"visibility", v} -> {:visibility, v}
        {"social_context", v} -> {:social_context, v}
        {"place_ref", v} -> {:place_ref, v}
        {"edited_at", v} -> {:edited_at, v}
        {"audience_user_ids", v} -> {:audience_user_ids, v}
        {"group_conversation_id", v} -> {:group_conversation_id, v}
        {k, v} when is_atom(k) -> {k, v}
        {_, _v} -> nil
      end)
      |> Enum.reject(&is_nil/1)
      |> Map.new()
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
