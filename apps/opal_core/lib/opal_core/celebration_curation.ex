defmodule OpalCore.CelebrationCuration do
  @moduledoc """
  Phase D-2 — celebration curation ("What would Maya love?").

  Template-based gift/plan ideas from taste, shared history, group patterns,
  and financial comfort. Never invents taste. Never recommends real products.
  Private to the celebrating user.
  """

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Celebrations
  alias OpalCore.Celebrations.Celebration
  alias OpalCore.FinancialProfiles
  alias OpalCore.GroupTastes
  alias OpalCore.Intelligence.LlmRespond
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.Clock
  alias OpalCore.SocialFlow.PlanParticipant
  alias OpalCore.SocialFlow.SharedPlan
  alias OpalCore.Taste
  alias OpalCore.TrustTiers

  @min_tier "known"

  @doc """
  Curate ideas for an owned celebration.

  Returns `{:ok, curation}` with either full fields (known+) or a basic
  reminder map (below known). Foreign celebrations → `{:error, :not_found}`.
  """
  def curate_for(user_id, celebration_id)
      when is_binary(user_id) and is_binary(celebration_id) do
    case Celebrations.get_for_user(user_id, celebration_id) do
      {:ok, %Celebration{} = c} ->
        today = today()
        days = Celebrations.days_until(c, today)
        date = Celebrations.next_occurrence(today, c.month, c.day)
        celebration_slice = celebration_slice(c, date, days)

        if TrustTiers.can_access_tier?(TrustTiers.get_tier(user_id), :taste) and
             tier_at_least?(user_id, @min_tier) do
          {:ok, full_curation(user_id, c, celebration_slice)}
        else
          {:ok, basic_curation(c, celebration_slice, days)}
        end

      {:error, reason} ->
        {:error, reason}
    end
  end

  def curate_for(_, _), do: {:error, :invalid}

  @doc """
  Top plan idea for list cards / reminders. Nil when basic or empty.
  """
  def top_plan_idea(user_id, celebration_id)
      when is_binary(user_id) and is_binary(celebration_id) do
    case curate_for(user_id, celebration_id) do
      {:ok, %{mode: :full, plan_ideas: [idea | _]}} when is_binary(idea) and idea != "" ->
        idea

      {:ok, %{"mode" => "full", "plan_ideas" => [idea | _]}}
      when is_binary(idea) and idea != "" ->
        idea

      _ ->
        nil
    end
  end

  def top_plan_idea(_, _), do: nil

  @doc """
  Curated reminder body for AttentionCenter, or nil when there is no personal idea
  (caller keeps the calm milestone fallback).
  """
  def reminder_copy(user_id, %Celebration{} = c, days_until)
      when is_binary(user_id) and is_integer(days_until) do
    case curate_for(user_id, c.id) do
      {:ok, %{mode: :full, plan_ideas: [idea | _]}} when is_binary(idea) and idea != "" ->
        base = basic_reminder_text(c, days_until)

        template =
          "#{base} Based on your history, #{first_name(c.person_name)} would love #{downcase_first(idea)} — want me to plan it?"

        {text, _source} =
          LlmRespond.draft_or_template(%{
            action: "celebration.reminder_copy",
            template_message: template,
            account_id: user_id,
            entities: %{
              "person_name" => c.person_name,
              "days_until" => days_until,
              "idea" => idea,
              "kind" => c.kind
            },
            instruction:
              "Warm celebration reminder. Keep date, name, and curated idea facts from the template. Never invent dates or products. One or two sentences.",
            recent_messages: []
          })

        if is_binary(text) and String.trim(text) != "", do: String.trim(text), else: template

      _ ->
        nil
    end
  end

  def reminder_copy(_, _, _), do: nil

  @doc "JSON-safe contract for API."
  def to_contract(%{} = curation) do
    %{
      "mode" => Atom.to_string(curation.mode),
      "celebration" => stringify_map(curation.celebration),
      "recipient_taste" => stringify_taste(curation[:recipient_taste]),
      "shared_history" => Enum.map(curation[:shared_history] || [], &stringify_map/1),
      "group_suggestion" => stringify_group(curation[:group_suggestion]),
      "gift_ideas" => curation[:gift_ideas] || [],
      "plan_ideas" => curation[:plan_ideas] || [],
      "budget_note" => curation[:budget_note],
      "reminder" => curation[:reminder]
    }
    |> Enum.reject(fn {_k, v} -> is_nil(v) end)
    |> Map.new()
  end

  # --- full / basic ----------------------------------------------------------

  defp full_curation(user_id, %Celebration{} = c, celebration_slice) do
    recipient = resolve_recipient(user_id, c.person_name)
    recipient_id = if recipient, do: recipient.id, else: nil

    taste =
      if is_binary(recipient_id) do
        case Taste.profile_for(recipient_id) do
          %{vibes: _, cuisines: _} = t -> %{vibes: t.vibes, cuisines: t.cuisines}
          _ -> nil
        end
      else
        nil
      end

    history =
      if is_binary(recipient_id) do
        shared_history(user_id, recipient_id)
      else
        []
      end

    group =
      if is_binary(recipient_id) do
        group_suggestion_for(user_id, recipient_id)
      else
        nil
      end

    # Prefer recipient taste; fall back to patterns learned from shared history / group.
    vibes = taste_vibes(taste, history, group)
    cuisines = taste_cuisines(taste, history, group)

    budget_note = budget_note_for(user_id)
    gift_ideas = build_gift_ideas(vibes, cuisines)
    plan_ideas = build_plan_ideas(vibes, cuisines, group, budget_note, history)

    %{
      mode: :full,
      celebration: celebration_slice,
      recipient_taste: taste,
      shared_history: history,
      group_suggestion: group,
      gift_ideas: gift_ideas,
      plan_ideas: plan_ideas,
      budget_note: budget_note
    }
  end

  defp basic_curation(%Celebration{} = c, celebration_slice, days) do
    %{
      mode: :basic,
      celebration: celebration_slice,
      recipient_taste: nil,
      shared_history: [],
      group_suggestion: nil,
      gift_ideas: [],
      plan_ideas: [],
      budget_note: nil,
      reminder: basic_reminder_text(c, days)
    }
  end

  defp celebration_slice(%Celebration{} = c, %Date{} = date, days) do
    %{
      name: "#{c.person_name}'s #{c.kind}",
      date: Date.to_iso8601(date),
      days_until: days,
      person_name: c.person_name,
      kind: c.kind,
      id: c.id
    }
  end

  defp basic_reminder_text(%Celebration{} = c, days) when is_integer(days) do
    cond do
      days == 0 -> "#{c.person_name}'s #{c.kind} is today."
      days == 1 -> "#{c.person_name}'s #{c.kind} is tomorrow."
      days == 7 -> "#{c.person_name}'s #{c.kind} is in a week."
      days == 14 -> "#{c.person_name}'s #{c.kind} is in 14 days."
      true -> "#{c.person_name}'s #{c.kind} is in #{days} days."
    end
  end

  # --- recipient / history / group -------------------------------------------

  defp resolve_recipient(owner_id, person_name)
       when is_binary(owner_id) and is_binary(person_name) do
    needle = String.downcase(String.trim(person_name))

    candidates =
      from(u in User,
        where: fragment("lower(?) = ?", u.display_name, ^needle)
      )
      |> Repo.all()

    case candidates do
      [] ->
        nil

      [only] ->
        only

      many ->
        # Prefer someone the owner has actually planned with; else someone with taste.
        planned_with =
          from(pp in PlanParticipant,
            join: pp2 in PlanParticipant,
            on: pp2.plan_id == pp.plan_id and pp2.user_id == ^owner_id,
            where: pp.user_id != ^owner_id,
            select: pp.user_id,
            distinct: true
          )
          |> Repo.all()
          |> MapSet.new()

        Enum.find(many, &MapSet.member?(planned_with, &1.id)) ||
          Enum.find(many, fn u -> match?(%{vibes: [_ | _]}, Taste.profile_for(u.id)) end) ||
          Enum.find(many, fn u -> match?(%{cuisines: [_ | _]}, Taste.profile_for(u.id)) end) ||
          List.last(many)
    end
  end

  defp resolve_recipient(_, _), do: nil

  defp shared_history(user_id, recipient_id) do
    # Plans where both are participants, newest first, max 3.
    plan_ids =
      from(pp in PlanParticipant,
        where: pp.user_id == ^user_id,
        select: pp.plan_id
      )

    from(sp in SharedPlan,
      join: pp in PlanParticipant,
      on: pp.plan_id == sp.id and pp.user_id == ^recipient_id,
      where: sp.id in subquery(plan_ids),
      where: sp.status in ["agreed", "completed", "tentative", "changed"],
      where: sp.status != "cancelled",
      order_by: [desc: sp.start_at, desc: sp.inserted_at],
      limit: 3,
      select: %{
        title: sp.title,
        alignment: sp.alignment,
        start_at: sp.start_at,
        inserted_at: sp.inserted_at
      }
    )
    |> Repo.all()
    |> Enum.map(&history_row/1)
  end

  defp history_row(row) do
    alignment = stringify_keys(row.alignment || %{})

    date =
      cond do
        match?(%DateTime{}, row.start_at) -> DateTime.to_iso8601(row.start_at)
        match?(%DateTime{}, row.inserted_at) -> DateTime.to_iso8601(row.inserted_at)
        true -> nil
      end

    %{
      plan_title: row.title,
      vibe: blank_to_nil(alignment["vibe"] || alignment["atmosphere"]),
      cuisine: blank_to_nil(alignment["cuisine"] || alignment["food"]),
      date: date
    }
  end

  defp group_suggestion_for(user_id, recipient_id) do
    # Prefer the dyad group; else any shared group with 3+ plans that includes both.
    dyad = GroupTastes.suggest_for_group([user_id, recipient_id])

    cond do
      dyad.vibes != [] or dyad.cuisines != [] or is_binary(dyad.best_day) ->
        %{vibes: dyad.vibes, cuisines: dyad.cuisines, best_day: dyad.best_day}

      true ->
        user_id
        |> GroupTastes.groups_for_user()
        |> Enum.filter(fn g ->
          g.plan_count >= 3 and recipient_id in (g.member_ids || [])
        end)
        |> List.first()
        |> case do
          nil ->
            nil

          g ->
            sug = GroupTastes.suggest_for_group(g.member_ids)

            if sug.vibes == [] and sug.cuisines == [] and is_nil(sug.best_day) do
              nil
            else
              %{vibes: sug.vibes, cuisines: sug.cuisines, best_day: sug.best_day}
            end
        end
    end
  end

  defp taste_vibes(taste, history, group) do
    from_taste = if taste, do: List.wrap(taste.vibes), else: []
    from_hist = history |> Enum.map(& &1.vibe) |> Enum.reject(&is_nil/1)
    from_group = if group, do: List.wrap(group[:vibes] || group["vibes"]), else: []

    (from_taste ++ from_hist ++ from_group)
    |> Enum.map(&normalize_token/1)
    |> Enum.reject(&is_nil/1)
    |> Enum.uniq()
  end

  defp taste_cuisines(taste, history, group) do
    from_taste = if taste, do: List.wrap(taste.cuisines), else: []
    from_hist = history |> Enum.map(& &1.cuisine) |> Enum.reject(&is_nil/1)
    from_group = if group, do: List.wrap(group[:cuisines] || group["cuisines"]), else: []

    (from_taste ++ from_hist ++ from_group)
    |> Enum.map(&normalize_token/1)
    |> Enum.reject(&is_nil/1)
    |> Enum.uniq()
  end

  # --- ideas -----------------------------------------------------------------

  defp build_gift_ideas(vibes, cuisines) do
    vibes_l = Enum.map(vibes, &String.downcase/1)

    candidates =
      []
      |> maybe_add(Enum.any?(vibes_l, &(&1 == "quiet")), "A cozy experience for two")
      |> maybe_add(Enum.any?(vibes_l, &(&1 == "lively")), "A night out somewhere energetic")
      |> maybe_add(Enum.any?(vibes_l, &(&1 == "foodie")), "A tasting menu at a new spot")
      |> maybe_add_cuisine_gift(cuisines)

    ideas =
      case candidates do
        [] -> ["Something thoughtful based on your history together"]
        list -> list
      end

    ideas |> Enum.uniq() |> Enum.take(3)
  end

  defp maybe_add_cuisine_gift(acc, cuisines) do
    case Enum.find(cuisines, &(is_binary(&1) and &1 != "")) do
      nil ->
        acc

      cuisine ->
        label = capitalize_word(cuisine)
        maybe_add(acc, true, "#{indefinite_article(label)} #{label} cooking class")
    end
  end

  defp build_plan_ideas(vibes, cuisines, group, budget_note, history) do
    vibe = List.first(vibes)
    cuisine = List.first(cuisines)
    best_day = if group, do: group[:best_day] || group["best_day"], else: nil

    hist_title =
      history
      |> Enum.map(& &1.plan_title)
      |> Enum.find(&(is_binary(&1) and &1 != ""))

    candidates =
      []
      |> maybe_add(
        is_binary(vibe) and is_binary(cuisine),
        "#{capitalize_word(vibe)} #{capitalize_word(cuisine)} dinner for two"
      )
      |> maybe_add(
        is_binary(vibe) and is_nil(cuisine),
        "#{capitalize_word(vibe)} evening together"
      )
      |> maybe_add(
        is_binary(cuisine) and is_nil(vibe),
        "#{capitalize_word(cuisine)} dinner for two"
      )
      |> maybe_add(
        is_binary(best_day),
        "#{capitalize_word(best_day)} night out together"
      )
      |> maybe_add(
        is_binary(hist_title),
        "A rematch of #{hist_title}"
      )
      |> maybe_add(
        is_binary(budget_note) and String.contains?(budget_note, "budget"),
        "A low-key celebration nearby"
      )
      |> maybe_add(
        is_binary(budget_note) and String.contains?(budget_note, "luxury"),
        "A special-occasion night out"
      )
      |> maybe_add(true, "Spa day")
      |> maybe_add(true, "Weekend getaway")

    candidates
    |> Enum.uniq()
    |> Enum.take(3)
  end

  defp budget_note_for(user_id) do
    # FinancialProfiles.get_profile already trust-gates at trusted+.
    case FinancialProfiles.get_profile(user_id) do
      %{comfort_level: level} when is_binary(level) and level != "" ->
        "Fits your #{level} comfort."

      _ ->
        nil
    end
  end

  # --- helpers ---------------------------------------------------------------

  defp tier_at_least?(user_id, min_tier) do
    rank = %{"new" => 0, "known" => 1, "trusted" => 2, "inner_circle" => 3}
    current = TrustTiers.get_tier(user_id)
    Map.get(rank, current, 0) >= Map.get(rank, min_tier, 1)
  end

  defp maybe_add(list, true, idea) when is_binary(idea), do: list ++ [idea]
  defp maybe_add(list, _, _), do: list

  defp normalize_token(nil), do: nil

  defp normalize_token(s) when is_binary(s) do
    t = s |> String.trim() |> String.downcase()
    if t == "", do: nil, else: t
  end

  defp normalize_token(_), do: nil

  defp blank_to_nil(nil), do: nil

  defp blank_to_nil(s) when is_binary(s) do
    t = String.trim(s)
    if t == "", do: nil, else: String.downcase(t)
  end

  defp blank_to_nil(_), do: nil

  defp capitalize_word(nil), do: ""

  defp capitalize_word(s) when is_binary(s) do
    case String.trim(s) do
      "" -> ""
      t -> String.capitalize(t)
    end
  end

  defp indefinite_article(word) when is_binary(word) do
    case String.downcase(String.first(word) || "") do
      v when v in ~w(a e i o u) -> "An"
      _ -> "A"
    end
  end

  defp indefinite_article(_), do: "A"

  defp downcase_first(<<first::utf8, rest::binary>>) do
    String.downcase(<<first::utf8>>) <> rest
  end

  defp downcase_first(s), do: s

  defp first_name(name) when is_binary(name) do
    name |> String.trim() |> String.split(~r/\s+/, parts: 2) |> hd()
  end

  defp first_name(_), do: "they"

  defp today do
    case Clock.utc_now() do
      %DateTime{} = dt -> DateTime.to_date(dt)
      _ -> Date.utc_today()
    end
  end

  defp stringify_keys(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end

  defp stringify_map(nil), do: nil

  defp stringify_map(map) when is_map(map) do
    Map.new(map, fn {k, v} -> {to_string(k), stringify_val(v)} end)
  end

  defp stringify_val(%Date{} = d), do: Date.to_iso8601(d)
  defp stringify_val(%DateTime{} = d), do: DateTime.to_iso8601(d)
  defp stringify_val(list) when is_list(list), do: Enum.map(list, &stringify_val/1)
  defp stringify_val(map) when is_map(map), do: stringify_map(map)
  defp stringify_val(v), do: v

  defp stringify_taste(nil), do: nil

  defp stringify_taste(%{vibes: vibes, cuisines: cuisines}) do
    %{"vibes" => List.wrap(vibes), "cuisines" => List.wrap(cuisines)}
  end

  defp stringify_taste(map) when is_map(map), do: stringify_map(map)

  defp stringify_group(nil), do: nil

  defp stringify_group(%{} = g) do
    %{
      "vibes" => List.wrap(g[:vibes] || g["vibes"]),
      "cuisines" => List.wrap(g[:cuisines] || g["cuisines"]),
      "best_day" => g[:best_day] || g["best_day"]
    }
  end
end
