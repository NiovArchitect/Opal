defmodule OpalCore.Relationships.Behavior do
  @moduledoc """
  Paste I Phase 0 — relationship type → live behavior.

  RU-1 stores types + optional `communication_bounds`. This module turns
  the taxonomy into enforceable tone, planning, and nudge policy so the
  seven types change product behavior (not docs-only).
  """

  alias OpalCore.Repo
  alias OpalCore.Relationships
  alias OpalCore.Relationships.RelationshipType

  @defaults %{
    "spouse" => %{"frequency" => "daily", "style" => "warm", "planning" => "spontaneous"},
    "partner" => %{"frequency" => "daily", "style" => "warm", "planning" => "spontaneous"},
    "family" => %{"frequency" => "weekly", "style" => "warm", "planning" => "planned"},
    "close_friend" => %{"frequency" => "weekly", "style" => "casual", "planning" => "spontaneous"},
    "friend" => %{"frequency" => "weekly", "style" => "casual", "planning" => "planned"},
    "business" => %{"frequency" => "occasional", "style" => "formal", "planning" => "planned"},
    "acquaintance" => %{"frequency" => "occasional", "style" => "formal", "planning" => "planned"}
  }

  @lead_time_hours %{
    "spouse" => 0,
    "partner" => 0,
    "family" => 12,
    "close_friend" => 2,
    "friend" => 12,
    "business" => 48,
    "acquaintance" => 24
  }

  @nudge_daily_cap %{
    "daily" => 3,
    "weekly" => 1,
    "occasional" => 0
  }

  def defaults, do: @defaults

  def defaults_for(type) when is_binary(type), do: Map.get(@defaults, type, %{})
  def defaults_for(_), do: %{}

  @doc "Merge stored bounds over type defaults. Missing type → empty."
  def resolved_bounds(user_id, contact_user_id)
      when is_binary(user_id) and is_binary(contact_user_id) do
    case Relationships.get_type(user_id, contact_user_id) do
      nil ->
        %{}

      type ->
        stored =
          case Repo.get_by(RelationshipType, user_id: user_id, contact_user_id: contact_user_id) do
            %RelationshipType{communication_bounds: b} when is_map(b) -> stringify(b)
            _ -> %{}
          end

        Map.merge(defaults_for(type), stored)
    end
  end

  def resolved_bounds(_, _), do: %{}

  def style_for(type) when is_binary(type) do
    defaults_for(type)["style"] || "casual"
  end

  def style_for(_), do: "casual"

  def planning_for(type) when is_binary(type) do
    defaults_for(type)["planning"] || "planned"
  end

  def planning_for(_), do: "planned"

  def frequency_for(type) when is_binary(type) do
    defaults_for(type)["frequency"] || "occasional"
  end

  def frequency_for(_), do: "occasional"

  def lead_time_hours(type) when is_binary(type), do: Map.get(@lead_time_hours, type, 24)
  def lead_time_hours(_), do: 24

  def spontaneous_ok?(type), do: planning_for(type) == "spontaneous"

  @doc """
  Enforce planning bounds. `hours_ahead` is how far the proposed plan is.

  Spontaneous types may plan same-day (hours_ahead >= 0).
  Planned types require at least `lead_time_hours/1`.
  """
  def enforce_planning(type, hours_ahead) when is_binary(type) and is_number(hours_ahead) do
    need = lead_time_hours(type)

    cond do
      spontaneous_ok?(type) and hours_ahead >= 0 ->
        :ok

      hours_ahead >= need ->
        :ok

      true ->
        {:needs_lead_time, need}
    end
  end

  def enforce_planning(_, _), do: {:error, :invalid}

  @doc "Daily nudge cap implied by frequency bound (0 = formal/rare only)."
  def nudge_daily_cap(type) when is_binary(type) do
    Map.get(@nudge_daily_cap, frequency_for(type), 0)
  end

  def nudge_daily_cap(_), do: 0

  @doc """
  Whether a proactive nudge toward this contact is in-bounds.

  Acquaintance/business (occasional) → deny casual nudges; allow time_critical only.
  """
  def nudge_allowed?(type, priority \\ "proactive_thread")

  def nudge_allowed?(type, priority) when is_binary(type) do
    cap = nudge_daily_cap(type)

    cond do
      priority in ["time_critical", "mediation"] -> true
      cap <= 0 and priority in ["nudge", "proactive_thread", "routine_break"] -> false
      cap > 0 -> true
      true -> false
    end
  end

  def nudge_allowed?(_, _), do: false

  # ── Tone-differentiated copy (assertable, not cosmetic) ─────────────────

  @doc """
  Dinner / plan proposal framing for a contact type.

  Returns `%{tone, framing, spontaneity, lead_time_hours, copy}`.
  """
  def plan_proposal_copy(type, opts \\ []) when is_binary(type) do
    who = Keyword.get(opts, :who, "them")
    when_label = Keyword.get(opts, :when, "tonight")
    style = style_for(type)
    planning = planning_for(type)
    lead = lead_time_hours(type)

    copy =
      case {style, planning} do
        {"warm", "spontaneous"} ->
          "Want to grab dinner #{when_label} with #{who}? No pressure — just us."

        {"warm", "planned"} ->
          "Shall we set dinner with #{who} for #{when_label}? I'll leave a little lead time."

        {"casual", "spontaneous"} ->
          "Dinner #{when_label} with #{who}? I'm down if you are."

        {"casual", "planned"} ->
          "Want to lock dinner with #{who} for #{when_label}? I'll pencil it in properly."

        {"formal", _} ->
          "Would you like to schedule dinner with #{who} for #{when_label}? " <>
            "I'll allow at least #{lead}h lead time and keep the framing professional."

        _ ->
          "Dinner with #{who} #{when_label}?"
      end

    %{
      tone: style,
      framing: if(style == "formal", do: "formal", else: "personal"),
      spontaneity: planning,
      lead_time_hours: lead,
      copy: copy
    }
  end

  @doc "Mediation draft tone for family vs colleagues (group context aware)."
  def mediation_copy(type_or_context, topic, opts \\ []) do
    context = normalize_group_context(type_or_context, opts)
    formality = context.formality
    silent = Keyword.get(opts, :silent_note)

    base =
      case formality do
        :warm ->
          "We're split on #{topic}. Here's a gentle way through — pick what feels right for everyone."

        :casual ->
          "Split on #{topic}. Quick nudge so we can land it:"

        :formal ->
          "The group is divided on #{topic}. Recommended resolution for your review:"
      end

    draft =
      if is_binary(silent) and silent != "" do
        base <> " Note: haven't heard from #{silent}."
      else
        base
      end

    %{formality: formality, group_label: context.label, draft: draft, tone: Atom.to_string(formality)}
  end

  @doc "Invite SMS/share copy differs by invitee relationship type."
  def invite_copy(type, inviter_name) when is_binary(type) and is_binary(inviter_name) do
    style = style_for(type)

    body =
      case style do
        "warm" ->
          "#{inviter_name} would love you on Opal — come join when you're ready 💛"

        "casual" ->
          "#{inviter_name} invited you to Opal. Tap to join."

        "formal" ->
          "#{inviter_name} has invited you to connect on Opal. Accept when convenient."

        _ ->
          "#{inviter_name} invited you to Opal."
      end

    %{tone: style, body: body, shame_free: true}
  end

  def invite_copy(_, inviter_name) when is_binary(inviter_name) do
    %{tone: "casual", body: "#{inviter_name} invited you to Opal.", shame_free: true}
  end

  @doc "Reminder warmth for partner vs acquaintance."
  def reminder_copy(type, task) when is_binary(type) and is_binary(task) do
    style = style_for(type)

    body =
      case style do
        "warm" -> "Hey love — reminder: #{task}."
        "casual" -> "Heads up: #{task}."
        "formal" -> "Reminder: #{task}."
        _ -> "Reminder: #{task}."
      end

    %{tone: style, body: body}
  end

  def reminder_copy(_, task) when is_binary(task), do: %{tone: "casual", body: "Reminder: #{task}."}

  @doc "Split / money ask framing — close_friend casual vs acquaintance formal."
  def split_ask_copy(type, amount_cents, label) when is_binary(type) and is_integer(amount_cents) do
    dollars = Float.round(amount_cents / 100, 2)
    style = style_for(type)

    body =
      case style do
        "warm" -> "Want to split #{label} — $#{dollars} each?"
        "casual" -> "Split #{label}? Your share is $#{dollars}."
        "formal" -> "Please confirm your share of $#{dollars} for #{label}."
        _ -> "Your share for #{label}: $#{dollars}."
      end

    %{tone: style, body: body, amount_cents: amount_cents, shows_balance: false}
  end

  @doc """
  Detect group coordination context from member types and/or explicit label.

  `family vacation` → warm/spontaneous; `quarterly offsite` → formal/planned.
  """
  def group_context(member_types, opts \\ []) when is_list(member_types) do
    label = Keyword.get(opts, :label) || Keyword.get(opts, :topic) || ""
    normalize_group_context(member_types, label: label)
  end

  def local_time_label(datetime, timezone) when is_binary(timezone) do
    dt =
      case datetime do
        %DateTime{} = d -> d
        iso when is_binary(iso) ->
          case DateTime.from_iso8601(iso) do
            {:ok, d, _} -> d
            _ -> DateTime.utc_now()
          end

        _ ->
          DateTime.utc_now()
      end

    local =
      case DateTime.shift_zone(dt, timezone) do
        {:ok, l} -> l
        _ -> apply_fixed_offset(dt, timezone)
      end

    hour = local.hour
    min = local.minute |> Integer.to_string() |> String.pad_leading(2, "0")
    ampm = if hour >= 12, do: "pm", else: "am"
    h12 = rem(hour, 12)
    h12 = if h12 == 0, do: 12, else: h12
    day = Calendar.strftime(local, "%A")
    "#{day} #{h12}:#{min}#{ampm} #{timezone_short(timezone)}"
  end

  def local_time_label(_, _), do: nil

  @doc """
  Dual-timezone dinner proposal copy (T1 / T4).
  Absolute moment → each viewer's local day+time string.
  """
  def dual_timezone_proposal(%DateTime{} = utc_moment, tz_a, tz_b, opts \\ []) do
    label_a = local_time_label(utc_moment, tz_a)
    label_b = local_time_label(utc_moment, tz_b)
    who = Keyword.get(opts, :who_b, "them")

    %{
      absolute: DateTime.to_iso8601(utc_moment),
      for_a: label_a,
      for_b: label_b,
      copy_a: "Dinner with #{who}: #{label_a} your time (#{label_b} theirs).",
      copy_b: "Dinner: #{label_b} your time (#{label_a} theirs)."
    }
  end

  # ── internals ────────────────────────────────────────────────────────────

  defp normalize_group_context(type_or_types, opts) do
    label =
      (opts[:label] || opts[:topic] || "")
      |> to_string()
      |> String.downcase()

    types =
      cond do
        is_binary(type_or_types) and type_or_types in RelationshipType.allowed_types() ->
          [type_or_types]

        is_list(type_or_types) ->
          Enum.map(type_or_types, &to_string/1)

        is_binary(type_or_types) ->
          []

        true ->
          []
      end

    cond do
      String.contains?(label, "offsite") or String.contains?(label, "quarterly") or
          String.contains?(label, "board") ->
        %{label: "offsite", formality: :formal, planning: "planned", tone: "formal"}

      String.contains?(label, "vacation") or String.contains?(label, "family") or
          Enum.any?(types, &(&1 in ["family", "spouse", "partner"])) ->
        %{label: "family", formality: :warm, planning: "spontaneous", tone: "warm"}

      Enum.any?(types, &(&1 == "business")) and not Enum.any?(types, &(&1 in ["spouse", "partner", "family"])) ->
        %{label: "colleagues", formality: :formal, planning: "planned", tone: "formal"}

      Enum.any?(types, &(&1 in ["close_friend", "friend"])) ->
        %{label: "friends", formality: :casual, planning: "spontaneous", tone: "casual"}

      true ->
        %{label: "group", formality: :casual, planning: "planned", tone: "casual"}
    end
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn {k, v} -> {to_string(k), v} end)
  end

  defp timezone_short("America/Los_Angeles"), do: "PT"
  defp timezone_short("Asia/Tokyo"), do: "JST"
  defp timezone_short("Europe/London"), do: "UK"
  defp timezone_short("Australia/Sydney"), do: "AEST"
  defp timezone_short(tz) when is_binary(tz), do: tz
  defp timezone_short(_), do: "UTC"

  defp apply_fixed_offset(%DateTime{} = utc, "America/Los_Angeles") do
    off = if utc.month >= 3 and utc.month <= 10, do: -7, else: -8
    DateTime.add(utc, off * 3600, :second)
  end

  defp apply_fixed_offset(%DateTime{} = utc, "Asia/Tokyo"), do: DateTime.add(utc, 9 * 3600, :second)
  defp apply_fixed_offset(%DateTime{} = utc, "Europe/London") do
    off = if utc.month >= 3 and utc.month <= 10, do: 1, else: 0
    DateTime.add(utc, off * 3600, :second)
  end

  defp apply_fixed_offset(%DateTime{} = utc, "Australia/Sydney") do
    off = if utc.month >= 10 or utc.month <= 3, do: 11, else: 10
    DateTime.add(utc, off * 3600, :second)
  end

  defp apply_fixed_offset(utc, _), do: utc
end
