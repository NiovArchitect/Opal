# mix run shots/intelligence/verify_llm.exs  (from apps/opal_core with repo root relative)
# Or: cd apps/opal_core && mix run ../../shots/intelligence/verify_llm.exs

alias OpalCore.Intelligence.{LlmAdapter, Pipeline, Extractor}

cases = [
  %{
    id: "a_maya_yes",
    body: "yes",
    context: %{
      plan_label: "Saturday market with Maya",
      current_time_label: "10:00 market",
      participants: ["Maya"],
      relationship: "Maya — close friend",
      recent_messages: [
        %{role: "assistant", content: "Market Saturday at 10 — you in?"},
        %{role: "user", content: "yes"}
      ]
    }
  },
  %{
    id: "b_chanelle_saturday",
    body: "what if we did Saturday instead?",
    context: %{
      plan_label: "Friday dinner",
      current_time_label: "Friday 7pm",
      participants: ["Chanelle"],
      relationship: "Chanelle — partner",
      recent_messages: [
        %{role: "assistant", content: "Friday dinner still good?"},
        %{role: "user", content: "what if we did Saturday instead?"}
      ]
    }
  },
  %{
    id: "c_alex_add_day",
    body: "I'm thinking about adding a day",
    context: %{
      plan_label: "Mexico City trip — 4 days",
      current_time_label: "Day 4 wrap",
      participants: ["Alex"],
      relationship: "Alex — trip co-planner",
      recent_messages: [
        %{role: "assistant", content: "Trip canvas is 4 days — Teotihuacan on day 3."},
        %{role: "user", content: "I'm thinking about adding a day"}
      ]
    }
  },
  %{
    id: "d_ambiguous_maybe",
    body: "maybe",
    context: %{
      plan_label: "rooftop drinks",
      current_time_label: "tonight 8pm",
      participants: ["Jordan"],
      relationship: "Jordan — friend",
      recent_messages: [
        %{role: "assistant", content: "Rooftop tonight at 8?"},
        %{role: "user", content: "maybe"}
      ]
    }
  }
]

adapter_ready = LlmAdapter.readiness()
adapter_configured = LlmAdapter.configured?()

smoke =
  case adapter_ready do
    :ready ->
      case LlmAdapter.chat([
             %{role: "system", content: "Reply with exactly: pong"},
             %{role: "user", content: "ping"}
           ]) do
        {:ok, %{content: c, usage: u}} ->
          %{status: "ok", content_len: String.length(c), usage: u}

        {:error, reason} ->
          %{status: "error", reason: inspect(reason)}

        {:disabled, msg} ->
          %{status: "disabled", reason: msg}
      end

    {:disabled, reason} ->
      %{status: "disabled", reason: inspect(reason)}
  end

{results, total_usage} =
  Enum.map_reduce(cases, %{prompt_tokens: 0, completion_tokens: 0, total_tokens: 0}, fn c, acc ->
    actor = Ecto.UUID.generate()
    conv = Ecto.UUID.generate()

    {intent, entities, vibe, source, meta} = Extractor.extract_message(c.body, c.context)

    pipe =
      Pipeline.on_message_created(
        %{
          id: Ecto.UUID.generate(),
          sender_user_id: actor,
          conversation_id: conv,
          body: c.body,
          server_seq: 1
        },
        c.context
      )

    {decision_action, decision_message, draft_source, decision_reason, confidence} =
      case pipe do
        {:ok, %{decision: d, extraction: x}} ->
          {d.action, d.payload["message"] || d.payload["suggestion"], d.payload["draft_source"],
           d.reason, d.confidence}

        {:error, reason} ->
          {"error", inspect(reason), nil, inspect(reason), 0.0}
      end

    usage = get_in(meta, ["usage"]) || %{}

    add = fn a, u ->
      %{
        prompt_tokens: a.prompt_tokens + (u["prompt_tokens"] || Map.get(u, :prompt_tokens, 0) || 0),
        completion_tokens:
          a.completion_tokens + (u["completion_tokens"] || Map.get(u, :completion_tokens, 0) || 0),
        total_tokens: a.total_tokens + (u["total_tokens"] || Map.get(u, :total_tokens, 0) || 0)
      }
    end

    acc2 = if is_map(usage), do: add.(acc, usage), else: acc

    # Hallucination check: final message must not invent known-seed names/places absent from context+body
    allowed =
      ([c.body, c.context[:plan_label], c.context[:current_time_label]] ++
         List.wrap(c.context[:participants]) ++
         (entities["people"] || []) ++
         (entities["places"] || []) ++
         (entities["times"] || []) ++
         (entities["activities"] || []))
      |> Enum.filter(&is_binary/1)
      |> Enum.join(" ")
      |> String.downcase()

    msg = decision_message || ""
    banned = ~w(pujol contramar quintonil teotihuacan paris tokyo london berlin)
    invented =
      Enum.filter(banned, fn w ->
        String.contains?(String.downcase(msg), w) and not String.contains?(allowed, w)
      end)

    hallucination? = invented != []

    quality =
      cond do
        decision_action == "error" -> "FAIL"
        hallucination? -> "FAIL_hallucination"
        c.id == "d_ambiguous_maybe" and decision_action not in ["escalate.user", "respond.thread"] ->
          "FAIL_expected_clarify"

        draft_source == "llm" and String.trim(msg) != "" ->
          "PASS_llm"

        draft_source in ["templates", nil] and String.trim(msg || "") != "" ->
          "PASS_templates"

        decision_action == "silent" and c.id != "d_ambiguous_maybe" ->
          "PASS_silent"

        decision_action == "silent" and c.id == "d_ambiguous_maybe" ->
          "FAIL_expected_clarify"

        true ->
          "PASS"
      end

    row = %{
      id: c.id,
      input: c.body,
      extract_path: source,
      intent: intent,
      entities: entities,
      vibe: vibe,
      llm_confidence: meta["llm_confidence"],
      decision_action: decision_action,
      decision_confidence: confidence,
      draft_source: draft_source,
      final_message: msg,
      reason: decision_reason,
      invented_terms: invented,
      quality: quality
    }

    {row, acc2}
  end)

# Cost projection: DeepSeek ~ $0.14 / 1M tokens (blend rough). Use observed avg * 1000 convos/day * 30.
per_case_tokens =
  if length(results) > 0 and total_usage.total_tokens > 0 do
    total_usage.total_tokens / length(results)
  else
    # Template-only run: estimate ~800 tokens/convo if LLM were on (prompt+completion)
    800.0
  end

daily_1000 = per_case_tokens * 1000
monthly = daily_1000 * 30
cost_per_mtok = 0.14
monthly_usd = monthly / 1_000_000 * cost_per_mtok

status =
  cond do
    smoke[:status] == "ok" and Enum.all?(results, &(&1.quality in ["PASS_llm", "PASS", "PASS_silent", "PASS_templates"])) and
        Enum.any?(results, &(&1.draft_source == "llm")) ->
      "LIVE"

    smoke[:status] == "disabled" ->
      "BLOCKED"

    smoke[:status] == "error" ->
      "BLOCKED"

    true ->
      "PARTIAL"
  end

out = %{
  tip_note: "written by shots/intelligence/verify_llm.exs",
  timestamp: DateTime.utc_now() |> DateTime.to_iso8601(),
  llm: %{
    readiness: inspect(adapter_ready),
    configured: adapter_configured,
    provider: LlmAdapter.provider_name(),
    model: LlmAdapter.model_name(),
    smoke: smoke,
    status: status,
    blocked_reason:
      cond do
        status == "BLOCKED" and smoke[:status] == "disabled" ->
          "OPAL_LLM_API_KEY absent from runtime env (~/.opal/r1a1.env). Add OPAL_LLM_API_KEY + OPAL_LLM_PROVIDER=deepseek, restart Phoenix once."

        status == "BLOCKED" ->
          "LLM smoke failed: #{inspect(smoke)}"

        true ->
          nil
      end
  },
  conversations: results,
  tokens: %{
    observed_total: total_usage,
    estimated_tokens_per_conversation: per_case_tokens,
    projection_1000_convos_per_day_tokens_month: monthly,
    deepseek_blend_usd_per_mtok: cost_per_mtok,
    projected_monthly_usd_at_1000_convos_day: Float.round(monthly_usd * 1.0, 4),
    sane_under_5_usd: monthly_usd < 5.0
  }
}

out_path =
  Path.expand("../../shots/intelligence/LLM_VERIFY.json", Path.dirname(__ENV__.file))
  |> then(fn p ->
    if String.contains?(p, "shots/intelligence") do
      p
    else
      Path.expand("shots/intelligence/LLM_VERIFY.json")
    end
  end)

# Resolve from cwd when mix run from apps/opal_core
out_path =
  cond do
    File.dir?("shots/intelligence") ->
      "shots/intelligence/LLM_VERIFY.json"

    File.dir?("../../shots/intelligence") ->
      "../../shots/intelligence/LLM_VERIFY.json"

    true ->
      Path.expand("~/Developer/NIOVI-Architect/worktrees/opal-grok-real-people/shots/intelligence/LLM_VERIFY.json")
      |> Path.expand()
  end

File.mkdir_p!(Path.dirname(out_path))
File.write!(out_path, Jason.encode!(out, pretty: true))
IO.puts("Wrote #{out_path}")
IO.puts("LLM status=#{status} readiness=#{inspect(adapter_ready)}")
IO.puts("Projected monthly USD@1000/day ≈ #{Float.round(monthly_usd * 1.0, 4)} (sane_under_5=#{monthly_usd < 5.0})")
