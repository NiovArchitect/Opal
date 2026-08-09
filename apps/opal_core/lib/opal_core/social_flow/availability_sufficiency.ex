defmodule OpalCore.SocialFlow.AvailabilitySufficiency do
  @moduledoc """
  Sufficiency resolver — *do we already know enough to help?*

  Additive under the frozen UX. Integrates with existing alignment-gap vocabulary
  via `AvailabilityAlignmentEvidence`. Does **not** implement a second alignment
  engine, Set authority, or automatic disclosure.

  ## Cascade outputs

  - `:enough_to_compute` — shared-safe overlap already exists from active shares
  - `:needs_permission` — private data can form a useful conclusion; user must authorize share
  - `:needs_confirmation` — data existed but is stale; smallest confirm, not full re-entry
  - `:needs_input` — no usable private windows; fallback editor / one missing input
  - `:no_useful_intervention` — blocked, silence, or no valuable action

  ## Future sources

  Callers may later fuse `calendar_free_busy` / device schedules into the same
  `facts` map. Phase 1 facts come from manual windows + intentional shares only.
  """

  @type decision ::
          :enough_to_compute
          | :needs_permission
          | :needs_confirmation
          | :needs_input
          | :no_useful_intervention

  @doc """
  Pure decision from gathered facts (no I/O).

  Expected fact keys (all optional except as used):

  - `:blocked` boolean
  - `:shared_overlap_found` boolean
  - `:has_fresh_windows` boolean
  - `:stale_only_windows` boolean — had windows, none still usable
  - `:private_preview_overlap` boolean — actor private ∩ peer shares
  - `:peer_has_shares` boolean
  - `:actor_has_active_share` boolean
  """
  @spec resolve(map()) :: decision()
  def resolve(facts) when is_map(facts) do
    cond do
      truthy?(facts[:blocked]) ->
        :no_useful_intervention

      truthy?(facts[:shared_overlap_found]) ->
        :enough_to_compute

      truthy?(facts[:stale_only_windows]) and not truthy?(facts[:has_fresh_windows]) ->
        :needs_confirmation

      truthy?(facts[:private_preview_overlap]) ->
        :needs_permission

      truthy?(facts[:has_fresh_windows]) and not truthy?(facts[:actor_has_active_share]) ->
        :needs_permission

      truthy?(facts[:has_fresh_windows]) and truthy?(facts[:peer_has_shares]) and
          not truthy?(facts[:shared_overlap_found]) ->
        # Shared peer data exists but no intersection yet — still may need more times
        :needs_input

      not truthy?(facts[:has_fresh_windows]) ->
        :needs_input

      true ->
        :no_useful_intervention
    end
  end

  @doc "Fallback order for documentation and tests (not a runtime loop)."
  def cascade_order do
    [
      :enough_to_compute,
      :needs_permission,
      :needs_confirmation,
      :needs_input,
      :no_useful_intervention
    ]
  end

  defp truthy?(true), do: true
  defp truthy?(false), do: false
  defp truthy?(nil), do: false
  defp truthy?(_), do: true
end
