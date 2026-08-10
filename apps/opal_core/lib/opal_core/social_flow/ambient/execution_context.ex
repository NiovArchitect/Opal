defmodule OpalCore.SocialFlow.Ambient.ExecutionContext do
  @moduledoc """
  Smallest composition of resolved alignment facts for downstream execution.

  PRIMARY LAW: Do not ask users to re-enter resolved context.

  Consumes IDs/references already known from Set / native commitment / plan.
  Does not manufacture social agreement (AlignmentAuthority alone Sets).
  Does not claim booked/paid/navigated without executor confirmation.

  AVP² remains payments only — not in this context.
  """

  @fields ~w(
    conversation_id
    plan_id
    plan_version
    native_commitment_id
    actor_user_id
    participant_ids
    required_ids
    party_size
    when
    place
    place_label
    venue_id
    provider
    provider_candidate_id
    destination
    relationship_context
    set
    slot_label
    travel_minutes
    price_each
    price_total
  )

  @doc """
  Build execution context from commitment / plan attrs already resolved.

  Never requires retyping address, time, party, or who is going.
  """
  def from_resolved(attrs) when is_map(attrs) do
    a = stringify(attrs)

    missing = missing_for_basic(a)

    ctx = %{
      "schema_version" => "0.1.0",
      "conversation_id" => a["conversation_id"],
      "plan_id" => a["plan_id"] || a["active_plan_id"],
      "plan_version" => a["plan_version"] || 0,
      "native_commitment_id" => a["native_commitment_id"] || a["commitment_id"],
      "actor_user_id" => a["actor_user_id"] || a["owner_user_id"],
      "participant_ids" => List.wrap(a["participant_ids"] || a["participants"]),
      "required_ids" => List.wrap(a["required_ids"]),
      "party_size" =>
        a["party_size"] || length(List.wrap(a["participant_ids"] || a["participants"])),
      "when" => a["when"] || a["start_at"] || a["time"],
      "place" => a["place"] || a["place_label"] || a["destination"],
      "place_label" => a["place_label"] || a["place"] || a["destination"],
      "venue_id" => a["venue_id"] || a["provider_place_id"] || a["provider_candidate_id"],
      "provider" => a["provider"],
      "provider_candidate_id" => a["provider_candidate_id"] || a["venue_id"],
      "destination" => a["destination"] || a["place"] || a["place_label"],
      "relationship_context" => a["relationship_context"],
      "set" => a["set"] == true,
      "slot_label" => a["slot_label"] || a["when"],
      "travel_minutes" => a["travel_minutes"],
      "price_each" => a["price_each"],
      "price_total" => a["price_total"],
      "reentry_required" => missing != [],
      "missing_fields" => missing,
      "reuses_alignment_context" => true,
      "authorizes_set" => false,
      "avp2_payments_only" => true,
      "provider_is_not_authority" => true,
      "social_truth_source" => "alignment_authority_only"
    }

    {:ok, ctx}
  end

  def from_resolved(_), do: {:error, :invalid}

  @doc "True when context is complete enough for a capability without re-entry."
  def ready_for?(ctx, capability) when is_map(ctx) do
    c = stringify(ctx)
    cap = to_string(capability)

    case cap do
      "navigation" ->
        is_binary(c["destination"] || c["place"]) and c["destination"] not in [nil, ""]

      "leave_by" ->
        not is_nil(c["when"]) and ready_for?(c, "navigation")

      "booking_inquiry" ->
        c["set"] == true and is_binary(c["venue_id"] || c["place"]) and
          not is_nil(c["party_size"]) and not is_nil(c["when"] || c["slot_label"])

      "booking_request" ->
        # Context complete; human auth is a separate transition, not readiness
        ready_for?(c, "booking_inquiry")

      "reminder" ->
        not is_nil(c["when"]) and is_binary(c["actor_user_id"] || c["owner_user_id"])

      "ticket_handoff" ->
        is_binary(c["provider_candidate_id"] || c["venue_id"])

      _ ->
        false
    end
  end

  def ready_for?(_, _), do: false

  @doc """
  Invalidate destination-dependent execution facets after place change.
  Preserves social Set / participants / intent.
  """
  def invalidate_for_place_change(ctx) when is_map(ctx) do
    c = stringify(ctx)

    {:ok,
     Map.merge(c, %{
       "destination" => nil,
       "place" => nil,
       "place_label" => nil,
       "venue_id" => nil,
       "navigation_stale" => true,
       "leave_by_stale" => true,
       "reminder_context_stale" => true,
       "travel_minutes" => nil,
       "social_truth_intact" => c["set"] == true,
       "reentry_required" => true,
       "missing_fields" => ["place", "destination"]
     })}
  end

  def invalidate_for_place_change(_), do: {:error, :invalid}

  @doc "Time change invalidates leave-by / slot-dependent booking prep, not Set."
  def invalidate_for_time_change(ctx, new_when) when is_map(ctx) do
    c = stringify(ctx)

    {:ok,
     Map.merge(c, %{
       "when" => new_when,
       "slot_label" => new_when,
       "leave_by_stale" => true,
       "booking_prep_stale" => true,
       "reminder_context_stale" => true,
       "social_truth_intact" => c["set"] == true,
       "reentry_required" => false
     })}
  end

  def invalidate_for_time_change(_, _), do: {:error, :invalid}

  @doc "Detect plan-version drift for in-flight actions."
  def plan_version_match?(ctx, action_plan_version) when is_map(ctx) do
    c = stringify(ctx)
    to_i(c["plan_version"]) == to_i(action_plan_version)
  end

  def plan_version_match?(_, _), do: false

  @doc "Bump plan version via existing PlanVersion semantics when available."
  def bump_version(ctx, reason \\ "material_change") when is_map(ctx) do
    c = stringify(ctx)
    v = to_i(c["plan_version"]) + 1

    # PlanVersion module may expose bump — keep local if not
    _ = reason

    {:ok, Map.put(c, "plan_version", v)}
  end

  def fields, do: @fields

  defp missing_for_basic(a) do
    []
    |> maybe_miss(is_nil(a["conversation_id"]) or a["conversation_id"] == "", "conversation_id")
    |> maybe_miss(
      is_nil(a["place"] || a["place_label"] || a["destination"]) or
        (a["place"] || a["place_label"] || a["destination"]) == "",
      "place"
    )
    |> maybe_miss(is_nil(a["when"] || a["start_at"] || a["time"]), "when")
  end

  defp maybe_miss(list, true, field), do: list ++ [field]
  defp maybe_miss(list, false, _), do: list

  defp to_i(n) when is_integer(n), do: n
  defp to_i(n) when is_float(n), do: trunc(n)
  defp to_i(_), do: 0

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
