defmodule OpalCore.SocialFlow.Execution.ExecutionRequirements do
  @moduledoc """
  Infer which execution capabilities a plan needs — no user configuration.

  From plan type, place/event facts, and conversation evidence.
  """

  @doc """
  Returns capability flags for a plan context.
  """
  def infer(attrs) when is_map(attrs) do
    a = stringify(attrs)
    type = plan_type(a)

    reservation? =
      a["reservation_needed"] == true or
        type in ~w(dinner restaurant) or
        a["reservation_support"] == true or
        a["opentable_slug"] not in [nil, ""]

    ticket? =
      a["ticket_needed"] == true or type in ~w(concert event sports) or
        a["ticket_support"] == true

    navigation? =
      a["navigation_useful"] != false and
        (is_binary(a["destination"] || a["place"] || a["place_label"]) or
           type not in ~w(virtual call))

    reminder? =
      a["reminder_useful"] != false and a["set"] == true and
        match?(%DateTime{}, a["when"] || a["plan_start"] || a["start_at"])

    payment_later? =
      a["payment_required_later"] == true or (ticket? and a["price_each"] not in [nil, 0])

    path = execution_path(type, reservation?, ticket?, navigation?, reminder?)

    {:ok,
     %{
       "plan_type" => type,
       "reservation_needed" => reservation? and not park_or_house?(type, a),
       "ticket_needed" => ticket?,
       "navigation_useful" => navigation?,
       "reminder_useful" => reminder?,
       "payment_required_later" => payment_later?,
       "execution_path" => path,
       "workflow_ui" => false,
       "authorizes_set" => false
     }}
  end

  def infer(_),
    do:
      {:ok,
       %{
         "reservation_needed" => false,
         "ticket_needed" => false,
         "navigation_useful" => true,
         "reminder_useful" => true
       }}

  defp plan_type(a) do
    t = a["plan_type"] || a["experience_type"] || a["category"] || a["place_type"]

    cond do
      is_binary(t) -> String.downcase(t)
      a["ticket_support"] == true -> "event"
      true -> "meetup"
    end
  end

  defp park_or_house?(type, a) do
    type in ~w(park outdoor house home friend_house) or
      a["place_kind"] in ~w(park house home)
  end

  defp execution_path(type, res?, tick?, nav?, rem?) do
    base =
      cond do
        type in ~w(dinner restaurant) and res? ->
          ["booking_handoff"]

        type in ~w(concert event sports) and tick? ->
          ["ticket_handoff"]

        type in ~w(park outdoor house home friend_house) ->
          []

        true ->
          if res?, do: ["booking_handoff"], else: []
      end

    base
    |> then(fn p -> if rem?, do: p ++ ["reminder"], else: p end)
    |> then(fn p -> if nav?, do: p ++ ["navigation"], else: p end)
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
