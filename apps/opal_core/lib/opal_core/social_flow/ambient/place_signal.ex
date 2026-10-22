defmodule OpalCore.SocialFlow.Ambient.PlaceSignal do
  @moduledoc """
  Repair #23 (WS-23-5) - PLACE SIGNAL, FELT: the first read path
  for the ambient Heat engine, tier-only.

  The home feed itself names places (a moment's place_label, a
  plan's location, a live room's place). This module answers, for
  a list of place names the viewer's own client already holds,
  how warm each place is FOR THIS VIEWER - computed server-side
  from Heat.compute's contextual_trending inputs, gathered ONLY
  from facts this viewer is already permitted to know:

    - plans the viewer created or participates in (the same
      gate SocialFlow.list_plans_for_user applies), excluding
      private and virtual plans (the R22 place builder's input
      law, mirrored server-side);
    - moments visible to the viewer (SocialMomentPublishing
      .list_for_viewer - visibility-gated by its own rules);
    - live rooms visible to the viewer (Lives
      .list_visible_lives - friend-visibility gated).

  SERIALIZATION LAW: only a qualitative tier crosses the wire -
  "quiet" | "stirring" | "warm" | "alive". Raw Heat floats are
  computed here and die here; no key in the payload carries a
  number derived from heat. heat_map_ui stays false (there is
  no map) and the Heat module's "private" posture is preserved:
  a place that is hot in another account's graph reads "quiet"
  for a viewer with no permitted facts about it, because that
  viewer's fact set for the place is empty by construction.

  Friends/proximity weighting: the tier's inputs are the
  viewer's own graph - distinct other people at the place
  (moment authors, live hosts, plan participants) feed Heat's
  friends_nearby_count, the viewer's own plans at the place
  feed overlapping windows and group coordination, and their
  moments there feed shared interest. No global count is ever
  read: world heat's local_activity input is scaled from the
  viewer's OWN visible activity at the place, never from
  world-wide demand.

  NEARBY (coarse, sharing-backbone only): a place reads nearby
  for this viewer when another participant of one of the
  viewer's own plans at that place holds a FRESH (unexpired)
  PlanLocationShare for that plan whose shared position is
  within @near_place_km of the plan's own place coordinates.
  The same derivation, per person, backs nearby_people/1 for
  the story rail's "nearby" stone state. Nothing finer ever
  leaves this module: no distances, no addresses, no
  coordinates, no live tracking - near / not-near only. A pair
  that has not shared location produces no nearby signal,
  ever: no fresh share row, no signal.
  """

  import Ecto.Query

  alias OpalCore.Center.DeviceLocation
  alias OpalCore.Lives
  alias OpalCore.Repo

  alias OpalCore.SocialFlow.{
    Ambient.Heat,
    PlanLocationShare,
    PlanParticipant,
    SharedPlan,
    SocialMomentPublishing
  }

  @tiers ~w(quiet stirring warm alive)
  @near_place_km 1.0
  @live_window_seconds 180 * 60
  @active_statuses ~w(tentative agreed changed)
  @max_places 40

  def tiers, do: @tiers

  @doc """
  Tier + nearby for each requested place name, for this viewer.
  Returns a list in request order (duplicates and blank names
  dropped, capped at #{@max_places}):

      [%{"place" => name, "tier" => tier, "nearby" => boolean}]

  `name` echoes the caller's own string (trimmed) - the server
  never invents a place name the viewer did not already hold.
  """
  def signals_for(viewer_id, place_names, opts \\ [])

  def signals_for(viewer_id, place_names, opts)
      when is_binary(viewer_id) and is_list(place_names) do
    now = Keyword.get(opts, :now, DateTime.utc_now())
    facts = viewer_facts(viewer_id, now)

    place_names
    |> Enum.map(fn
      name when is_binary(name) -> String.trim(name)
      _ -> ""
    end)
    |> Enum.reject(&(&1 == ""))
    |> Enum.uniq_by(&normalize/1)
    |> Enum.take(@max_places)
    |> Enum.map(fn name ->
      place_facts = Map.get(facts, normalize(name), empty_facts())

      %{
        "place" => name,
        "tier" => tier_for(place_facts),
        "nearby" => place_facts.nearby
      }
    end)
  end

  def signals_for(_, _, _), do: []

  @doc """
  The set of other user ids who read "nearby" for this viewer:
  participants of the viewer's own plans who hold a fresh
  per-plan location share placing them within #{@near_place_km}
  km of that plan's place. Coarse by construction - the caller
  learns only membership in the set, never a position.
  """
  def nearby_people(viewer_id, opts \\ [])

  def nearby_people(viewer_id, opts) when is_binary(viewer_id) do
    now = Keyword.get(opts, :now, DateTime.utc_now())
    facts = viewer_facts(viewer_id, now)

    facts
    |> Map.values()
    |> Enum.flat_map(& &1.nearby_people)
    |> MapSet.new()
  end

  def nearby_people(_, _), do: MapSet.new()

  # ----------------------------------------------------------------
  # Fact gathering - viewer-permitted reads only
  # ----------------------------------------------------------------

  defp empty_facts do
    %{
      people: MapSet.new(),
      lives: 0,
      moments: 0,
      happening_plans: 0,
      coming_plans: 0,
      memory_plans: 0,
      group_coordinating: false,
      nearby: false,
      nearby_people: []
    }
  end

  defp viewer_facts(viewer_id, now) do
    plans = viewer_plans(viewer_id)
    participants_by_plan = participants_for(plans)

    acc = %{}

    acc =
      Enum.reduce(plans, acc, fn plan, acc ->
        case place_key(plan.location, plan) do
          nil ->
            acc

          key ->
            people =
              participants_by_plan
              |> Map.get(plan.id, [])
              |> Enum.reject(&(&1 == viewer_id))

            family = plan_family(plan, now)

            add = %{
              people: MapSet.new(people),
              coming_plans: if(family == :coming, do: 1, else: 0),
              happening_plans: if(family == :happening, do: 1, else: 0),
              memory_plans: if(family == :past, do: 1, else: 0),
              group_coordinating:
                length(Map.get(participants_by_plan, plan.id, [])) >= 3
            }

            merge_fact(acc, key, add)
        end
      end)

    acc =
      Enum.reduce(visible_moments(viewer_id), acc, fn moment, acc ->
        case moment_place(moment) do
          nil ->
            acc

          name ->
            author = moment["author_user_id"]

            add = %{
              people: if(author && author != viewer_id, do: MapSet.new([author]), else: MapSet.new()),
              moments: 1
            }

            merge_fact(acc, normalize(name), add)
        end
      end)

    acc =
      Enum.reduce(visible_lives(viewer_id), acc, fn room, acc ->
        case room["place_label"] do
          name when is_binary(name) and name != "" ->
            host = room["host_account_id"]

            add = %{
              people: if(host && host != viewer_id, do: MapSet.new([host]), else: MapSet.new()),
              lives: 1
            }

            merge_fact(acc, normalize(name), add)

          _ ->
            acc
        end
      end)

    # Nearby - the sharing backbone, read per plan at the place.
    Enum.reduce(plans, acc, fn plan, acc ->
      case place_key(plan.location, plan) do
        nil ->
          acc

        key ->
          near_people = nearby_people_for_plan(plan, viewer_id, now)

          if near_people == [] do
            acc
          else
            merge_fact(acc, key, %{nearby: true, nearby_people: near_people})
          end
      end
    end)
  end

  defp merge_fact(acc, key, add) do
    base = Map.get(acc, key, empty_facts())

    merged = %{
      people: MapSet.union(base.people, Map.get(add, :people, MapSet.new())),
      lives: base.lives + Map.get(add, :lives, 0),
      moments: base.moments + Map.get(add, :moments, 0),
      happening_plans: base.happening_plans + Map.get(add, :happening_plans, 0),
      coming_plans: base.coming_plans + Map.get(add, :coming_plans, 0),
      memory_plans: base.memory_plans + Map.get(add, :memory_plans, 0),
      group_coordinating: base.group_coordinating or Map.get(add, :group_coordinating, false),
      nearby: base.nearby or Map.get(add, :nearby, false),
      nearby_people: base.nearby_people ++ Map.get(add, :nearby_people, [])
    }

    Map.put(acc, key, merged)
  end

  # The viewer's own plans, under the plans-list gate (creator or
  # participant), with the R22 builder's exclusions mirrored:
  # private plans and virtual plans never feed a place signal,
  # and cancelled / expired plans are not facts about a place.
  defp viewer_plans(viewer_id) do
    participant_plan_ids =
      from(pp in PlanParticipant, where: pp.user_id == ^viewer_id, select: pp.plan_id)
      |> Repo.all()

    from(p in SharedPlan,
      where:
        (p.created_by_user_id == ^viewer_id or p.id in ^participant_plan_ids) and
          p.is_private != true and p.plan_type != "virtual" and
          p.status not in ["cancelled", "expired"] and
          not is_nil(p.location) and p.location != ""
    )
    |> Repo.all()
  end

  defp participants_for([]), do: %{}

  defp participants_for(plans) do
    ids = Enum.map(plans, & &1.id)

    from(pp in PlanParticipant, where: pp.plan_id in ^ids, select: {pp.plan_id, pp.user_id})
    |> Repo.all()
    |> Enum.group_by(fn {plan_id, _} -> plan_id end, fn {_, user_id} -> user_id end)
  end

  defp visible_moments(viewer_id) do
    SocialMomentPublishing.list_for_viewer(viewer_id, limit: 100)
  rescue
    _ -> []
  end

  defp visible_lives(viewer_id) do
    viewer_id
    |> Lives.list_visible_lives()
    |> Enum.map(fn
      %{"live_room" => room} when is_map(room) -> room
      room when is_map(room) -> room
      _ -> %{}
    end)
  rescue
    _ -> []
  end

  defp moment_place(moment) do
    case moment["place_ref"] do
      %{"display_name" => name} when is_binary(name) and name != "" -> name
      %{"name" => name} when is_binary(name) and name != "" -> name
      _ -> nil
    end
  end

  # A plan contributes to a place only when it carries a location
  # string; the key is the R22 builder's normalization (trim,
  # collapse whitespace, downcase) so server and client group
  # the same records to the same place.
  defp place_key(location, _plan) when is_binary(location) do
    case normalize(location) do
      "" -> nil
      key -> key
    end
  end

  defp place_key(_, _), do: nil

  defp normalize(name) when is_binary(name) do
    name |> String.trim() |> String.replace(~r/\s+/, " ") |> String.downcase()
  end

  defp normalize(_), do: ""

  # The plan's temporal family for signal purposes, mirroring
  # the R22 builder's placePlanFamily legs that matter here:
  # completed is memory; an active plan inside its live window
  # is happening; any other active plan is coming.
  defp plan_family(%SharedPlan{status: "completed"}, _now), do: :past

  defp plan_family(%SharedPlan{status: status, start_at: start_at, end_at: end_at}, now)
       when status in @active_statuses do
    cond do
      is_nil(start_at) ->
        :coming

      DateTime.compare(start_at, now) == :gt ->
        :coming

      not is_nil(end_at) ->
        if DateTime.compare(end_at, now) == :lt, do: :coming, else: :happening

      true ->
        if DateTime.diff(now, start_at, :second) <= @live_window_seconds,
          do: :happening,
          else: :coming
    end
  end

  defp plan_family(_, _), do: :coming

  # Fresh shares by OTHER participants of this plan, near the
  # plan's own place. No place coordinates on the plan means no
  # distance can be truthfully measured, so no signal - the
  # backbone's own honesty rule (PlanHistory renders the same
  # absence as "distance unavailable").
  defp nearby_people_for_plan(%SharedPlan{id: plan_id, place_lat: lat, place_lon: lon}, viewer_id, now)
       when is_binary(plan_id) and is_number(lat) and is_number(lon) do
    shares =
      from(s in PlanLocationShare,
        where: s.plan_id == ^plan_id and s.expires_at > ^now and s.user_id != ^viewer_id,
        select: {s.user_id, s.lat, s.lon}
      )
      |> Repo.all()

    shares
    |> Enum.filter(fn {_user_id, slat, slon} ->
      case DeviceLocation.haversine_km(slat, slon, lat, lon) do
        km when is_number(km) -> km <= @near_place_km
        _ -> false
      end
    end)
    |> Enum.map(fn {user_id, _, _} -> user_id end)
    |> Enum.uniq()
  end

  defp nearby_people_for_plan(_, _, _), do: []

  # ----------------------------------------------------------------
  # Tier derivation - Heat.compute, tier-only out
  # ----------------------------------------------------------------

  defp tier_for(facts) do
    people_count = MapSet.size(facts.people)
    activity = facts.lives * 2 + facts.happening_plans + facts.moments

    inputs = %{
      # World: only the viewer's own visible activity at the
      # place - never a global demand figure.
      "local_activity" => min(activity / 4.0, 1.0),
      "event_happening" => facts.lives > 0 or facts.happening_plans > 0,
      "venues_open" => true,
      # Network: my people at the place weigh first (Heat clamps
      # friends_nearby_count at 4), then coordination facts from
      # the viewer's own plans there.
      "friends_nearby_count" => people_count,
      "overlapping_windows" => facts.coming_plans > 0 or facts.happening_plans > 0,
      "group_coordinating" => facts.group_coordinating,
      "shared_interest" => facts.moments > 0,
      # Relationship: a place the viewer's graph has lived at
      # fits a little warmer than a place it has only scheduled.
      "preference_fit" => if(facts.moments > 0 or facts.memory_plans > 0, do: 0.6, else: 0.5),
      "relationship_context" => if(people_count > 0, do: "friends", else: nil)
    }

    {:ok, heat} = Heat.compute(inputs)

    score = heat["contextual_trending"]

    cond do
      score >= 0.60 -> "alive"
      score >= 0.48 -> "warm"
      score >= 0.36 -> "stirring"
      true -> "quiet"
    end
  end
end
