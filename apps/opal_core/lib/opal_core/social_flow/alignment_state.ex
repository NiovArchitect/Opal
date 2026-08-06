defmodule OpalCore.SocialFlow.AlignmentState do
  @moduledoc """
  Authoritative alignment stages for the Real People first vertical.

  Elixir owns eligibility, transitions, and shared-safe projections.
  Python may propose; time and client alone cannot create Set.
  """

  @stages ~w(quiet recognized still_open set changed canceled)a

  @public_labels %{
    quiet: nil,
    recognized: "Becoming a plan",
    still_open: "Still open",
    set: "Set",
    changed: "Plans changed",
    canceled: "Not happening"
  }

  def stages, do: @stages

  def public_label(stage) when is_atom(stage), do: Map.get(@public_labels, stage)
  def public_label(_), do: nil

  @doc """
  Set gate for first two-user proof.

  Requires:
  - conversation has ≥2 distinct member speakers with affirmative responses
  - plan-forming evidence exists
  - no cancel evidence
  - no private "not_this_time" / need_another_time invalidation (caller supplies)

  One user alone cannot create mutual Set.
  """
  def set_gate_satisfied?(opts) when is_map(opts) do
    affirmatives = Map.get(opts, :affirmative_user_ids, []) |> Enum.uniq()
    member_ids = Map.get(opts, :member_user_ids, []) |> Enum.uniq()
    plan? = Map.get(opts, :plan_evidence?, false)
    canceled? = Map.get(opts, :canceled?, false)
    blocked? = Map.get(opts, :blocked?, false)
    private_block? = Map.get(opts, :private_invalidates?, false)

    length(member_ids) >= 2 and
      plan? and
      not canceled? and
      not blocked? and
      not private_block? and
      length(affirmatives) >= 2 and
      Enum.all?(affirmatives, &(&1 in member_ids))
  end

  def set_gate_satisfied?(_), do: false

  def forbidden_public_labels do
    ["Booked", "Reservation requested", "Provider checking"]
  end
end
