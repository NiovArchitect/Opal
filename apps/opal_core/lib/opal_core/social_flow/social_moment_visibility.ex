defmodule OpalCore.SocialFlow.SocialMomentVisibility do
  @moduledoc """
  Server visibility rules for Social Moments (Pass 17–18).

  Visibility is not a UI filter — enforcement is mandatory.
  Integrates TrustSafety blocks + RelationshipGraph friend authority.
  Hide is viewer-local. Report ≠ delete.

  Pass 18: FRIENDS is never default-true. opts[:friends?] must be
  RelationshipGraph.friend_visibility_authorized?/2 unless testing.
  """

  alias OpalCore.SocialFlow.RelationshipGraph

  @doc """
  Can viewer fetch this moment?

  opts:
  - blocked?: boolean override (tests)
  - hidden?: viewer hid moment
  - member_of_group?: for group visibility
  - friends?: relationship graph membership (friends scope) — MUST be explicit for friends
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
        case to_string(m["visibility"] || RelationshipGraph.default_visibility()) do
          "private" ->
            false

          "specific_people" ->
            audience = List.wrap(m["audience_user_ids"] || m[:audience_user_ids] || [])
            Enum.any?(audience, &(to_string(&1) == viewer)) and not blocked?(author, viewer, opts)

          "group" ->
            Keyword.get(opts, :member_of_group?, false) == true

          "friends" ->
            # Pass 18: never default true — missing friends? is deny
            case Keyword.fetch(opts, :friends?) do
              {:ok, true} -> true
              {:ok, false} -> false
              :error -> false
            end

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
  def default_visibility, do: RelationshipGraph.default_visibility()

  @doc "Supported scopes — no public invent."
  def supported_visibilities, do: ~w(private specific_people group friends)

  @doc "Debug snapshot — never product UI."
  def debug_decision(moment, viewer_user_id, opts \\ []) do
    m = stringify(moment)
    author = to_string(m["author_user_id"] || "")
    viewer = to_string(viewer_user_id || "")
    friends? = Keyword.get(opts, :friends?)
    member? = Keyword.get(opts, :member_of_group?, false)
    hidden? = Keyword.get(opts, :hidden?, false)
    blocked = blocked?(author, viewer, opts)
    allowed = can_view?(moment, viewer_user_id, opts)

    %{
      "moment_id" => m["id"],
      "viewer_id" => viewer,
      "author_id" => author,
      "visibility" => m["visibility"],
      "moderation_state" => m["moderation_state"],
      "friends?" => friends?,
      "member_of_group?" => member?,
      "hidden?" => hidden?,
      "blocked" => blocked,
      "decision" => if(allowed, do: "allow", else: "deny"),
      "reason" =>
        cond do
          viewer == author -> "author"
          blocked -> "blocked"
          hidden? -> "hidden"
          m["moderation_state"] in ~w(removed restricted) -> "moderation"
          m["visibility"] == "friends" and friends? != true -> "not_friend"
          m["visibility"] == "group" and not member? -> "not_group_member"
          allowed -> "authorized"
          true -> "not_in_audience"
        end
    }
  end

  defp blocked?(author, viewer, opts) do
    case Keyword.fetch(opts, :blocked?) do
      {:ok, b} -> b == true
      :error ->
        # Either direction relationship block prevents moment delivery
        RelationshipGraph.safety_blocked?(author, viewer)
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
