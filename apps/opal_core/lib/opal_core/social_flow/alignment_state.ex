defmodule OpalCore.SocialFlow.AlignmentState do
  @moduledoc """
  Authoritative alignment stages for the Real People first vertical.

  Elixir owns eligibility, transitions, and shared-safe projections.
  Python may propose; time and client alone cannot create Set.
  """

  @stages ~w(quiet recognized still_open set changed canceled)a

  # Fallback presentation only — prefer SharedRealityPresentation headlines.
  # Never expose internal stage names ("Set") as the primary human label.
  @public_labels %{
    quiet: nil,
    recognized: "Something is forming",
    still_open: "Still taking shape",
    set: "You're both in",
    changed: "Plans changed",
    canceled: "Not happening"
  }

  def stages, do: @stages

  def public_label(stage) when is_atom(stage), do: Map.get(@public_labels, stage)
  def public_label(_), do: nil

  @doc """
  Set gate for message-path / ProductSignals elevation.

  Requires:
  - conversation has ≥2 members (or ≥1 required when composition provided)
  - **all required participants** have affirmed (not necessarily every member)
  - plan-forming evidence exists
  - no cancel evidence
  - no private "not_this_time" / need_another_time invalidation (caller supplies)

  Authority model:
  - Dyad (no composition): both members must affirm (required = all members)
  - Group: required_participant_ids from GroupComposition — optional late arrivals
    ("start without me") do not block Set; two of five cannot stand in for five
    required people

  Optional participants, guests, and partial participation are composition
  concerns — not silent consent for required people.
  """
  def set_gate_satisfied?(opts) when is_map(opts) do
    affirmatives = Map.get(opts, :affirmative_user_ids, []) |> Enum.uniq()
    member_ids = Map.get(opts, :member_user_ids, []) |> Enum.uniq()

    required_ids =
      (Map.get(opts, :required_participant_ids) || member_ids)
      |> Enum.uniq()
      |> Enum.filter(&(&1 in member_ids or member_ids == []))

    # Fallback: if required list empty, use all members (safety).
    required_ids = if required_ids == [], do: member_ids, else: required_ids

    plan? = Map.get(opts, :plan_evidence?, false)
    canceled? = Map.get(opts, :canceled?, false)
    blocked? = Map.get(opts, :blocked?, false)
    private_block? = Map.get(opts, :private_invalidates?, false)

    affirm_set = MapSet.new(affirmatives)
    required_set = MapSet.new(required_ids)

    required_satisfied? =
      length(required_ids) >= 1 and
        length(member_ids) >= 2 and
        MapSet.subset?(required_set, affirm_set) and
        Enum.all?(affirmatives, &(&1 in member_ids))

    # Dyad safety: never Set with a single affirmative even if required mis-set.
    dyad_ok? =
      length(member_ids) != 2 or
        MapSet.subset?(MapSet.new(member_ids), affirm_set)

    required_satisfied? and
      dyad_ok? and
      plan? and
      not canceled? and
      not blocked? and
      not private_block?
  end

  def set_gate_satisfied?(_), do: false

  def forbidden_public_labels do
    ["Booked", "Reservation requested", "Provider checking"]
  end
end
