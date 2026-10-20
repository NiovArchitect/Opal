defmodule OpalCore.Center.ProviderAction do
  @moduledoc """
  Create and run Center provider actions. Promise language requires a job id.
  Venue selection attaches to the same SharedPlan id (PLAN_ID_STABLE).
  """

  import Ecto.Query
  alias OpalCore.Repo
  alias OpalCore.Places.Gateway
  alias OpalCore.Center.{ProviderActionJob, ProviderActionWorker, PlanningContext}
  alias OpalCore.Events.Publisher
  alias OpalCore.SocialFlow
  alias OpalCore.SocialFlow.SharedPlan

  @doc """
  Enqueue a places search for an explicit destination. Returns {:ok, job}.
  """
  def start_places_search(attrs) when is_map(attrs) do
    user_id = attrs[:user_id] || attrs["user_id"]
    conversation_id = attrs[:conversation_id] || attrs["conversation_id"]
    destination = attrs[:destination] || attrs["destination"]
    planning = attrs[:planning_snapshot] || attrs["planning_snapshot"] || %{}
    plan_id = attrs[:plan_id] || attrs["plan_id"] || planning["plan_id"]

    search_mode =
      attrs[:search_mode] || attrs["search_mode"] || planning["search_mode"] || "discovery"

    requested_venue =
      attrs[:requested_venue_name] || attrs["requested_venue_name"] ||
        planning["requested_venue_name"] || planning["venue"]

    requested_locality =
      attrs[:requested_venue_locality] || attrs["requested_venue_locality"] ||
        planning["requested_venue_locality"] || destination

    # Repair #12 (F12-11): origin threading — device-anchored searches carry
    # coarse lat/lon so the provider centers on the device, not on a
    # destination-text geocode. origin_source ∈ device/manual/named_destination.
    origin_source =
      attrs[:origin_source] || attrs["origin_source"] || planning["origin_source"]

    origin_lat = attrs[:origin_lat] || attrs["origin_lat"] || planning["origin_lat"]
    origin_lon = attrs[:origin_lon] || attrs["origin_lon"] || planning["origin_lon"]

    device_origin? = is_number(origin_lat) and is_number(origin_lon)

    exact? =
      search_mode in ["exact_entity", "exact"] and is_binary(requested_venue) and
        String.trim(requested_venue) != ""

    dest_ok? =
      exact? or (is_binary(destination) and String.trim(destination) != "")

    # B1 (A6): a places search for a virtual plan is a search for a
    # non-place - refuse it at the door, whoever the caller is.
    if is_binary(plan_id) and
         match?(%SharedPlan{plan_type: "virtual"}, Repo.get(SharedPlan, plan_id)) do
      {:error, :plan_is_virtual}
    else
      start_places_search_checked(attrs, user_id, conversation_id, destination, planning, plan_id, search_mode, requested_venue, requested_locality, origin_source, origin_lat, origin_lon, exact?, dest_ok?)
    end
  end

  defp start_places_search_checked(attrs, user_id, conversation_id, destination, planning, plan_id, search_mode, requested_venue, requested_locality, origin_source, origin_lat, origin_lon, exact?, dest_ok?) do
    device_origin? = is_number(origin_lat) and is_number(origin_lon)

    with true <- is_binary(user_id),
         true <- dest_ok? do
      geography =
        cond do
          exact? and is_binary(requested_locality) and String.trim(requested_locality) != "" ->
            String.trim(requested_locality)

          is_binary(destination) and String.trim(destination) != "" ->
            String.trim(destination)

          true ->
            "search area"
        end

      cuisine =
        attrs[:cuisine] || attrs["cuisine"] || planning["cuisine"]

      categories =
        attrs[:categories] || attrs["categories"] ||
          cuisine_to_categories(cuisine) || "catering.restaurant"

      job_attrs = %{
        "user_id" => user_id,
        "conversation_id" => conversation_id,
        "plan_id" => plan_id,
        "kind" => "places_search",
        "status" => "queued",
        "search_geography" => geography,
        "request" => %{
          "destination_text" => geography,
          "categories" => categories,
          "cuisine" => if(is_binary(cuisine) and cuisine != "", do: cuisine, else: nil),
          "limit" => attrs[:limit] || attrs["limit"] || 5,
          "radius_m" => attrs[:radius_m] || attrs["radius_m"] || 8_000,
          "quality_intent" => attrs[:quality_intent] || attrs["quality_intent"],
          "search_mode" => if(exact?, do: "exact_entity", else: "discovery"),
          "requested_venue_name" => if(exact?, do: String.trim(requested_venue), else: nil),
          "requested_venue_locality" =>
            if(exact? and is_binary(requested_locality),
              do: String.trim(requested_locality),
              else: nil
            ),
          # Repair #12 (F12-11): origin threading for device-anchored search.
          "origin_source" => origin_source,
          "origin_lat" => if(device_origin?, do: origin_lat, else: nil),
          "origin_lon" => if(device_origin?, do: origin_lon, else: nil)
        },
        "planning_snapshot" => stringify(planning)
      }

      {:ok, job} =
        %ProviderActionJob{}
        |> ProviderActionJob.changeset(job_attrs)
        |> Repo.insert()

      _ =
        %{job_id: job.id}
        |> ProviderActionWorker.new()
        |> Oban.insert()

      _ =
        Publisher.record(%{
          event_type: "action.provider_job.queued",
          event_id: "provider_job_queued:#{job.id}",
          aggregate_type: "provider_action_job",
          aggregate_id: job.id,
          partition_key: user_id,
          actor_user_id: user_id,
          privacy_class: "private_authorized",
          purpose: "center_provider_action",
          payload: %{
            "kind" => "places_search",
            "search_geography" => job.search_geography,
            "status" => "queued"
          }
        })

      {:ok, job}
    else
      _ -> {:error, :invalid}
    end
  end

  def get(id) when is_binary(id), do: Repo.get(ProviderActionJob, id)

  def list_for_user(user_id, limit \\ 10) when is_binary(user_id) do
    from(j in ProviderActionJob,
      where: j.user_id == ^user_id,
      order_by: [desc: j.inserted_at],
      limit: ^limit
    )
    |> Repo.all()
  end

  @doc """
  Cancel queued/running provider jobs for this user so a new conversational
  turn cannot be monopolized by a stale venue lookup.
  """
  def cancel_inflight_for_user(user_id) when is_binary(user_id) do
    now = DateTime.utc_now()

    {count, _} =
      from(j in ProviderActionJob,
        where: j.user_id == ^user_id and j.status in ^["queued", "running"]
      )
      |> Repo.update_all(
        set: [
          status: "cancelled",
          finished_at: now,
          updated_at: now
        ]
      )

    {:ok, count}
  end

  def cancel_inflight_for_user(_), do: {:ok, 0}

  @doc """
  Ensure a durable SharedPlan id exists for this planning draft.
  Reuses planning_context.plan_id when present (PLAN_ID_STABLE).
  """
  def ensure_plan(user_id, planning) when is_binary(user_id) and is_map(planning) do
    existing = planning["plan_id"]

    cond do
      is_binary(existing) and existing != "" and
          match?(%SharedPlan{}, Repo.get(SharedPlan, existing)) ->
        {:ok, existing, planning}

      true ->
        who = planning["who"] || planning["primary_person"]
        dest = planning["destination"] || "somewhere"
        when_s = planning["when"] || planning["when_resolved"] || "soon"
        who_label = format_who_label(who)
        # Repair #18 (Division A, F18-06): no schedule baked into the
        # title (the day lives in time_label), and the planning context
        # is passed through as dedupe context (who + when + destination)
        # so this path stops relying solely on the 15-minute sticky id.
        title = String.trim("Dinner#{if who_label, do: " with #{who_label}", else: ""}")

        case SocialFlow.create_tentative_plan_from_center(user_id, %{
               "title" => title,
               "location" => dest,
               "place" => dest,
               "area" => dest,
               "time_label" => when_s,
               "subject_who" => who_label,
               # B1 (A6): forward place type - dropping it here was the
               # F14-04 bug pattern, live on this path.
               "plan_type" => planning["plan_type"],
               "meeting_link" => planning["meeting_link"],
               "meeting_provider" => planning["meeting_provider"],
               "decision_id" => planning["opportunity_fingerprint"] || planning["decision_id"]
             }) do
          {:ok, plan, _} ->
            {:ok, plan.id, Map.put(planning, "plan_id", plan.id)}

          {:error, reason} ->
            {:error, reason}
        end
    end
  end

  def ensure_plan(_, _), do: {:error, :invalid}

  @doc """
  Attach a selected venue to the same plan id. Projects Center + peer chat + graph event.

  Options:
  - `paint: false` — perform the plan write without painting the "Perfect — I
    added …" chat message. Used by the exact-resolve path (Repair #12 F12-03),
    which paints a single "Found it — … I've set it as the venue" message
    describing the performed write instead of two messages.
  """
  def attach_selected_venue(user_id, venue, planning, opts \\ [])

  def attach_selected_venue(user_id, venue, planning, opts)
      when is_binary(user_id) and is_map(venue) and is_map(planning) and is_list(opts) do
    paint? = Keyword.get(opts, :paint, true)
    name = venue["name"] || venue[:name]

    with true <- is_binary(name) and String.trim(name) != "",
         {:ok, plan_id, planning2} <- ensure_plan(user_id, planning),
         %SharedPlan{} = plan <- Repo.get(SharedPlan, plan_id),
         # B1 (A6): attaching a physical venue to a virtual plan would
         # split the record (title/alignment claim a venue, the row
         # claims Online). Refuse - converting back to in-person is
         # the lawful path, then attach.
         :ok <-
           if(plan.plan_type == "virtual",
             do: {:error, :plan_is_virtual},
             else: :ok
           ) do
      dest = planning2["destination"] || plan.location
      address = venue["address"] || venue[:address]
      location = if is_binary(address) and address != "", do: "#{name} · #{address}", else: name

      alignment =
        (plan.alignment || %{})
        |> Map.put("venue", %{
          "name" => name,
          "address" => address,
          "provider" => venue["provider"] || venue[:provider] || "geoapify",
          "provider_place_id" => venue["provider_place_id"] || venue["id"] || venue[:id],
          "lat" => venue["lat"] || venue[:lat],
          "lon" => venue["lon"] || venue[:lon],
          "search_geography" => dest
        })
        |> Map.put("destination", dest)
        |> Map.put("option_selected", true)

      # Founder Polish G2 (the place-coordinates writer): the venue
      # map above already carried the gateway candidate's lat/lon
      # into alignment - this is where the same pair lands on the
      # plan ROW (place_lat/place_lon), the columns the P10c leave-by
      # derivation reads. The candidate is server-resolved here, so
      # its coordinates are the truth available at selection time -
      # no client round-trip, no geocoding. A candidate WITHOUT a
      # valid pair (e.g. the name-only fallback candidate) CLEARS the
      # columns: the plan's place is now that candidate, and the old
      # place's coordinates must not survive onto it.
      {venue_lat, venue_lon} =
        case SocialFlow.place_coordinates_from_params(venue) do
          {:ok, pair} -> pair
          _ -> {nil, nil}
        end

      {:ok, updated} =
        plan
        |> SharedPlan.changeset(%{
          "title" => "#{name} · #{planning2["when"] || plan.time_label || "soon"}",
          "location" => location,
          "place_lat" => venue_lat,
          "place_lon" => venue_lon,
          "alignment" => alignment
        })
        |> Repo.update()

      _ = PlanningContext.merge(user_id, %{"plan_id" => plan_id, "venue" => name}, %{})

      _ =
        Publisher.record(%{
          event_type: "plan.updated",
          event_id: "plan_venue_attached:#{plan_id}:#{:erlang.phash2(name)}",
          aggregate_type: "shared_plan",
          aggregate_id: plan_id,
          partition_key: user_id,
          actor_user_id: user_id,
          privacy_class: "private_authorized",
          purpose: "center_venue_attach",
          plan_id: plan_id,
          payload: %{
            "plan_id" => plan_id,
            "venue" => name,
            "destination" => dest,
            "option_selected" => true,
            "source" => "center"
          }
        })

      chat_proj = maybe_project_peer_chat(user_id, planning2, updated, name)
      center_proj = if paint?, do: paint_center_attach(user_id, updated, name, dest), else: false

      planning3 =
        planning2
        |> Map.put("plan_id", plan_id)
        |> Map.put("venue", name)
        |> Map.delete("venue_cancelled")

      next_dep = OpalCore.Center.DependencyPlanner.next_after(planning3, "venue")

      _ =
        PlanningContext.merge(
          user_id,
          %{
            "plan_id" => plan_id,
            "venue" => name,
            "next_dependency" => next_dep && next_dep["id"],
            "dependencies" => OpalCore.Center.DependencyPlanner.build(planning3)
          },
          %{}
        )

      {:ok,
       %{
         plan_id: plan_id,
         plan: updated,
         venue: name,
         graph_projection: true,
         chat_projection: chat_proj,
         center_projection: center_proj,
         next_dependency: next_dep,
         planning: Map.merge(planning3, %{"next_dependency" => next_dep && next_dep["id"]})
       }}
    else
      nil -> {:error, :plan_missing}
      false -> {:error, :invalid_venue}
      {:error, _} = err -> err
    end
  end

  def attach_selected_venue(_, _, _, _), do: {:error, :invalid}

  defp format_who_label(nil), do: nil
  defp format_who_label(who) when is_binary(who), do: who
  defp format_who_label([n | _]) when is_binary(n), do: n
  defp format_who_label(_), do: nil

  # SUBJECT_PERSON ≠ MESSAGE_RECIPIENT. Venue attach stays on Center/Graph.
  # Shared-safe human projection is a separate explicit authority path.
  defp maybe_project_peer_chat(_user_id, _planning, _plan, _venue_name), do: false

  defp paint_center_attach(user_id, plan, venue_name, dest) do
    alias OpalCore.OpalConversations
    alias OpalCore.OpalConversations.OpalMessage

    when_s =
      get_in(plan.alignment || %{}, ["when"]) || plan.time_label || "Saturday"

    planning =
      PlanningContext.get_for_user(user_id)
      |> Map.merge(%{
        "destination" => dest,
        "venue" => venue_name,
        "when" => when_s,
        "plan_id" => plan.id
      })

    next_dep = OpalCore.Center.DependencyPlanner.next_after(planning, "venue")

    body =
      "Perfect — I added #{venue_name} to #{OpalCore.Center.TemporalPhrase.when_phrase(when_s)} in #{dest}." <>
        case next_dep do
          %{"prompt" => prompt} when is_binary(prompt) and prompt != "" -> " #{prompt}"
          _ -> ""
        end

    case OpalConversations.get_or_create_conversation(user_id) do
      {:ok, conversation} ->
        %OpalMessage{}
        |> OpalMessage.changeset(%{
          "conversation_id" => conversation.id,
          "role" => "opal",
          "body" => body,
          "metadata" => %{
            "source" => "provider_action",
            "action_state" => "option_selected",
            "plan_id" => plan.id,
            "venue" => venue_name,
            "search_geography" => dest,
            "option_selected" => true
          }
        })
        |> Repo.insert()

        true

      _ ->
        false
    end
  rescue
    _ -> false
  end

  @doc "Execute job body (called by worker)."
  def perform(%ProviderActionJob{} = job) do
    now = DateTime.utc_now(:microsecond)

    {:ok, job} =
      job
      |> ProviderActionJob.changeset(%{
        "status" => "running",
        "started_at" => now,
        "provider" => Gateway.primary_id()
      })
      |> Repo.update()

    case job.kind do
      "places_search" -> perform_places_search(job)
      _ -> fail(job, "unsupported_kind")
    end
  end

  defp perform_places_search(%ProviderActionJob{} = job) do
    dest = job.search_geography || job.request["destination_text"]
    mode = job.request["search_mode"] || "discovery"
    requested = job.request["requested_venue_name"]
    locality = job.request["requested_venue_locality"] || dest

    # Repair #11 — exact-entity jobs must resolve via Gateway.resolve_exact_entity,
    # never discovery. The named-venue intent is an exact-entity request; returning
    # discovery substitutes for it is forbidden.
    exact_query? =
      mode == "exact_entity" and is_binary(requested) and String.trim(requested) != ""

    result =
      if exact_query? do
        query = %{
          "search_mode" => "exact_entity",
          "requested_venue_name" => String.trim(requested),
          "requested_venue_locality" => locality,
          "destination_text" => locality,
          "limit" => 1
        }

        Gateway.resolve_exact_entity(query)
      else
        query =
          %{
            "destination_text" => dest,
            "categories" => job.request["categories"] || "catering.restaurant",
            "cuisine" => job.request["cuisine"],
            "limit" => job.request["limit"] || 5,
            "radius_m" => job.request["radius_m"] || 8_000,
            "search_mode" => "discovery"
          }
          # Repair #12 (F12-11): device-anchored discovery centers the
          # provider circle on the device coords — no destination-text geocode.
          |> then(fn q ->
            lat = job.request["origin_lat"]
            lon = job.request["origin_lon"]

            if is_number(lat) and is_number(lon) do
              q |> Map.put("lat", lat) |> Map.put("lon", lon)
            else
              q
            end
          end)

        Gateway.search_places(query)
      end

    case result do
      {:ok, result} ->
        cands =
          (result["candidates"] || [])
          |> Enum.filter(fn c -> is_binary(c["name"]) and c["name"] != "" end)
          |> then(fn list ->
            # Exact mode: never pad with unrelated alternatives.
            if result["search_mode"] == "exact_entity",
              do: Enum.take(list, 1),
              else: Enum.take(list, 3)
          end)

        finish_ready(job, Map.put(result, "candidates", cands))

      {:error, reason} ->
        fail(job, format_err(reason))
    end
  end

  defp finish_ready(job, result) do
    now = DateTime.utc_now(:microsecond)

    # Stale-response rejection: a cancel/New Chat while the worker ran must win.
    case Repo.get(ProviderActionJob, job.id) do
      %ProviderActionJob{status: status} when status in ["cancelled", "superseded"] ->
        {:ok, job}

      %ProviderActionJob{status: status} = fresh when status in ["queued", "running"] ->
        {:ok, job} =
          fresh
          |> ProviderActionJob.changeset(%{
            "status" => "results_ready",
            "result" => result,
            "provider" => result["provider"] || fresh.provider,
            "search_geography" => result["search_geography"] || fresh.search_geography,
            "finished_at" => now,
            "error" => nil
          })
          |> Repo.update()

        _ =
          Publisher.record(%{
            event_type: "action.provider_job.results_ready",
            event_id: "provider_job_ready:#{job.id}",
            aggregate_type: "provider_action_job",
            aggregate_id: job.id,
            partition_key: job.user_id,
            actor_user_id: job.user_id,
            privacy_class: "private_authorized",
            purpose: "center_provider_action",
            payload: %{
              "status" => "results_ready",
              "provider" => job.provider,
              "search_geography" => job.search_geography,
              "option_count" => length((job.result || %{})["candidates"] || [])
            }
          })

        _ = maybe_paint_center_results(job)
        {:ok, job}

      _ ->
        {:ok, job}
    end
  end

  defp fail(job, error) when is_binary(error) do
    now = DateTime.utc_now(:microsecond)

    case Repo.get(ProviderActionJob, job.id) do
      %ProviderActionJob{status: status} when status in ["cancelled", "superseded"] ->
        {:ok, job}

      %ProviderActionJob{status: status} = fresh when status in ["queued", "running"] ->
        {:ok, job} =
          fresh
          |> ProviderActionJob.changeset(%{
            "status" => "failed",
            "error" => String.slice(error, 0, 500),
            "finished_at" => now
          })
          |> Repo.update()

        _ =
          Publisher.record(%{
            event_type: "action.provider_job.failed",
            event_id: "provider_job_failed:#{job.id}",
            aggregate_type: "provider_action_job",
            aggregate_id: job.id,
            partition_key: job.user_id,
            actor_user_id: job.user_id,
            privacy_class: "private_authorized",
            purpose: "center_provider_action",
            payload: %{"status" => "failed", "error" => job.error}
          })

        _ = maybe_paint_center_failure(job)
        {:ok, job}

      _ ->
        {:ok, job}
    end
  end

  defp maybe_paint_center_results(%ProviderActionJob{} = job) do
    alias OpalCore.OpalConversations
    alias OpalCore.OpalConversations.OpalMessage

    if stale_provider_paint?(job) do
      :ok
    else
      do_paint_center_results(job)
    end
  rescue
    _ -> :ok
  end

  defp do_paint_center_results(%ProviderActionJob{} = job) do
    alias OpalCore.OpalConversations
    alias OpalCore.OpalConversations.OpalMessage

    result = job.result || %{}
    cands = result["candidates"] || []
    geo = job.search_geography || "there"
    requested = job.request["requested_venue_name"]

    exact? =
      result["search_mode"] == "exact_entity" or job.request["search_mode"] == "exact_entity"

    body =
      cond do
        exact? and cands == [] ->
          name = requested || "that place"
          loc = job.request["requested_venue_locality"] || geo

          "I couldn't verify #{name} in #{loc} from available sources yet. " <>
            "Want to keep #{name} as the requested venue, or should I look for nearby alternatives?"

        exact? and length(cands) == 1 ->
          exact_resolve_copy(job, hd(cands), geo, result)

        cands == [] ->
          cuisine = job.request["cuisine"]

          if is_binary(cuisine) and cuisine != "" do
            "I checked #{geo} for #{cuisine} restaurants but couldn't verify enough matches yet. " <>
              "Want me to widen the search, or try a different cuisine?"
          else
            "I checked #{geo} but couldn't find named restaurant options I trust yet. Want me to retry?"
          end

        true ->
          cuisine = job.request["cuisine"]
          # Repair #12 (F12-11e): real haversine distances for device-anchored
          # searches — computed from the same origin the provider used.
          names = Enum.map_join(cands, ", ", &candidate_label(&1, job.request))

          lead =
            if is_binary(cuisine) and cuisine != "" do
              "I found #{length(cands)} #{cuisine} option#{if length(cands) == 1, do: "", else: "s"} in #{geo}"
            else
              "I found a few strong options in #{geo}"
            end

          "#{lead}: #{names}. Pick one and I'll attach it to the plan. " <>
            (result["attribution"] || "Powered by Geoapify")
      end

    case job.conversation_id && OpalConversations.get_or_create_conversation(job.user_id) do
      {:ok, conversation} ->
        meta = %{
          "source" => "provider_action",
          "action_job_id" => job.id,
          "action_state" => "results_ready",
          "options" => Enum.map(cands, &public_opt/1),
          "search_geography" => geo,
          "provider" => job.provider,
          "plan_id" => job.plan_id,
          "planning_snapshot" => job.planning_snapshot,
          "attribution" => (job.result || %{})["attribution"],
          # Repair #12 (F12-11f): origin indicator rides the message metadata
          # so every surface reads the same value (device/manual/named_destination).
          "origin_source" => job.request["origin_source"] || "manual"
        }

        %OpalMessage{}
        |> OpalMessage.changeset(%{
          "conversation_id" => conversation.id,
          "role" => "opal",
          "body" => body,
          "metadata" => meta
        })
        |> Repo.insert()

      _ ->
        :ok
    end
  rescue
    _ -> :ok
  end

  # Repair #12 (F12-03 / F12-13): the exact paint claimed "I'll use this as the
  # venue" but never wrote it — the address lived only in chat. On a single
  # exact-entity candidate the venue is attached to the plan FIRST (single
  # source of truth: plan.alignment["venue"] carries name+address+coords) and
  # the painted copy describes the performed write. Never clobbers an
  # explicit user selection with an automated resolve.
  defp exact_resolve_copy(job, candidate, geo, result) do
    name = candidate["name"] || job.request["requested_venue_name"] || "that place"
    addr = candidate["address"] || geo
    attribution = result["attribution"] || "Powered by Geoapify"
    venue_bit = "#{name} · #{addr}"
    planning = job.planning_snapshot || %{}

    case existing_venue_name(job.plan_id) do
      existing when is_binary(existing) and existing != "" ->
        if String.downcase(String.trim(existing)) == String.downcase(String.trim(name)) do
          "Found it — #{venue_bit}. That's already set as the venue. #{attribution}"
        else
          "Found it — #{venue_bit}. The plan already has #{existing} as the venue. " <>
            "Say the word if you want to switch. #{attribution}"
        end

      _ ->
        case attach_selected_venue(job.user_id, candidate, planning, paint: false) do
          {:ok, _} ->
            "Found it — #{venue_bit}. I've set it as the venue (not a reservation yet). #{attribution}"

          _ ->
            "Found it — #{venue_bit}. I couldn't attach it to the plan just now. " <>
              "Want me to retry? #{attribution}"
        end
    end
  end

  defp existing_venue_name(nil), do: nil

  defp existing_venue_name(plan_id) when is_binary(plan_id) do
    case Repo.get(SharedPlan, plan_id) do
      %SharedPlan{alignment: alignment} -> get_in(alignment || %{}, ["venue", "name"])
      _ -> nil
    end
  end

  defp existing_venue_name(_), do: nil

  # Repair #12 (F12-11e): candidate label with a real haversine distance when
  # the search was device-anchored. Non-device origins show the plain name —
  # never a fabricated distance.
  defp candidate_label(candidate, request) when is_map(candidate) and is_map(request) do
    name = candidate["name"] || "a spot"
    lat = request["origin_lat"]
    lon = request["origin_lon"]

    dist =
      if request["origin_source"] == "device" and is_number(lat) and is_number(lon) do
        OpalCore.Center.DeviceLocation.distance_label(
          lat,
          lon,
          candidate["lat"],
          candidate["lon"]
        )
      else
        nil
      end

    if is_binary(dist), do: "#{name} (#{dist})", else: name
  end

  defp candidate_label(candidate, _), do: (is_map(candidate) && candidate["name"]) || "a spot"

  defp maybe_paint_center_failure(%ProviderActionJob{} = job) do
    alias OpalCore.OpalConversations
    alias OpalCore.OpalConversations.OpalMessage

    if stale_provider_paint?(job) do
      :ok
    else
      geo = job.search_geography || "that area"
      requested = job.request["requested_venue_name"]
      origin_source = job.request["origin_source"]

      # Repair #12 (F12-03 residual 2): a hard provider failure must name the
      # venue that was attempted, not paint a generic "couldn't reach" line.
      body =
        if job.request["search_mode"] == "exact_entity" and is_binary(requested) and
             String.trim(requested) != "" do
          name = String.trim(requested)

          "I couldn't reach live data to verify #{name} in #{geo} just now. " <>
            "I've kept #{name} as the requested venue. Want me to retry?"
        else
          "I couldn't reach live restaurant data for #{geo}. Want me to retry?"
        end

      case OpalConversations.get_or_create_conversation(job.user_id) do
        {:ok, conversation} ->
          %OpalMessage{}
          |> OpalMessage.changeset(%{
            "conversation_id" => conversation.id,
            "role" => "opal",
            "body" => body,
            "metadata" => %{
              "source" => "provider_action",
              "action_job_id" => job.id,
              "action_state" => "failed",
              "planning_snapshot" => job.planning_snapshot,
              "plan_id" => job.plan_id,
              "origin_source" => origin_source,
              "search_geography" => geo
            }
          })
          |> Repo.insert()

        _ ->
          :ok
      end
    end
  rescue
    _ -> :ok
  end

  # Reject paints after cancel / New Chat so stale Geoapify responses cannot
  # monopolize a newer conversational turn. Jobs started AFTER clear still paint.
  defp stale_provider_paint?(%ProviderActionJob{} = job) do
    fresh = Repo.get(ProviderActionJob, job.id)
    planning = PlanningContext.get_for_user(job.user_id)

    cleared_after_job? =
      case planning["cleared_at"] do
        ts when is_binary(ts) ->
          case DateTime.from_iso8601(ts) do
            {:ok, cleared, _} when not is_nil(job.inserted_at) ->
              DateTime.compare(cleared, job.inserted_at) != :lt

            _ ->
              true
          end

        _ ->
          false
      end

    match?(%ProviderActionJob{status: status} when status in ["cancelled", "superseded"], fresh) or
      cleared_after_job?
  end

  defp stale_provider_paint?(_), do: true

  defp public_opt(c) when is_map(c) do
    Map.take(c, [
      "id",
      "name",
      "address",
      "lat",
      "lon",
      "categories",
      "cuisine",
      "search_geography",
      "provider",
      "rating_available",
      "reservation_support"
    ])
  end

  defp public_opt(_), do: %{}

  defp cuisine_to_categories(cuisine) when is_binary(cuisine) and cuisine != "" do
    slug =
      cuisine
      |> String.trim()
      |> String.downcase()
      |> String.replace(~r/[^a-z0-9]+/, "_")
      |> String.trim("_")

    if slug == "", do: nil, else: "catering.restaurant.#{slug}"
  end

  defp cuisine_to_categories(_), do: nil

  defp format_err({:http, status, _}), do: "http_#{status}"
  defp format_err({:provider, msg}) when is_binary(msg), do: msg
  defp format_err(atom) when is_atom(atom), do: Atom.to_string(atom)
  defp format_err(other), do: inspect(other)

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end

  defp stringify(_), do: %{}
end
