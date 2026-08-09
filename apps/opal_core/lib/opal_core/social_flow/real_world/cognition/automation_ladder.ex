defmodule OpalCore.SocialFlow.RealWorld.Cognition.AutomationLadder do
  @moduledoc """
  Safe automation ladder:

  understand → privately_suggest → prepare → authorize → execute → confirm

  Cognition may run freely through prepare.
  External effects require authorize before execute.
  """

  @rungs ~w(understand privately_suggest prepare authorize execute confirm)

  @external_actions ~w(
    share_availability
    share_location
    share_eta
    create_calendar_event
    send_external_message
    place_call
    start_navigation
    make_reservation
    purchase
    payment
  )

  def rungs, do: @rungs
  def external_actions, do: @external_actions

  @doc "True if action requires progressive user authorization."
  def external_action?(action) when is_binary(action), do: action in @external_actions
  def external_action?(action) when is_atom(action), do: external_action?(Atom.to_string(action))
  def external_action?(_), do: true

  @doc """
  Advance one rung if policy allows.

  Cannot skip authorize for external actions.
  """
  def advance(state, opts \\ []) when is_map(state) do
    s = stringify(state)
    rung = s["rung"] || "understand"
    action = s["action"] || "cognition"
    authorized? = s["user_authorized"] == true or Keyword.get(opts, :user_authorized) == true

    next = next_rung(rung)

    cond do
      next == nil ->
        {:ok, s}

      external_action?(action) and next in ~w(execute confirm) and not authorized? and
          rung != "authorize" ->
        # Force stop at authorize
        {:ok, Map.put(s, "rung", "authorize") |> Map.put("awaiting_authorization", true)}

      external_action?(action) and next == "execute" and not authorized? ->
        {:error, :authorization_required}

      true ->
        {:ok,
         s
         |> Map.put("rung", next)
         |> Map.put("awaiting_authorization", next == "authorize" and external_action?(action))}
    end
  end

  @doc "May run cognition freely without user prompt."
  def cognition_rung?(rung) when rung in ~w(understand privately_suggest prepare), do: true
  def cognition_rung?(_), do: false

  defp next_rung("understand"), do: "privately_suggest"
  defp next_rung("privately_suggest"), do: "prepare"
  defp next_rung("prepare"), do: "authorize"
  defp next_rung("authorize"), do: "execute"
  defp next_rung("execute"), do: "confirm"
  defp next_rung("confirm"), do: nil
  defp next_rung(_), do: "understand"

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
