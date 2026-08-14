defmodule OpalCore.SocialFlow.AttentionAuthority do
  @moduledoc """
  ATTENTION / INTERVENTION decision boundary (Pass 10).

  Sits *after* Evidence → Inference → Authority → Presentation candidates.
  Something may be true, durable, and causal — and still deserve **silence**.

  Primary law:
  THE SMARTER OPAL BECOMES, THE LESS SOFTWARE THE HUMAN SHOULD HAVE TO MANAGE.

  Does **not** replace SocialReality, ProductSignals, Chronology, or AlignmentAuthority.
  Consumes their outputs and decides human-facing consequence.

  Builds on:
  - `Execution.AttentionTier` (prepare early, interrupt late)
  - `InterventionResolution` (silence is success)
  - `Ambient.InterruptionDebt` (surface cost — not reimplemented here)

  Internal interruption classes (never product labels):
  ambient | useful_now | action_required | time_sensitive | critical | silence
  """

  alias OpalCore.SocialFlow.Execution.AttentionTier

  @classes ~w(silence ambient useful_now action_required time_sensitive critical)

  def classes, do: @classes

  @doc "Rank for comparison (higher = more interruptive)."
  def class_rank(class) when is_binary(class) do
    case class do
      "silence" -> 0
      "ambient" -> 1
      "useful_now" -> 2
      "action_required" -> 3
      "time_sensitive" -> 4
      "critical" -> 5
      _ -> 0
    end
  end

  def class_rank(_), do: 0

  @doc """
  Evaluate a single reality/signal projection for attention.

  Expected keys (all optional; pure map API):
  - `:next_gap` — SocialReality next_gap atom or string
  - `:lifecycle_stage` / `:stage`
  - `:requires_user_action` boolean
  - `:member_count` / `:participant_count`
  - `:sufficiency` — intention | converging | usable
  - `:has_meaningful_dims` — what/when/where any known
  - `:duplicate_of_active` — true when same lineage already surfaced
  - `:recompute_only` — true when backend recompute with no human delta
  - `:minutes_until` — integer | nil for temporal urgency
  - `:leave_by_relevant` — travel leave window matters now
  - `:private_memory_only` — only private memory changed
  - `:kind` — proposal | signal | etc.
  """
  @spec evaluate(map()) :: %{
          class: String.t(),
          should_surface_home: boolean(),
          should_surface_chat_filament: boolean(),
          should_interrupt: boolean(),
          may_notify: boolean(),
          tier: String.t(),
          priority: integer(),
          reason: String.t(),
          channel: String.t() | nil
        }
  def evaluate(facts) when is_map(facts) do
    facts = stringify_keys(facts)

    cond do
      truthy?(facts["recompute_only"]) ->
        pack("silence", false, false, false, "dormant", "recompute_no_delta")

      truthy?(facts["duplicate_of_active"]) ->
        pack("silence", false, false, false, "dormant", "duplicate_lineage")

      truthy?(facts["private_memory_only"]) ->
        # Private memory may improve Curate ranking without Home noise.
        pack("silence", false, false, false, "watch", "private_memory_no_home")

      facts["kind"] == "proposal" ->
        pack("silence", false, false, false, "dormant", "proposal_satellite")

      handled_recall?(facts) ->
        # Recede from Home by default; Plans/recall may still load.
        pack("ambient", false, false, false, "dormant", "handled_recede")

      truthy?(facts["leave_by_relevant"]) or leave_window?(facts["minutes_until"]) ->
        pack(
          "time_sensitive",
          true,
          true,
          true,
          "urgent_actionable",
          "leave_window",
          "in_app_actionable"
        )

      actionable_gap?(facts["next_gap"]) and truthy?(facts["requires_user_action"] || true) ->
        pack(
          "action_required",
          true,
          true,
          false,
          "actionable",
          "next_gap_action",
          "in_app_actionable"
        )

      usable_active?(facts) and approaching?(facts["minutes_until"]) ->
        pack("useful_now", true, true, false, "actionable", "approaching_usable", "in_app_passive")

      usable_active?(facts) ->
        pack("useful_now", true, false, false, "prepare", "usable_ambient", "in_app_passive")

      converging?(facts) ->
        pack("ambient", true, false, false, "watch", "converging_field", "in_app_passive")

      weak_intention?(facts) ->
        pack("silence", false, false, false, "dormant", "weak_intention")

      true ->
        pack("silence", false, false, false, "dormant", "no_attention_justified")
    end
  end

  def evaluate(_), do: pack("silence", false, false, false, "dormant", "invalid_facts")

  @doc """
  Compress many evaluations into a sparse Home field.

  Order of operations (Pass 11 — ranking before caps):
  1. Evaluate each candidate
  2. **Reality collapse** — one row per conversation/lineage (highest priority wins)
  3. Sort by priority (class + temporal urgency + actionability)
  4. Safety-rail caps per band (rails, not the intelligence)

  Caps alone must never be the sole reason a higher-priority reality loses to a lower one.
  """
  @spec compose_home_field([{map(), any()}], keyword()) :: [
          %{item: any(), decision: map(), band: String.t(), surface_reason: String.t()}
        ]
  def compose_home_field(items, opts \\ []) when is_list(items) do
    explain = compose_home_field_explain(items, opts)
    explain.surfaced
  end

  @doc """
  Full compression funnel with survivors + suppressions for residue proofs.

  Returns:
  - `:candidates` — all evaluated rows
  - `:after_collapse` — one per reality lineage
  - `:surfaced` — after ranking + band caps
  - `:suppressed` — with reasons (silence, collapse_lost, cap_band, etc.)
  """
  @spec compose_home_field_explain([{map(), any()}], keyword()) :: %{
          candidates: list(),
          after_collapse: list(),
          surfaced: list(),
          suppressed: list()
        }
  def compose_home_field_explain(items, opts \\ []) when is_list(items) do
    max_now = Keyword.get(opts, :max_now, 2)
    max_later = Keyword.get(opts, :max_later, 3)
    max_quiet = Keyword.get(opts, :max_quiet, 1)

    candidates =
      Enum.map(items, fn {facts, item} ->
        facts = stringify_keys(if is_map(facts), do: facts, else: %{})
        d = evaluate(facts)
        d = %{d | priority: priority_score(facts, d)}
        %{
          item: item,
          facts: facts,
          decision: d,
          band: band_for(d),
          lineage: lineage_key(facts)
        }
      end)

    silenced =
      candidates
      |> Enum.filter(fn c -> not c.decision.should_surface_home end)
      |> Enum.map(fn c ->
        Map.put(c, :suppress_reason, "attention_silence:#{c.decision.reason}")
      end)

    eligible = Enum.filter(candidates, & &1.decision.should_surface_home)

    {collapsed, collapse_losses} = collapse_by_lineage(eligible)

    ranked = Enum.sort_by(collapsed, &(-&1.decision.priority))

    {now, now_drop} = take_band(ranked, "now", max_now)
    {later, later_drop} = take_band(ranked, "later", max_later)
    {quiet, quiet_drop} = take_band(ranked, "quiet", max_quiet)

    surfaced =
      (now ++ later ++ quiet)
      |> Enum.map(fn c ->
        %{
          item: c.item,
          decision: c.decision,
          band: c.band,
          surface_reason: surface_reason(c),
          lineage: c.lineage
        }
      end)

    cap_drops =
      (now_drop ++ later_drop ++ quiet_drop)
      |> Enum.map(fn c ->
        Map.put(c, :suppress_reason, "cap_after_rank:#{c.band}:priority_#{c.decision.priority}")
      end)

    suppressed =
      (silenced ++ collapse_losses ++ cap_drops)
      |> Enum.map(fn c ->
        %{
          item: c.item,
          decision: c.decision,
          band: Map.get(c, :band),
          suppress_reason: c.suppress_reason,
          lineage: Map.get(c, :lineage)
        }
      end)

    %{
      candidates: candidates,
      after_collapse: collapsed,
      surfaced: surfaced,
      suppressed: suppressed
    }
  end

  @doc """
  Notification / interrupt policy for a semantic consequence id.

  Pure: given previous notice and new evaluation, decide notify / suppress / supersede.
  Does not send OS push — policy only.
  """
  @spec notification_policy(map(), map() | nil) :: %{
          action: :notify | :suppress | :supersede | :silent,
          reason: String.t(),
          consequence_id: String.t() | nil
        }
  def notification_policy(new_facts, previous \\ nil) when is_map(new_facts) do
    facts = stringify_keys(new_facts)
    d = evaluate(facts)
    cid = consequence_id(facts)
    prev = if is_map(previous), do: stringify_keys(previous), else: nil
    prev_cid = prev && (prev["consequence_id"] || prev["conversation_id"])
    prev_payload = prev && prev["payload_key"]
    new_payload = payload_key(facts)

    cond do
      not d.may_notify ->
        %{action: :silent, reason: d.reason, consequence_id: cid}

      is_map(prev) and prev_cid != nil and prev_cid == cid and prev_payload == new_payload ->
        %{action: :suppress, reason: "dedupe_same_consequence", consequence_id: cid}

      is_map(prev) and prev_cid != nil and prev_cid == cid and prev_payload != new_payload ->
        %{action: :supersede, reason: "same_lineage_updated", consequence_id: cid}

      d.should_interrupt or d.class in ~w(time_sensitive critical) ->
        %{action: :notify, reason: d.reason, consequence_id: cid}

      true ->
        %{action: :silent, reason: "not_interruptive", consequence_id: cid}
    end
  end

  @doc "Whether a chronology/filament row should show in Chat by default."
  def filament_visible?(facts) when is_map(facts) do
    d = evaluate(facts)
    d.should_surface_chat_filament and d.class != "silence"
  end

  def filament_visible?(_), do: false

  # --- internals ---

  defp pack(class, home, filament, interrupt, tier, reason, channel \\ nil) do
    tier_n = AttentionTier.normalize(tier)
    # Home ambient may surface without AttentionTier.may_surface? (that gates push-tier).
    # Interrupt/push still respects tier + class.
    may_push =
      interrupt and
        (AttentionTier.may_push?(tier_n) or class in ~w(time_sensitive critical))

    %{
      class: class,
      should_surface_home: home == true,
      should_surface_chat_filament: filament == true,
      should_interrupt: may_push,
      may_notify: may_push,
      tier: tier_n,
      priority: class_rank(class) * 100 + AttentionTier.rank(tier_n),
      reason: to_string(reason),
      channel: channel
    }
  end

  # Priority: class ≫ temporal urgency ≫ actionability. Caps apply only after this sort.
  defp priority_score(facts, decision) do
    base = decision.priority
    mins = facts["minutes_until"]

    temporal =
      cond do
        is_integer(mins) and mins >= 0 and mins <= 60 -> 50
        is_integer(mins) and mins > 60 and mins <= 360 -> 30
        is_integer(mins) and mins > 360 and mins <= 24 * 60 -> 15
        is_integer(mins) and mins > 24 * 60 -> 5
        truthy?(facts["leave_by_relevant"]) -> 45
        true -> 0
      end

    action_bonus = if decision.class in ~w(action_required time_sensitive critical), do: 20, else: 0
    gap_bonus = if actionable_gap?(facts["next_gap"]), do: 10, else: 0

    base + temporal + action_bonus + gap_bonus
  end

  defp lineage_key(facts) do
    consequence_id(facts) ||
      facts["id"] ||
      :erlang.phash2(facts)
  end

  defp collapse_by_lineage(eligible) do
    # Tag with stable index so we can identify the single winner per lineage.
    indexed = Enum.with_index(eligible)

    grouped =
      Enum.group_by(indexed, fn {c, _i} -> c.lineage end)

    winners_idx =
      Enum.map(grouped, fn {_lin, rows} ->
        {_c, i} = Enum.max_by(rows, fn {c, _i} -> c.decision.priority end)
        i
      end)
      |> MapSet.new()

    winners =
      indexed
      |> Enum.filter(fn {_c, i} -> MapSet.member?(winners_idx, i) end)
      |> Enum.map(fn {c, _i} -> c end)

    losses =
      indexed
      |> Enum.reject(fn {_c, i} -> MapSet.member?(winners_idx, i) end)
      |> Enum.map(fn {c, _i} ->
        Map.put(c, :suppress_reason, "reality_collapse:lost_to_higher_priority_same_lineage")
      end)

    {winners, losses}
  end

  defp take_band(ranked, band, max_n) do
    band_rows = Enum.filter(ranked, &(&1.band == band))
    {Enum.take(band_rows, max_n), Enum.drop(band_rows, max_n)}
  end

  defp surface_reason(c) do
    "survive:#{c.decision.reason}|class=#{c.decision.class}|priority=#{c.decision.priority}|band=#{c.band}"
  end

  defp band_for(%{class: class} = d) do
    # Imminent usable realities stay NOW; far usable can recede to later.
    case class do
      c when c in ~w(action_required time_sensitive critical) -> "now"
      "useful_now" ->
        if d.priority >= class_rank("useful_now") * 100 + 30, do: "now", else: "later"

      "ambient" -> "later"
      _ -> "quiet"
    end
  end

  defp actionable_gap?(gap) do
    g = gap |> to_string() |> String.downcase()
    g in ~w(time place activity participants open_loop)
  end

  defp usable_active?(facts) do
    suf = facts["sufficiency"] |> to_string()
    stage = stage(facts)
    suf == "usable" or stage in ~w(set ready)
  end

  defp converging?(facts) do
    suf = facts["sufficiency"] |> to_string()
    stage = stage(facts)
    suf == "converging" or stage in ~w(still_open plan_forming) or truthy?(facts["has_meaningful_dims"])
  end

  defp handled_recall?(facts) do
    stage(facts) in ~w(handled canceled quiet)
  end

  defp weak_intention?(facts) do
    suf = facts["sufficiency"] |> to_string()
    stage = stage(facts)
    (suf == "intention" or stage in ~w(quiet) or stage == "") and not truthy?(facts["has_meaningful_dims"])
  end

  defp approaching?(mins) when is_integer(mins), do: mins >= 0 and mins <= 24 * 60
  defp approaching?(_), do: false

  defp leave_window?(mins) when is_integer(mins), do: mins >= 0 and mins <= 120
  defp leave_window?(_), do: false

  defp stage(facts) do
    (facts["lifecycle_stage"] || facts["stage"] || "")
    |> to_string()
    |> String.downcase()
  end

  defp consequence_id(facts) do
    facts["consequence_id"] ||
      facts["conversation_id"] ||
      facts["lineage_id"] ||
      nil
  end

  defp payload_key(facts) do
    [
      facts["next_gap"],
      facts["when"],
      facts["where"],
      facts["leave_by"],
      facts["lifecycle_stage"] || facts["stage"]
    ]
    |> Enum.map(&to_string/1)
    |> Enum.join("|")
  end

  defp truthy?(v), do: v == true or v == "true" or v == 1

  defp stringify_keys(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
