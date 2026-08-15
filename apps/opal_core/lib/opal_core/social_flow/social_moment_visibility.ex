defmodule OpalCore.SocialFlow.SocialMomentVisibility do
  @moduledoc """
  Server visibility rules for Social Moments (Pass 17).

  Visibility is not a UI filter — enforcement is mandatory.
  Integrates TrustSafety blocks. Hide is viewer-local. Report ≠ delete.
  """

  alias OpalCore.SocialFlow.TrustSafety

  @doc """
  Can viewer fetch this moment?

  opts:
  - blocked?: boolean override (tests)
  - hidden?: viewer hid moment
  - member_of_group?: for group visibility
  - friends?: relationship graph membership (friends scope)
  """
  def can_view?(moment, viewer_user_id, opts \\ [])

  def can_view?(moment, viewer_user_id, opts) when is_map(moment) do
    m = stringify(moment)
    viewer = to_string(viewer_user_id || "")
    author = to_string(m["author_user_id"] || m[:author_user_id] || "")

    cond do
      viewer == "" ->
        false

      not is_nil(m["deleted_at"] || m[:deleted_at]) ->
        # Author may still manage tombstone; public viewers cannot
        viewer == author and Keyword.get(opts, :author_manage, false)

      m["moderation_state"] in ~w(removed restricted) and viewer != author ->
        false

      viewer == author ->
        true

      Keyword.get(opts, :hidden?, false) ->
        false

      blocked?(author, viewer, opts) ->
        false

      true ->
        case to_string(m["visibility"] || "friends") do
          "private" ->
            false

          "specific_people" ->
            audience = List.wrap(m["audience_user_ids"] || m[:audience_user_ids] || [])
            Enum.any?(audience, &(to_string(&1) == viewer))

          "group" ->
            Keyword.get(opts, :member_of_group?, false) == true

          "friends" ->
            Keyword.get(opts, :friends?, true) == true

          _ ->
            false
        end
    end
  end

  def can_view?(_, _, _), do: false

  @doc "Can viewer access media bytes for a moment they can already view?"
  def can_access_media?(moment, viewer_user_id, opts \\ []) do
    can_view?(moment, viewer_user_id, opts) and
      to_string(moment["moderation_state"] || "active") in ~w(active pending)
  end

  @doc "Publish does not create economic attribution."
  def publish_creates_attribution?, do: false

  @doc "Publish does not create push notifications by default."
  def publish_creates_notification?, do: false

  @doc "Discovery ranking must ignore commission value."
  def discovery_uses_commission?, do: false

  @doc "Default visibility is relationship-centered, never public."
  def default_visibility, do: "friends"

  @doc "Supported scopes — no public invent."
  def supported_visibilities, do: ~w(private specific_people group friends)

  defp blocked?(author, viewer, opts) do
    case Keyword.fetch(opts, :blocked?) do
      {:ok, b} -> b == true
      :error ->
        # Either direction relationship block prevents moment delivery
        TrustSafety.blocked?(author, viewer) or TrustSafety.blocked?(viewer, author)
    end
  rescue
    _ -> Keyword.get(opts, :blocked?, false) == true
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
