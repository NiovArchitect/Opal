defmodule OpalCore.OpalPlanConfirm do
  @moduledoc """
  Screenshot bug 4 — when the user affirms "Want me to set this up?", create a
  real SharedPlan via Messages.ensure_direct + SocialFlow.create_tentative.
  """

  alias OpalCore.Accounts.User
  alias OpalCore.Messages
  alias OpalCore.Relationships
  alias OpalCore.Repo
  alias OpalCore.SocialFlow
  alias OpalCore.SocialFlow.{AssistancePreference, MeetingLinks}

  @doc """
  Execute a `:plan_confirm` intent.

  Returns `{:ok, result_map}` with `:title`, `:what`, `:when`, `:who`, `:plan_id`,
  `:conversation_id` on success, or `{:error, reason}`.
  Never invents a meeting URL.
  """
  def execute(user_id, entities, context)
      when is_binary(user_id) and is_map(entities) and is_map(context) do
    what = present(entities[:what] || entities["what"]) || "plans"
    when_s = present(entities[:when] || entities["when"])
    who = normalize_who(entities[:who] || entities["who"])
    plan_type = normalize_plan_type(entities)
    meeting_link = resolve_meeting_link(user_id, entities, plan_type)

    title = build_title(what, when_s, who)
    time_label = when_s

    location = if plan_type == "virtual", do: "Online", else: what

    case resolve_peer(user_id, who, context) do
      {:ok, peer_id} ->
        with {:ok, direct} <- Messages.ensure_direct_conversation(user_id, peer_id),
             cid when is_binary(cid) <- direct.conversation_id || direct[:conversation_id],
             {:ok, plan, _participants} <-
               SocialFlow.create_tentative_plan_from_conversation(cid, user_id, %{
                 "title" => title,
                 "place" => location,
                 "location" => location,
                 "time_label" => time_label,
                 "plan_type" => plan_type,
                 "meeting_link" => meeting_link
               }) do
          _ = maybe_persist_usual_link(user_id, meeting_link, entities)

          {:ok,
           %{
             title: plan.title || title,
             what: what,
             when: when_s,
             who: who,
             plan_id: plan.id,
             conversation_id: cid,
             status: plan.status || "tentative",
             plan_type: plan.plan_type || plan_type,
             meeting_link: plan.meeting_link
           }}
        else
          {:error, reason} -> {:error, reason}
          _ -> {:error, :create_failed}
        end

      {:error, :no_peer} ->
        # No named peer — still create a durable plan on a self-note conversation
        # is not supported (source requires conversation members). Ask who.
        {:error, :need_who}

      {:error, reason} ->
        {:error, reason}
    end
  end

  def execute(_, _, _), do: {:error, :invalid}

  defp normalize_plan_type(entities) do
    case entities[:plan_type] || entities["plan_type"] do
      t when t in ["virtual", :virtual] -> "virtual"
      _ ->
        if MeetingLinks.sanitize(entities[:meeting_link] || entities["meeting_link"]),
          do: "virtual",
          else: "in_person"
    end
  end

  defp resolve_meeting_link(user_id, entities, "virtual") do
    pasted = MeetingLinks.sanitize(entities[:meeting_link] || entities["meeting_link"])
    use_usual? = entities[:use_usual_meeting_link] || entities["use_usual_meeting_link"]

    cond do
      is_binary(pasted) -> pasted
      use_usual? -> usual_meeting_link(user_id)
      true -> usual_meeting_link(user_id)
    end
  end

  defp resolve_meeting_link(_, _, _), do: nil

  defp usual_meeting_link(user_id) do
    case Repo.get_by(AssistancePreference, user_id: user_id) do
      %AssistancePreference{usual_meeting_link: link} -> MeetingLinks.sanitize(link)
      _ -> nil
    end
  end

  defp maybe_persist_usual_link(_user_id, nil, _), do: :ok

  defp maybe_persist_usual_link(user_id, link, entities) when is_binary(link) do
    save? =
      entities[:use_usual_meeting_link] || entities["use_usual_meeting_link"] ||
        entities[:save_usual_meeting_link] || entities["save_usual_meeting_link"] ||
        is_nil(usual_meeting_link(user_id))

    if save? do
      case Repo.get_by(AssistancePreference, user_id: user_id) do
        %AssistancePreference{} = pref ->
          pref
          |> AssistancePreference.changeset(%{usual_meeting_link: link})
          |> Repo.update()

        nil ->
          %AssistancePreference{}
          |> AssistancePreference.changeset(%{
            user_id: user_id,
            usual_meeting_link: link,
            timezone: "America/Los_Angeles"
          })
          |> Repo.insert()
      end
    else
      :ok
    end
  end

  defp maybe_persist_usual_link(_, _, _), do: :ok

  defp resolve_peer(user_id, who, context) when is_list(who) and who != [] do
    contacts = get_in_ctx(context, [:social, :frequent_contacts]) || []

    name = hd(who) |> to_string() |> String.trim()
    down = String.downcase(name)

    from_contacts =
      Enum.find_value(contacts, fn c ->
        display = c[:display_name] || c["display_name"] || ""
        uid = c[:user_id] || c["user_id"]

        if is_binary(uid) and String.contains?(String.downcase(display), down) do
          uid
        else
          nil
        end
      end)

    from_rels =
      Relationships.contacts_with_types(user_id)
      |> Enum.find_value(fn c ->
        display = c[:display_name] || ""
        uid = c[:contact_user_id]

        if is_binary(uid) and String.contains?(String.downcase(to_string(display)), down) do
          uid
        else
          nil
        end
      end)

    peer = from_contacts || from_rels || lookup_user_by_name(name)

    cond do
      is_binary(peer) and peer != user_id -> {:ok, peer}
      true -> {:error, :no_peer}
    end
  end

  defp resolve_peer(_user_id, _, _), do: {:error, :need_who}

  defp get_in_ctx(map, [k | rest]) when is_map(map) do
    next = Map.get(map, k) || Map.get(map, to_string(k))
    if rest == [], do: next, else: get_in_ctx(next || %{}, rest)
  end

  defp get_in_ctx(_, _), do: nil

  defp lookup_user_by_name(name) when is_binary(name) and name != "" do
    import Ecto.Query

    like = "#{String.trim(name)}%"

    from(u in User,
      where: ilike(u.display_name, ^like) or ilike(u.handle, ^like),
      select: u.id,
      limit: 1
    )
    |> Repo.one()
  end

  defp lookup_user_by_name(_), do: nil

  # Paste W4 Phase 1 — echo user `what` words; never invent Movie/Hurricane titles.
  defp build_title(what, when_s, who) do
    echoed = title_case_user_words(what)

    with_who =
      case who do
        [n | _] when is_binary(n) and n != "" -> " with #{n}"
        _ -> ""
      end

    when_bit = if is_binary(when_s) and when_s != "", do: " #{when_s}", else: ""
    String.trim("#{echoed}#{when_bit}#{with_who}")
  end

  defp title_case_user_words(nil), do: "Plans"
  defp title_case_user_words(""), do: "Plans"

  defp title_case_user_words(raw) when is_binary(raw) do
    trimmed =
      raw
      |> String.trim()
      |> String.replace(~r/\s+/, " ")
      |> String.replace(~r/^(a|an|the)\s+/i, "")

    case String.split(trimmed, " ", trim: true) |> Enum.take(6) do
      [] ->
        "Plans"

      [first | rest] ->
        Enum.join([String.capitalize(first) | rest], " ")
    end
  end

  defp title_case_user_words(_), do: "Plans"

  defp normalize_who(nil), do: nil
  defp normalize_who(who) when is_list(who), do: Enum.map(who, &to_string/1)
  defp normalize_who(who) when is_binary(who), do: [who]
  defp normalize_who(_), do: nil

  defp present(nil), do: nil
  defp present(""), do: nil

  defp present(v) when is_binary(v) do
    case String.trim(v) do
      "" -> nil
      s -> s
    end
  end

  defp present(_), do: nil
end
