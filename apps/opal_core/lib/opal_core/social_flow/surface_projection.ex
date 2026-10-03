defmodule OpalCore.SocialFlow.SurfaceProjection do
  @moduledoc """
  Track A8 — WHERE should the user see this, and HOW do surfaces stay coherent
  without repeating the same demand.

  Derives a SurfaceProjectionDecision from domain facts. Does not own SharedPlan,
  ConversationAlignment, or AttentionAuthority. Does not create a second action
  implementation.

  FOUNDATIONAL LAW: ONE TRUTH. ONE CANONICAL ACTION. MULTIPLE COHERENT
  PROJECTIONS. NO DUPLICATE PRESSURE.
  """

  # --- A8 laws (zeros) ---

  def multiple_canonical_action_implementations?, do: false
  def active_context_duplicate_action?, do: false
  def proposer_cross_surface_action_cta?, do: false
  def downstream_action_competes_with_unsettled_upstream?, do: false
  def recommendation_cross_surface_spam?, do: false
  def every_attention_item_appears_on_home?, do: false
  def home_bypasses_mute_attention?, do: false
  def banner_while_canonical_action_visible?, do: false
  def dismiss_banner_resolves_action?, do: false

  @doc """
  Decide projections for one recipient + one underlying issue.

  Expected facts (string or atom keys):
  - source_type: proposal | booking_authorization | open_question | commitment |
    provider_failure | recommendation | memory | plan_update | waiting_on
  - source_id / attention_id / dedupe_key
  - recipient_user_id
  - role: required_responder | proposer | authorizer | observer | participant |
    commitment_owner | question_owner | waiting_on_owner | organizer
  - conversation_id / plan_id / proposal_id
  - pending_change / change_proposal_value / current_plan_when
  - active_conversation_viewer_id (if user is in canonical thread)
  - muted
  - attention_carries_action (bool)
  - upstream_unsettled (bool)
  - blocked_by / superseded_by / requires_current_plan_version
  - home_relevance (bool | nil)
  """
  @spec decide(map()) :: map()
  def decide(facts) when is_map(facts) do
    f = stringify_keys(facts)
    source_type = normalize_source_type(f["source_type"])
    role = normalize_role(f["role"])
    active? = active_context?(f)
    muted? = truthy?(f["muted"])
    home_relevance = home_relevance?(f)

    {canonical, projections, primary, ambient, suppress, reason, prominent, proposer_cta, downstream} =
      case {source_type, role} do
        {"proposal", "required_responder"} ->
          decide_proposal_responder(f, active?, muted?, home_relevance)

        {"proposal", "proposer"} ->
          decide_proposal_proposer(f, home_relevance)

        {"booking_authorization", _} ->
          decide_booking_authorization(f, role, active?, muted?, home_relevance)

        {"provider_failure", _} ->
          decide_provider_failure(f, role, active?, muted?, home_relevance)

        {"commitment", _} ->
          decide_commitment(f, role, active?, muted?, home_relevance)

        {"recommendation", _} ->
          decide_recommendation(f)

        {"memory", _} ->
          decide_memory(f)

        {"open_question", _} ->
          decide_open_question(f, role, active?, muted?, home_relevance)

        {"waiting_on", _} ->
          decide_waiting_on(f, role, home_relevance)

        {"plan_update", _} ->
          decide_plan_update(f, home_relevance)

        _ ->
          decide_default(f, role, active?, muted?, home_relevance)
      end

    %{
      "attention_id" => f["attention_id"] || f["dedupe_key"],
      "source_id" => f["source_id"],
      "recipient_user_id" => f["recipient_user_id"],
      "role" => role,
      "source_type" => source_type,
      "canonical_action_target" => canonical,
      "primary_surface" => primary,
      "allowed_ambient_surfaces" => ambient,
      "suppress_surfaces" => suppress,
      "active_context" => active?,
      "projection_reason" => reason,
      "projections" => projections,
      "downstream_suppressed" => downstream,
      "prominent_action_count" => prominent,
      "proposer_approval_cta_count" => proposer_cta,
      "multiple_canonical_action_implementations" => multiple_canonical_action_implementations?(),
      "active_context_duplicate_action" => active_context_duplicate_action?(),
      "recommendation_cross_surface_spam" => recommendation_cross_surface_spam?(),
      "home_bypasses_mute_attention" => home_bypasses_mute_attention?(),
      "banner_while_canonical_action_visible" => banner_while_canonical_action_visible?(),
      "dismiss_banner_resolves_action" => dismiss_banner_resolves_action?()
    }
  end

  def decide(_), do: decide(%{})

  @doc """
  Convenience: decide for a known source_type + role with optional extras.
  """
  @spec decide_for_role(atom() | String.t(), atom() | String.t(), map()) :: map()
  def decide_for_role(source_type, role, opts \\ %{}) do
    opts = if is_map(opts), do: opts, else: %{}

    decide(
      opts
      |> stringify_keys()
      |> Map.put("source_type", source_type)
      |> Map.put("role", role)
    )
  end

  @doc """
  True when reservation/auth should not compete with a pending upstream proposal.
  """
  @spec suppress_downstream?(map()) :: boolean()
  def suppress_downstream?(facts) when is_map(facts) do
    f = stringify_keys(facts)

    truthy?(f["upstream_unsettled"]) or truthy?(f["pending_change"]) or
      blocked_by_proposal?(f)
  end

  def suppress_downstream?(_), do: false

  @doc "Surfaces allowed to show an ACTION CTA for this decision."
  @spec prominent_action_surfaces(map()) :: [String.t()]
  def prominent_action_surfaces(decision) when is_map(decision) do
    d = stringify_keys(decision)
    projections = d["projections"] || %{}

    []
    |> maybe_action_surface(projections["thread"] == "action", "thread")
    |> maybe_action_surface(projections["graph_detail"] in ["action", "execution_failed"], "graph_detail")
    |> maybe_action_surface(
      projections["attention"] == "review_link" and d["prominent_action_count"] == 1 and
        d["primary_surface"] == "attention",
      "attention"
    )
  end

  def prominent_action_surfaces(_), do: []

  @doc """
  Compact Chats label, e.g. \"8:00 PM proposed\" or \"Ready · 7:30 PM · Fort Oak\".
  """
  @spec compact_chats_label(map()) :: String.t() | nil
  def compact_chats_label(facts) when is_map(facts) do
    f = stringify_keys(facts)
    source_type = normalize_source_type(f["source_type"])
    value = f["change_proposal_value"] || proposal_value(f)
    when_label = f["current_plan_when"]
    place = f["place"] || f["place_name"]

    cond do
      source_type == "proposal" and is_binary(value) and value != "" ->
        "#{value} proposed"

      source_type == "provider_failure" and is_binary(value) and value != "" ->
        value

      source_type == "provider_failure" ->
        "Booking issue"

      source_type == "booking_authorization" and suppress_downstream?(f) and is_binary(value) ->
        "#{value} proposed"

      source_type == "booking_authorization" ->
        "Ready to reserve"

      source_type == "commitment" and is_binary(when_label) ->
        when_label

      is_binary(when_label) and is_binary(place) ->
        "Ready · #{when_label} · #{place}"

      is_binary(when_label) ->
        when_label

      true ->
        nil
    end
  end

  def compact_chats_label(_), do: nil

  @doc "Graph pending status string, or nil when not pending."
  @spec graph_pending_status(map()) :: String.t() | nil
  def graph_pending_status(facts) when is_map(facts) do
    f = stringify_keys(facts)
    source_type = normalize_source_type(f["source_type"])
    value = f["change_proposal_value"] || proposal_value(f)

    cond do
      source_type == "proposal" and is_binary(value) and value != "" ->
        "#{value} proposed"

      source_type == "proposal" ->
        "Change proposed"

      source_type == "booking_authorization" and suppress_downstream?(f) and is_binary(value) ->
        "#{value} proposed"

      source_type == "provider_failure" ->
        "Booking failed"

      source_type == "commitment" ->
        nil

      true ->
        nil
    end
  end

  def graph_pending_status(_), do: nil

  @doc "Whether a banner is allowed for this decision."
  @spec banner_allowed?(map()) :: boolean()
  def banner_allowed?(decision) when is_map(decision) do
    d = stringify_keys(decision)
    projections = d["projections"] || %{}
    projections["banner"] == "allow"
  end

  def banner_allowed?(_), do: false

  @doc "Home pending treatment atom."
  @spec home_pending_treatment(map()) :: :none | :quiet_status | :relevant
  def home_pending_treatment(decision) when is_map(decision) do
    d = stringify_keys(decision)
    projections = d["projections"] || %{}

    case projections["home"] do
      "quiet_status" -> :quiet_status
      "relevant" -> :relevant
      _ -> :none
    end
  end

  def home_pending_treatment(_), do: :none

  @doc """
  Thin helper: build SurfaceProjection facts from an AttentionAuthority item + extras.
  Does not rewrite AttentionAuthority.
  """
  @spec facts_from_attention_item(map(), map()) :: map()
  def facts_from_attention_item(item, extras \\ %{}) when is_map(item) do
    item = stringify_keys(item)
    extras = stringify_keys(if is_map(extras), do: extras, else: %{})

    %{
      "attention_id" => item["attention_id"] || item["id"] || item["dedupe_key"],
      "source_id" => item["source_id"],
      "dedupe_key" => item["dedupe_key"],
      "recipient_user_id" => item["recipient_user_id"],
      "role" => item["role"] || extras["role"],
      "source_type" => item["source_type"] || extras["source_type"],
      "conversation_id" => item["conversation_id"] || get_in(item, ["deep_link", "conversation_id"]),
      "plan_id" => item["plan_id"] || get_in(item, ["deep_link", "plan_id"]),
      "proposal_id" => item["proposal_id"] || get_in(item, ["deep_link", "proposal_id"]),
      "attention_carries_action" => item["action_required"] == true
    }
    |> Map.merge(extras)
  end

  # --- role / source decisions ---

  defp decide_proposal_responder(f, active?, muted?, home_relevance) do
    banner = banner_for(active?, muted?)
    home = home_for_pending(home_relevance, muted?)
    suppress = suppress_list(banner, home, muted?)

    canonical = canonical_target(f, "thread", "change_proposal")

    projections = %{
      "thread" => "action",
      "attention" => "review_link",
      "graph_detail" => "pending_status",
      "graph_list" => "compact_status",
      "chats" => "compact_consequence",
      "home" => home,
      "banner" => banner
    }

    ambient = ambient_for(["attention", "graph_detail", "chats", "graph_list"], home, banner)

    {canonical, projections, "thread", ambient, suppress, "proposal_responder_action", 1, 0, []}
  end

  defp decide_proposal_proposer(f, home_relevance) do
    home = home_for_pending(home_relevance, false)
    suppress = ["banner", "home_action"]

    canonical = canonical_target(f, "thread", "change_proposal")

    projections = %{
      "thread" => "waiting_status",
      "attention" => "waiting",
      "graph_detail" => "pending_status",
      "graph_list" => "compact_status",
      "chats" => "compact_consequence",
      "home" => home,
      "banner" => "suppress"
    }

    ambient = ambient_for(["attention", "graph_detail", "chats", "graph_list"], home, "suppress")

    {canonical, projections, "thread", ambient, suppress, "proposal_proposer_waiting", 0, 0, []}
  end

  defp decide_booking_authorization(f, role, active?, muted?, home_relevance) do
    if suppress_downstream?(f) do
      # Upstream proposal owns the action — reservation does not compete.
      banner = "suppress"
      home = home_for_pending(home_relevance, muted?)
      suppress = ["banner", "home_action", "reservation_auth_cta"]

      canonical = canonical_target(f, "thread", "change_proposal")

      projections = %{
        "thread" => if(role == "required_responder", do: "action", else: "waiting_status"),
        "attention" => if(role == "required_responder", do: "review_link", else: "waiting"),
        "graph_detail" => "pending_status",
        "graph_list" => "compact_status",
        "chats" => "compact_consequence",
        "home" => home,
        "banner" => banner
      }

      ambient = ambient_for(["attention", "graph_detail", "chats"], home, banner)
      prominent = if role == "required_responder", do: 1, else: 0

      {canonical, projections, "thread", ambient, suppress,
       "booking_auth_suppressed_by_upstream_proposal", prominent, 0, ["reservation_auth"]}
    else
      banner = banner_for(active?, muted?)
      home = home_for_pending(home_relevance, muted?)
      suppress = suppress_list(banner, home, muted?)
      focus = "reservation_auth"
      primary = if role in ["authorizer", "required_responder", "organizer"], do: "thread", else: "attention"
      action? = role in ["authorizer", "required_responder", "organizer"]

      canonical = canonical_target(f, primary, if(action?, do: focus, else: nil))

      projections = %{
        "thread" => if(action?, do: "action", else: "none"),
        "attention" => if(action?, do: "review_link", else: "updated"),
        "graph_detail" => "pending_status",
        "graph_list" => "compact_status",
        "chats" => "compact_consequence",
        "home" => home,
        "banner" => banner
      }

      ambient = ambient_for(["attention", "graph_detail", "chats"], home, banner)
      prominent = if action?, do: 1, else: 0

      {canonical, projections, primary, ambient, suppress, "booking_authorization", prominent, 0, []}
    end
  end

  defp decide_provider_failure(f, role, active?, muted?, home_relevance) do
    banner = banner_for(active?, muted?)
    home = home_for_pending(home_relevance, muted?)
    suppress = suppress_list(banner, home, muted?)
    owns_thread? = is_binary(f["conversation_id"]) and f["conversation_id"] != ""
    action_role? = role in ["authorizer", "required_responder", "organizer", "commitment_owner"]

    thread =
      cond do
        owns_thread? and action_role? -> "action"
        owns_thread? -> "waiting_status"
        true -> "none"
      end

    primary = if thread == "action", do: "thread", else: "attention"
    canonical = canonical_target(f, primary, if(thread == "action", do: "reservation_auth", else: nil))

    projections = %{
      "thread" => thread,
      "attention" => "review_link",
      "graph_detail" => "execution_failed",
      "graph_list" => "compact_status",
      "chats" => "compact_consequence",
      "home" => home,
      "banner" => banner
    }

    ambient = ambient_for(["attention", "graph_detail", "chats"], home, banner)
    prominent = if thread == "action" or action_role?, do: 1, else: 0

    {canonical, projections, primary, ambient, suppress, "provider_failure", prominent, 0, []}
  end

  defp decide_commitment(f, _role, active?, muted?, home_relevance) do
    banner = banner_for(active?, muted?)
    home = if home_relevance and not muted?, do: "relevant", else: "none"
    suppress = suppress_list(banner, home, muted?)
    canonical = canonical_target(f, "graph_detail", "commitment")

    projections = %{
      "thread" => "none",
      "attention" => "review_link",
      "graph_detail" => "commitment_visible",
      "graph_list" => "compact_status",
      "chats" => "compact_consequence",
      "home" => home,
      "banner" => banner
    }

    ambient = ambient_for(["attention", "graph_detail", "chats"], home, banner)

    {canonical, projections, "attention", ambient, suppress, "commitment_due", 1, 0, []}
  end

  defp decide_recommendation(_f) do
    canonical = %{
      "surface" => "none",
      "focus" => nil,
      "conversation_id" => nil,
      "plan_id" => nil,
      "proposal_id" => nil
    }

    projections = %{
      "thread" => "none",
      "attention" => "none",
      "graph_detail" => "current_only",
      "graph_list" => "compact_status",
      "chats" => "none",
      "home" => "none",
      "banner" => "suppress"
    }

    {canonical, projections, "none", [], ["banner", "home_action", "attention"], "recommendation_silent", 0,
     0, []}
  end

  defp decide_memory(_f) do
    canonical = %{
      "surface" => "none",
      "focus" => nil,
      "conversation_id" => nil,
      "plan_id" => nil,
      "proposal_id" => nil
    }

    projections = %{
      "thread" => "none",
      "attention" => "none",
      "graph_detail" => "current_only",
      "graph_list" => "compact_status",
      "chats" => "none",
      "home" => "none",
      "banner" => "suppress"
    }

    {canonical, projections, "none", [], ["banner", "home_action", "attention"], "memory_silent", 0, 0, []}
  end

  defp decide_open_question(f, role, active?, muted?, home_relevance) do
    banner = banner_for(active?, muted?)
    home = home_for_pending(home_relevance, muted?)
    suppress = suppress_list(banner, home, muted?)
    action? = role in ["required_responder", "question_owner"]

    canonical = canonical_target(f, "thread", if(action?, do: "open_question", else: nil))

    projections = %{
      "thread" => if(action?, do: "action", else: "waiting_status"),
      "attention" => if(action?, do: "review_link", else: "waiting"),
      "graph_detail" => "pending_status",
      "graph_list" => "compact_status",
      "chats" => "compact_consequence",
      "home" => home,
      "banner" => banner
    }

    ambient = ambient_for(["attention", "graph_detail", "chats"], home, banner)
    prominent = if action?, do: 1, else: 0

    {canonical, projections, "thread", ambient, suppress, "open_question", prominent, 0, []}
  end

  defp decide_waiting_on(f, role, home_relevance) do
    home = home_for_pending(home_relevance, false)
    suppress = ["banner", "home_action"]
    owner? = role in ["waiting_on_owner", "required_responder"]

    canonical = canonical_target(f, "thread", nil)

    projections = %{
      "thread" => "waiting_status",
      "attention" => if(owner?, do: "waiting", else: "none"),
      "graph_detail" => "pending_status",
      "graph_list" => "compact_status",
      "chats" => "compact_consequence",
      "home" => home,
      "banner" => "suppress"
    }

    ambient = ambient_for(["attention", "graph_detail", "chats"], home, "suppress")

    {canonical, projections, "attention", ambient, suppress, "waiting_on", 0, 0, []}
  end

  defp decide_plan_update(f, home_relevance) do
    home = if home_relevance, do: "quiet_status", else: "none"
    suppress = ["banner", "home_action"]
    canonical = canonical_target(f, "none", nil)

    projections = %{
      "thread" => "settled",
      "attention" => "updated",
      "graph_detail" => "current_only",
      "graph_list" => "compact_status",
      "chats" => "compact_consequence",
      "home" => home,
      "banner" => "suppress"
    }

    ambient = ambient_for(["attention", "graph_detail", "chats"], home, "suppress")

    {canonical, projections, "attention", ambient, suppress, "plan_update", 0, 0, []}
  end

  defp decide_default(f, role, active?, muted?, home_relevance) do
    banner = banner_for(active?, muted?)
    home = home_for_pending(home_relevance, muted?)
    suppress = suppress_list(banner, home, muted?)
    canonical = canonical_target(f, "none", nil)

    projections = %{
      "thread" => "none",
      "attention" => "none",
      "graph_detail" => "current_only",
      "graph_list" => "compact_status",
      "chats" => "none",
      "home" => home,
      "banner" => banner
    }

    ambient = ambient_for([], home, banner)
    _ = role

    {canonical, projections, "none", ambient, suppress, "default_quiet", 0, 0, []}
  end

  # --- helpers ---

  defp canonical_target(f, surface, focus) do
    %{
      "surface" => surface,
      "focus" => focus,
      "conversation_id" => f["conversation_id"],
      "plan_id" => f["plan_id"],
      "proposal_id" => f["proposal_id"]
    }
  end

  defp active_context?(f) do
    recipient = f["recipient_user_id"]
    viewer = f["active_conversation_viewer_id"]

    truthy?(f["active_context"]) or
      (is_binary(recipient) and is_binary(viewer) and recipient == viewer)
  end

  defp home_relevance?(f) do
    case f["home_relevance"] do
      true -> true
      "true" -> true
      _ -> false
    end
  end

  defp home_for_pending(true, false), do: "quiet_status"
  defp home_for_pending(true, true), do: "none"
  defp home_for_pending(_, _), do: "none"

  defp banner_for(true, _), do: "suppress"
  defp banner_for(_, true), do: "suppress"
  defp banner_for(_, _), do: "allow"

  defp suppress_list("suppress", "none", true), do: ["banner", "home_action"]
  defp suppress_list("suppress", "none", _), do: ["banner"]
  defp suppress_list("suppress", _, true), do: ["banner", "home_action"]
  defp suppress_list("suppress", _, _), do: ["banner"]
  defp suppress_list(_, "none", true), do: ["home_action"]
  defp suppress_list(_, _, true), do: ["home_action"]
  defp suppress_list(_, _, _), do: []

  defp ambient_for(base, home, banner) do
    base
    |> then(fn list -> if home in ["quiet_status", "relevant"], do: ["home" | list], else: list end)
    |> then(fn list -> if banner == "allow", do: ["banner" | list], else: list end)
    |> Enum.uniq()
  end

  defp blocked_by_proposal?(f) do
    blocked = f["blocked_by"]

    cond do
      is_binary(blocked) and String.contains?(blocked, "proposal") -> true
      is_map(blocked) and normalize_source_type(blocked["source_type"] || blocked["type"]) == "proposal" ->
        true
      truthy?(f["pending_change"]) -> true
      true -> false
    end
  end

  defp proposal_value(f) do
    case f["change_proposal"] do
      %{"value" => v} when is_binary(v) -> v
      _ -> nil
    end
  end

  defp maybe_action_surface(list, true, surface), do: list ++ [surface]
  defp maybe_action_surface(list, _, _), do: list

  defp normalize_source_type(nil), do: "unknown"

  defp normalize_source_type(t) when is_atom(t), do: normalize_source_type(Atom.to_string(t))

  defp normalize_source_type(t) when is_binary(t) do
    case String.downcase(t) do
      "proposal" -> "proposal"
      "time_proposal_pending" -> "proposal"
      "change_proposal" -> "proposal"
      "booking_authorization" -> "booking_authorization"
      "reservation_auth" -> "booking_authorization"
      "booking_auth" -> "booking_authorization"
      "provider_failure" -> "provider_failure"
      "booking_failed" -> "provider_failure"
      "commitment" -> "commitment"
      "commitment_due" -> "commitment"
      "recommendation" -> "recommendation"
      "memory" -> "memory"
      "open_question" -> "open_question"
      "waiting_on" -> "waiting_on"
      "plan_update" -> "plan_update"
      other -> other
    end
  end

  defp normalize_source_type(_), do: "unknown"

  defp normalize_role(nil), do: "participant"
  defp normalize_role(r) when is_atom(r), do: normalize_role(Atom.to_string(r))

  defp normalize_role(r) when is_binary(r) do
    case String.downcase(r) do
      "required_responder" -> "required_responder"
      "responder" -> "required_responder"
      "proposer" -> "proposer"
      "authorizer" -> "authorizer"
      "observer" -> "observer"
      "participant" -> "participant"
      "commitment_owner" -> "commitment_owner"
      "question_owner" -> "question_owner"
      "waiting_on_owner" -> "waiting_on_owner"
      "organizer" -> "organizer"
      other -> other
    end
  end

  defp normalize_role(_), do: "participant"

  defp truthy?(v), do: v == true or v == "true" or v == 1

  defp stringify_keys(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
