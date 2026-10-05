defmodule OpalCore.GroupTastes do
  @moduledoc """
  Phase D-1 — group taste learning.

  Learns what groups enjoy together from agreed/completed SharedPlans.
  Minimum 3 plans before suggestions. Opt-out members excluded. Aggregate only.
  """

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.FinancialProfiles
  alias OpalCore.GroupTastes.GroupTaste
  alias OpalCore.Repo

  @min_members 2
  @min_plans_for_suggest 3
  @decay_days 180
  @decay_weight 0.5
  @top_n 3

  @doc """
  Deterministic group hash: sorted ids joined by `|`, SHA256, first 16 hex chars.
  """
  def group_hash(member_ids) when is_list(member_ids) do
    member_ids
    |> normalize_ids()
    |> Enum.join("|")
    |> then(&:crypto.hash(:sha256, &1))
    |> Base.encode16(case: :lower)
    |> String.slice(0, 16)
  end

  def group_hash(_), do: nil

  @doc """
  Record an agreed/completed plan for a group.

  Filters opt-out users. Requires 2+ remaining members.
  `plan_attrs`: `%{vibe:, cuisine:, day_of_week:, observed_at:}` (all optional except need something).
  """
  def record_plan(member_ids, plan_attrs \\ %{})

  def record_plan(member_ids, plan_attrs) when is_list(member_ids) and is_map(plan_attrs) do
    members = eligible_members(member_ids)

    cond do
      length(members) < @min_members ->
        {:error, :too_few_members}

      true ->
        hash = group_hash(members)
        now = observed_at(plan_attrs)
        vibe = blank_to_nil(plan_attrs[:vibe] || plan_attrs["vibe"])
        cuisine = blank_to_nil(plan_attrs[:cuisine] || plan_attrs["cuisine"])
        day = normalize_day(plan_attrs[:day_of_week] || plan_attrs["day_of_week"])
        price = mode_price_comfort(members)

        case Repo.get_by(GroupTaste, group_hash: hash) do
          nil ->
            insert_new(hash, members, vibe, cuisine, day, price, now)

          %GroupTaste{} = existing ->
            update_existing(existing, vibe, cuisine, day, price, now)
        end
    end
  end

  def record_plan(_, _), do: {:error, :invalid}

  @doc "Return group taste for member set, or nil when <2 eligible / missing."
  def get_for_group(member_ids) when is_list(member_ids) do
    members = eligible_members(member_ids)

    if length(members) < @min_members do
      nil
    else
      Repo.get_by(GroupTaste, group_hash: group_hash(members))
    end
  end

  def get_for_group(_), do: nil

  @doc """
  Suggest top vibes/cuisines/best_day. Empty when plan_count < 3.
  Applies 0.5 weight to observations older than 6 months.
  """
  def suggest_for_group(member_ids, opts \\ []) do
    as_of = Keyword.get(opts, :as_of, DateTime.utc_now())

    case get_for_group(member_ids) do
      %GroupTaste{plan_count: n} = gt when n >= @min_plans_for_suggest ->
        %{
          vibes: top_weighted(gt.vibes, as_of, @top_n),
          cuisines: top_weighted(gt.cuisines, as_of, @top_n),
          best_day: List.first(top_weighted(gt.temporal_patterns, as_of, 1))
        }

      _ ->
        empty_suggest()
    end
  end

  @doc "Group tastes where `user_id` is a member (for your circles)."
  def groups_for_user(user_id) when is_binary(user_id) do
    from(g in GroupTaste,
      where: fragment("? = ANY(?)", ^user_id, g.member_ids),
      order_by: [desc: g.plan_count, desc: g.last_plan_at]
    )
    |> Repo.all()
  end

  def groups_for_user(_), do: []

  @doc "OC-2 slices: top 3 groups with plan_count >= 3 for this user."
  def context_slices_for(user_id) when is_binary(user_id) do
    user_id
    |> groups_for_user()
    |> Enum.filter(&(&1.plan_count >= @min_plans_for_suggest))
    |> Enum.take(3)
    |> Enum.map(&to_context_slice/1)
  end

  def context_slices_for(_), do: []

  @doc "Set opt-out flag for a user."
  def set_opt_out(user_id, opted_out?) when is_binary(user_id) and is_boolean(opted_out?) do
    case Repo.get(User, user_id) do
      %User{} = u ->
        u
        |> Ecto.Changeset.change(%{group_taste_opt_out: opted_out?})
        |> Repo.update()

      nil ->
        {:error, :not_found}
    end
  end

  def set_opt_out(_, _), do: {:error, :invalid}

  @doc "Whether user opted out of group taste learning."
  def opted_out?(user_id) when is_binary(user_id) do
    case Repo.get(User, user_id) do
      %User{group_taste_opt_out: true} -> true
      _ -> false
    end
  end

  def opted_out?(_), do: false

  def empty_suggest, do: %{vibes: [], cuisines: [], best_day: nil}

  # --- internals -----------------------------------------------------------

  defp insert_new(hash, members, vibe, cuisine, day, price, now) do
    attrs = %{
      group_hash: hash,
      member_ids: members,
      vibes: bump_map(%{}, vibe, now),
      cuisines: bump_map(%{}, cuisine, now),
      temporal_patterns: bump_map(%{}, day, now),
      price_comfort: price,
      plan_count: 1,
      last_plan_at: now
    }

    %GroupTaste{}
    |> GroupTaste.changeset(attrs)
    |> Repo.insert()
  end

  defp update_existing(%GroupTaste{} = gt, vibe, cuisine, day, price, now) do
    attrs = %{
      vibes: bump_map(gt.vibes || %{}, vibe, now),
      cuisines: bump_map(gt.cuisines || %{}, cuisine, now),
      temporal_patterns: bump_map(gt.temporal_patterns || %{}, day, now),
      price_comfort: price || gt.price_comfort,
      plan_count: gt.plan_count + 1,
      last_plan_at: now
    }

    gt
    |> GroupTaste.changeset(attrs)
    |> Repo.update()
  end

  defp bump_map(map, nil, _now), do: map || %{}
  defp bump_map(map, "", _now), do: map || %{}

  defp bump_map(map, key, now) when is_binary(key) do
    key = String.downcase(String.trim(key))
    map = map || %{}
    iso = DateTime.to_iso8601(now)

    entry =
      case Map.get(map, key) do
        %{"n" => n, "events" => events} when is_list(events) ->
          %{"n" => n + 1, "events" => Enum.take(events ++ [iso], -50)}

        n when is_integer(n) ->
          %{"n" => n + 1, "events" => [iso]}

        _ ->
          %{"n" => 1, "events" => [iso]}
      end

    Map.put(map, key, entry)
  end

  defp bump_map(map, _, _), do: map || %{}

  defp top_weighted(nil, _as_of, _n), do: []
  defp top_weighted(map, as_of, n) when is_map(map) do
    map
    |> Enum.map(fn {name, entry} -> {name, weighted_score(entry, as_of)} end)
    |> Enum.reject(fn {_name, score} -> score <= 0 end)
    |> Enum.sort_by(fn {_name, score} -> score end, :desc)
    |> Enum.take(n)
    |> Enum.map(fn {name, _} -> name end)
  end

  defp top_weighted(_, _, _), do: []

  defp weighted_score(%{"events" => events}, as_of) when is_list(events) do
    Enum.reduce(events, 0.0, fn iso, acc ->
      case parse_dt(iso) do
        %DateTime{} = dt ->
          days = DateTime.diff(as_of, dt, :day)
          w = if days > @decay_days, do: @decay_weight, else: 1.0
          acc + w

        _ ->
          acc + 1.0
      end
    end)
  end

  defp weighted_score(%{"n" => n}, _as_of) when is_number(n), do: n * 1.0
  defp weighted_score(n, _as_of) when is_integer(n), do: n * 1.0
  defp weighted_score(_, _), do: 0.0

  defp to_context_slice(%GroupTaste{} = gt) do
    names = member_display_names(gt.member_ids)
    suggestion = suggest_for_group(gt.member_ids)

    %{
      member_ids: gt.member_ids,
      member_names: names,
      vibes: suggestion.vibes,
      cuisines: suggestion.cuisines,
      best_day: suggestion.best_day,
      plan_count: gt.plan_count
    }
  end

  defp member_display_names(ids) when is_list(ids) do
    users =
      from(u in User, where: u.id in ^ids, select: {u.id, u.display_name})
      |> Repo.all()
      |> Map.new()

    Enum.map(ids, fn id -> Map.get(users, id) || "Someone" end)
  end

  defp eligible_members(member_ids) do
    ids = normalize_ids(member_ids)

    opted =
      from(u in User, where: u.id in ^ids and u.group_taste_opt_out == true, select: u.id)
      |> Repo.all()
      |> MapSet.new()

    Enum.reject(ids, &MapSet.member?(opted, &1))
  end

  defp normalize_ids(ids) do
    ids
    |> Enum.map(&to_string/1)
    |> Enum.map(&String.trim/1)
    |> Enum.reject(&(&1 == ""))
    |> Enum.uniq()
    |> Enum.sort()
  end

  defp mode_price_comfort(member_ids) do
    levels =
      member_ids
      |> Enum.map(fn id ->
        case FinancialProfiles.get_profile(id) do
          %{comfort_level: level} -> level
          _ -> nil
        end
      end)
      |> Enum.reject(&is_nil/1)

    case levels do
      [] ->
        nil

      list ->
        list
        |> Enum.frequencies()
        |> Enum.max_by(fn {_k, v} -> v end)
        |> elem(0)
    end
  end

  defp observed_at(attrs) do
    raw = attrs[:observed_at] || attrs["observed_at"]

    case raw do
      %DateTime{} = dt -> DateTime.truncate(dt, :microsecond)
      iso when is_binary(iso) -> parse_dt(iso) || now()
      _ -> now()
    end
  end

  defp now, do: DateTime.utc_now() |> DateTime.truncate(:microsecond)

  defp parse_dt(iso) when is_binary(iso) do
    case DateTime.from_iso8601(iso) do
      {:ok, dt, _} -> DateTime.truncate(dt, :microsecond)
      _ -> nil
    end
  end

  defp parse_dt(_), do: nil

  defp normalize_day(nil), do: nil
  defp normalize_day(d) when is_atom(d), do: normalize_day(Atom.to_string(d))

  defp normalize_day(d) when is_binary(d) do
    d = String.downcase(String.trim(d))

    cond do
      d in ~w(monday mon) -> "monday"
      d in ~w(tuesday tue tues) -> "tuesday"
      d in ~w(wednesday wed) -> "wednesday"
      d in ~w(thursday thu thur thurs) -> "thursday"
      d in ~w(friday fri) -> "friday"
      d in ~w(saturday sat) -> "saturday"
      d in ~w(sunday sun) -> "sunday"
      true -> d
    end
  end

  defp normalize_day(_), do: nil

  defp blank_to_nil(nil), do: nil
  defp blank_to_nil(s) when is_binary(s) do
    t = String.trim(s)
    if t == "", do: nil, else: t
  end

  defp blank_to_nil(_), do: nil
end
