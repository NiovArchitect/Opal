defmodule OpalCore.OpalContext do
  @moduledoc """
  Phase OC-2 — Opal Center context assembly.

  Gathers everything Opal needs to understand the user into one packet.
  No generation (OC-4). No intent (OC-3). Empty lists when data is absent.
  """

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.CelebrationCuration
  alias OpalCore.Celebrations
  alias OpalCore.FinancialProfiles
  alias OpalCore.GroupTastes
  alias OpalCore.Messaging.ConversationMember
  alias OpalCore.Messaging.Message
  alias OpalCore.OpalConversations
  alias OpalCore.OpalConversations.OpalConversation
  alias OpalCore.OpalConversations.OpalMessage
  alias OpalCore.Relationships
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.PlanParticipant
  alias OpalCore.SocialFlow.SharedPlan
  alias OpalCore.Taste
  alias OpalCore.TrustTiers

  @default_timezone "America/Los_Angeles"
  @max_message 2000
  @history_limit 10
  @context_keys ~w(user taste temporal social message relationships trust_tier financial group_tastes conversation_history)a

  @doc """
  Assemble a context packet for `user_id` + inbound `message_text`.

  Returns `{:ok, context_map}` with keys including RU-2 `:trust_tier`,
  RU-3 `:financial`, D-1 `:group_tastes`, and short-term
  `:conversation_history` (last 10 Opal Center messages, role+body only).
  """
  def assemble(user_id, message_text) when is_binary(user_id) and is_binary(message_text) do
    case Repo.get(User, user_id) do
      nil ->
        {:error, :user_not_found}

      %User{} = user ->
        text = message_text |> String.trim() |> String.slice(0, @max_message)
        tier = TrustTiers.get_tier(user_id)

        context = %{
          user: assemble_user(user),
          taste: gated_taste(user_id, tier),
          temporal: gated_temporal(user_id, tier),
          social: gated_social(user_id, tier),
          message: assemble_message(text),
          # RU-1 — gated at trusted+
          relationships: gated_relationships(user_id, tier),
          # RU-2
          trust_tier: tier,
          # RU-3 — trusted+ and profile present only; no notes
          financial: gated_financial(user_id, tier),
          # D-1 — top groups (plan_count >= 3), aggregate only
          group_tastes: GroupTastes.context_slices_for(user_id),
          # Short-term memory — prior Opal Center turns (not the inbound text)
          conversation_history: assemble_conversation_history(user_id)
        }

        {:ok, context}
    end
  end

  def assemble(_, _), do: {:error, :invalid}

  def context_keys, do: @context_keys

  defp assemble_user(%User{} = user) do
    %{
      id: user.id,
      display_name: user.display_name,
      handle: user.handle,
      timezone: user_timezone(user)
    }
  end

  # users table has no timezone column yet — default honestly.
  defp user_timezone(_user), do: @default_timezone

  defp empty_taste, do: %{vibes: [], cuisines: [], price_comfort: nil}

  defp gated_taste(user_id, tier) do
    if TrustTiers.can_access_tier?(tier, :taste) do
      taste = assemble_taste(user_id)

      # Financial comfort requires trusted+
      if TrustTiers.can_access_tier?(tier, :financial) do
        taste
      else
        %{taste | price_comfort: nil}
      end
    else
      empty_taste()
    end
  end

  defp assemble_taste(user_id) do
    case Taste.profile_for(user_id) do
      %{vibes: vibes, cuisines: cuisines, price_comfort: price} ->
        %{
          vibes: List.wrap(vibes) |> Enum.take(5),
          cuisines: List.wrap(cuisines) |> Enum.take(5),
          price_comfort: price
        }

      nil ->
        empty_taste()

      _ ->
        empty_taste()
    end
  end

  defp gated_temporal(user_id, tier) do
    %{
      recent_plans:
        if(TrustTiers.can_access_tier?(tier, :plans), do: recent_plans(user_id), else: []),
      upcoming_celebrations:
        if(TrustTiers.can_access_tier?(tier, :celebrations),
          do: upcoming_celebrations(user_id),
          else: []
        ),
      # Conversation count is basic activity — always available.
      active_conversation_count: active_conversation_count(user_id)
    }
  end

  defp gated_social(user_id, tier) do
    # Frequent contacts / group patterns support planning — known+.
    if TrustTiers.can_access_tier?(tier, :plans) do
      assemble_social(user_id)
    else
      %{frequent_contacts: [], group_patterns: []}
    end
  end

  defp gated_relationships(user_id, tier) do
    if TrustTiers.can_access_tier?(tier, :relationships) do
      Relationships.type_map_for(user_id)
    else
      %{}
    end
  end

  defp gated_financial(user_id, tier) do
    if TrustTiers.can_access_tier?(tier, :financial) do
      FinancialProfiles.context_slice(user_id)
    else
      nil
    end
  end

  defp recent_plans(user_id) do
    from(sp in SharedPlan,
      join: pp in PlanParticipant,
      on: pp.plan_id == sp.id,
      where: pp.user_id == ^user_id,
      order_by: [desc: sp.inserted_at],
      limit: 20,
      select: %{
        id: sp.id,
        title: sp.title,
        status: sp.status,
        date: sp.start_at,
        inserted_at: sp.inserted_at
      }
    )
    |> Repo.all()
    |> Enum.map(fn row ->
      date =
        cond do
          match?(%DateTime{}, row.date) -> DateTime.to_iso8601(row.date)
          match?(%DateTime{}, row.inserted_at) -> DateTime.to_iso8601(row.inserted_at)
          true -> nil
        end

      %{
        id: row.id,
        title: row.title,
        status: row.status,
        date: date
      }
    end)
    # Screenshot bug 3 — "What's coming up?" listed Fort Oak ×3 from duplicate
    # tentative rows (Plan this / MultipleResultsError fallout). Keep newest per
    # normalized title, then cap at 5.
    |> dedupe_plans_by_title()
    |> Enum.take(5)
  end

  defp dedupe_plans_by_title(plans) when is_list(plans) do
    plans
    |> Enum.reduce({[], MapSet.new()}, fn plan, {acc, seen} ->
      key = normalize_plan_title(plan[:title] || plan["title"])

      cond do
        key == "" ->
          {acc ++ [plan], seen}

        MapSet.member?(seen, key) ->
          {acc, seen}

        true ->
          {acc ++ [plan], MapSet.put(seen, key)}
      end
    end)
    |> elem(0)
  end

  defp normalize_plan_title(nil), do: ""

  defp normalize_plan_title(title) when is_binary(title) do
    title
    |> String.downcase()
    |> String.replace(~r/\s*\(tentative\)\s*$/i, "")
    |> String.trim()
  end

  defp normalize_plan_title(_), do: ""

  defp upcoming_celebrations(user_id) do
    today = Date.utc_today()

    case Celebrations.list_for_user(user_id) do
      {:ok, list} ->
        list
        |> Enum.take(5)
        |> Enum.map(fn c ->
          %{
            id: c.id,
            name: c.person_name,
            kind: c.kind,
            days_until: Celebrations.days_until(c, today),
            # D-2 — top curated plan idea when known+ with data
            top_idea: CelebrationCuration.top_plan_idea(user_id, c.id)
          }
        end)

      _ ->
        []
    end
  end

  defp active_conversation_count(user_id) do
    from(c in OpalConversation, where: c.user_id == ^user_id)
    |> Repo.aggregate(:count, :id)
  end

  defp assemble_social(user_id) do
    %{
      frequent_contacts: frequent_contacts(user_id),
      group_patterns: group_patterns(user_id)
    }
  end

  defp frequent_contacts(user_id) do
    since = DateTime.utc_now() |> DateTime.add(-30 * 24 * 3600, :second)

    top_ids =
      from(m in Message,
        join: cm in ConversationMember,
        on: cm.conversation_id == m.conversation_id and cm.user_id == ^user_id,
        where: m.inserted_at >= ^since and m.sender_user_id != ^user_id,
        group_by: m.sender_user_id,
        order_by: [desc: count(m.id)],
        limit: 5,
        select: m.sender_user_id
      )
      |> Repo.all()

    if top_ids == [] do
      []
    else
      users =
        from(u in User, where: u.id in ^top_ids, select: {u.id, u.display_name})
        |> Repo.all()
        |> Map.new()

      Enum.map(top_ids, fn id ->
        %{user_id: id, display_name: Map.get(users, id)}
      end)
    end
  end

  defp group_patterns(user_id) do
    # Recent plans the user is on (cap for performance), then load co-participants once.
    plan_ids =
      from(pp in PlanParticipant,
        join: sp in SharedPlan,
        on: sp.id == pp.plan_id,
        where: pp.user_id == ^user_id,
        order_by: [desc: sp.inserted_at],
        limit: 50,
        select: sp.id
      )
      |> Repo.all()

    if plan_ids == [] do
      []
    else
      rows =
        from(pp in PlanParticipant,
          join: u in User,
          on: u.id == pp.user_id,
          where: pp.plan_id in ^plan_ids,
          select: {pp.plan_id, u.id, u.display_name}
        )
        |> Repo.all()

      rows
      |> Enum.group_by(fn {plan_id, _, _} -> plan_id end)
      |> Enum.filter(fn {_plan_id, members} -> length(members) >= 3 end)
      |> Enum.map(fn {_plan_id, members} ->
        ids = members |> Enum.map(fn {_, id, _} -> id end) |> Enum.sort()
        names = members |> Enum.map(fn {_, _, name} -> name end) |> Enum.sort()
        {ids, names}
      end)
      |> Enum.group_by(fn {ids, _names} -> ids end)
      |> Enum.map(fn {_ids, occurrences} ->
        names = occurrences |> hd() |> elem(1)
        %{member_names: names, shared_plan_count: length(occurrences)}
      end)
      |> Enum.sort_by(& &1.shared_plan_count, :desc)
      |> Enum.take(3)
    end
  end

  defp assemble_message(text) do
    %{
      text: text,
      length: String.length(text),
      sent_at: DateTime.utc_now() |> DateTime.to_iso8601()
    }
  end

  # Last N Opal Center messages (role + body + optional intent). Empty when none yet.
  defp assemble_conversation_history(user_id) do
    case Repo.get_by(OpalConversation, user_id: user_id) do
      %OpalConversation{id: cid} ->
        OpalConversations.list_messages(cid, @history_limit)
        |> Enum.map(fn %OpalMessage{} = m ->
          intent = history_intent(m.metadata)

          %{
            role: if(m.role == "opal", do: "opal", else: "user"),
            body: m.body || ""
          }
          |> then(fn base ->
            if is_map(intent), do: Map.put(base, :intent, intent), else: base
          end)
        end)

      _ ->
        []
    end
  end

  defp history_intent(%{"intent" => intent}) when is_map(intent), do: intent
  defp history_intent(%{intent: intent}) when is_map(intent), do: intent
  defp history_intent(_), do: nil
end
