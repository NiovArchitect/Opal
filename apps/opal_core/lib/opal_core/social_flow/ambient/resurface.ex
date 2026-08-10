defmodule OpalCore.SocialFlow.Ambient.Resurface do
  @moduledoc """
  Meaningful-change threshold for re-entering after quiet.

  Material changes may justify resurfacing. Noise must not.
  """

  @material ~w(
    venue_closed
    required_participant_joined
    required_participant_left
    travel_unrealistic
    slot_expired
    price_material_change
    event_starts_soon
    plan_time_changed
    capacity_impossible
    provider_failed
    hard_constraint_failed
  )

  @noise ~w(
    rating_micro_shift
    eta_one_minute
    popularity_micro
    message_count
    provider_ping
  )

  def material_kinds, do: @material
  def noise_kinds, do: @noise

  @doc """
  Decide whether a change set justifies leaving quiet / re-evaluating surface.
  """
  def decide(changes) when is_list(changes) do
    kinds =
      changes
      |> Enum.map(fn
        k when is_binary(k) -> k
        %{kind: k} -> to_string(k)
        %{"kind" => k} -> to_string(k)
        other -> to_string(other)
      end)

    material = Enum.filter(kinds, &(&1 in @material))
    noise = Enum.filter(kinds, &(&1 in @noise))

    justify? = material != []

    {:ok,
     %{
       "resurface" => justify?,
       "material" => material,
       "noise" => noise,
       "reason" => if(justify?, do: hd(material), else: "noise_or_empty"),
       "authorizes_set" => false
     }}
  end

  def decide(_), do: {:ok, %{"resurface" => false, "reason" => "invalid"}}
end
