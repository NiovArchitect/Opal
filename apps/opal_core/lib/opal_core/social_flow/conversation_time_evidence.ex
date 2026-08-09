defmodule OpalCore.SocialFlow.ConversationTimeEvidence do
  @moduledoc """
  Bounded proposal path for conversational time evidence.

  Examples of *candidates* (not authority):
  - "Thursday might work."
  - "I get off around 7."
  - "Sunday afternoon is easier."
  - "Not tonight."

  Python (or a lightweight heuristic) may **propose**:
  - candidate range
  - confidence
  - provenance

  Elixir determines:
  - whether usable
  - privacy scope (always owner-private until intentional share)
  - freshness / expiry
  - whether confirmation is required

  Ambiguous inference cannot become authority. Never auto-shares. Never Sets.
  """

  @min_confidence_for_usable 0.75
  @min_confidence_for_confirm 0.45
  @schema "0.1.0"

  @type proposal :: %{
          optional(:candidate_start) => DateTime.t() | String.t(),
          optional(:candidate_end) => DateTime.t() | String.t(),
          optional(:confidence) => float(),
          optional(:provenance) => String.t() | map(),
          optional(:source_message_id) => String.t(),
          optional(:owner_user_id) => String.t(),
          optional(:timezone) => String.t(),
          optional(:polarity) => String.t()
        }

  @doc """
  Admit or reject a time-evidence proposal.

  Outcomes:
  - `{:usable, fact}` — high confidence; may feed private context (still not shared)
  - `{:needs_confirmation, fact}` — medium confidence; ask confirm, do not store as hard fact
  - `{:reject, reason}` — too weak / invalid / negative-only without replacement
  """
  def admit(proposal) when is_map(proposal) do
    p = stringify(proposal)
    conf = to_float(p["confidence"])
    polarity = p["polarity"] || "positive"

    with {:ok, start_at} <- parse_dt(p["candidate_start"] || p["start_at"]),
         {:ok, end_at} <- parse_dt(p["candidate_end"] || p["end_at"]),
         :ok <- validate_range(start_at, end_at),
         :ok <- validate_owner(p["owner_user_id"]) do
      fact = build_fact(p, start_at, end_at, conf)

      cond do
        polarity in ["negative", "reject", "not_available"] and conf < @min_confidence_for_usable ->
          {:reject, :weak_negative}

        polarity in ["negative", "reject", "not_available"] ->
          # Negative evidence is private exclusion signal only — never shared fact
          {:usable, Map.put(fact, "permission_scope", "owner_private_exclusion")}

        conf >= @min_confidence_for_usable ->
          {:usable, fact}

        conf >= @min_confidence_for_confirm ->
          {:needs_confirmation, Map.put(fact, "requires_confirmation", true)}

        true ->
          {:reject, :confidence_too_low}
      end
    else
      {:error, reason} -> {:reject, reason}
    end
  end

  def admit(_), do: {:reject, :invalid_proposal}

  @doc """
  Lightweight heuristic proposal from natural language (test/dev fallback when
  Python is unavailable). Not authority — always runs through `admit/1`.
  """
  def heuristic_propose(text, owner_user_id, opts \\ [])
      when is_binary(text) and is_binary(owner_user_id) do
    t = String.downcase(text)
    now = Keyword.get(opts, :now) || DateTime.utc_now() |> DateTime.truncate(:microsecond)
    tz = Keyword.get(opts, :timezone) || "UTC"

    cond do
      String.contains?(t, "not tonight") ->
        {s, e} = day_window(now, 0, {18, 0}, {23, 0})

        %{
          "owner_user_id" => owner_user_id,
          "candidate_start" => s,
          "candidate_end" => e,
          "confidence" => 0.8,
          "provenance" => "conversation_heuristic",
          "polarity" => "negative",
          "timezone" => tz
        }

      String.contains?(t, "thursday") ->
        days = days_until_dow(now, 4)
        {s, e} = day_window(now, days, {17, 0}, {21, 0})
        conf = if String.contains?(t, "might"), do: 0.55, else: 0.82

        %{
          "owner_user_id" => owner_user_id,
          "candidate_start" => s,
          "candidate_end" => e,
          "confidence" => conf,
          "provenance" => "conversation_heuristic",
          "polarity" => "positive",
          "timezone" => tz
        }

      String.contains?(t, "sunday") ->
        days = days_until_dow(now, 7)
        {s, e} = day_window(now, days, {12, 0}, {17, 0})

        %{
          "owner_user_id" => owner_user_id,
          "candidate_start" => s,
          "candidate_end" => e,
          "confidence" => 0.78,
          "provenance" => "conversation_heuristic",
          "polarity" => "positive",
          "timezone" => tz
        }

      String.contains?(t, "around 7") or String.contains?(t, "get off") ->
        {s, e} = day_window(now, 0, {19, 0}, {21, 0})
        conf = if String.contains?(t, "around"), do: 0.6, else: 0.7

        %{
          "owner_user_id" => owner_user_id,
          "candidate_start" => s,
          "candidate_end" => e,
          "confidence" => conf,
          "provenance" => "conversation_heuristic",
          "polarity" => "positive",
          "timezone" => tz
        }

      true ->
        nil
    end
  end

  def min_confidence_for_usable, do: @min_confidence_for_usable
  def min_confidence_for_confirm, do: @min_confidence_for_confirm

  defp build_fact(p, start_at, end_at, conf) do
    %{
      "schema_version" => @schema,
      "source" => "conversation_confirmed",
      "owner_user_id" => p["owner_user_id"],
      "start_at" => start_at,
      "end_at" => end_at,
      "timezone" => p["timezone"] || "UTC",
      "observed_at" => DateTime.utc_now() |> DateTime.truncate(:microsecond),
      "valid_until" => nil,
      "confidence" => conf,
      "permission_scope" => "owner_private",
      "requires_confirmation" => conf < @min_confidence_for_usable,
      "provenance" => p["provenance"] || "conversation",
      "source_message_id" => p["source_message_id"],
      "revoked" => false,
      "authorizes_set" => false,
      "auto_share" => false
    }
  end

  defp validate_range(s, e) do
    if DateTime.compare(e, s) == :gt, do: :ok, else: {:error, :invalid_range}
  end

  defp validate_owner(id) when is_binary(id) and byte_size(id) > 0, do: :ok
  defp validate_owner(_), do: {:error, :owner_required}

  defp parse_dt(%DateTime{} = dt), do: {:ok, DateTime.truncate(dt, :microsecond)}

  defp parse_dt(iso) when is_binary(iso) do
    case DateTime.from_iso8601(iso) do
      {:ok, dt, _} -> {:ok, DateTime.truncate(dt, :microsecond)}
      _ -> {:error, :invalid_datetime}
    end
  end

  defp parse_dt(_), do: {:error, :invalid_datetime}

  defp days_until_dow(%DateTime{} = now, target_dow) do
    # Elixir Date.day_of_week: 1=Mon ... 7=Sun
    current = Date.day_of_week(DateTime.to_date(now))

    rem(target_dow - current + 7, 7)
    |> then(fn
      0 -> 7
      d -> d
    end)
  end

  defp day_window(%DateTime{} = now, days_ahead, {sh, sm}, {eh, em}) do
    date = DateTime.to_date(now) |> Date.add(days_ahead)
    s = DateTime.new!(date, Time.new!(sh, sm, 0), "Etc/UTC")
    e = DateTime.new!(date, Time.new!(eh, em, 0), "Etc/UTC")
    {DateTime.truncate(s, :microsecond), DateTime.truncate(e, :microsecond)}
  end

  defp to_float(nil), do: 0.0
  defp to_float(n) when is_number(n), do: n * 1.0

  defp to_float(s) when is_binary(s) do
    case Float.parse(s) do
      {f, _} -> f
      :error -> 0.0
    end
  end

  defp to_float(_), do: 0.0

  defp stringify(%{__struct__: _} = struct), do: struct

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), preserve(v)}
      {k, v} -> {to_string(k), preserve(v)}
    end)
  end

  defp preserve(%{__struct__: _} = s), do: s
  defp preserve(v), do: v
end
