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
        end_at: fetch!(attrs, :end_at),
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

    %{
      "schema_version" => "0.1.0",
      "share_id" => s.id,
      "conversation_id" => s.conversation_id,
      "owner_user_id" => s.owner_user_id,
      "display_start" => DateTime.to_iso8601(w.start_at),
      "display_end" => DateTime.to_iso8601(w.end_at),
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
  def resolve_intervention(conversation_id, actor_user_id)
      when is_binary(conversation_id) and is_binary(actor_user_id) do
    alias OpalCore.SocialFlow.AvailabilitySufficiency

    with :ok <- ensure_member(conversation_id, actor_user_id) do
      blocked = blocked_pair_in_conversation?(conversation_id)
      windows = list_my_windows(actor_user_id)
      fresh = Enum.filter(windows, &usable_window_record?/1)
      stale_only = windows != [] and fresh == []

      {:ok, public_overlap} = compute_overlap(conversation_id, actor_user_id)
      shared_found = public_overlap["overlap_status"] == "overlap_found"

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

      decision = AvailabilitySufficiency.resolve(facts)

      payload =
        intervention_payload(decision, %{
          public_overlap: public_overlap,
          preview: preview,
          fresh: fresh
        })

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

    not_ended = DateTime.compare(w.end_at, now) == :gt
    not_expired and not_ended
  end

  defp usable_window_record?(_), do: false

  defp window_range(%AvailabilityShare{availability_window: w}) do
    if usable_window_record?(w), do: {w.start_at, w.end_at, w.timezone}, else: nil
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
        {w.start_at, w.end_at, w.timezone, w.id}
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
