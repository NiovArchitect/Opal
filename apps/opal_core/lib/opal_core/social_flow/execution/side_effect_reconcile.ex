defmodule OpalCore.SocialFlow.Execution.SideEffectReconcile do
  @moduledoc """
  External side-effect reconciliation when plan version drifts.

  Unlike pure recommendations, a late provider success may have created a
  **real** reservation/charge in the world. Cannot simply suppress as stale.

  Minimum compensation model (not a saga framework):

  1. Recognize stale social version
  2. Recognize external side effect
  3. Attempt safe compensation if authorization + provider permit
  4. Else surface one human decision

  Cancellation requested ≠ cancelled.
  """

  alias OpalCore.SocialFlow.Ambient.ExecutionAction

  @doc """
  Reconcile a late provider result against current plan version.

  Returns one of:
  - admit_to_current (versions match)
  - compensate_stale (cancel old external effect)
  - human_decision (cannot auto-compensate)
  - ignore_no_side_effect
  """
  def reconcile(action, result, opts \\ []) when is_map(action) and is_map(result) do
    a = stringify(action)
    r = stringify(result)
    active_pv = opts[:active_plan_version] || opts["active_plan_version"] || a["plan_version"]
    version_match? = to_i(a["plan_version"]) == to_i(active_pv)

    side_effect? =
      r["provider_confirmed"] == true or r["status"] in ~w(confirmed success booked) or
        r["external_side_effect"] == true

    cond do
      version_match? and side_effect? ->
        {:ok, admitted} = ExecutionAction.admit_result(a, r, active_plan_version: active_pv)

        {:ok,
         %{
           "outcome" => "admit_to_current",
           "admit" => admitted,
           "external_side_effect" => true,
           "suppressed" => false
         }}

      version_match? and not side_effect? ->
        {:ok,
         %{
           "outcome" => "ignore_no_side_effect",
           "admit" => false,
           "external_side_effect" => false
         }}

      not version_match? and not side_effect? ->
        {:ok,
         %{
           "outcome" => "suppress_stale_no_side_effect",
           "admit" => false,
           "external_side_effect" => false,
           "social_plan_intact" => true
         }}

      not version_match? and side_effect? ->
        compensate_or_ask(a, r, active_pv, opts)
    end
  end

  def reconcile(_, _, _), do: {:error, :invalid}

  defp compensate_or_ask(action, result, active_pv, opts) do
    can_compensate? =
      opts[:allow_compensate] == true and
        opts[:provider_supports_cancel] == true and
        opts[:original_authorization_permits_cancel] == true

    if can_compensate? do
      compensation = %{
        "action_id" => "cmp_" <> (action["action_id"] || "unknown"),
        "capability" => "booking_cancel",
        "state" => "requested",
        "target_provider_ref" => result["provider_ref"] || result["confirmation_ref"],
        "stale_plan_version" => action["plan_version"],
        "active_plan_version" => active_pv,
        "cancelled" => false,
        "cancellation_requested" => true,
        "cancellation_confirmed" => false
      }

      {:ok,
       %{
         "outcome" => "compensate_stale",
         "compensation" => compensation,
         "external_side_effect" => true,
         "social_plan_intact" => true,
         "human_decision" => nil,
         "cancellation_requested_not_confirmed" => true
       }}
    else
      {:ok,
       %{
         "outcome" => "human_decision",
         "external_side_effect" => true,
         "social_plan_intact" => true,
         "human_decision" => %{
           "kind" => "minimum_question",
           "topic" => "stale_external_booking",
           "copy" => "An earlier reservation may still be open.",
           "options" => ["Cancel it if possible", "Keep it", "I'll handle it"],
           "silent_discard_forbidden" => true,
           "authorizes_set" => false
         },
         "stale_action" => action,
         "provider_result" => Map.take(result, ~w(provider_ref confirmation_ref status))
       }}
    end
  end

  @doc "Mark compensation cancelled only on provider confirm."
  def confirm_compensation(compensation, provider_result) when is_map(compensation) do
    c = stringify(compensation)
    r = stringify(provider_result)

    if r["provider_confirmed"] == true or r["status"] == "cancelled" do
      {:ok,
       Map.merge(c, %{
         "state" => "confirmed",
         "cancelled" => true,
         "cancellation_confirmed" => true
       })}
    else
      {:ok,
       Map.merge(c, %{
         "state" => "requested",
         "cancelled" => false,
         "cancellation_confirmed" => false
       })}
    end
  end

  def confirm_compensation(_, _), do: {:error, :invalid}

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
