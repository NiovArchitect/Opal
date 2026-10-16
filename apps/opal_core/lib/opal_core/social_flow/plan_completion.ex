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

  Steps persist on `plan.alignment["completion"]` (durable, visible to every
  surface) and are returned as data. Conversational copy (the actual asks and
  offers) stays with the caller/orchestrator — this module never paints chat.
  """

  import Ecto.Query

  alias OpalCore.Center.ProviderAction
  alias OpalCore.Center.ProviderActionJob
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.OpalCalendar
  alias OpalCore.SocialFlow.SharedPlan

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
