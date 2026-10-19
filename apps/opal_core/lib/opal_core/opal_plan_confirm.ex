defmodule OpalCore.OpalPlanConfirm do
  @moduledoc """
  When the user affirms Center planning, create a durable SharedPlan.

  SUBJECT_PERSON_ID ≠ MESSAGE_RECIPIENT_ID unless the user explicitly shares.
  Default Center confirm uses `create_tentative_plan_from_center` (owner-private).
  Never auto-opens a human direct conversation or paints Opal transcript there.
  """

  alias OpalCore.Relationships
  alias OpalCore.Repo
  alias OpalCore.SocialFlow
  alias OpalCore.SocialFlow.{AssistancePreference, MeetingLinks}

  @doc """
  Execute a `:plan_confirm` intent.

  Returns `{:ok, result_map}` with `:title`, `:what`, `:when`, `:who`, `:plan_id`,
  `:conversation_id` (nil for private Center plans) on success, or `{:error, reason}`.
  Never invents a meeting URL.
  """
  def execute(user_id, entities, context)
      when is_binary(user_id) and is_map(entities) and is_map(context) do
    what = sanitize_what(entities[:what] || entities["what"]) || "plans"
    when_s = present(entities[:when] || entities["when"])
    who = normalize_who(entities[:who] || entities["who"])
    plan_type = normalize_plan_type(entities)
    meeting_link = resolve_meeting_link(user_id, entities, plan_type)
    share? = explicit_share?(entities)

    # Repair #18 fix wave (RF-3) — the explicit clock and named venue
    # parsed at proposal time are facts of the plan being confirmed:
    # the stored time_label carries day + clock ("Sunday 10 AM", the
    # same label shape conversation plans use), and a named venue is
    # the plan's place — not the echoed activity word.
    when_time = present(entities[:when_time] || entities["when_time"])
    venue = present(entities[:venue] || entities["venue"])

    title = build_title(what, when_s, who)
    time_label = combine_when(when_s, when_time)

    location =
      cond do
        plan_type == "virtual" -> "Online"
        is_binary(venue) -> venue
        true -> what
      end

    # Repair #18: pass the decision context through - the resolved
    # subject id (when the who resolves inside the user's own contacts)
    # and any decision_id the caller carried - so the Center create can
    # dedupe and persist the subject instead of dropping both.
    subject_user_id =
      case resolve_peer(user_id, who, context) do
        {:ok, peer_id} -> peer_id
        _ -> nil
      end

    decision_id = present(entities[:decision_id] || entities["decision_id"])

    # Default: owner-private Center plan. Subject person stays subject only.
    if share? do
      case resolve_peer(user_id, who, context) do
        {:ok, _peer_id} ->
          # Explicit share still creates Center-owned plan first; human projection
          # is a separate authority path (not auto message).
          create_center_private(
            user_id,
            title,
            location,
            time_label,
            what,
            when_s,
            who,
            plan_type,
            meeting_link,
            entities,
            subject_user_id,
            decision_id
          )

        {:error, :no_peer} ->
          {:error, :need_who}

        {:error, reason} ->
          {:error, reason}
      end
    else
      create_center_private(
        user_id,
        title,
        location,
        time_label,
        what,
        when_s,
        who,
        plan_type,
        meeting_link,
        entities,
        subject_user_id,
        decision_id
      )
    end
  end

  defp create_center_private(
         user_id,
         title,
         location,
         time_label,
         what,
         when_s,
         who,
         plan_type,
         meeting_link,
         entities,
         subject_user_id,
         decision_id
       ) do
    # RF-3 — the venue/clock facts ride the confirm entities; the
    # result quotes the created record's own label and place.
    when_time = present(entities[:when_time] || entities["when_time"])
    venue = present(entities[:venue] || entities["venue"])

    case SocialFlow.create_tentative_plan_from_center(user_id, %{
           "title" => title,
           "place" => location,
           "location" => location,
           "time_label" => time_label || "Open window",
           "plan_type" => plan_type,
           "meeting_link" => meeting_link,
           "meeting_provider" =>
             MeetingLinks.normalize_provider(
               entities[:meeting_provider] || entities["meeting_provider"]
             ),
           "subject_who" => who,
           "subject_user_id" => subject_user_id,
           "decision_id" => decision_id,
           # Repair #18 (B2) — food-at-home signal passthrough (additive;
           # absent for every non-food turn, so other creates are unchanged).
           "food_at_home" => entities[:food_at_home] || entities["food_at_home"],
           "food_question" => entities[:food_question] || entities["food_question"]
         }) do
      {:ok, plan, _participants} ->
        _ = maybe_persist_usual_link(user_id, meeting_link, entities)

        # F12-05 — drive to completion (calendar, restaurant discovery when no
        # venue, ride/directions next-steps). Never fails the confirm.
        completion_steps =
          case SocialFlow.PlanCompletion.drive(plan.id, user_id) do
            {:ok, %{steps: steps}} -> steps
            _ -> []
          end

        {:ok,
         %{
           title: plan.title || title,
           what: what,
           # RF-3 — the confirmed record's own label (day + explicit
           # clock) and venue, so the Done copy quotes the plan row.
           when: plan.time_label || time_label || when_s,
           when_time: when_time,
           venue: venue,
           who: who,
           plan_id: plan.id,
           conversation_id: nil,
           status: plan.status || "tentative",
           plan_type: plan.plan_type || plan_type,
           meeting_link: plan.meeting_link,
           initial_planning_visibility: "owner_private",
           completion_steps: completion_steps
         }}

      {:error, reason} ->
        {:error, reason}
    end
  end

  # RF-3 — day + explicit clock as one stored label ("Sunday 10 AM").
  # The clock is appended only when the day string does not already
  # carry it; a missing day falls back to the clock alone.
  defp combine_when(when_s, when_time) do
    cond do
      is_binary(when_s) and is_binary(when_time) ->
        if String.contains?(String.downcase(when_s), String.downcase(when_time)),
          do: when_s,
          else: "#{when_s} #{when_time}"

      is_binary(when_s) ->
        when_s

      true ->
        when_time
    end
  end

  defp explicit_share?(entities) do
    entities[:share_with_subject] == true or entities["share_with_subject"] == true or
      entities[:reveal_to_subject] == true or entities["reveal_to_subject"] == true
  end

  defp sanitize_what(nil), do: nil

  defp sanitize_what(w) when is_binary(w) do
    t =
      w
      |> String.trim()
      |> String.split(~r/[?—–]/u)
      |> List.first()
      |> to_string()
      |> String.trim()

    down = String.downcase(t)

    cond do
      t == "" -> nil
      # Possessive/byte-slice damage: "omething" / "thing" from "something"
      down in ~w(omething thing ome anything) -> nil
      down in ~w(something anything everything nothing stuff things) -> nil
      String.starts_with?(down, "something") -> nil
      true -> present(t)
    end
  end

  defp sanitize_what(_), do: nil

  def execute(_, _, _), do: {:error, :invalid}

  defp normalize_plan_type(entities) do
    case entities[:plan_type] || entities["plan_type"] do
      t when t in ["virtual", :virtual] ->
        "virtual"

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

    # F12-56 (per-account isolation): resolution is scoped to the account's
    # own relationships/contacts ONLY. There is deliberately no global
    # user-table fallback — a cross-account name collision must never attach
    # a plan to a stranger, and the lookup must not leak user existence.
    peer = from_contacts || from_rels

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

  # F12-56 — lookup_user_by_name/1 (global ilike over ALL users, limit 1) is
  # deleted. Peer resolution stays inside the account's own
  # relationships/contacts; a cross-account name collision must never resolve
  # to a stranger, and the lookup must not leak user existence.

  # Paste W4 Phase 1 — echo user `what` words; never invent Movie/Hurricane titles.
  # Repair #18 (Division A, F18-06 title hygiene): the schedule is NOT
  # baked into the title - `when_s` lives in time_label / start_at where
  # it can move. The old "{what} {when} with {who}" baking froze the
  # creation-time day into every surface that renders the title, and
  # fragment variation (same intent, different fragments per turn) is
  # what minted the duplicate rows.
  defp build_title(what, _when_s, who) do
    echoed = title_case_user_words(what)

    with_who =
      case who do
        [n | _] when is_binary(n) and n != "" -> " with #{n}"
        _ -> ""
      end

    String.trim("#{echoed}#{with_who}")
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
