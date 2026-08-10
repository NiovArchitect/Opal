defmodule OpalCore.SocialFlow.Ambient.ExecutionAction do
  @moduledoc """
  Externally meaningful action identity + lifecycle for execution composition.

  States (minimal, compatible with BookingBridge / Device ActionStateMachine):

  not_ready | ready | authorization_required | prepared | requested |
  confirmed | failed | cancelled | expired | stale

  Idempotency: retries share action_id; late responses with wrong plan_version
  are suppressed.
  """

  alias OpalCore.SocialFlow.Ambient.{ExecutionContext, ProviderResultGate}

  @states ~w(
    not_ready
    ready
    authorization_required
    prepared
    requested
    confirmed
    failed
    cancelled
    expired
    stale
  )

  def states, do: @states

  @doc """
  Mint stable action_id from material dimensions.

  plan_version + capability + target + conversation.
  """
  def action_id(ctx, capability) when is_map(ctx) do
    c = stringify(ctx)
    cap = to_string(capability)

    material = [
      c["conversation_id"] || "",
      c["plan_id"] || "",
      to_string(c["plan_version"] || 0),
      cap,
      c["venue_id"] || c["destination"] || c["place"] || "",
      to_string(c["when"] || c["slot_label"] || ""),
      to_string(c["party_size"] || "")
    ]

    :crypto.hash(:sha256, Enum.join(material, "|"))
    |> Base.encode16(case: :lower)
    |> binary_part(0, 20)
  end

  def action_id(_, _), do: "invalid"

  @doc "Create a prepared action bound to execution context."
  def prepare(ctx, capability, attrs \\ %{})

  def prepare(ctx, capability, attrs) when is_map(ctx) do
    c = stringify(ctx)
    a = stringify(attrs)
    cap = to_string(capability)

    ready? = ExecutionContext.ready_for?(c, cap)
    state = initial_state(ready?, a)

    {:ok,
     %{
       "action_id" => action_id(c, cap),
       "capability" => cap,
       "state" => state,
       "plan_version" => c["plan_version"],
       "conversation_id" => c["conversation_id"],
       "venue_id" => c["venue_id"],
       "destination" => c["destination"] || c["place"],
       "when" => c["when"] || c["slot_label"],
       "party_size" => c["party_size"],
       "idempotency_key" => a["idempotency_key"] || action_id(c, cap),
       "reentry_required" => c["reentry_required"] == true,
       "authorizes_set" => false,
       "booked" => false,
       "paid" => false,
       "confirmed" => false
     }}
  end

  def prepare(_, _, _), do: {:error, :invalid}

  @doc """
  Transition action. External confirmations only move to confirmed.
  """
  def transition(action, event, opts \\ [])

  def transition(action, event, opts) when is_map(action) do
    a = stringify(action)
    event = to_string(event)
    active_pv = Keyword.get(opts, :active_plan_version, a["plan_version"])

    cond do
      not ExecutionContext.plan_version_match?(
        %{"plan_version" => active_pv},
        a["plan_version"]
      ) and event not in ~w(cancel) ->
        {:ok, Map.merge(a, %{"state" => "stale", "reason" => "plan_version_mismatch"})}

      true ->
        do_transition(a, event, opts)
    end
  end

  def transition(_, _, _), do: {:error, :invalid}

  @doc """
  Admit a late provider/device response only if action + plan still valid.
  """
  def admit_result(action, result, opts \\ [])

  def admit_result(action, result, opts) when is_map(action) and is_map(result) do
    a = stringify(action)
    r = stringify(result)
    active_pv = Keyword.get(opts, :active_plan_version, a["plan_version"])

    gate =
      ProviderResultGate.admit?(%{
        "result_plan_version" => a["plan_version"],
        "active_plan_version" => active_pv,
        "claim_type" => claim_for(a["capability"]),
        "live" => r["live"] == true,
        "provider_confirmed" => r["provider_confirmed"] == true or r["status"] == "confirmed",
        "inventory_checked" => r["inventory_checked"] == true
      })

    cond do
      a["state"] in ~w(cancelled expired stale) ->
        {:ok, %{"admit" => false, "reason" => "action_" <> a["state"]}}

      not gate["admit"] ->
        {:ok, %{"admit" => false, "reason" => gate["reason"], "action" => a}}

      r["status"] in ~w(confirmed success delivered) ->
        {:ok, t} = transition(a, "confirm", opts)
        {:ok, %{"admit" => true, "action" => t, "truthful" => true}}

      r["status"] in ~w(failed error) ->
        {:ok, t} = transition(a, "fail", opts)
        {:ok, %{"admit" => true, "action" => t}}

      true ->
        {:ok, %{"admit" => false, "reason" => "unrecognized_result"}}
    end
  end

  def admit_result(_, _, _), do: {:error, :invalid}

  @doc """
  Provider confirmed different time than social Set — do not mutate Set.
  Returns smallest human decision payload.
  """
  def provider_time_mismatch(ctx, provider_time) when is_map(ctx) do
    c = stringify(ctx)

    %{
      "kind" => "minimum_question",
      "topic" => "provider_time_delta",
      "copy" => "#{provider_time} is available instead.",
      "social_set_unchanged" => true,
      "set_time" => c["when"] || c["slot_label"],
      "provider_time" => provider_time,
      "silent_mutation_forbidden" => true,
      "authorizes_set" => false,
      "feed" => false
    }
  end

  @doc "Provider place substitution requires human authority."
  def provider_place_mismatch(ctx, alt_place) when is_map(ctx) do
    c = stringify(ctx)

    %{
      "kind" => "minimum_question",
      "topic" => "provider_place_delta",
      "copy" => "Another place nearby works.",
      "social_set_unchanged" => true,
      "chosen_place" => c["place"] || c["place_label"],
      "alternate_place" => alt_place,
      "silent_mutation_forbidden" => true,
      "authorizes_set" => false,
      "feed" => false
    }
  end

  defp initial_state(true, a) do
    if a["user_authorized"] == true, do: "ready", else: "authorization_required"
  end

  defp initial_state(false, _), do: "not_ready"

  defp do_transition(a, "authorize", _) do
    if a["state"] in ~w(authorization_required prepared not_ready ready) do
      {:ok, Map.put(a, "state", "ready")}
    else
      {:error, :invalid_transition}
    end
  end

  defp do_transition(a, "prepare", _) do
    if a["state"] in ~w(ready authorization_required) do
      {:ok, Map.put(a, "state", "prepared")}
    else
      {:error, :invalid_transition}
    end
  end

  defp do_transition(a, "request", _) do
    if a["state"] in ~w(ready prepared authorization_required) do
      {:ok, Map.merge(a, %{"state" => "requested", "booked" => false, "confirmed" => false})}
    else
      {:error, :invalid_transition}
    end
  end

  defp do_transition(a, "confirm", _) do
    if a["state"] in ~w(requested prepared executing ready authorization_required) do
      {:ok,
       Map.merge(a, %{
         "state" => "confirmed",
         "confirmed" => true,
         # Only true for booking capability when provider confirms
         "booked" => a["capability"] in ~w(booking_request booking)
       })}
    else
      {:error, :invalid_transition}
    end
  end

  defp do_transition(a, "fail", opts) do
    {:ok,
     Map.merge(a, %{
       "state" => "failed",
       "failure_reason" => Keyword.get(opts, :reason, "provider_failed"),
       "booked" => false,
       "confirmed" => false
     })}
  end

  defp do_transition(a, "cancel", _) do
    {:ok, Map.merge(a, %{"state" => "cancelled", "booked" => false})}
  end

  defp do_transition(a, "expire", _) do
    {:ok, Map.merge(a, %{"state" => "expired", "booked" => false, "may_prompt_book" => false})}
  end

  defp do_transition(_, _, _), do: {:error, :invalid_transition}

  defp claim_for("booking_request"), do: "booked"
  defp claim_for("booking"), do: "booked"
  defp claim_for("booking_inquiry"), do: "availability"
  defp claim_for("navigation"), do: "fit"
  defp claim_for("reminder"), do: "fit"
  defp claim_for(_), do: "fit"

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
