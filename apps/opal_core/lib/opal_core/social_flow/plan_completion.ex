defmodule OpalCore.SocialFlow.PlanCompletion do
  @moduledoc """
  Repair #12 (F12-05) — drive a plan to completion after create/update.

  The pipeline runs off the authoritative plan row (gyroscope: no shadow
  state, no per-surface completion flags):

  (a) restaurants — when the plan has a destination/area but no venue yet,
      kick off the existing Geoapify discovery path
      (Center.ProviderAction.start_places_search/1). Never invents venues; a
      queued provider job is honest work, not a fake result. Deduped: one
      live search per plan.
  (b) ride — record "ride" as a completion next-step so the turn can ask about
      arranging a ride. No ride-booking code path exists; the ask is the
      honest step, and it is surfaced as a suggestion, never a claim.
  (c) directions — once a venue is set, record "directions" as a next-step
      offer with the venue name + address when known.
  (d) calendar — project to the native Opal calendar (idempotent per plan
      version), so Center creates/corrections land on the calendar like every
      other plan path.

  Repair #15 (Track H) — preparation that used to wait for a screen visit:
  (e) follow-through — register a durable TemporalFollowThrough
      "plan_approach" loop for a future plan with a canonical start. The
      loop machinery (tick worker, AttentionAuthority gating, Attention
      Center merge) already existed but had NO producer: loops were only
      ever created in tests, so real plans never matured into the
      Attention Center. Registration creates no notification and no
      outbound contact; AttentionAuthority still decides what, if
      anything, surfaces, and when.
  (f) coming-up projection — upsert a ProductShell coming-up item per
      participant, so the plan the user already made is waiting on their
      Home / Plans surfaces instead of only inside the conversation or
      Center screen they created it in. The shell writers likewise had
      no production producer; home_snapshot read rows nothing wrote.

  Steps persist on `plan.alignment["completion"]` (durable, visible to every
  surface) and are returned as data. Conversational copy (the actual asks and
  offers) stays with the caller/orchestrator — this module never paints chat.
  """

  import Ecto.Query

  alias OpalCore.Center.ProviderAction
  alias OpalCore.Center.ProviderActionJob
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.OpalCalendar
  alias OpalCore.SocialFlow.PlanParticipant
  alias OpalCore.SocialFlow.PlanStateArbitration
  alias OpalCore.SocialFlow.ProductShell
  alias OpalCore.SocialFlow.SharedPlan
  alias OpalCore.SocialFlow.TemporalFollowThrough

  @search_active_statuses ~w(queued running results_ready)

  @doc """
  Drive completion for a plan. Idempotent: re-running with no changes yields
  the same steps (no duplicate searches, calendar projection is per-version).

  Returns `{:ok, %{plan_id: id, steps: steps}}` or `{:error, reason}`.
  """
  def drive(plan_id, actor_id, opts \\ [])
      when is_binary(plan_id) and is_binary(actor_id) and is_list(opts) do
    case Repo.get(SharedPlan, plan_id) do
      nil ->
        {:error, :not_found}

      %SharedPlan{status: "cancelled"} ->
        {:ok, %{plan_id: plan_id, steps: []}}

      %SharedPlan{} = plan ->
        steps =
          []
          |> drive_calendar(plan)
          |> drive_restaurants(plan, actor_id)
          |> drive_ride_and_directions(plan)
          |> drive_follow_through(plan, actor_id)
          |> drive_coming_up(plan)

        persist_completion(plan, steps)
        {:ok, %{plan_id: plan.id, steps: steps}}
    end
  end

  def drive(_, _, _), do: {:error, :invalid}

  # (d) — native Opal calendar projection. Idempotent per plan version.
  defp drive_calendar(steps, %SharedPlan{} = plan) do
    case OpalCalendar.project_from_shared_plan(plan) do
      {:ok, _} -> steps ++ [%{"id" => "calendar", "status" => "projected"}]
      {:error, reason} -> steps ++ [%{"id" => "calendar", "status" => "failed", "reason" => inspect(reason)}]
    end
  end

  # (a) — restaurant discovery via the existing Geoapify path, only when the
  # plan names a geography but no venue yet, and no live search exists.
  # Skipped when the plan came from a venue choice ("Go with this" /
  # option_selected / decision_id): the venue decision is made, discovery
  # would be a redundant second search.
  defp drive_restaurants(steps, %SharedPlan{} = plan, actor_id) do
    alignment = plan.alignment || %{}
    venue_name = get_in(alignment, ["venue", "name"])
    venue_chosen? =
      (is_binary(venue_name) and String.trim(venue_name) != "") or
        alignment["option_selected"] == true or is_binary(alignment["decision_id"])

    cond do
      venue_chosen? ->
        steps

      search_live?(plan.id) ->
        steps ++ [%{"id" => "restaurants", "status" => "search_already_running"}]

      true ->
        geo = alignment["area"] || alignment["destination"] || plan.location

        if is_binary(geo) and String.trim(geo) != "" do
          case ProviderAction.start_places_search(%{
                 user_id: actor_id,
                 plan_id: plan.id,
                 destination: String.trim(geo),
                 planning_snapshot: %{"plan_id" => plan.id},
                 search_mode: "discovery"
               }) do
            {:ok, job} ->
              steps ++
                [%{"id" => "restaurants", "status" => "search_started", "job_id" => job.id}]

            {:error, reason} ->
              steps ++
                [%{"id" => "restaurants", "status" => "failed", "reason" => inspect(reason)}]
          end
        else
          steps ++ [%{"id" => "restaurants", "status" => "skipped_no_destination"}]
        end
    end
  end

  defp search_live?(plan_id) do
    from(j in ProviderActionJob,
      where: j.plan_id == ^plan_id and j.kind == "places_search" and j.status in @search_active_statuses,
      select: 1,
      limit: 1
    )
    |> Repo.exists?()
  end

  # (b)(c) — ride ask + directions offer as durable next-steps. Suggestions,
  # never claims; the orchestrator turns them into copy.
  defp drive_ride_and_directions(steps, %SharedPlan{} = plan) do
    alignment = plan.alignment || %{}
    venue = alignment["venue"] || %{}
    venue_name = venue["name"]
    address = venue["address"]

    steps =
      if plan_type(plan) == "virtual" do
        steps
      else
        steps ++
          [
            %{
              "id" => "ride",
              "status" => "suggested",
              "copy" => "Want me to arrange a ride?"
            }
          ]
      end

    if is_binary(venue_name) and String.trim(venue_name) != "" do
      where = if is_binary(address) and address != "", do: "#{venue_name} · #{address}", else: venue_name

      steps ++
        [
          %{
            "id" => "directions",
            "status" => "suggested",
            "copy" => "Want directions to #{where}?"
          }
        ]
    else
      steps
    end
  end

  # (e) — Repair #15 (Track H): the missing TemporalFollowThrough producer.
  # Only a future plan with a canonical start earns a loop: past plans get
  # no future attention (PAST_PLAN_FUTURE_ATTENTION = 0), and a plan with
  # no derivable start is skipped honestly rather than guessed. The loop
  # is idempotent per plan + version + start, so a reschedule (which also
  # invalidates the prior version's loops via ConversationAlignment)
  # registers a fresh loop and never duplicates.
  defp drive_follow_through(steps, %SharedPlan{} = plan, actor_id) do
    start = canonical_start(plan)

    cond do
      not match?(%DateTime{}, start) ->
        steps ++ [%{"id" => "follow_through", "status" => "skipped_no_start"}]

      DateTime.compare(start, DateTime.utc_now()) != :gt ->
        steps ++ [%{"id" => "follow_through", "status" => "skipped_past"}]

      true ->
        alignment = plan.alignment || %{}
        version = to_string(alignment["plan_version"] || 0)

        case TemporalFollowThrough.register(%{
               "kind" => "plan_approach",
               "source_id" => plan.id,
               "conversation_id" => plan.conversation_id,
               "plan_id" => plan.id,
               "plan_version" => version,
               "owner_user_id" => actor_id,
               "responsibility_user_id" => plan.created_by_user_id || actor_id,
               "participant_ids" => participant_ids(plan, actor_id),
               "timezone" => plan.timezone || "America/Los_Angeles",
               "plan_start_at" => start,
               "metadata" => %{
                 "plan_status" => plan.status,
                 "title" => plan.title,
                 "place_unresolved" => not venue_named?(plan)
               },
               "idempotency_key" =>
                 "plan-approach:#{plan.id}:#{version}:#{DateTime.to_unix(start)}"
             }) do
          {:ok, _loop, :created} ->
            steps ++ [%{"id" => "follow_through", "status" => "registered"}]

          {:ok, _loop, :idempotent} ->
            steps ++ [%{"id" => "follow_through", "status" => "already_registered"}]

          {:error, reason} ->
            steps ++ [%{"id" => "follow_through", "status" => "failed", "reason" => inspect(reason)}]
        end
    end
  end

  # (f) — Repair #15 (Track H): project the plan onto each participant's
  # Coming Up surface (ProductShell), keyed per owner + plan so re-driving
  # updates the same row's labels instead of duplicating. Only participants
  # receive the projection — the plan's own people, nobody else.
  defp drive_coming_up(steps, %SharedPlan{} = plan) do
    start = canonical_start(plan)

    if match?(%DateTime{}, start) and DateTime.compare(start, DateTime.utc_now()) == :lt do
      # A past plan is history, not "coming up" — never project it forward.
      steps ++ [%{"id" => "coming_up", "status" => "skipped_past"}]
    else
      do_drive_coming_up(steps, plan)
    end
  end

  defp do_drive_coming_up(steps, %SharedPlan{} = plan) do
    owners = participant_ids(plan, plan.created_by_user_id)
    state = coming_up_state(plan)

    results =
      Enum.map(owners, fn owner ->
        ProductShell.upsert_coming_up(%{
          owner_user_id: owner,
          plan_id: plan.id,
          conversation_id: plan.conversation_id,
          title: plan.title || "Plan",
          when_label: plan.time_label,
          where_label: venue_label(plan),
          state: state,
          idempotency_key: "cu-#{owner}-plan-#{plan.id}"
        })
      end)

    if Enum.all?(results, &match?({:ok, _, _}, &1)) do
      steps ++ [%{"id" => "coming_up", "status" => "projected", "owners" => length(owners)}]
    else
      steps ++ [%{"id" => "coming_up", "status" => "failed"}]
    end
  rescue
    _ -> steps ++ [%{"id" => "coming_up", "status" => "failed"}]
  end

  defp coming_up_state(%SharedPlan{} = plan) do
    start = canonical_start(plan)

    cond do
      plan.status == "tentative" -> "needs_confirmation"
      match?(%DateTime{}, start) and same_local_day?(start, plan.timezone) -> "today"
      true -> "upcoming"
    end
  end

  defp same_local_day?(%DateTime{} = start, tz) do
    tz = if is_binary(tz) and tz != "", do: tz, else: "America/Los_Angeles"

    case {DateTime.shift_zone(start, tz), DateTime.shift_zone(DateTime.utc_now(), tz)} do
      {{:ok, local_start}, {:ok, local_now}} -> DateTime.to_date(local_start) == DateTime.to_date(local_now)
      _ -> false
    end
  end

  defp canonical_start(%SharedPlan{} = plan) do
    alignment = plan.alignment || %{}

    attrs =
      alignment
      |> Map.put("start_at", plan.start_at && DateTime.to_iso8601(plan.start_at))
      |> Map.put_new("timezone", plan.timezone)

    PlanStateArbitration.canonical_start(attrs)
  end

  defp participant_ids(%SharedPlan{} = plan, fallback) do
    ids =
      from(p in PlanParticipant, where: p.plan_id == ^plan.id, select: p.user_id)
      |> Repo.all()
      |> Enum.filter(&is_binary/1)

    ids = if plan.created_by_user_id, do: Enum.uniq([plan.created_by_user_id] ++ ids), else: ids
    ids = if ids == [] and is_binary(fallback), do: [fallback], else: ids
    Enum.uniq(ids)
  end

  defp venue_named?(%SharedPlan{} = plan) do
    alignment = plan.alignment || %{}
    name = get_in(alignment, ["venue", "name"]) || get_in(alignment, ["place", "value"])
    is_binary(name) and String.trim(name) != ""
  end

  defp venue_label(%SharedPlan{} = plan) do
    alignment = plan.alignment || %{}
    venue = alignment["venue"] || %{}

    cond do
      is_binary(venue["name"]) and venue["name"] != "" -> venue["name"]
      is_binary(get_in(alignment, ["place", "value"])) -> get_in(alignment, ["place", "value"])
      is_binary(plan.location) and plan.location != "" -> plan.location
      true -> nil
    end
  end

  defp plan_type(%SharedPlan{plan_type: t}) when is_binary(t), do: t
  defp plan_type(%SharedPlan{}), do: "in_person"

  defp persist_completion(%SharedPlan{} = plan, steps) do
    alignment =
      Map.put(plan.alignment || %{}, "completion", %{
        "steps" => steps,
        "driven_at" => DateTime.utc_now() |> DateTime.truncate(:second) |> DateTime.to_iso8601()
      })

    plan
    |> SharedPlan.changeset(%{alignment: alignment})
    |> Repo.update()
  end
end
