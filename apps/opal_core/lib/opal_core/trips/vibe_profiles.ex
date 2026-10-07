defmodule OpalCore.Trips.VibeProfiles do
  @moduledoc """
  Learn and read vibe profiles for experience curation.

  Learning path: activity RSVP (`in` / `interested`) + activity vibe_tags +
  block slot → update energy windows / interests / sleep bias.
  Never invents tags that were not observed.
  """

  import Ecto.Query

  alias OpalCore.Repo
  alias OpalCore.Taste
  alias OpalCore.Trips.TripActivity
  alias OpalCore.Trips.TripTimeBlock
  alias OpalCore.Trips.VibeProfile

  @doc "Load profile or nil. Non-UUID ids (test fixtures) return :not_found."
  def get(user_id) when is_binary(user_id) do
    if uuid?(user_id) do
      case Repo.get_by(VibeProfile, user_id: user_id) do
        %VibeProfile{} = p -> {:ok, p}
        nil -> {:error, :not_found}
      end
    else
      {:error, :not_found}
    end
  rescue
    Ecto.Query.CastError -> {:error, :not_found}
  end

  def get(_), do: {:error, :not_found}

  defp uuid?(id) when is_binary(id) do
    match?(
      {:ok, _},
      Ecto.UUID.cast(id)
    )
  end

  @doc "Get or create an empty flexible profile."
  def ensure(user_id) when is_binary(user_id) do
    case get(user_id) do
      {:ok, p} ->
        {:ok, p}

      {:error, :not_found} ->
        %VibeProfile{}
        |> VibeProfile.changeset(%{user_id: user_id, sleep_bias: "flexible"})
        |> Repo.insert()
    end
  end

  def ensure(_), do: {:error, :not_found}

  @doc "Profiles for many users (missing → soft empty contract)."
  def list_for_users(user_ids) when is_list(user_ids) do
    ids = user_ids |> Enum.filter(&(is_binary(&1) and uuid?(&1))) |> Enum.uniq()

    found =
      from(p in VibeProfile, where: p.user_id in ^ids)
      |> Repo.all()
      |> Map.new(&{&1.user_id, &1})

    Enum.map(ids, fn id ->
      case Map.get(found, id) do
        %VibeProfile{} = p -> VibeProfile.to_contract(p)
        nil -> empty_contract(id)
      end
    end)
  end

  def list_for_users(_), do: []

  @doc """
  Learn from a canvas activity response.

  Only `in` and `interested` teach. `passed` does not add interest tags.
  """
  def learn_from_activity_response(activity_id, user_id, state)
      when is_binary(activity_id) and is_binary(user_id) and is_binary(state) do
    if state not in ["in", "interested"] do
      get(user_id)
    else
      with %TripActivity{} = activity <- Repo.get(TripActivity, activity_id),
           %TripTimeBlock{} = block <- Repo.get(TripTimeBlock, activity.trip_time_block_id),
           {:ok, profile} <- ensure(user_id) do
        tags = normalize_tags(activity.vibe_tags || [])
        window = slot_to_window(block.slot, block.time_label)
        sleep = infer_sleep(profile.sleep_bias, window, state)
        now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

        evidence =
          [
            %{
              "source" => "trip_activity",
              "activity_id" => activity_id,
              "venue_name" => activity.venue_name,
              "tags" => tags,
              "window" => window,
              "state" => state,
              "at" => DateTime.to_iso8601(now)
            }
            | Enum.take(profile.evidence || [], 49)
          ]

        profile
        |> VibeProfile.changeset(%{
          interest_tags: merge_tags(profile.interest_tags, tags),
          energy_windows: merge_tags(profile.energy_windows, List.wrap(window)),
          sleep_bias: sleep,
          evidence: evidence,
          last_learned_at: now
        })
        |> Repo.update()
      else
        nil -> {:error, :not_found}
        {:error, _} = e -> e
      end
    end
  end

  def learn_from_activity_response(_, _, _), do: {:error, :not_found}

  @doc """
  Enrich a vibe profile with durable Taste memory vibes/cuisines when present.
  Read-only merge for curation — does not write Taste rows.
  """
  def enriched_contract(user_id) when is_binary(user_id) do
    base =
      case get(user_id) do
        {:ok, p} -> VibeProfile.to_contract(p)
        _ -> empty_contract(user_id)
      end

    case Taste.profile_for(user_id) do
      %{vibes: vibes, cuisines: cuisines} ->
        Map.merge(base, %{
          "interest_tags" => merge_tags(base["interest_tags"], vibes ++ cuisines),
          "taste_vibes" => vibes,
          "taste_cuisines" => cuisines
        })

      _ ->
        base
    end
  end

  def enriched_contract(_), do: empty_contract(nil)

  defp empty_contract(user_id) do
    %{
      "user_id" => user_id,
      "sleep_bias" => "flexible",
      "energy_windows" => [],
      "interest_tags" => [],
      "evidence_count" => 0,
      "last_learned_at" => nil
    }
  end

  defp normalize_tags(tags) do
    tags
    |> List.wrap()
    |> Enum.map(&to_string/1)
    |> Enum.map(&String.trim/1)
    |> Enum.map(&String.downcase/1)
    |> Enum.reject(&(&1 == ""))
    |> Enum.uniq()
  end

  defp merge_tags(existing, incoming) do
    (List.wrap(existing) ++ normalize_tags(incoming))
    |> Enum.uniq()
    |> Enum.take(24)
  end

  defp slot_to_window(slot, time_label) do
    label = String.downcase(to_string(time_label || ""))

    cond do
      String.contains?(label, "golden") -> "golden_hour"
      slot in ["morning", "afternoon", "evening", "night"] -> slot
      String.contains?(label, "morning") -> "morning"
      String.contains?(label, "afternoon") -> "afternoon"
      String.contains?(label, "evening") or String.contains?(label, "7:") -> "evening"
      true -> "custom"
    end
  end

  defp infer_sleep(current, window, "in") when window in ["morning", "early_morning"] do
    if current == "late", do: "flexible", else: "early"
  end

  defp infer_sleep(current, window, "in") when window in ["night", "evening"] do
    if current == "early", do: "flexible", else: current
  end

  defp infer_sleep(current, _, _), do: current || "flexible"
end
