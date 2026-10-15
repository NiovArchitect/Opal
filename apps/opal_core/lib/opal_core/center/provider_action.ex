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

    exact? = search_mode in ["exact_entity", "exact"] and is_binary(requested_venue) and
               String.trim(requested_venue) != ""

    dest_ok? =
      exact? or (is_binary(destination) and String.trim(destination) != "")

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

      job_attrs = %{
        "user_id" => user_id,
        "conversation_id" => conversation_id,
        "plan_id" => plan_id,
        "kind" => "places_search",
        "status" => "queued",
        "search_geography" => geography,
        "request" => %{
          "destination_text" => geography,
          "categories" => attrs[:categories] || attrs["categories"] || "catering.restaurant",
          "limit" => attrs[:limit] || attrs["limit"] || 5,
          "radius_m" => attrs[:radius_m] || attrs["radius_m"] || 8_000,
          "quality_intent" => attrs[:quality_intent] || attrs["quality_intent"],
          "search_mode" => if(exact?, do: "exact_entity", else: "discovery"),
          "requested_venue_name" => if(exact?, do: String.trim(requested_venue), else: nil),
          "requested_venue_locality" =>
            if(exact? and is_binary(requested_locality),
              do: String.trim(requested_locality),
              else: nil
            )
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
  Ensure a durable SharedPlan id exists for this planning draft.
  Reuses planning_context.plan_id when present (PLAN_ID_STABLE).
  """
  def ensure_plan(user_id, planning) when is_binary(user_id) and is_map(planning) do
    existing = planning["plan_id"]

    cond do
      is_binary(existing) and existing != "" and match?(%SharedPlan{}, Repo.get(SharedPlan, existing)) ->
        {:ok, existing, planning}

      true ->
        who = planning["who"] || planning["primary_person"]
        dest = planning["destination"] || "somewhere"
        when_s = planning["when"] || planning["when_resolved"] || "soon"
        who_label = format_who_label(who)
        title = String.trim("Dinner #{when_s}#{if who_label, do: " with #{who_label}", else: ""}")

        case SocialFlow.create_tentative_plan_from_center(user_id, %{
               "title" => title,
               "location" => dest,
               "place" => dest,
               "area" => dest,
               "time_label" => when_s
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
  """
  def attach_selected_venue(user_id, venue, planning)
      when is_binary(user_id) and is_map(venue) and is_map(planning) do
    name = venue["name"] || venue[:name]

    with true <- is_binary(name) and String.trim(name) != "",
         {:ok, plan_id, planning2} <- ensure_plan(user_id, planning),
         %SharedPlan{} = plan <- Repo.get(SharedPlan, plan_id) do
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

      {:ok, updated} =
        plan
        |> SharedPlan.changeset(%{
          "title" => "#{name} · #{planning2["when"] || plan.time_label || "soon"}",
          "location" => location,
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
      center_proj = paint_center_attach(user_id, updated, name, dest)

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

  def attach_selected_venue(_, _, _), do: {:error, :invalid}

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

    query =
      if mode == "exact_entity" and is_binary(requested) and String.trim(requested) != "" do
        %{
          "search_mode" => "exact_entity",
          "requested_venue_name" => String.trim(requested),
          "requested_venue_locality" => locality,
          "destination_text" => locality,
          "limit" => 1
        }
      else
        %{
          "destination_text" => dest,
          "categories" => job.request["categories"] || "catering.restaurant",
          "limit" => job.request["limit"] || 5,
          "radius_m" => job.request["radius_m"] || 8_000,
          "search_mode" => "discovery"
        }
      end

    case Gateway.search_places(query) do
      {:ok, result} ->
        cands =
          (result["candidates"] || [])
          |> Enum.filter(fn c -> is_binary(c["name"]) and c["name"] != "" end)
          |> then(fn list ->
            # Exact mode: never pad with unrelated alternatives.
            if result["search_mode"] == "exact_entity", do: Enum.take(list, 1), else: Enum.take(list, 3)
          end)

        finish_ready(job, Map.put(result, "candidates", cands))

      {:error, reason} ->
        fail(job, format_err(reason))
    end
  end

  defp finish_ready(job, result) do
    now = DateTime.utc_now(:microsecond)

    {:ok, job} =
      job
      |> ProviderActionJob.changeset(%{
        "status" => "results_ready",
        "result" => result,
        "provider" => result["provider"] || job.provider,
        "search_geography" => result["search_geography"] || job.search_geography,
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
  end

  defp fail(job, error) when is_binary(error) do
    now = DateTime.utc_now(:microsecond)

    {:ok, job} =
      job
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
  end

  defp maybe_paint_center_results(%ProviderActionJob{} = job) do
    alias OpalCore.OpalConversations
    alias OpalCore.OpalConversations.OpalMessage

    result = job.result || %{}
    cands = result["candidates"] || []
    geo = job.search_geography || "there"
    requested = job.request["requested_venue_name"]
    exact? = result["search_mode"] == "exact_entity" or job.request["search_mode"] == "exact_entity"

    body =
      cond do
        exact? and cands == [] ->
          name = requested || "that place"
          loc = job.request["requested_venue_locality"] || geo

          "I couldn't verify #{name} in #{loc} from available sources yet. " <>
            "Want to keep #{name} as the requested venue, or should I look for nearby alternatives?"

        exact? and length(cands) == 1 ->
          c = hd(cands)
          addr = c["address"] || geo

          "Found it — #{c["name"]}#{if addr, do: " · #{addr}", else: ""}. " <>
            "I'll use this as the venue (not a reservation yet). " <>
            (result["attribution"] || "Powered by Geoapify")

        cands == [] ->
          "I checked #{geo} but couldn't find named restaurant options I trust yet. Want me to retry?"

        true ->
          names = Enum.map_join(cands, ", ", & &1["name"])

          "I found a few strong options in #{geo}: #{names}. " <>
            "Pick one and I'll attach it to the plan. " <>
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
          "attribution" => (job.result || %{})["attribution"]
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

  defp maybe_paint_center_failure(%ProviderActionJob{} = job) do
    alias OpalCore.OpalConversations
    alias OpalCore.OpalConversations.OpalMessage

    geo = job.search_geography || "that area"
    body = "I couldn't reach live restaurant data for #{geo}. Want me to retry?"

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
            "plan_id" => job.plan_id
          }
        })
        |> Repo.insert()

      _ ->
        :ok
    end
  rescue
    _ -> :ok
  end

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
