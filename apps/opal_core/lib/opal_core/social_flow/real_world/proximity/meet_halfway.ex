defmodule OpalCore.SocialFlow.RealWorld.Proximity.MeetHalfway do
  @moduledoc """
  Meet-halfway zone derivation without forcing users to calculate.

  Inputs: privacy-safe approximate areas.
  Output: candidate zone labels (0–3), never raw coordinates.
  """

  @doc """
  Derive candidate meet zones from approximate area labels.

  Simple deterministic midpoint on shared city/region vocabulary for now.
  """
  def candidate_zones(areas) when is_list(areas) do
    labels =
      areas
      |> Enum.map(&area_label/1)
      |> Enum.reject(&is_nil/1)
      |> Enum.uniq()

    cond do
      labels == [] ->
        {:ok, %{"zones" => [], "shared_copy" => nil}}

      length(labels) == 1 ->
        {:ok,
         %{
           "zones" => [%{"label" => hd(labels), "kind" => "shared_area"}],
           "shared_copy" => "#{hd(labels)} looks easy for both of you."
         }}

      true ->
        # Privacy-safe: propose both neighborhoods + a generic midway framing
        zones =
          labels
          |> Enum.take(2)
          |> Enum.map(&%{"label" => &1, "kind" => "participant_area"})
          |> Kernel.++([%{"label" => "midway", "kind" => "meet_halfway"}])
          |> Enum.take(3)

        {:ok,
         %{
           "zones" => zones,
           "shared_copy" => "A couple areas fit.",
           "no_coordinates" => true
         }}
    end
  end

  def candidate_zones(_), do: {:ok, %{"zones" => [], "shared_copy" => nil}}

  defp area_label(%{"area_label" => l}) when is_binary(l), do: l
  defp area_label(%{area_label: l}) when is_binary(l), do: l
  defp area_label(l) when is_binary(l), do: l
  defp area_label(_), do: nil
end
