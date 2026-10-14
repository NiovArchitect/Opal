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
  alias OpalCore.Messages
  alias OpalCore.Accounts.User
  alias OpalCore.Relationships

  @doc """
  Enqueue a places search for an explicit destination. Returns {:ok, job}.
  """
  def start_places_search(attrs) when is_map(attrs) do
    user_id = attrs[:user_id] || attrs["user_id"]
    conversation_id = attrs[:conversation_id] || attrs["conversation_id"]
    destination = attrs[:destination] || attrs["destination"]
    planning = attrs[:planning_snapshot] || attrs["planning_snapshot"] || %{}
    plan_id = attrs[:plan_id] || attrs["plan_id"] || planning["plan_id"]

    with true <- is_binary(user_id),
         true <- is_binary(destination) and String.trim(destination) != "" do
      job_attrs = %{
        "user_id" => user_id,
        "conversation_id" => conversation_id,
        "plan_id" => plan_id,
        "kind" => "places_search",
        "status" => "queued",
        "search_geography" => String.trim(destination),
        "request" => %{
          "destination_text" => String.trim(destination),
          "categories" => attrs[:categories] || attrs["categories"] || "catering.restaurant",
          "limit" => attrs[:limit] || attrs["limit"] || 5,
          "radius_m" => attrs[:radius_m] || attrs["radius_m"] || 8_000,
          "quality_intent" => attrs[:quality_intent] || attrs["quality_intent"]
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

      {:ok,
       %{
         plan_id: plan_id,
         plan: updated,
         venue: name,
         graph_projection: true,
         chat_projection: chat_proj,
         center_projection: center_proj,
         planning: Map.merge(planning2, %{"plan_id" => plan_id, "venue" => name})
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

  defp maybe_project_peer_chat(user_id, planning, plan, venue_name) do
    who = planning["who"] || planning["primary_person"]
    name = format_who_label(who)

    peer_id =
      cond do
        is_binary(name) ->
          Relationships.contacts_with_types(user_id)
          |> Enum.find_value(fn c ->
            display = to_string(c[:display_name] || "")
            uid = c[:contact_user_id]

            if is_binary(uid) and String.contains?(String.downcase(display), String.downcase(name)) do
              uid
            else
              nil
            end
          end) || lookup_user_by_name(name)

        true ->
          nil
      end

    if is_binary(peer_id) and peer_id != user_id do
      case Messages.ensure_direct_conversation(user_id, peer_id) do
        {:ok, direct} ->
          cid = direct.conversation_id || direct[:conversation_id]
          dest = planning["destination"] || "there"
          when_s = planning["when"] || plan.time_label || "soon"

          body =
            "Planning note: #{venue_name} in #{dest} · #{when_s}. " <>
              "I'll keep this on our shared plan."

          _ =
            Messages.accept_message(%{
              conversation_id: cid,
              sender_user_id: user_id,
              client_message_id: "venue_attach:#{plan.id}:#{:erlang.phash2(venue_name)}",
              body: body
            })

          true

        _ ->
          false
      end
    else
      false
    end
  rescue
    _ -> false
  end

  defp lookup_user_by_name(name) when is_binary(name) and name != "" do
    like = "#{String.trim(name)}%"

    from(u in User,
      where: ilike(u.display_name, ^like) or ilike(u.handle, ^like),
      select: u.id,
      limit: 1
    )
    |> Repo.one()
  end

  defp lookup_user_by_name(_), do: nil

  defp paint_center_attach(user_id, plan, venue_name, dest) do
    alias OpalCore.OpalConversations
    alias OpalCore.OpalConversations.OpalMessage

    body =
      "Locked in #{venue_name} in #{dest}. It's on the same plan — I'll keep Graph and Chat aligned."

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

    case Gateway.search_places(%{
           "destination_text" => dest,
           "categories" => job.request["categories"] || "catering.restaurant",
           "limit" => job.request["limit"] || 5,
           "radius_m" => job.request["radius_m"] || 8_000
         }) do
      {:ok, result} ->
        # Prefer named restaurants; take up to 3 for OptionSet.
        cands =
          (result["candidates"] || [])
          |> Enum.filter(fn c -> is_binary(c["name"]) and c["name"] != "" end)
          |> Enum.take(3)

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

    cands = (job.result || %{})["candidates"] || []
    geo = job.search_geography || "there"

    body =
      if cands == [] do
        "I checked #{geo} but couldn't find named restaurant options I trust yet. Want me to retry?"
      else
        names = Enum.map_join(cands, ", ", & &1["name"])

        "I found a few strong options in #{geo}: #{names}. " <>
          "Pick one and I'll attach it to the plan. " <>
          ((job.result || %{})["attribution"] || "Powered by Geoapify")
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
