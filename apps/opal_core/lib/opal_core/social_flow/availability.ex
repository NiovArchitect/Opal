defmodule OpalCore.SocialFlow.Availability do
  @moduledoc """
  Additive SocialFlow capability: private windows + intentional shares +
  deterministic shared-safe overlap.

  Feeds existing alignment as **one evidence input** — does **not** replace
  messaging, Set authority, discovery, product shell, or invent a parallel Set.

  No availability row is required for conversations.
  Overlap never authorizes Set; only `AlignmentAuthority` may elevate to Set
  after real mutual agreement (messages / private participation).
  """

  import Ecto.Query

  alias OpalCore.Repo
  alias OpalCore.Messaging.ConversationMember
  alias OpalCore.SocialFlow.AvailabilityShare
  alias OpalCore.SocialFlow.AvailabilityWindow
  alias OpalCore.SocialFlow.RateLimitBucket
  alias OpalCore.SocialFlow.TrustSafety

  # Soft product ceilings — not IP hard-blocks; protect abuse without homework UX.
  @window_create_max 40
  @window_create_window_sec 3_600
  @share_max 30
  @share_window_sec 3_600

  # ---------------------------------------------------------------------------
  # Private windows (owner only)
  # ---------------------------------------------------------------------------

  @doc "Create a private availability window for the owner. Phase 1 source is manual."
  def create_window(attrs) when is_map(attrs) do
    owner = fetch!(attrs, :owner_user_id)
    source = Map.get(attrs, :source) || "manual"

    # Phase 1: only manual is accepted at the product boundary.
    with :ok <- ensure_manual_source(source),
         :ok <- rate_limit_window_create(owner) do
      %AvailabilityWindow{}
      |> AvailabilityWindow.changeset(%{
        owner_user_id: owner,
        start_at: fetch!(attrs, :start_at),
        end_at: Map.get(attrs, :end_at),
        open_ended: Map.get(attrs, :open_ended) == true or is_nil(Map.get(attrs, :end_at)),
        timezone: Map.get(attrs, :timezone) || "UTC",
        source: "manual",
        status: "active",
        expires_at: Map.get(attrs, :expires_at)
      })
      |> Repo.insert()
      |> case do
        {:ok, w} -> {:ok, w}
        {:error, cs} -> {:error, cs}
      end
    end
  end

  def list_my_windows(owner_user_id) when is_binary(owner_user_id) do
    from(w in AvailabilityWindow,
      where: w.owner_user_id == ^owner_user_id and w.status == "active",
      order_by: [asc: w.start_at]
    )
    |> Repo.all()
  end

  def get_my_window(owner_user_id, window_id)
      when is_binary(owner_user_id) and is_binary(window_id) do
    case Repo.get(AvailabilityWindow, window_id) do
      %AvailabilityWindow{owner_user_id: ^owner_user_id, status: "active"} = w ->
        {:ok, w}

      # Soft-deleted or expired-from-owner view: gone, not a foreign secret.
      %AvailabilityWindow{owner_user_id: ^owner_user_id} ->
        {:error, :not_found}

      %AvailabilityWindow{} ->
        {:error, :forbidden}

      nil ->
        {:error, :not_found}
    end
  end

  def delete_window(owner_user_id, window_id)
      when is_binary(owner_user_id) and is_binary(window_id) do
    with {:ok, w} <- get_my_window(owner_user_id, window_id) do
      now = now()

      Repo.transaction(fn ->
        {:ok, w} =
          w
          |> AvailabilityWindow.changeset(%{status: "deleted"})
          |> Repo.update()

        # Soft-revoke active shares of this window
        from(s in AvailabilityShare,
          where: s.availability_window_id == ^window_id and s.status == "active"
        )
        |> Repo.update_all(set: [status: "revoked", revoked_at: now, updated_at: now])

        w
      end)
    end
  end

  def update_window(owner_user_id, window_id, attrs)
      when is_binary(owner_user_id) and is_binary(window_id) and is_map(attrs) do
    with {:ok, w} <- get_my_window(owner_user_id, window_id) do
      w
      |> AvailabilityWindow.changeset(%{
        start_at: Map.get(attrs, :start_at, w.start_at),
        end_at: Map.get(attrs, :end_at, w.end_at),
        timezone: Map.get(attrs, :timezone, w.timezone),
        expires_at: Map.get(attrs, :expires_at, w.expires_at)
      })
      |> Repo.update()
    end
  end

  # ---------------------------------------------------------------------------
  # Intentional share into a conversation
  # ---------------------------------------------------------------------------

  @doc """
  Share selected private windows into a conversation.

  Peer receives only shared-safe projections (via `list_shared_safe/2` or
  realtime `availability:shared`).
  """
  def share_windows(attrs) when is_map(attrs) do
    owner = fetch!(attrs, :owner_user_id)
    conversation_id = fetch!(attrs, :conversation_id)
    window_ids = List.wrap(Map.get(attrs, :window_ids) || [])

    with :ok <- ensure_member(conversation_id, owner),
         :ok <- ensure_not_blocked_in_conversation(conversation_id, owner),
         :ok <- rate_limit_share(owner, conversation_id),
         :ok <- validate_owned_windows(owner, window_ids) do
      now = now()

      results =
        Enum.map(window_ids, fn wid ->
          upsert_share(owner, conversation_id, wid, now)
        end)

      case Enum.find(results, &match?({:error, _}, &1)) do
        {:error, reason} ->
          {:error, reason}

        nil ->
          shares = Enum.map(results, fn {:ok, s} -> s end)
          # Idempotent re-share of the same active windows is OK (no double events required).
          {:ok, shares, Enum.map(shares, &shared_safe_projection/1)}
      end
    end
  end

  def revoke_share(owner_user_id, share_id)
      when is_binary(owner_user_id) and is_binary(share_id) do
    revoke_share(owner_user_id, share_id, nil)
  end

  def revoke_share(owner_user_id, share_id, conversation_id)
      when is_binary(owner_user_id) and is_binary(share_id) do
    case Repo.get(AvailabilityShare, share_id) do
      %AvailabilityShare{owner_user_id: ^owner_user_id, status: "active"} = s ->
        if conversation_id && s.conversation_id != conversation_id do
          {:error, :forbidden}
        else
          s
          |> AvailabilityShare.changeset(%{status: "revoked", revoked_at: now()})
          |> Repo.update()
        end

      %AvailabilityShare{owner_user_id: ^owner_user_id} = s ->
        if conversation_id && s.conversation_id != conversation_id do
          {:error, :forbidden}
        else
          {:error, :already_revoked}
        end

      %AvailabilityShare{} ->
        {:error, :forbidden}

      nil ->
        {:error, :not_found}
    end
  end

  @doc """
  Shared-safe windows visible to a conversation member.

  Never includes unshared private windows. Outsiders get `:not_a_member`.
  """
  def list_shared_safe(conversation_id, actor_user_id)
      when is_binary(conversation_id) and is_binary(actor_user_id) do
    with :ok <- ensure_member(conversation_id, actor_user_id) do
      rows = active_share_rows(conversation_id)
      {:ok, Enum.map(rows, &shared_safe_projection/1)}
    end
  end

  @doc "Owner-only: which of my windows are shared into this conversation."
  def list_my_shares(conversation_id, owner_user_id)
      when is_binary(conversation_id) and is_binary(owner_user_id) do
    with :ok <- ensure_member(conversation_id, owner_user_id) do
      shares =
        from(s in AvailabilityShare,
          where:
            s.conversation_id == ^conversation_id and s.owner_user_id == ^owner_user_id and
              s.status == "active",
          preload: [:availability_window]
        )
        |> Repo.all()
        |> Enum.filter(&usable_window?/1)

      {:ok,
       Enum.map(shares, fn s ->
         %{
           "share_id" => s.id,
           "window" => AvailabilityWindow.to_owner_contract(s.availability_window)
         }
       end)}
    end
  end

  # ---------------------------------------------------------------------------
  # Deterministic overlap (Elixir owns authority)
  # ---------------------------------------------------------------------------

  @doc """
  Compute shared-safe overlaps for a conversation from active shares.

  Requires at least two distinct owners with usable shared ranges.
  Blocked pairs yield empty overlap (no new coordination surface).
  """
  def compute_overlap(conversation_id, actor_user_id)
      when is_binary(conversation_id) and is_binary(actor_user_id) do
    with :ok <- ensure_member(conversation_id, actor_user_id) do
      if blocked_pair_in_conversation?(conversation_id) do
        {:ok, empty_overlap("blocked")}
      else
        by_owner =
          conversation_id
          |> active_share_rows()
          |> Enum.group_by(& &1.owner_user_id)
          |> Enum.map(fn {owner, rows} ->
            ranges =
              rows
              |> Enum.map(&window_range/1)
              |> Enum.reject(&is_nil/1)

            {owner, ranges}
          end)
          |> Enum.reject(fn {_o, ranges} -> ranges == [] end)

        owners = Enum.map(by_owner, &elem(&1, 0))

        if length(owners) < 2 do
          {:ok, empty_overlap("need_more_shares")}
        else
          # Pairwise intersection across all owner range sets (N=2 primary; N>2: successive).
          ranges_list = Enum.map(by_owner, &elem(&1, 1))
          overlaps = multi_intersect(ranges_list) |> merge_ranges()

          {:ok,
           %{
             "schema_version" => "0.1.0",
             "conversation_id" => conversation_id,
             "participant_count" => length(owners),
             "overlaps" => Enum.map(overlaps, &range_to_safe/1),
             "label" => overlap_label(overlaps),
             "no_private_schedule" => true,
             "overlap_status" => if(overlaps == [], do: "no_overlap", else: "overlap_found")
           }}
        end
      end
    end
  end

  # ---------------------------------------------------------------------------
  # Shared-safe projection
  # ---------------------------------------------------------------------------

  def shared_safe_projection(%AvailabilityShare{} = s) do
    s = Repo.preload(s, :availability_window)
    w = s.availability_window

    open_ended? = Map.get(w, :open_ended) == true or is_nil(w.end_at)

    %{
      "schema_version" => "0.1.0",
      "share_id" => s.id,
      "conversation_id" => s.conversation_id,
      "owner_user_id" => s.owner_user_id,
      "display_start" => if(w.start_at, do: DateTime.to_iso8601(w.start_at), else: nil),
      # Open-ended social time: never invent an end for the peer.
      "display_end" => if(open_ended? or is_nil(w.end_at), do: nil, else: DateTime.to_iso8601(w.end_at)),
      "open_ended" => open_ended?,
      "timezone" => w.timezone,
      "shared_safe" => true
    }
  end

  def shared_safe_projection(%{share: %AvailabilityShare{} = s}), do: shared_safe_projection(s)

  @doc "Assert payload has no private leakage keys."
  def assert_shared_safe!(payload) when is_map(payload) do
    # Machine status keys like overlap_status are allowed; private schedule metadata is not.
    forbidden_keys =
      ~w(private_reason response_key calendar_title event_title unavailable_reason event_notes)

    for key <- forbidden_keys do
      if Map.has_key?(payload, key) or nested_has_key?(payload, key) do
        raise "availability shared-safe leak: #{key}"
      end
    end

    :ok
  end

  @doc """
  Pure interval intersection for tests and future multi-source fusion.

  Inputs are UTC DateTimes. Timezone labels do not affect the math (display only).
  Partial overlaps and empty results are deterministic — never probabilistic.
  """
  def interval_intersect_utc(
        %DateTime{} = s1,
        %DateTime{} = e1,
        %DateTime{} = s2,
        %DateTime{} = e2
      ) do
    interval_intersect(s1, e1, s2, e2)
  end

  @doc """
  Explicit contract: availability overlap is never Set authority.

  Call sites must not promote overlap_status to ProductSignals Set.
  """
  def authorizes_set?(_overlap_or_share), do: false

  @doc """
  Private multi-person calendar composition → shared-safe consequence.

  Knows free/busy deeply; reveals only the smallest useful shared signal.
  Never authorizes Set. Never writes calendars. Never exposes peer event titles.
  """
  def compose_calendar_fit(attrs) when is_map(attrs) do
    result = OpalCore.SocialFlow.AvailabilityComposition.compose_fit(attrs)
    shared = result["shared"] || %{}
    assert_shared_safe!(shared)
    OpalCore.SocialFlow.AvailabilityComposition.assert_disclosure_safe!(shared)
    {:ok, result}
  end

  def compose_calendar_fit(_), do: {:error, :invalid}

  @doc """
  Compose fit for conversation members from permissioned free/busy + options.

  Partial calendar coverage does not invent "works for both."
  """
  def compose_fit_for_conversation(conversation_id, actor_user_id, opts \\ [])
      when is_binary(conversation_id) and is_binary(actor_user_id) do
    alias OpalCore.SocialFlow.RealWorld.Calendar.Connector

    with :ok <- ensure_member(conversation_id, actor_user_id) do
      member_ids =
        from(cm in ConversationMember,
          where: cm.conversation_id == ^conversation_id,
          select: cm.user_id
        )
        |> Repo.all()

      range = %{
        start_at: Keyword.get(opts, :candidate_start) || Keyword.get(opts, :start_at),
        end_at: Keyword.get(opts, :candidate_end) || Keyword.get(opts, :end_at)
      }

      required_ids = MapSet.new(Keyword.get(opts, :required_user_ids) || member_ids)
      optional_ids = MapSet.new(Keyword.get(opts, :optional_user_ids) || [])
      late_ok_ids = MapSet.new(Keyword.get(opts, :late_ok_user_ids) || [])
      flex_ids = MapSet.new(Keyword.get(opts, :flexible_user_ids) || [])

      participants =
        Enum.map(member_ids, fn uid ->
          {connected, busy} = fetch_member_busy(uid, range)

          %{
            "user_id" => uid,
            "busy_blocks" => busy,
            "calendar_connected" => connected,
            "required" => MapSet.member?(required_ids, uid) and not MapSet.member?(optional_ids, uid),
            "optional" => MapSet.member?(optional_ids, uid),
            "late_ok" => MapSet.member?(late_ok_ids, uid),
            "flexibility" => if(MapSet.member?(flex_ids, uid), do: "flexible", else: nil)
          }
        end)

      attrs =
        opts
        |> Enum.into(%{})
        |> stringify_opts()
        |> Map.put("participants", participants)
        |> Map.put("actor_user_id", actor_user_id)
        |> Map.put_new("mode", Keyword.get(opts, :mode, "chosen_social_time"))

      compose_calendar_fit(attrs)
    end
  end

  defp fetch_member_busy(user_id, range) do
    alias OpalCore.SocialFlow.RealWorld.Calendar.Connector

    case Connector.calendar_permission(user_id) do
      {:ok, %{"granted" => true}} ->
        case Connector.free_busy(user_id, range) do
          {:ok, busy} -> {true, busy}
          _ -> {true, []}
        end

      _ ->
        {false, []}
    end
  rescue
    _ -> {false, []}
  end

  defp stringify_opts(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end

  # ---------------------------------------------------------------------------
  # Sufficiency / intervention (additive under frozen UX)
  # ---------------------------------------------------------------------------

  @doc """
  Resolve the **smallest** availability intervention for this actor.

  Uses current Phase-1 sources only: manual windows + intentional shares.
  Does not auto-share. Does not invent calendar free/busy.

  Returns `{:ok, map}` with:
  - `"decision"` — sufficiency outcome
  - `"private"` — always true for this payload
  - `"private_copy"` / `"action_label"` / `"suggested_window_ids"` when relevant
  - `"overlap"` — public shared-safe overlap when already computable from shares
  - `"preview_overlaps"` — **owner-private** preview (actor private ∩ peer shares)
  """
  def resolve_intervention(conversation_id, actor_user_id, opts \\ [])

  def resolve_intervention(conversation_id, actor_user_id, opts)
      when is_binary(conversation_id) and is_binary(actor_user_id) and is_list(opts) do
    alias OpalCore.SocialFlow.AsymmetricParticipation
    alias OpalCore.SocialFlow.InterventionResolution

    with :ok <- ensure_member(conversation_id, actor_user_id) do
      blocked = blocked_pair_in_conversation?(conversation_id)
      windows = list_my_windows(actor_user_id)
      fresh = Enum.filter(windows, &usable_window_record?/1)
      stale_only = windows != [] and fresh == []

      {:ok, public_overlap} = compute_overlap(conversation_id, actor_user_id)
      shared_found = public_overlap["overlap_status"] == "overlap_found"
      overlap_count = length(public_overlap["overlaps"] || [])

      peer_shares = peer_shared_ranges(conversation_id, actor_user_id)
      peer_has = peer_shares != []

      actor_shares =
        from(s in AvailabilityShare,
          where:
            s.conversation_id == ^conversation_id and s.owner_user_id == ^actor_user_id and
              s.status == "active",
          preload: [:availability_window]
        )
        |> Repo.all()
        |> Enum.filter(&usable_window?/1)

      preview =
        if blocked do
          []
        else
          private_preview_overlaps(fresh, peer_shares)
        end

      facts = %{
        blocked: blocked,
        shared_overlap_found: shared_found,
        has_fresh_windows: fresh != [],
        stale_only_windows: stale_only,
        private_preview_overlap: preview != [],
        peer_has_shares: peer_has,
        actor_has_active_share: actor_shares != []
      }

      # Optional calendar free/busy fusion (provider-neutral; falls back silently)
      cal_enrich =
        OpalCore.SocialFlow.RealWorld.CalendarSufficiency.enrich_facts(
          actor_user_id,
          facts,
          candidate_start: Keyword.get(opts, :candidate_start),
          candidate_end: Keyword.get(opts, :candidate_end),
          willingness: Keyword.get(opts, :willingness)
        )

      facts = cal_enrich.facts
      decision = cal_enrich.decision
      # Optional social restraint signals (defaults preserve prior cascade)
      social = %{
        forming?: Keyword.get(opts, :forming?, true),
        context_confidence: Keyword.get(opts, :context_confidence, 0.85),
        participant_count: Keyword.get(opts, :participant_count, 2),
        recent_suggestion_count: Keyword.get(opts, :recent_suggestion_count, 0),
        ignored_suggestion: Keyword.get(opts, :ignored_suggestion, false),
        topic_changed: Keyword.get(opts, :topic_changed, false),
        humans_solving: Keyword.get(opts, :humans_solving, false),
        stale_opportunity: Keyword.get(opts, :stale_opportunity, false),
        casual_chat: Keyword.get(opts, :casual_chat, false),
        overlap_count: overlap_count,
        permission_revoked: Keyword.get(opts, :permission_revoked, false)
      }

      general =
        InterventionResolution.resolve(Map.merge(facts, social))

      # Asymmetric bias: low-effort actors only get zero-friction surfaces
      actor_level = Keyword.get(opts, :actor_engagement, "active")
      peer_levels = Keyword.get(opts, :peer_engagements, ["active"])
      bias = AsymmetricParticipation.intervention_bias(actor_level, peer_levels)

      decision =
        cond do
          general.outcome == :silence and Keyword.get(opts, :apply_restraint, false) ->
            :no_useful_intervention

          bias.surface_policy == :minimal and
              decision not in [:enough_to_compute, :no_useful_intervention] ->
            :no_useful_intervention

          bias.surface_policy == :confirm_only and decision in [:needs_input, :needs_permission] ->
            if decision == :needs_permission, do: :needs_permission, else: :no_useful_intervention

          true ->
            decision
        end

      payload =
        intervention_payload(decision, %{
          public_overlap: public_overlap,
          preview: preview,
          fresh: fresh
        })
        |> Map.put("general_outcome", Atom.to_string(general.outcome))
        |> Map.put("restraint_reason", general.reason)
        |> Map.put("asymmetric_policy", Atom.to_string(bias.surface_policy))
        |> Map.put("shame_holdout", bias.shame_holdout)
        |> Map.put(
          "calendar_status",
          cal_enrich.calendar[:calendar_status] &&
            to_string(cal_enrich.calendar[:calendar_status])
        )
        |> Map.put("should_ask_time", cal_enrich.should_ask_time)
        |> Map.put("step_eliminated", cal_enrich.step_eliminated)

      # Privacy-safe telemetry — never blocks product path
      _ =
        OpalCore.SocialFlow.InterventionTelemetry.emit_intervention(
          conversation_id,
          actor_user_id,
          payload["decision"]
        )

      {:ok, payload}
    end
  end

  @doc """
  Apply a user correction to private availability and recompute intervention.

  Does not auto-share. Does not authorize Set. Supersedes prior windows.
  """
  def apply_correction(attrs) when is_map(attrs) do
    OpalCore.SocialFlow.AvailabilityCorrection.apply(attrs)
  end

  # ---------------------------------------------------------------------------
  # Internals
  # ---------------------------------------------------------------------------

  defp ensure_manual_source("manual"), do: :ok
  defp ensure_manual_source(_), do: {:error, :source_not_enabled}

  defp rate_limit_window_create(owner) do
    RateLimitBucket.hit("availability:window_create:#{owner}", "availability_window_create",
      max: @window_create_max,
      window_sec: @window_create_window_sec
    )
  end

  defp rate_limit_share(owner, conversation_id) do
    RateLimitBucket.hit(
      "availability:share:#{owner}:#{conversation_id}",
      "availability_share",
      max: @share_max,
      window_sec: @share_window_sec
    )
  end

  defp upsert_share(owner, conversation_id, window_id, now) do
    case Repo.get_by(AvailabilityShare,
           conversation_id: conversation_id,
           availability_window_id: window_id,
           status: "active"
         ) do
      %AvailabilityShare{} = s ->
        {:ok, s}

      nil ->
        # revive revoked row if present
        case from(s in AvailabilityShare,
               where:
                 s.conversation_id == ^conversation_id and
                   s.availability_window_id == ^window_id
             )
             |> Repo.one() do
          %AvailabilityShare{status: "revoked"} = s ->
            s
            |> AvailabilityShare.changeset(%{
              status: "active",
              shared_at: now,
              revoked_at: nil
            })
            |> Repo.update()

          nil ->
            %AvailabilityShare{}
            |> AvailabilityShare.changeset(%{
              owner_user_id: owner,
              conversation_id: conversation_id,
              availability_window_id: window_id,
              status: "active",
              shared_at: now
            })
            |> Repo.insert()

          %AvailabilityShare{} = s ->
            {:ok, s}
        end
    end
  end

  defp validate_owned_windows(_owner, []), do: {:error, :window_ids_required}

  defp validate_owned_windows(owner, window_ids) do
    windows =
      from(w in AvailabilityWindow,
        where: w.id in ^window_ids and w.owner_user_id == ^owner and w.status == "active"
      )
      |> Repo.all()

    if length(windows) == length(Enum.uniq(window_ids)) do
      if Enum.all?(windows, &usable_window_record?/1), do: :ok, else: {:error, :window_expired}
    else
      {:error, :forbidden}
    end
  end

  defp active_share_rows(conversation_id) do
    from(s in AvailabilityShare,
      where: s.conversation_id == ^conversation_id and s.status == "active",
      preload: [:availability_window]
    )
    |> Repo.all()
    |> Enum.filter(&usable_window?/1)
  end

  defp usable_window?(%AvailabilityShare{availability_window: w}), do: usable_window_record?(w)
  defp usable_window?(_), do: false

  defp usable_window_record?(nil), do: false

  defp usable_window_record?(%AvailabilityWindow{status: "active"} = w) do
    now = now()

    not_expired =
      is_nil(w.expires_at) or DateTime.compare(w.expires_at, now) == :gt

    end_at = AvailabilityWindow.effective_end_at(w)
    not_ended = match?(%DateTime{}, end_at) and DateTime.compare(end_at, now) == :gt
    not_expired and not_ended
  end

  defp usable_window_record?(_), do: false

  defp window_range(%AvailabilityShare{availability_window: w}) do
    if usable_window_record?(w) do
      {w.start_at, AvailabilityWindow.effective_end_at(w), w.timezone}
    else
      nil
    end
  end

  defp multi_intersect([]), do: []
  defp multi_intersect([only]), do: only

  defp multi_intersect([a | rest]) do
    Enum.reduce(rest, a, fn next, acc ->
      for {s1, e1, tz1} <- acc,
          {s2, e2, _tz2} <- next,
          intersect = interval_intersect(s1, e1, s2, e2),
          not is_nil(intersect) do
        {is, ie} = intersect
        {is, ie, tz1}
      end
    end)
  end

  defp interval_intersect(s1, e1, s2, e2) do
    start_at = max_dt(s1, s2)
    end_at = min_dt(e1, e2)

    if DateTime.compare(end_at, start_at) == :gt do
      {start_at, end_at}
    else
      nil
    end
  end

  defp max_dt(a, b), do: if(DateTime.compare(a, b) == :gt, do: a, else: b)
  defp min_dt(a, b), do: if(DateTime.compare(a, b) == :lt, do: a, else: b)

  defp merge_ranges(ranges) do
    ranges
    |> Enum.sort_by(fn {s, _e, _tz} -> DateTime.to_unix(s, :microsecond) end)
    |> Enum.reduce([], fn range, acc ->
      case acc do
        [] ->
          [range]

        [{ps, pe, ptz} | rest] ->
          {s, e, tz} = range

          if DateTime.compare(s, pe) != :gt do
            [{ps, max_dt(pe, e), ptz} | rest]
          else
            [range, {ps, pe, ptz} | rest]
          end
          |> then(fn list ->
            # keep tz from first when merging
            _ = tz
            list
          end)
      end
    end)
    |> Enum.reverse()
  end

  defp range_to_safe({start_at, end_at, timezone}) do
    %{
      "display_start" => DateTime.to_iso8601(start_at),
      "display_end" => DateTime.to_iso8601(end_at),
      "timezone" => timezone,
      "shared_safe" => true
    }
  end

  defp overlap_label([]), do: "No shared times yet."

  defp overlap_label(overlaps) do
    n = length(overlaps)

    if n == 1 do
      "One time works for both of you."
    else
      "#{n} times work for both of you."
    end
  end

  defp empty_overlap(status) do
    %{
      "schema_version" => "0.1.0",
      "overlaps" => [],
      "label" =>
        case status do
          "need_more_shares" -> "Share a couple times that work."
          "blocked" -> "Could not find a shared time."
          _ -> "No shared times yet."
        end,
      "no_private_schedule" => true,
      "overlap_status" => status
    }
  end

  defp ensure_member(conversation_id, user_id) do
    exists? =
      from(cm in ConversationMember,
        where: cm.conversation_id == ^conversation_id and cm.user_id == ^user_id
      )
      |> Repo.exists?()

    if exists?, do: :ok, else: {:error, :not_a_member}
  end

  defp ensure_not_blocked_in_conversation(conversation_id, user_id) do
    peer_ids =
      from(cm in ConversationMember,
        where: cm.conversation_id == ^conversation_id and cm.user_id != ^user_id,
        select: cm.user_id
      )
      |> Repo.all()

    blocked? =
      Enum.any?(peer_ids, fn peer ->
        TrustSafety.blocked?(user_id, peer) or TrustSafety.blocked?(peer, user_id)
      end)

    if blocked?, do: {:error, :blocked}, else: :ok
  end

  defp blocked_pair_in_conversation?(conversation_id) do
    ids =
      from(cm in ConversationMember,
        where: cm.conversation_id == ^conversation_id,
        select: cm.user_id
      )
      |> Repo.all()

    ids
    |> Enum.flat_map(fn a ->
      Enum.map(ids, fn b ->
        a != b and (TrustSafety.blocked?(a, b) or TrustSafety.blocked?(b, a))
      end)
    end)
    |> Enum.any?()
  end

  defp nested_has_key?(map, key) when is_map(map) do
    Map.has_key?(map, key) or
      Enum.any?(Map.values(map), fn
        v when is_map(v) -> nested_has_key?(v, key)
        v when is_list(v) -> Enum.any?(v, &(is_map(&1) and nested_has_key?(&1, key)))
        _ -> false
      end)
  end

  defp now, do: DateTime.utc_now() |> DateTime.truncate(:microsecond)

  defp peer_shared_ranges(conversation_id, actor_user_id) do
    conversation_id
    |> active_share_rows()
    |> Enum.reject(fn s -> s.owner_user_id == actor_user_id end)
    |> Enum.map(&window_range/1)
    |> Enum.reject(&is_nil/1)
  end

  # Actor-private windows ∩ peer **shared** ranges only. Result is owner-private guidance.
  defp private_preview_overlaps(_fresh_windows, peer_ranges) when peer_ranges == [], do: []

  defp private_preview_overlaps(fresh_windows, peer_ranges) do
    mine =
      for w <- fresh_windows do
        {w.start_at, AvailabilityWindow.effective_end_at(w), w.timezone, w.id}
      end

    for {s1, e1, tz1, wid} <- mine,
        {s2, e2, _tz2} <- peer_ranges,
        intersect = interval_intersect(s1, e1, s2, e2),
        not is_nil(intersect) do
      {is, ie} = intersect
      {is, ie, tz1, wid}
    end
    |> Enum.map(fn {s, e, tz, wid} ->
      Map.merge(range_to_safe({s, e, tz}), %{"suggested_window_id" => wid})
    end)
    |> Enum.uniq_by(fn r -> {r["display_start"], r["display_end"]} end)
  end

  defp intervention_payload(:enough_to_compute, %{public_overlap: o}) do
    %{
      "schema_version" => "0.1.0",
      "decision" => "enough_to_compute",
      "private" => true,
      "authorizes_set" => false,
      "overlap" => o,
      "private_copy" => nil,
      "action_label" => nil,
      "suggested_window_ids" => [],
      "preview_overlaps" => []
    }
  end

  defp intervention_payload(:needs_permission, %{preview: preview, fresh: _fresh})
       when preview != [] do
    first = hd(preview)
    ids = preview |> Enum.map(& &1["suggested_window_id"]) |> Enum.uniq()

    %{
      "schema_version" => "0.1.0",
      "decision" => "needs_permission",
      "private" => true,
      "authorizes_set" => false,
      "overlap" => nil,
      "private_copy" => private_lines_up_copy(first),
      "action_label" => "Share it",
      "suggested_window_ids" => ids,
      "preview_overlaps" => Enum.map(preview, &Map.delete(&1, "suggested_window_id"))
    }
  end

  defp intervention_payload(:needs_permission, %{fresh: fresh}) do
    %{
      "schema_version" => "0.1.0",
      "decision" => "needs_permission",
      "private" => true,
      "authorizes_set" => false,
      "overlap" => nil,
      "private_copy" => "Share when you're ready",
      "action_label" => "Share",
      "suggested_window_ids" => Enum.map(fresh, & &1.id),
      "preview_overlaps" => []
    }
  end

  defp intervention_payload(:needs_confirmation, _ctx) do
    %{
      "schema_version" => "0.1.0",
      "decision" => "needs_confirmation",
      "private" => true,
      "authorizes_set" => false,
      "overlap" => nil,
      "private_copy" => "Still free around then?",
      "action_label" => "Update times",
      "suggested_window_ids" => [],
      "preview_overlaps" => []
    }
  end

  defp intervention_payload(:needs_input, _ctx) do
    %{
      "schema_version" => "0.1.0",
      "decision" => "needs_input",
      "private" => true,
      "authorizes_set" => false,
      "overlap" => nil,
      "private_copy" => nil,
      "action_label" => "Find a time",
      "suggested_window_ids" => [],
      "preview_overlaps" => []
    }
  end

  defp intervention_payload(:no_useful_intervention, _ctx) do
    %{
      "schema_version" => "0.1.0",
      "decision" => "no_useful_intervention",
      "private" => true,
      "authorizes_set" => false,
      "overlap" => nil,
      "private_copy" => nil,
      "action_label" => nil,
      "suggested_window_ids" => [],
      "preview_overlaps" => []
    }
  end

  defp private_lines_up_copy(%{"display_start" => start_s, "display_end" => end_s}) do
    # Keep short; frontend may refine display with local formatters.
    case {DateTime.from_iso8601(start_s), DateTime.from_iso8601(end_s)} do
      {{:ok, s, _}, {:ok, _e, _}} ->
        dow = Calendar.strftime(s, "%A")
        "#{dow} lines up for you too."

      _ ->
        "A time lines up for you too."
    end
  end

  defp private_lines_up_copy(_), do: "A time lines up for you too."

  defp fetch!(attrs, key) do
    case Map.fetch(attrs, key) do
      {:ok, v} when not is_nil(v) -> v
      _ -> raise ArgumentError, "missing #{inspect(key)}"
    end
  end
end
