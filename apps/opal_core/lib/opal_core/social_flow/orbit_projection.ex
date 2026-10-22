defmodule OpalCore.SocialFlow.OrbitProjection do
  @moduledoc """
  Repair #20 (F-19) — THE ORBIT PROJECTION: the one backend output
  the orbit screen renders for a thread. Thread = the moment; orbit
  = the arc: the thread's full party set, every upcoming plan that
  belongs to this thread (as ring stones, in their governed state),
  and — per person, per plan — who is still pending and who is in
  etiquette limbo (the cooling state), so the whole state of the
  conversation is legible from the ring before a word is read.

  Composition law — this module derives NOTHING of its own:
  - plans come from `NextPlan.all_for_conversation/3` (the same
    candidate scope, vault filter, upcoming rule, ordering, and
    state derivation as the thread's Next Together fact);
  - per-party response states are the participant rows' own
    canonical vocabulary (`PlanParticipant.canonical_response_state/1`);
  - limbo is the etiquette machinery's own export
    (`NonResponseEtiquette.limbo_recipients/2`) — stage set and
    window fraction computed there, never re-derived here;
  - party identity/tint are the records' own fields plus
    `NextPlan.entity_tint/1`, the one tint definition.

  Repair #20 amendment — ORBIT PROJECTION v2 adds, composing the
  same authorities only:
  - `subject`: the room's center is the TOPIC, never a person
    (founder Center Law) — the next plan's title when one exists,
    else the conversation record's own title, else nil;
  - `where_lines`: finished plain lines for the room's "Where
    we're at" card, composed from the next-together fact, the
    plans' states, and per-plan etiquette truth from
    `NonResponseEtiquette.viewer_projection/3` (fork state, stage,
    and the machinery's own remaining-window line included).
    Misalignment honesty (Orbit Law 3): a presented fork and a
    window that closed unanswered are NAMED plainly — no
    smoothing language;
  - `past_plans`: this conversation's past/settled facts from
    `NextPlan.past_for_conversation/3` (the upcoming pipeline's
    own scope + vault filter, past as not-upcoming), each with
    loved evidence ONLY from data: `repeated` is true when a
    plan's repeat provenance (`alignment["repeated_from_plan_id"]`,
    the F-15 repeat machinery) points at it, and `loved` is true
    only then. The plan model carries no explicit positive-signal
    field (checked 2026-10-20), so repeats are the only loved
    evidence that exists; nothing is ever marked loved without it.

  A viewer who is not a member of the conversation gets nil:
  there is no orbit for them, honestly.
  """

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Messages
  alias OpalCore.Repo
  alias OpalCore.SocialFlow
  alias OpalCore.SocialFlow.NextPlan
  alias OpalCore.SocialFlow.NonResponseEtiquette
  alias OpalCore.SocialFlow.PlanParticipant
  alias OpalCore.SocialFlow.SharedPlan

  @doc """
  The orbit projection for `viewer_id` in `conversation_id`, or nil
  when the viewer is not a member of the conversation.
  """
  def for_conversation(viewer_id, conversation_id, opts \\ [])

  def for_conversation(viewer_id, conversation_id, opts)
      when is_binary(viewer_id) and is_binary(conversation_id) do
    # Repair #23 (F-1): party identity is the user id, once each -
    # the header parties line is composed from this list verbatim.
    member_ids = conversation_id |> Messages.member_user_ids() |> Enum.uniq()

    if viewer_id in member_ids do
      plans =
        viewer_id
        |> NextPlan.all_for_conversation(conversation_id, opts)
        |> Enum.map(&enrich_plan(&1, opts))

      next_plan = NextPlan.for_conversation(viewer_id, conversation_id, opts)
      party_list = parties(member_ids, viewer_id, plans)
      past = past_plans(viewer_id, conversation_id, opts)

      %{
        "conversation_id" => conversation_id,
        "composition" => if(length(member_ids) >= 3, do: "group", else: "dyad"),
        "parties" => party_list,
        "plans" => plans,
        "next_plan" => next_plan,
        "subject" => subject(next_plan, conversation_id),
        "where_lines" => where_lines(next_plan, plans, party_list, viewer_id, opts),
        "past_plans" => past,
        # Repair #21 (W-5b): who came and went - the conversation's
        # recorded membership events (Chronology member_added /
        # member_removed moments, read through the messaging
        # boundary that writes them). The orbit renders these
        # finished lines; it derives nothing about membership here.
        "membership_events" => Messages.membership_events(conversation_id)
      }
    else
      nil
    end
  end

  def for_conversation(_, _, _), do: nil

  # Each plan fact gains its party read: for every party of the plan
  # (the one participant-id definition), their canonical response
  # state, whether their answer is still pending, and their limbo
  # truth from the etiquette machinery when a loop is cooling on
  # them. A party with no participant row carries a nil response —
  # absent, never invented.
  defp enrich_plan(fact, opts) do
    plan_id = fact["plan_id"]
    party_ids = plan_party_ids(plan_id)

    responses =
      from(pp in PlanParticipant, where: pp.plan_id == ^plan_id)
      |> Repo.all()
      |> Map.new(fn pp ->
        {pp.user_id, PlanParticipant.canonical_response_state(pp.response_state)}
      end)

    limbo =
      plan_id
      |> NonResponseEtiquette.limbo_recipients(opts)
      |> Map.new(fn entry -> {entry["recipient_id"], entry} end)

    participants =
      Enum.map(party_ids, fn user_id ->
        limbo_entry = Map.get(limbo, user_id)

        %{
          "user_id" => user_id,
          "response_state" => Map.get(responses, user_id),
          "pending" => Map.get(responses, user_id) == "pending",
          "limbo" => not is_nil(limbo_entry),
          "limbo_stage" => limbo_entry && limbo_entry["stage"],
          "limbo_fraction_remaining" => limbo_entry && limbo_entry["window_fraction_remaining"]
        }
      end)

    Map.put(fact, "participants", participants)
  end

  defp plan_party_ids(plan_id) do
    case Repo.get(SharedPlan, plan_id) do
      %SharedPlan{} = plan -> SocialFlow.plan_participant_ids(plan)
      _ -> []
    end
  end

  # The thread's people, viewer first and then by name — a stable
  # ring order decided HERE so no surface invents its own. Each
  # party folds the thread plans' per-plan reads into one pending /
  # limbo truth for their light: pending on ANY of this thread's
  # plans lights the pending read; limbo on any plan cools the
  # light with the smallest remaining fraction (the coolest truth).
  defp parties(member_ids, viewer_id, plans) do
    users =
      from(u in User, where: u.id in ^member_ids)
      |> Repo.all()
      |> Map.new(fn u -> {u.id, u} end)

    member_ids
    |> Enum.map(fn user_id ->
      user = Map.get(users, user_id)

      reads =
        Enum.flat_map(plans, & &1["participants"]) |> Enum.filter(&(&1["user_id"] == user_id))

      limbo_fractions =
        reads |> Enum.map(& &1["limbo_fraction_remaining"]) |> Enum.reject(&is_nil/1)

      limbo_fraction = if limbo_fractions == [], do: nil, else: Enum.min(limbo_fractions)

      %{
        "user_id" => user_id,
        "display_name" => (user && user.display_name) || "",
        "handle" => (user && user.handle) || "",
        "entity_tint" => NextPlan.entity_tint(user_id),
        "is_viewer" => user_id == viewer_id,
        "pending" => Enum.any?(reads, & &1["pending"]),
        "limbo" => Enum.any?(reads, & &1["limbo"]),
        "limbo_fraction_remaining" => limbo_fraction
      }
    end)
    |> Enum.sort_by(fn p -> {if(p["is_viewer"], do: 0, else: 1), p["display_name"]} end)
  end

  # --- Projection v2 ------------------------------------------------

  # The room's center is the TOPIC (founder Center Law): the next
  # plan's own title; failing that, the conversation record's own
  # title - its label, when the label is a human title and not a
  # machine routing label (group-/direct-/connection-, the same
  # prefixes Messages and OpalConversations refuse to call a name);
  # failing that, nil. Never a person's name.
  defp subject(next_plan, conversation_id) do
    plan_title = next_plan && next_plan["title"]

    cond do
      is_binary(plan_title) and String.trim(plan_title) != "" ->
        plan_title

      true ->
        case Repo.get(OpalCore.Messaging.Conversation, conversation_id) do
          %OpalCore.Messaging.Conversation{label: label} when is_binary(label) ->
            if String.starts_with?(label, ["group-", "direct-", "connection-"]) or
                 String.trim(label) == "" do
              nil
            else
              label
            end

          _ ->
            nil
        end
    end
  end

  # The "Where we're at" lines: few, finished, rendered verbatim.
  # Sources, in order: the next-together fact; then per plan (the
  # orbit's own stone order, capped) ONE standing line - the
  # etiquette truth when the etiquette machinery has one for this
  # viewer, else the plan's pending parties from its own enriched
  # participant reads.
  defp where_lines(next_plan, plans, party_list, viewer_id, opts) do
    names = Map.new(party_list, &{&1["user_id"], &1["display_name"]})

    # Repair #21 v4.2.1 (CF2-6) - copy coherence at the
    # derivation: the next-together line derives from the SAME
    # plan list the standing lines and the party reads derive
    # from (the pick when there is one, else the list's first
    # fact), never from the pick alone. A plan that exists but
    # carries no time yet is NOT "no plan": the line says it is
    # not scheduled yet, and when the viewer is the one it is
    # waiting on, it says that too - so this line can never
    # contradict the Your move truth on the same card. "No next
    # plan is set yet" is reserved for a room with no plan at
    # all, in any derivation.
    next_fact = next_plan || List.first(plans)

    next_line =
      case next_fact do
        %{"title" => title} = fact ->
          if is_binary(fact["when_label"]) and fact["when_label"] != "" do
            [
              "Next together: #{title}",
              fact["when_label"],
              fact["where_label"]
            ]
            |> Enum.reject(&is_nil/1)
            # A plan fact whose place label repeats its title reads
            # once, not twice - the line stays finished.
            |> Enum.uniq()
            |> Enum.join(" - ")
            |> Kernel.<>(".")
          else
            base = "Next together: #{title} - not scheduled yet."

            if viewer_pending?(party_list, viewer_id) do
              base <> " One waiting on you."
            else
              base
            end
          end

        _ ->
          "No next plan is set yet."
      end

    standing_lines =
      plans
      |> Enum.take(3)
      |> Enum.map(&standing_line(&1, names, viewer_id, opts))
      |> Enum.reject(&is_nil/1)

    [next_line | standing_lines]
  end

  defp standing_line(fact, names, viewer_id, opts) do
    title = fact["title"]
    etiquette = NonResponseEtiquette.viewer_projection(fact["plan_id"], viewer_id, opts)

    cond do
      match?(%{}, etiquette) and etiquette["stage"] == "escalated" ->
        # The fork window closed with no answer and the lifecycle
        # escalated to the requester. Name it plainly (Law 3): the
        # misalignment is the fact, not a smoothing of it.
        "#{name_for(names, etiquette["recipient_user_id"])} did not answer #{title} before the answer window closed. It is still unanswered."

      match?(%{}, etiquette) and get_in(etiquette, ["fork", "state"]) == "presented" ->
        "A choice is in front of #{name_for(names, etiquette["recipient_user_id"])} on #{title} - decline, or ask for another time - and it is still unanswered."

      match?(%{}, etiquette) and match?(%{}, etiquette["limbo"]) ->
        remaining = get_in(etiquette, ["limbo", "remaining_window_text"])

        base =
          "#{name_for(names, etiquette["recipient_user_id"])} has not answered #{title} yet."

        if is_binary(remaining) and remaining != "", do: base <> " " <> remaining, else: base

      true ->
        pending_names =
          fact["participants"]
          |> Enum.filter(& &1["pending"])
          |> Enum.map(&name_for(names, &1["user_id"]))

        case pending_names do
          [] -> nil
          _ -> "Still waiting on #{Enum.join(pending_names, ", ")} for #{title}."
        end
    end
  end

  # The viewer's own pending truth, read off the same party
  # list the ring lights and the web card's Your move row read.
  defp viewer_pending?(party_list, viewer_id) do
    Enum.any?(party_list, &(&1["user_id"] == viewer_id and &1["pending"] == true))
  end

  defp name_for(names, user_id) do
    case Map.get(names, user_id) do
      name when is_binary(name) and name != "" -> name
      _ -> "Someone"
    end
  end

  # Past/settled facts with their loved evidence. The repeat
  # provenance set is read once: every plan id that some plan's
  # F-15 repeat provenance points at. A past plan is `repeated`
  # (and therefore `loved` - the only loved evidence the data
  # carries) exactly when its id is in that set.
  defp past_plans(viewer_id, conversation_id, opts) do
    facts = NextPlan.past_for_conversation(viewer_id, conversation_id, opts)

    repeated_ids =
      from(p in SharedPlan,
        where: not is_nil(fragment("? ->> 'repeated_from_plan_id'", p.alignment)),
        select: fragment("? ->> 'repeated_from_plan_id'", p.alignment)
      )
      |> Repo.all()
      |> MapSet.new()

    Enum.map(facts, fn fact ->
      repeated = MapSet.member?(repeated_ids, fact["plan_id"])

      Map.merge(fact, %{
        "repeated" => repeated,
        "loved" => repeated,
        "loved_evidence" => if(repeated, do: "repeated", else: nil)
      })
    end)
  end
end
