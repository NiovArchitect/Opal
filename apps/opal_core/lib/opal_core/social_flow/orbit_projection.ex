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
    member_ids = Messages.member_user_ids(conversation_id)

    if viewer_id in member_ids do
      plans =
        viewer_id
        |> NextPlan.all_for_conversation(conversation_id, opts)
        |> Enum.map(&enrich_plan(&1, opts))

      %{
        "conversation_id" => conversation_id,
        "composition" => if(length(member_ids) >= 3, do: "group", else: "dyad"),
        "parties" => parties(member_ids, viewer_id, plans),
        "plans" => plans,
        "next_plan" => NextPlan.for_conversation(viewer_id, conversation_id, opts)
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
          "limbo_fraction_remaining" =>
            limbo_entry && limbo_entry["window_fraction_remaining"]
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
      reads = Enum.flat_map(plans, & &1["participants"]) |> Enum.filter(&(&1["user_id"] == user_id))
      limbo_fractions = reads |> Enum.map(& &1["limbo_fraction_remaining"]) |> Enum.reject(&is_nil/1)
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
end
