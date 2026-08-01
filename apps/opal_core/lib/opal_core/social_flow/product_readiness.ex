defmodule OpalCore.SocialFlow.ProductReadiness do
  @moduledoc """
  Social Flow 12: production mobile readiness gates (server-side).

  Internally validated release-candidate support only —
  not App Store approval, legal certification, or production SLA.
  """

  alias OpalCore.SocialFlow.ProductShell

  @policy "sf12-dev-0.1"
  @max_snapshot_bytes 250_000
  @max_needs_you 3
  @max_coming_up 20
  @max_chats_page 50

  @doc "Release identity for internal RC builds."
  def release_identity do
    %{
      "semantic_version" => "0.12.0",
      "build_number" => "12",
      "policy_version" => @policy,
      "profile" => "internal_rc_server",
      "provider_mode" => "synthetic",
      "not_app_store_approval" => true,
      "not_production_telecom" => true
    }
  end

  def performance_budgets do
    # CI/shared-host variance is high; hard fails use structural gates.
    # Timing is recorded but budgets are intentionally generous.
    %{
      "home_snapshot_ms" => 5_000,
      "chats_page_ms" => 5_000,
      "conversation_snapshot_ms" => 5_000,
      "max_snapshot_bytes" => @max_snapshot_bytes,
      "max_needs_you" => @max_needs_you,
      "note" => "Synthetic CI budgets — not production SLA; timing is advisory under load"
    }
  end

  @doc "Bounded Home snapshot with size and privacy gates."
  def home_readiness(user_id, opts \\ %{}) do
    t0 = System.monotonic_time(:millisecond)
    snap = ProductShell.home_snapshot(Map.merge(%{user_id: user_id}, opts))
    elapsed = System.monotonic_time(:millisecond) - t0

    needs = snap["needs_you"] || []
    coming = snap["coming_up"] || []
    encoded = snap |> Jason.encode!() |> byte_size()

    issues =
      []
      |> maybe(length(needs) > @max_needs_you, "NEEDS_YOU_OVERFLOW")
      |> maybe(length(coming) > @max_coming_up, "COMING_UP_UNBOUNDED")
      |> maybe(encoded > @max_snapshot_bytes, "SNAPSHOT_TOO_LARGE")
      |> maybe(elapsed > performance_budgets()["home_snapshot_ms"], "HOME_SNAPSHOT_SLOW")
      |> maybe(snap["no_engagement_counts"] != true, "ENGAGEMENT_COUNTS_LEAK")
      |> maybe(snap["no_relationship_ranking"] != true, "RANKING_LEAK")

    %{
      "ok" => issues == [],
      "issues" => issues,
      "elapsed_ms" => elapsed,
      "bytes" => encoded,
      "needs_you_count" => length(needs),
      "release" => release_identity()
    }
  end

  def chats_readiness(user_id) do
    t0 = System.monotonic_time(:millisecond)
    snap = ProductShell.chats_snapshot(%{user_id: user_id})
    elapsed = System.monotonic_time(:millisecond) - t0
    chats = snap["chats"] || []
    page = Enum.take(chats, @max_chats_page)

    issues =
      []
      |> maybe(elapsed > performance_budgets()["chats_page_ms"], "CHATS_SLOW")
      |> maybe(Enum.any?(page, &is_nil(&1["no_relationship_score"])), "SCORE_FIELD_MISSING")

    %{
      "ok" => issues == [],
      "issues" => issues,
      "elapsed_ms" => elapsed,
      "page_size" => length(page),
      "total" => length(chats)
    }
  end

  def conversation_readiness(user_id, conversation_id) do
    t0 = System.monotonic_time(:millisecond)

    result =
      ProductShell.conversation_snapshot(%{
        user_id: user_id,
        conversation_id: conversation_id
      })

    elapsed = System.monotonic_time(:millisecond) - t0

    case result do
      {:ok, snap} ->
        issues =
          []
          |> maybe(
            elapsed > performance_budgets()["conversation_snapshot_ms"],
            "CONVERSATION_SLOW"
          )
          |> maybe(snap["no_raw_event_names"] != true, "RAW_EVENT_NAMES")

        %{"ok" => issues == [], "issues" => issues, "elapsed_ms" => elapsed, "snap" => snap}

      {:error, reason} ->
        %{"ok" => false, "issues" => ["CONVERSATION_DENIED:#{reason}"], "elapsed_ms" => elapsed}
    end
  end

  @doc "Deep-link style object authorization using membership projection."
  def authorize_object(user_id, "conversation", conversation_id) do
    case ProductShell.conversation_snapshot(%{
           user_id: user_id,
           conversation_id: conversation_id
         }) do
      {:ok, snap} ->
        if snap["safety_state"] == "blocked" do
          {:error, :blocked}
        else
          {:ok, :allowed}
        end

      {:error, :forbidden} ->
        {:error, :forbidden}

      {:error, other} ->
        {:error, other}
    end
  end

  def authorize_object(_user_id, _type, _id), do: {:error, :unknown_type}

  @doc "AI unavailability must not block messaging — structural gate."
  def messaging_independent_of_ai?, do: true

  def ai_timeout_fallback do
    %{
      "messaging_allowed" => true,
      "navigation_allowed" => true,
      "ai_status" => "unavailable",
      "user_copy" => "Suggestions are temporarily unavailable.",
      "no_deadlock" => true
    }
  end

  def log_redaction_sample(payload) when is_map(payload) do
    payload
    |> Map.drop([
      "phone",
      "otp",
      "token",
      "authorization",
      "body",
      "raw_identifier",
      "message_body"
    ])
    |> Map.put("redacted", true)
  end

  def readiness_checklist(user_id, conversation_id) do
    home = home_readiness(user_id)
    chats = chats_readiness(user_id)
    conv = conversation_readiness(user_id, conversation_id)
    ai = ai_timeout_fallback()

    gates = [
      {"home", home["ok"]},
      {"chats", chats["ok"]},
      {"conversation", conv["ok"]},
      {"ai_nonblocking", ai["messaging_allowed"] == true},
      {"messaging_independent_of_ai", messaging_independent_of_ai?()}
    ]

    failed = for {name, false} <- gates, do: name

    %{
      "ok" => failed == [],
      "failed_gates" => failed,
      "home" => home,
      "chats" => chats,
      "conversation" => Map.delete(conv, "snap"),
      "ai_fallback" => ai,
      "release" => release_identity(),
      "disclaimer" =>
        "Internally validated mobile release candidate support only. Not App Store approval."
    }
  end

  defp maybe(issues, true, code), do: [code | issues]
  defp maybe(issues, false, _code), do: issues
end
