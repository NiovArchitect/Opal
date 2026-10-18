defmodule OpalCore.SocialFlow.HouseholdContext do
  @moduledoc """
  Repair #18 Division B (B5) — the one context read both B5 halves
  share: for a user, are they planning from a household pod, on their
  own, or neither?

  Solo is a DERIVED, read-time predicate — never stored, never added
  to any user contract as a label about the person, never visible to
  any other user. It means exactly one graph fact: Opal holds nobody
  for this user yet (no active pod membership, no connected peer, no
  typed contact). It is computed from records the product already
  holds with consent — message counts, plan counts, recency,
  TravelState, and sentiment are deliberately NOT inputs, and pod code
  never reads TravelState. The moment it stops being true (first
  accepted contact, first pod), it simply stops firing; there is no
  state to clean up.

  A declared pod of 1 is a pod, never solo: the declaration wins.
  """

  import Ecto.Query

  alias OpalCore.Relationships
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.Households
  alias OpalCore.SocialFlow.PlanParticipant
  alias OpalCore.SocialFlow.SharedPlan

  # --- Laws ---

  def solo_stored_as_trait?, do: false
  def solo_user_facing_label?, do: false
  def solo_reads_travel_state?, do: false
  def solo_infers_from_activity_volume?, do: false

  @doc "True when Opal holds nobody for this user yet (graph fact, not a loneliness inference)."
  def solo?(user_id) when is_binary(user_id) do
    not Households.any_active_membership?(user_id) and
      Relationships.contacts_with_types(user_id) == []
  end

  def solo?(_), do: false

  @doc """
  The one explicit context projection: kind is "pod" (primary pod —
  defaults apply), "household" (pod member, no primary chosen),
  "solo", or "connected". Carries the primary pod's plan defaults
  when one exists, and nothing about any other user.
  """
  def context_for(user_id) when is_binary(user_id) do
    case Households.primary_pod(user_id) do
      %OpalCore.SocialFlow.Household{} = pod ->
        %{
          "context_kind" => "pod",
          "pod" => Households.to_contract(pod, user_id),
          "plan_defaults" => Households.plan_defaults(user_id)
        }

      _ ->
        cond do
          Households.any_active_membership?(user_id) ->
            %{"context_kind" => "household", "pod" => nil, "plan_defaults" => nil}

          solo?(user_id) ->
            %{"context_kind" => "solo", "pod" => nil, "plan_defaults" => nil}

          true ->
            %{"context_kind" => "connected", "pod" => nil, "plan_defaults" => nil}
        end
    end
  end

  def context_for(_), do: %{"context_kind" => "connected", "pod" => nil, "plan_defaults" => nil}

  # --- Suggestion candidates + solo bias ---

  @doc """
  The user's current suggestion candidates, derived from real held
  records (their open plans), in natural (creation) order. Each
  candidate carries a shape: "virtual" (plan_type), "group" (3+
  people), or "one_to_one".
  """
  def suggestion_candidates(user_id) when is_binary(user_id) do
    rows =
      from(p in SharedPlan,
        join: pp in PlanParticipant,
        on: pp.plan_id == p.id,
        where: pp.user_id == ^user_id and p.status in ~w(tentative agreed changed),
        order_by: [asc: p.inserted_at],
        select: p,
        distinct: true
      )
      |> Repo.all()

    counts =
      from(pp in PlanParticipant,
        where: pp.plan_id in ^Enum.map(rows, & &1.id),
        group_by: pp.plan_id,
        select: {pp.plan_id, count(pp.id)}
      )
      |> Repo.all()
      |> Map.new()

    Enum.map(rows, fn plan ->
      people = Map.get(counts, plan.id, 1)

      shape =
        cond do
          plan.plan_type == "virtual" -> "virtual"
          people >= 3 -> "group"
          true -> "one_to_one"
        end

      %{
        "shape" => shape,
        "plan_id" => plan.id,
        "title" => plan.title,
        "plan_type" => plan.plan_type
      }
    end)
  end

  def suggestion_candidates(_), do: []

  @doc """
  Solo bias, ranking only: for a solo user, group-shaped and virtual
  candidates sort above 1:1 in-person ones (stable within each class).
  Bias, never filter — the batch size and membership never change,
  and non-solo users keep the producers' natural order untouched.
  """
  def order_candidates(user_id, candidates) when is_binary(user_id) and is_list(candidates) do
    if solo?(user_id) do
      Enum.sort_by(candidates, fn c ->
        if shape_of(c) in ["group", "virtual"], do: 0, else: 1
      end)
    else
      candidates
    end
  end

  def order_candidates(_, candidates), do: candidates

  @doc "The ordered candidate projection the suggestion surfaces render."
  def suggestion_order(user_id) do
    %{
      "context_kind" => context_for(user_id)["context_kind"],
      "candidates" => order_candidates(user_id, suggestion_candidates(user_id))
    }
  end

  defp shape_of(candidate) when is_map(candidate) do
    candidate["shape"] || candidate[:shape] ||
      cond do
        (candidate["plan_type"] || candidate[:plan_type]) == "virtual" -> "virtual"
        (candidate["person_count"] || candidate[:person_count] || 1) >= 3 -> "group"
        true -> "one_to_one"
      end
  end
end
