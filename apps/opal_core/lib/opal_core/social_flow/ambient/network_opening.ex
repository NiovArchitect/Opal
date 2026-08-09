defmodule OpalCore.SocialFlow.Ambient.NetworkOpening do
  @moduledoc """
  Network heat inputs from permissioned relationship graph — not address-book dump.

  Uses selected/hashed contacts matching contract only.
  Feeds Ambient heat privately; never exposes who was scanned.
  """

  alias OpalCore.SocialFlow.Ambient.Heat
  alias OpalCore.SocialFlow.RealWorld.Contacts.Matching

  @doc """
  Build private network signals from selected contacts match + opening overlap.
  """
  def from_selected_contacts(attrs) when is_map(attrs) do
    a = stringify(attrs)

    with {:ok, req} <-
           Matching.build_request(%{
             owner_user_id: a["owner_user_id"],
             selected_contacts: a["selected_contacts"] || []
           }) do
      matched = List.wrap(a["matched_user_ids"] || [])
      nearby = List.wrap(a["nearby_matched_ids"] || [])
      overlapping = a["overlapping_windows"] == true

      {:ok, heat} =
        Heat.compute(%{
          "friends_nearby_count" => length(nearby),
          "overlapping_windows" => overlapping,
          "group_coordinating" => a["group_coordinating"] == true,
          "shared_interest" => a["shared_interest"] == true,
          "preference_fit" => a["preference_fit"] || 0.5,
          "relationship_context" => a["relationship_context"] || "friends",
          "local_activity" => a["local_activity"] || 0.3
        })

      {:ok,
       %{
         "contact_method" => req["method"],
         "full_address_book_uploaded" => false,
         "matched_count" => length(matched),
         "nearby_count" => length(nearby),
         "network_heat" => heat["network"],
         "contextual_trending" => heat["contextual_trending"],
         "scanned_identities_exposed" => false,
         "raw_contacts_stored" => false,
         "heat_map_ui" => false,
         "private" => true
       }}
    end
  end

  def from_selected_contacts(_), do: {:error, :invalid}

  @doc "Contextual invite when network opening is strong — not spam."
  def invite_for_opening(attrs) when is_map(attrs) do
    a = stringify(attrs)

    if a["network_heat"] && to_f(a["network_heat"]) >= 0.5 do
      Matching.contextual_invite(%{
        inviter_user_id: a["owner_user_id"],
        conversation_id: a["conversation_id"],
        plan_context: a["plan_context"] || "opening",
        shared_safe_summary: a["shared_safe_summary"] || "Something could work tonight."
      })
    else
      {:ok, %{"invite" => false, "reason" => "network_heat_weak", "spam_invite" => false}}
    end
  end

  def invite_for_opening(_), do: {:error, :invalid}

  defp to_f(n) when is_number(n), do: n * 1.0
  defp to_f(_), do: 0.0

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
