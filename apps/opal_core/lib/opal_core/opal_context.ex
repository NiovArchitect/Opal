defmodule OpalCore.OpalContext do
  @moduledoc """
  Phase OC-2 — Opal Center context assembly.

  Gathers everything Opal needs to understand the user into one packet.
  No generation (OC-4). No intent (OC-3). Empty lists when data is absent.
  """

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Celebrations
  alias OpalCore.Messaging.ConversationMember
  alias OpalCore.Messaging.Message
  alias OpalCore.OpalConversations.OpalConversation
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.PlanParticipant
  alias OpalCore.SocialFlow.SharedPlan
  alias OpalCore.Taste

  @default_timezone "America/Los_Angeles"
  @max_message 2000
  @context_keys ~w(user taste temporal social message)a

  @doc """
  Assemble a context packet for `user_id` + inbound `message_text`.

  Returns `{:ok, context_map}` with exact keys:
  `:user`, `:taste`, `:temporal`, `:social`, `:message`.
  """
  def assemble(user_id, message_text) when is_binary(user_id) and is_binary(message_text) do
    case Repo.get(User, user_id) do
      nil ->
        {:error, :user_not_found}

      %User{} = user ->
        text = message_text |> String.trim() |> String.slice(0, @max_message)

        context = %{
          user: assemble_user(user),
          taste: assemble_taste(user_id),
          temporal: assemble_temporal(user_id),
          social: assemble_social(user_id),
          message: assemble_message(text)
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

  defp assemble_taste(user_id) do
    case Taste.profile_for(user_id) do
      %{vibes: vibes, cuisines: cuisines, price_comfort: price} ->
        %{
          vibes: List.wrap(vibes) |> Enum.take(5),
          cuisines: List.wrap(cuisines) |> Enum.take(5),
          price_comfort: price
        }

      nil ->
        %{vibes: [], cuisines: [], price_comfort: nil}

      _ ->
        %{vibes: [], cuisines: [], price_comfort: nil}
    end
  end

  defp assemble_temporal(user_id) do
    %{
      recent_plans: recent_plans(user_id),
      upcoming_celebrations: upcoming_celebrations(user_id),
      active_conversation_count: active_conversation_count(user_id)
    }
  end

  defp recent_plans(user_id) do
    from(sp in SharedPlan,
      join: pp in PlanParticipant,
      on: pp.plan_id == sp.id,
      where: pp.user_id == ^user_id,
      order_by: [desc: sp.inserted_at],
      limit: 5,
      select: %{title: sp.title, date: sp.start_at, inserted_at: sp.inserted_at}
    )
    |> Repo.all()
    |> Enum.map(fn row ->
      date =
        cond do
          match?(%DateTime{}, row.date) -> DateTime.to_iso8601(row.date)
          match?(%DateTime{}, row.inserted_at) -> DateTime.to_iso8601(row.inserted_at)
          true -> nil
        end

      %{title: row.title, date: date}
    end)
  end

  defp upcoming_celebrations(user_id) do
    today = Date.utc_today()

    case Celebrations.list_for_user(user_id) do
      {:ok, list} ->
        list
        |> Enum.take(5)
        |> Enum.map(fn c ->
          %{
            name: c.person_name,
            days_until: Celebrations.days_until(c, today)
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
end
