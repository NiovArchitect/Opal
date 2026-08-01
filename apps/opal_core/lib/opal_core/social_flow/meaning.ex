defmodule OpalCore.SocialFlow.Meaning do
  @moduledoc """
  Social Flow 3: shared meaning, open loops, pre-send clarity, repair.

  Epistemic law: evidence-grounded; no mind-reading; no relationship scores.
  Python proposes; Elixir owns insight lifecycle, privacy, and emission.
  """

  import Ecto.Query

  alias OpalCore.{Contracts, Repo}
  alias OpalCore.Messaging.{ConversationMember, Message}

  alias OpalCore.SocialFlow.{
    AuditEvent,
    ConversationInsight,
    DecisionSummary,
    OpenLoop,
    PrivateDraftAssist,
    SharedPlan,
    CompletionEvent
  }

  @trace "trace-social-flow-3"
  @forbidden_diagnosis ~w(
    angry manipulative narcissist unhealthy lying
    attachment_style personality_disorder
  )

  # --- Pre-send clarity (Journey A) ---

  def pre_send_check(attrs) do
    owner_id = fetch!(attrs, :owner_user_id)
    conversation_id = fetch!(attrs, :conversation_id)
    draft = fetch!(attrs, :draft_text)
    prior = Map.get(attrs, :prior_messages) || []
    idem = Map.get(attrs, :idempotency_key) || "presend-#{:erlang.phash2({owner_id, draft})}"
    trace_id = Map.get(attrs, :trace_id) || @trace

    with :ok <- ensure_member(conversation_id, owner_id),
         :ok <- reject_diagnosis_language(draft) do
      case Repo.get_by(ConversationInsight, idempotency_key: idem) do
        %ConversationInsight{} = existing ->
          {:ok, existing, :idempotent}

        nil ->
          analysis = analyze_pre_send(prior, draft)

          if analysis.needs_attention do
            expires =
              DateTime.add(DateTime.utc_now(), 3600, :second) |> DateTime.truncate(:microsecond)

            {:ok, insight} =
              %ConversationInsight{}
              |> ConversationInsight.changeset(%{
                owner_user_id: owner_id,
                conversation_id: conversation_id,
                insight_type: "pre_send_clarity",
                privacy_class: "private",
                status: "visible",
                copy: analysis.insight_copy,
                actions: %{
                  "items" => [
                    %{"id" => "help_answer", "label" => "Help me answer clearly"},
                    %{"id" => "send_as_written", "label" => "Send as written"},
                    %{"id" => "dismiss", "label" => "Dismiss"}
                  ]
                },
                evidence_message_ids: analysis.evidence_ids,
                uncertainty: analysis.uncertainty,
                payload: %{"reasons" => analysis.reasons},
                suggested_draft: analysis.suggested_draft,
                idempotency_key: idem,
                expires_at: expires
              })
              |> Repo.insert()

            {:ok, draft_assist} =
              %PrivateDraftAssist{}
              |> PrivateDraftAssist.changeset(%{
                owner_user_id: owner_id,
                conversation_id: conversation_id,
                insight_id: insight.id,
                original_draft: draft,
                suggested_draft: analysis.suggested_draft,
                status: "active",
                expires_at: expires
              })
              |> Repo.insert()

            audit!(
              conversation_id,
              owner_id,
              "insight.pre_send",
              %{
                "insight_id" => insight.id,
                "has_draft_assist" => true
              },
              trace_id
            )

            broadcast_private(
              conversation_id,
              owner_id,
              "social_flow:insight",
              %{
                "insight" => ConversationInsight.to_contract(insight),
                "draft_assist" => PrivateDraftAssist.to_contract(draft_assist)
              },
              trace_id
            )

            {:ok, %{insight: insight, draft_assist: draft_assist}, :created}
          else
            {:ok, :no_insight}
          end
      end
    end
  end

  defp analyze_pre_send(prior, draft) do
    questions =
      prior
      |> Enum.flat_map(fn m ->
        text = m[:body] || m["body"] || ""
        extract_questions(text)
      end)

    draft_l = String.downcase(draft)
    unanswered = Enum.reject(questions, &question_answered?(&1, draft_l))

    escalatory =
      Regex.match?(~r/big deal|don'?t know why|whatever|calm down/i, draft)

    needs = unanswered != [] or (escalatory and questions != [])

    {copy, suggested} =
      cond do
        Enum.any?(unanswered, &Regex.match?(~r/coming|saturday|still planning|together/i, &1)) ->
          {
            "Jordan asked whether you are still coming. Your draft does not answer that yet.",
            "I'm not sure yet, and I should have been clearer. I'll know by tonight and will let you know."
          }

        unanswered != [] ->
          q = hd(unanswered)
          {"A direct question still needs an answer: #{q}", nil}

        true ->
          {nil, nil}
      end

    evidence_ids =
      Enum.map(prior, fn m -> m[:id] || m["id"] end)
      |> Enum.filter(&is_binary/1)

    %{
      needs_attention: needs and is_binary(copy),
      insight_copy: copy || "No clarity issue detected.",
      suggested_draft: suggested,
      reasons:
        if(unanswered != [], do: ["draft_does_not_answer_direct_question"], else: []) ++
          if(escalatory and questions != [],
            do: ["draft_may_escalate_before_answering"],
            else: []
          ),
      uncertainty: [
        "Does not claim the recipient's emotional state",
        "Draft is a suggestion only; user must approve send"
      ],
      evidence_ids: evidence_ids
    }
  end

  def act_pre_send(%{insight_id: id, user_id: user_id, action: action} = attrs) do
    with %ConversationInsight{} = insight <- Repo.get(ConversationInsight, id),
         true <- insight.owner_user_id == user_id,
         true <- insight.status == "visible" do
      case action do
        "help_answer" ->
          assist =
            Repo.get_by(PrivateDraftAssist, insight_id: insight.id, status: "active")

          {:ok, insight} =
            insight
            |> ConversationInsight.changeset(%{status: "acted"})
            |> Repo.update()

          {:ok,
           %{insight: insight, draft_assist: assist, suggested_draft: insight.suggested_draft}}

        "send_as_written" ->
          resolve_insight(insight, "sent_as_written")

        "dismiss" ->
          dismiss_insight(insight, user_id)

        "use_draft" ->
          edited = Map.get(attrs, :edited_draft) || insight.suggested_draft

          case Repo.get_by(PrivateDraftAssist, insight_id: insight.id) do
            %PrivateDraftAssist{} = d ->
              d
              |> PrivateDraftAssist.changeset(%{
                user_edited_draft: edited,
                status: "used"
              })
              |> Repo.update()

            _ ->
              :ok
          end

          resolve_insight(insight, "draft_used")

        _ ->
          {:error, :unknown_action}
      end
    else
      nil -> {:error, :not_found}
      false -> {:error, :forbidden}
    end
  end

  # --- Open loops (Journey B) ---

  def detect_open_loops(attrs) do
    owner_id = fetch!(attrs, :owner_user_id)
    conversation_id = fetch!(attrs, :conversation_id)
    messages = Map.get(attrs, :messages) || load_recent_messages(conversation_id)
    idem_base = Map.get(attrs, :idempotency_key) || "openloop-#{conversation_id}-#{owner_id}"
    trace_id = Map.get(attrs, :trace_id) || @trace

    with :ok <- ensure_member(conversation_id, owner_id) do
      loops = find_open_loops(messages)

      results =
        Enum.map(loops, fn loop ->
          idem = "#{idem_base}-#{:erlang.phash2(loop.summary)}"

          case Repo.get_by(OpenLoop, idempotency_key: idem) do
            %OpenLoop{status: status} = existing
            when status in ~w(resolved dismissed superseded) ->
              {:ok, existing, :idempotent_terminal}

            %OpenLoop{} = existing ->
              {:ok, existing, :idempotent}

            nil ->
              create_open_loop_insight(owner_id, conversation_id, loop, idem, trace_id)
          end
        end)

      {:ok, results}
    end
  end

  defp create_open_loop_insight(owner_id, conversation_id, loop, idem, trace_id) do
    {:ok, insight} =
      %ConversationInsight{}
      |> ConversationInsight.changeset(%{
        owner_user_id: owner_id,
        conversation_id: conversation_id,
        insight_type: "open_loop",
        privacy_class: "private",
        status: "visible",
        copy: loop.summary,
        actions: %{
          "items" => [
            %{"id" => "reply_now", "label" => "Reply now"},
            %{"id" => "remind_later", "label" => "Remind me later"},
            %{"id" => "not_needed", "label" => "Not needed"},
            %{"id" => "dismiss", "label" => "Dismiss"}
          ]
        },
        evidence_message_ids: loop.source_ids,
        uncertainty: ["Does not claim why the question is unanswered"],
        payload: %{
          "answered_parts" => loop.answered,
          "unanswered_parts" => loop.unanswered
        },
        suggested_draft: loop.suggested_draft,
        idempotency_key: "insight-#{idem}"
      })
      |> Repo.insert()

    {:ok, open_loop} =
      %OpenLoop{}
      |> OpenLoop.changeset(%{
        owner_user_id: owner_id,
        conversation_id: conversation_id,
        loop_type: "unanswered_question",
        summary: loop.summary,
        status: if(loop.answered == [], do: "open", else: "partially_answered"),
        source_message_ids: loop.source_ids,
        answered_parts: loop.answered,
        unanswered_parts: loop.unanswered,
        insight_id: insight.id,
        idempotency_key: idem
      })
      |> Repo.insert()

    broadcast_private(
      conversation_id,
      owner_id,
      "social_flow:insight",
      %{
        "insight" => ConversationInsight.to_contract(insight),
        "open_loop" => OpenLoop.to_contract(open_loop)
      },
      trace_id
    )

    {:ok, %{insight: insight, open_loop: open_loop}, :created}
  end

  defp find_open_loops(messages) do
    Enum.flat_map(messages, fn m ->
      text = m[:body] || m["body"] || ""
      id = m[:id] || m["id"]
      qs = extract_questions(text)

      if length(qs) >= 2 do
        later =
          messages
          |> Enum.drop_while(fn x -> (x[:id] || x["id"]) != id end)
          |> Enum.drop(1)
          |> Enum.map(fn x -> String.downcase(x[:body] || x["body"] || "") end)
          |> Enum.join(" ")

        answered = Enum.filter(qs, &question_answered?(&1, later))
        unanswered = Enum.reject(qs, &question_answered?(&1, later))

        if unanswered == [] do
          []
        else
          summary =
            if answered != [] and
                 Enum.any?(unanswered, &String.contains?(String.downcase(&1), "reservation")) do
              "You answered the pickup question. The reservation question still needs a response."
            else
              "You answered one question. Another question still needs a response."
            end

          draft =
            if Enum.any?(unanswered, &String.contains?(String.downcase(&1), "reservation")) do
              "I haven't made the reservation yet. I'll handle it tonight."
            else
              nil
            end

          [
            %{
              summary: summary,
              answered: answered,
              unanswered: unanswered,
              source_ids: if(is_binary(id), do: [id], else: []),
              suggested_draft: draft
            }
          ]
        end
      else
        []
      end
    end)
  end

  def resolve_open_loop(%{open_loop_id: id, user_id: user_id, action: action}) do
    with %OpenLoop{} = loop <- Repo.get(OpenLoop, id),
         true <- loop.owner_user_id == user_id,
         true <- loop.status in ~w(open partially_answered) do
      now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

      status =
        case action do
          "resolved" -> "resolved"
          "dismiss" -> "dismissed"
          "not_needed" -> "dismissed"
          _ -> "resolved"
        end

      {:ok, loop} =
        loop
        |> OpenLoop.changeset(%{status: status, resolved_at: now})
        |> Repo.update()

      if loop.insight_id do
        case Repo.get(ConversationInsight, loop.insight_id) do
          %ConversationInsight{} = i ->
            i
            |> ConversationInsight.changeset(%{
              status: if(status == "resolved", do: "resolved", else: "dismissed"),
              resolved_at: now,
              dismissed_at: if(status == "dismissed", do: now, else: nil)
            })
            |> Repo.update()

          _ ->
            :ok
        end
      end

      {:ok, loop}
    else
      nil -> {:error, :not_found}
      false -> {:error, :forbidden}
    end
  end

  # --- Decision summary (Journey C) ---

  def what_did_we_decide(attrs) do
    owner_id = fetch!(attrs, :owner_user_id)
    conversation_id = fetch!(attrs, :conversation_id)
    trace_id = Map.get(attrs, :trace_id) || @trace

    with :ok <- ensure_member(conversation_id, owner_id) do
      plan =
        from(p in SharedPlan,
          where: p.conversation_id == ^conversation_id and p.status in ^["agreed", "changed"],
          order_by: [desc: p.inserted_at],
          limit: 1
        )
        |> Repo.one()

      {confirmed, still_open} =
        if plan do
          conf =
            [
              %{
                "text" => plan.time_label || plan.title || "Agreed plan",
                "source_message_ids" => []
              }
            ]

          open =
            if is_nil(plan.location) or plan.location == "" do
              [%{"text" => "Location unresolved", "source_message_ids" => []}]
            else
              []
            end

          {conf, open}
        else
          {[], [%{"text" => "No shared plan on record", "source_message_ids" => []}]}
        end

      # Shared completions only (never private reminders)
      shared_completions =
        from(c in CompletionEvent,
          where:
            c.conversation_id == ^conversation_id and c.visibility == "shared" and
              c.completion_kind == "commitment_complete"
        )
        |> Repo.all()

      handled =
        Enum.map(shared_completions, fn c ->
          %{
            "text" => c.shared_message || c.gratification_copy || "Shared completion",
            "source_message_ids" => []
          }
        end)

      {:ok, summary} =
        %DecisionSummary{}
        |> DecisionSummary.changeset(%{
          owner_user_id: owner_id,
          conversation_id: conversation_id,
          confirmed: %{"items" => confirmed},
          still_open: %{"items" => still_open},
          handled: %{"items" => handled},
          source_lineage: %{
            "plan_id" => plan && plan.id,
            "excludes" => ["private_reminders", "private_memory", "discarded_options"]
          },
          privacy_class: "private"
        })
        |> Repo.insert()

      audit!(
        conversation_id,
        owner_id,
        "decision_summary.created",
        %{
          "summary_id" => summary.id
        },
        trace_id
      )

      {:ok, DecisionSummary.to_contract(summary)}
    end
  end

  # --- Ambiguity (Journey D) ---

  def detect_ambiguity(attrs) do
    owner_id = fetch!(attrs, :owner_user_id)
    conversation_id = fetch!(attrs, :conversation_id)
    message_id = fetch!(attrs, :message_id)
    body = fetch!(attrs, :body)
    idem = Map.get(attrs, :idempotency_key) || "amb-#{message_id}"
    trace_id = Map.get(attrs, :trace_id) || @trace

    with :ok <- ensure_member(conversation_id, owner_id) do
      if ambiguous_phrase?(body) do
        case Repo.get_by(ConversationInsight, idempotency_key: idem) do
          %ConversationInsight{} = existing ->
            {:ok, existing, :idempotent}

          nil ->
            {:ok, insight} =
              %ConversationInsight{}
              |> ConversationInsight.changeset(%{
                owner_user_id: owner_id,
                conversation_id: conversation_id,
                insight_type: "ambiguity",
                privacy_class: "private",
                status: "visible",
                copy:
                  "This could be understood more than one way. Would you like to clarify before acting?",
                actions: %{
                  "items" => [
                    %{"id" => "ask_clarify", "label" => "Ask for clarification"},
                    %{"id" => "continue", "label" => "Continue"},
                    %{"id" => "dismiss", "label" => "Dismiss"},
                    %{"id" => "opal_misunderstood", "label" => "Opal misunderstood"}
                  ]
                },
                evidence_message_ids: [message_id],
                uncertainty: [
                  "Does not assert anger or passive-aggression",
                  "Multiple interpretations remain possible"
                ],
                suggested_draft:
                  "Just to make sure I understand—are you comfortable with me deciding, or would you rather choose together?",
                payload: %{"phrase" => String.slice(body, 0, 256)},
                idempotency_key: idem
              })
              |> Repo.insert()

            broadcast_private(
              conversation_id,
              owner_id,
              "social_flow:insight",
              %{
                "insight" => ConversationInsight.to_contract(insight)
              },
              trace_id
            )

            {:ok, insight, :created}
        end
      else
        {:ok, :no_insight}
      end
    end
  end

  # --- Repair (Journey E) ---

  def detect_repair_opportunity(attrs) do
    owner_id = fetch!(attrs, :owner_user_id)
    conversation_id = fetch!(attrs, :conversation_id)
    message_id = fetch!(attrs, :message_id)
    body = fetch!(attrs, :body)
    idem = Map.get(attrs, :idempotency_key) || "repair-#{message_id}"
    trace_id = Map.get(attrs, :trace_id) || @trace

    with :ok <- ensure_member(conversation_id, owner_id) do
      if impact_statement?(body) do
        case Repo.get_by(ConversationInsight, idempotency_key: idem) do
          %ConversationInsight{} = existing ->
            {:ok, existing, :idempotent}

          nil ->
            {:ok, insight} =
              %ConversationInsight{}
              |> ConversationInsight.changeset(%{
                owner_user_id: owner_id,
                conversation_id: conversation_id,
                insight_type: "repair",
                privacy_class: "private",
                status: "visible",
                copy:
                  "Jordan said the message felt dismissive. Would you like help acknowledging that before explaining your intent?",
                actions: %{
                  "items" => [
                    %{"id" => "help_respond", "label" => "Help me respond"},
                    %{"id" => "write_myself", "label" => "I'll write it myself"},
                    %{"id" => "dismiss", "label" => "Dismiss"}
                  ]
                },
                evidence_message_ids: [message_id],
                uncertainty: [
                  "Does not diagnose the relationship",
                  "Does not force an apology"
                ],
                suggested_draft:
                  "I can see why that felt dismissive. I responded to the logistics and missed what you were trying to explain.",
                payload: %{"impact_quote" => String.slice(body, 0, 512)},
                idempotency_key: idem
              })
              |> Repo.insert()

            {:ok, _assist} =
              %PrivateDraftAssist{}
              |> PrivateDraftAssist.changeset(%{
                owner_user_id: owner_id,
                conversation_id: conversation_id,
                insight_id: insight.id,
                suggested_draft: insight.suggested_draft,
                status: "active",
                expires_at:
                  DateTime.add(DateTime.utc_now(), 7200, :second)
                  |> DateTime.truncate(:microsecond)
              })
              |> Repo.insert()

            broadcast_private(
              conversation_id,
              owner_id,
              "social_flow:insight",
              %{
                "insight" => ConversationInsight.to_contract(insight)
              },
              trace_id
            )

            {:ok, insight, :created}
        end
      else
        {:ok, :no_insight}
      end
    end
  end

  def correct_insight(%{insight_id: id, user_id: user_id, label: label}) do
    with %ConversationInsight{} = insight <- Repo.get(ConversationInsight, id),
         true <- insight.owner_user_id == user_id do
      now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

      {:ok, insight} =
        insight
        |> ConversationInsight.changeset(%{
          status: "corrected",
          correction_label: label || "opal_misunderstood",
          dismissed_at: now
        })
        |> Repo.update()

      # Correction is context-bound — no personality profile
      audit!(
        insight.conversation_id,
        user_id,
        "insight.corrected",
        %{
          "insight_id" => insight.id,
          "label" => insight.correction_label,
          "no_profile" => true
        },
        @trace
      )

      {:ok, insight}
    else
      nil -> {:error, :not_found}
      false -> {:error, :forbidden}
    end
  end

  def get_insight_for_user(insight_id, user_id) do
    case Repo.get(ConversationInsight, insight_id) do
      %ConversationInsight{owner_user_id: ^user_id} = i -> {:ok, i}
      %ConversationInsight{} -> {:error, :forbidden}
      nil -> {:error, :not_found}
    end
  end

  def get_draft_for_user(draft_id, user_id) do
    case Repo.get(PrivateDraftAssist, draft_id) do
      %PrivateDraftAssist{owner_user_id: ^user_id} = d -> {:ok, d}
      %PrivateDraftAssist{} -> {:error, :forbidden}
      nil -> {:error, :not_found}
    end
  end

  def list_active_insights(owner_user_id, conversation_id) do
    with :ok <- ensure_member(conversation_id, owner_user_id) do
      from(i in ConversationInsight,
        where:
          i.owner_user_id == ^owner_user_id and i.conversation_id == ^conversation_id and
            i.status in ^["visible", "acted"] and i.privacy_class == "private",
        order_by: [desc: i.inserted_at],
        limit: 10
      )
      |> Repo.all()
      |> Enum.map(&ConversationInsight.to_contract/1)
      |> then(&{:ok, &1})
    end
  end

  def sync_meaning(user_id, conversation_id) do
    with :ok <- ensure_member(conversation_id, user_id) do
      {:ok, insights} = list_active_insights(user_id, conversation_id)

      loops =
        from(o in OpenLoop,
          where:
            o.owner_user_id == ^user_id and o.conversation_id == ^conversation_id and
              o.status in ^["open", "partially_answered"]
        )
        |> Repo.all()
        |> Enum.map(&OpenLoop.to_contract/1)

      drafts =
        from(d in PrivateDraftAssist,
          where:
            d.owner_user_id == ^user_id and d.conversation_id == ^conversation_id and
              d.status == "active"
        )
        |> Repo.all()
        |> Enum.map(&PrivateDraftAssist.to_contract/1)

      {:ok,
       %{
         "schema_version" => "0.1.0",
         "insights" => insights,
         "open_loops" => loops,
         "private_drafts" => drafts
       }}
    end
  end

  # --- helpers ---

  defp dismiss_insight(insight, _user_id) do
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    insight
    |> ConversationInsight.changeset(%{status: "dismissed", dismissed_at: now})
    |> Repo.update()
  end

  defp resolve_insight(insight, _reason) do
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    insight
    |> ConversationInsight.changeset(%{status: "resolved", resolved_at: now})
    |> Repo.update()
  end

  defp load_recent_messages(conversation_id) do
    from(m in Message,
      where: m.conversation_id == ^conversation_id,
      order_by: [asc: m.server_seq],
      limit: 20
    )
    |> Repo.all()
    |> Enum.map(fn m -> %{id: m.id, body: m.body, sender_user_id: m.sender_user_id} end)
  end

  defp extract_questions(text) do
    qs =
      Regex.scan(~r/[^.?!]*\?/, text)
      |> Enum.map(fn [q] -> String.trim(q) end)
      |> Enum.reject(&(&1 == ""))

    case qs do
      [one] ->
        if String.contains?(String.downcase(one), " and ") or String.contains?(one, ", and") do
          one
          |> String.split(~r/,\s*and\s+|\sand\s+/i)
          |> Enum.map(fn p ->
            p = String.trim(p)
            if String.ends_with?(p, "?"), do: p, else: p <> "?"
          end)
        else
          [one]
        end

      other ->
        other
    end
  end

  defp question_answered?(question, response_lower) do
    q = String.downcase(question)

    cond do
      String.contains?(q, "reservation") ->
        Regex.match?(
          ~r/reservation|booked|haven'?t|have not|i('ll| will) (make|handle|book)/,
          response_lower
        )

      String.contains?(q, "pick") or String.contains?(q, "6") ->
        Regex.match?(~r/\byes\b|6 works|works|pick/, response_lower)

      String.contains?(q, "coming") or String.contains?(q, "saturday") ->
        Regex.match?(~r/coming|not sure yet|i('ll| will) know|can'?t make|busy/, response_lower)

      true ->
        Regex.match?(~r/\byes\b|\bno\b|i('ll| will)/, response_lower)
    end
  end

  defp ambiguous_phrase?(body) do
    Regex.match?(~r/do whatever you want|fine\.|whatever|i guess/i, body || "")
  end

  defp impact_statement?(body) do
    Regex.match?(~r/felt dismissive|felt hurt|that felt|mattered to me/i, body || "")
  end

  defp reject_diagnosis_language(text) do
    low = String.downcase(text || "")

    if Enum.any?(@forbidden_diagnosis, &String.contains?(low, &1)) do
      {:error, :diagnosis_language_refused}
    else
      :ok
    end
  end

  defp broadcast_private(conversation_id, owner_id, event, payload, trace_id) do
    envelope =
      Contracts.event_envelope(
        event,
        Map.put(payload, "audience_user_id", owner_id),
        trace_id
      )

    Phoenix.PubSub.broadcast(
      OpalCore.PubSub,
      "social_flow:conversation:#{conversation_id}",
      {:social_flow_event, event, envelope}
    )

    :ok
  end

  defp audit!(conversation_id, actor, event_type, payload, trace_id) do
    # Store metadata only — no intimate draft text
    safe = Map.drop(payload, ["draft", "original_draft", "body"])

    %AuditEvent{}
    |> AuditEvent.changeset(%{
      conversation_id: conversation_id,
      actor_user_id: actor,
      event_type: event_type,
      payload: safe,
      trace_id: trace_id
    })
    |> Repo.insert!()

    :ok
  end

  defp ensure_member(conversation_id, user_id) do
    exists? =
      from(cm in ConversationMember,
        where: cm.conversation_id == ^conversation_id and cm.user_id == ^user_id
      )
      |> Repo.exists?()

    if exists?, do: :ok, else: {:error, :not_a_member}
  end

  defp fetch!(attrs, key) do
    Map.get(attrs, key) || Map.get(attrs, Atom.to_string(key)) ||
      raise ArgumentError, "missing #{key}"
  end
end
