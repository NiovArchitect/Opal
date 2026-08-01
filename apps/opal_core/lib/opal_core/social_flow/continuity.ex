defmodule OpalCore.SocialFlow.Continuity do
  @moduledoc """
  Social Flow 7: relationship continuity and controlled shared memory.

  Continuity is intentional, consented, and forgettable — not retention profiling.
  """

  import Ecto.Query

  alias OpalCore.Repo
  alias OpalCore.Messaging.ConversationMember
  alias OpalCore.SocialFlow.AuditEvent
  alias OpalCore.SocialFlow.FollowThrough
  alias OpalCore.SocialFlow.RelationshipMemory

  alias OpalCore.SocialFlow.{
    ContinuityCandidate,
    FutureInvitationPrompt,
    RelationshipContext,
    SharedMemory,
    SharedMemoryConsent,
    SocialTradition
  }

  @trace "trace-social-flow-7"
  @prohibited [
    "always prefers",
    "social anxiety",
    "relationship score",
    "keep the tradition alive",
    "losing touch",
    "dislikes people"
  ]

  # --- Journey A: private personal memory (extends SF2 path) ---

  def propose_private_memory(attrs) do
    owner = fetch!(attrs, :owner_user_id)
    conversation_id = fetch!(attrs, :conversation_id)
    summary = fetch!(attrs, :summary)
    counterpart = Map.get(attrs, :counterpart_user_id)
    source_ids = Map.get(attrs, :source_message_ids) || []
    purpose = Map.get(attrs, :purpose) || "private personal continuity"
    idem = Map.get(attrs, :idempotency_key) || "pcand-#{:erlang.phash2({owner, summary})}"
    trace_id = Map.get(attrs, :trace_id) || @trace

    refute_diagnosis!(summary)

    with :ok <- ensure_member(conversation_id, owner) do
      case Repo.get_by(ContinuityCandidate, idempotency_key: idem) do
        %ContinuityCandidate{} = c ->
          {:ok, c, :idempotent}

        nil ->
          {:ok, cand} =
            %ContinuityCandidate{}
            |> ContinuityCandidate.changeset(%{
              conversation_id: conversation_id,
              proposed_by_user_id: owner,
              memory_class: "private",
              candidate_type: Map.get(attrs, :candidate_type) || "preference_observation",
              summary: summary,
              purpose: purpose,
              source_message_ids: source_ids,
              required_participant_ids: [owner],
              counterpart_user_id: counterpart,
              confidence: Map.get(attrs, :confidence) || 0.7,
              uncertainty: Map.get(attrs, :uncertainty) || ["not a permanent trait"],
              status: "visible",
              raw_candidate: %{
                "prompt" => Map.get(attrs, :private_prompt) || "Remember this privately?",
                "actions" => ["Save privately", "Edit", "Not relevant", "Dismiss"]
              },
              idempotency_key: idem
            })
            |> Repo.insert()

          # Also create SF2-compatible candidate for private path reuse
          {:ok, %{candidate: sf2_cand}} =
            FollowThrough.create_memory_candidate(%{
              owner_user_id: owner,
              conversation_id: conversation_id,
              counterpart_user_id: counterpart,
              candidate_summary: summary,
              candidate_type: "continuity_preference",
              source_message_ids: source_ids,
              confidence: cand.confidence,
              uncertainty: cand.uncertainty,
              proposed_purpose: purpose,
              trace_id: trace_id
            })

          audit!(
            conversation_id,
            owner,
            "continuity.private.candidate",
            %{
              "candidate_id" => cand.id,
              "sf2_candidate_id" => sf2_cand.id
            },
            trace_id
          )

          {:ok,
           %{
             candidate: cand,
             sf2_candidate: sf2_cand,
             private_prompt: cand.raw_candidate["prompt"]
           }, :created}
      end
    end
  end

  def save_private_memory(%{candidate_id: id, user_id: user_id} = attrs) do
    # Prefer SF2 candidate id if provided as sf2_candidate_id
    sf2_id = Map.get(attrs, :sf2_candidate_id) || id
    trace_id = Map.get(attrs, :trace_id) || @trace

    case FollowThrough.approve_memory_candidate(%{
           candidate_id: sf2_id,
           user_id: user_id,
           trace_id: trace_id
         }) do
      {:ok, result} when is_map(result) ->
        mem = Map.get(result, :memory) || result[:memory]

        if cand = Repo.get(ContinuityCandidate, id) do
          cand
          |> ContinuityCandidate.changeset(%{
            status: "accepted",
            resolved_at: DateTime.utc_now() |> DateTime.truncate(:microsecond)
          })
          |> Repo.update()
        end

        if mem, do: {:ok, mem}, else: {:error, :invalid_result}

      other ->
        other
    end
  end

  def forget_private_memory(%{memory_id: id, user_id: user_id}) do
    FollowThrough.handle_memory(%{memory_id: id, user_id: user_id, action: "forget"})
  end

  def get_private_memory(memory_id, user_id) do
    FollowThrough.get_memory_for_user(memory_id, user_id)
  end

  # --- Journey B: shared relationship memory ---

  def propose_shared_memory(attrs) do
    conversation_id = fetch!(attrs, :conversation_id)
    proposer = fetch!(attrs, :proposed_by_user_id)
    summary = fetch!(attrs, :summary)
    required = Map.get(attrs, :required_participant_ids) || member_ids(conversation_id)
    purpose = Map.get(attrs, :purpose) || "shared continuity"

    idem =
      Map.get(attrs, :idempotency_key) || "smem-#{:erlang.phash2({conversation_id, summary})}"

    trace_id = Map.get(attrs, :trace_id) || @trace

    with :ok <- ensure_member(conversation_id, proposer),
         :ok <- ensure_context_allows(conversation_id, proposer) do
      case Repo.get_by(SharedMemory, idempotency_key: idem) do
        %SharedMemory{} = m ->
          {:ok, m, :idempotent}

        nil ->
          now = DateTime.utc_now() |> DateTime.truncate(:microsecond)
          review = DateTime.add(now, 90 * 86_400, :second)

          {:ok, mem} =
            %SharedMemory{}
            |> SharedMemory.changeset(%{
              conversation_id: conversation_id,
              memory_class: Map.get(attrs, :memory_class) || "shared_relationship",
              summary: summary,
              purpose: purpose,
              source_message_ids: Map.get(attrs, :source_message_ids) || [],
              participant_ids: required,
              required_participant_ids: required,
              status: "pending_consent",
              visibility: "shared",
              review_at: review,
              deletion_state: "active",
              idempotency_key: idem,
              metadata: %{
                "prompt" => Map.get(attrs, :prompt) || summary,
                "actions" => ["Save together", "Not now", "No", "Edit wording"],
                "not_auto_recurrence" => true
              }
            })
            |> Repo.insert()

          Enum.each(required, fn uid ->
            %SharedMemoryConsent{}
            |> SharedMemoryConsent.changeset(%{
              shared_memory_id: mem.id,
              user_id: uid,
              decision: "pending",
              idempotency_key: "smc-#{mem.id}-#{uid}"
            })
            |> Repo.insert()
          end)

          broadcast(
            conversation_id,
            "social_flow:shared_memory_candidate",
            %{
              "shared_memory" => SharedMemory.to_contract(mem),
              "silence_is_not_consent" => true
            },
            trace_id
          )

          {:ok, mem, :created}
      end
    end
  end

  def respond_shared_memory(attrs) do
    memory_id = fetch!(attrs, :shared_memory_id)
    user_id = fetch!(attrs, :user_id)
    decision = fetch!(attrs, :decision)
    trace_id = Map.get(attrs, :trace_id) || @trace

    with %SharedMemory{} = mem <- Repo.get(SharedMemory, memory_id),
         :ok <- ensure_member(mem.conversation_id, user_id),
         true <- user_id in (mem.required_participant_ids || []),
         true <- mem.status == "pending_consent",
         %SharedMemoryConsent{} = consent <-
           Repo.get_by(SharedMemoryConsent, shared_memory_id: memory_id, user_id: user_id) do
      now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

      {:ok, consent} =
        consent
        |> SharedMemoryConsent.changeset(%{decision: decision, decided_at: now})
        |> Repo.update()

      consents =
        from(c in SharedMemoryConsent, where: c.shared_memory_id == ^memory_id)
        |> Repo.all()

      cond do
        decision == "decline" ->
          {:ok, mem} =
            mem
            |> SharedMemory.changeset(%{status: "declined"})
            |> Repo.update()

          {:ok, %{memory: mem, consent: consent, active: false}}

        Enum.all?(consents, &(&1.decision == "accept")) ->
          {:ok, mem} =
            mem
            |> SharedMemory.changeset(%{status: "active"})
            |> Repo.update()

          broadcast(
            mem.conversation_id,
            "social_flow:shared_memory",
            %{
              "shared_memory" => SharedMemory.to_contract(mem)
            },
            trace_id
          )

          audit!(
            mem.conversation_id,
            user_id,
            "continuity.shared.activated",
            %{
              "shared_memory_id" => mem.id
            },
            trace_id
          )

          {:ok, %{memory: mem, consent: consent, active: true}}

        true ->
          # one accept insufficient
          {:ok, %{memory: mem, consent: consent, active: false, awaiting: true}}
      end
    else
      nil -> {:error, :not_found}
      false -> {:error, :forbidden}
      {:error, _} = e -> e
    end
  end

  def get_shared_memory(memory_id, user_id) do
    case Repo.get(SharedMemory, memory_id) do
      %SharedMemory{deletion_state: "active", status: status} = m
      when status in ~w(pending_consent active paused) ->
        if member?(m.conversation_id, user_id) and user_id in (m.participant_ids || []) do
          {:ok, m}
        else
          {:error, :forbidden}
        end

      %SharedMemory{deletion_state: ds} when ds in ~w(deleted forgotten) ->
        {:error, :deleted}

      %SharedMemory{} ->
        {:error, :forbidden}

      nil ->
        {:error, :not_found}
    end
  end

  def delete_shared_memory(%{shared_memory_id: id, user_id: user_id, mode: mode}) do
    # mode: dissolve (shared inactive) | personal_hide not modeled as hard delete of others
    with %SharedMemory{} = mem <- Repo.get(SharedMemory, id),
         :ok <- ensure_member(mem.conversation_id, user_id),
         true <- user_id in (mem.participant_ids || []) do
      now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

      status =
        case mode do
          "dissolve" -> "dissolved"
          "archive" -> "archived"
          "delete" -> "deleted"
          _ -> "archived"
        end

      deletion_state = if status == "deleted", do: "deleted", else: "active"

      {:ok, mem} =
        mem
        |> SharedMemory.changeset(%{
          status: status,
          deletion_state: deletion_state,
          deleted_at: if(status == "deleted", do: now),
          archived_at: if(status == "archived", do: now)
        })
        |> Repo.update()

      %OpalCore.SocialFlow.AuditEvent{}
      |> OpalCore.SocialFlow.AuditEvent.changeset(%{
        conversation_id: mem.conversation_id,
        actor_user_id: user_id,
        event_type: "continuity.shared.deleted",
        payload: %{"shared_memory_id" => mem.id, "mode" => mode},
        trace_id: @trace
      })
      |> Repo.insert!()

      # insert deletion event via raw if table exists - use audit only to avoid extra schema
      {:ok, mem}
    else
      nil -> {:error, :not_found}
      false -> {:error, :forbidden}
      {:error, _} = e -> e
    end
  end

  # --- Journey C: recurrence / tradition ---

  def propose_recurrence(attrs) do
    conversation_id = fetch!(attrs, :conversation_id)
    proposer = fetch!(attrs, :proposed_by_user_id)
    title = Map.get(attrs, :title) || "Game night"
    summary = fetch!(attrs, :summary)
    rule = Map.get(attrs, :recurrence_rule) || %{"cadence" => "first_friday", "time" => "evening"}
    required = Map.get(attrs, :required_participant_ids) || member_ids(conversation_id)
    occurrences = Map.get(attrs, :observed_occurrences) || 3
    idem = Map.get(attrs, :idempotency_key) || "trad-#{:erlang.phash2({conversation_id, title})}"
    trace_id = Map.get(attrs, :trace_id) || @trace

    with :ok <- ensure_member(conversation_id, proposer),
         :ok <- ensure_context_allows(conversation_id, proposer) do
      case Repo.get_by(SocialTradition, idempotency_key: idem) do
        %SocialTradition{} = t ->
          {:ok, t, :idempotent}

        nil ->
          {:ok, t} =
            %SocialTradition{}
            |> SocialTradition.changeset(%{
              conversation_id: conversation_id,
              title: title,
              summary: summary,
              tradition_type: Map.get(attrs, :tradition_type) || "group_rhythm",
              recurrence_rule: rule,
              participant_ids: required,
              required_participant_ids: required,
              status: "proposed",
              occurrence_count: occurrences,
              idempotency_key: idem,
              metadata: %{
                "prompt" =>
                  Map.get(attrs, :prompt) ||
                    "This group has held #{title} repeatedly. Make it a recurring tradition?",
                "actions" => ["Propose recurrence", "Keep informal", "Not relevant", "Dismiss"],
                "no_auto_create" => true
              }
            })
            |> Repo.insert()

          # consent rows reuse shared memory consent pattern via tradition responses table
          # store pending as tradition status proposed until accept_recurrence

          broadcast(
            conversation_id,
            "social_flow:tradition_candidate",
            %{
              "tradition" => SocialTradition.to_contract(t),
              "silence_is_not_consent" => true,
              "no_mandatory_attendance" => true
            },
            trace_id
          )

          {:ok, t, :created}
      end
    end
  end

  def respond_recurrence(attrs) do
    tradition_id = fetch!(attrs, :tradition_id)
    user_id = fetch!(attrs, :user_id)
    decision = fetch!(attrs, :decision)
    occurrence_key = Map.get(attrs, :occurrence_key) || "activation"
    trace_id = Map.get(attrs, :trace_id) || @trace

    with %SocialTradition{} = t <- Repo.get(SocialTradition, tradition_id),
         :ok <- ensure_member(t.conversation_id, user_id),
         true <- user_id in (t.required_participant_ids || []),
         true <- t.status in ~w(proposed active) do
      consents =
        (t.metadata || %{})
        |> Map.get("consents", %{})
        |> Map.put(user_id, decision)

      meta =
        (t.metadata || %{})
        |> Map.put("consents", consents)
        |> Map.put("last_occurrence_key", occurrence_key)

      cond do
        decision == "decline" and occurrence_key == "activation" ->
          {:ok, t} =
            t
            |> SocialTradition.changeset(%{status: "declined", metadata: meta})
            |> Repo.update()

          {:ok, %{tradition: t, active: false}}

        occurrence_key == "activation" and
            Enum.all?(t.required_participant_ids, fn uid -> consents[uid] == "accept" end) ->
          {:ok, t} =
            t
            |> SocialTradition.changeset(%{status: "active", metadata: meta})
            |> Repo.update()

          broadcast(
            t.conversation_id,
            "social_flow:tradition",
            %{
              "tradition" => SocialTradition.to_contract(t)
            },
            trace_id
          )

          {:ok, %{tradition: t, active: true}}

        true ->
          {:ok, t} =
            t
            |> SocialTradition.changeset(%{metadata: meta})
            |> Repo.update()

          # individual occurrence decline ok without ending tradition
          {:ok, %{tradition: t, active: t.status == "active", decision: decision, awaiting: true}}
      end
    else
      nil -> {:error, :not_found}
      false -> {:error, :forbidden}
      {:error, _} = e -> e
    end
  end

  def pause_tradition(%{tradition_id: id, user_id: user_id}) do
    with %SocialTradition{} = t <- Repo.get(SocialTradition, id),
         :ok <- ensure_member(t.conversation_id, user_id) do
      now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

      t
      |> SocialTradition.changeset(%{status: "paused", paused_at: now})
      |> Repo.update()
    else
      nil -> {:error, :not_found}
      {:error, _} = e -> e
    end
  end

  def end_tradition(%{tradition_id: id, user_id: user_id}) do
    with %SocialTradition{} = t <- Repo.get(SocialTradition, id),
         :ok <- ensure_member(t.conversation_id, user_id) do
      now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

      t
      |> SocialTradition.changeset(%{status: "ended", ended_at: now})
      |> Repo.update()
    end
  end

  # --- Journey D: future invitation ---

  def evaluate_future_invitation(attrs) do
    tradition_id = fetch!(attrs, :tradition_id)
    user_id = fetch!(attrs, :user_id)
    idem = Map.get(attrs, :idempotency_key) || "inv-#{tradition_id}-#{Date.utc_today()}"
    trace_id = Map.get(attrs, :trace_id) || @trace

    with %SocialTradition{} = t <- Repo.get(SocialTradition, tradition_id),
         :ok <- ensure_member(t.conversation_id, user_id),
         :ok <- ensure_context_allows(t.conversation_id, user_id),
         true <- t.status == "active" do
      case Repo.get_by(FutureInvitationPrompt, idempotency_key: idem) do
        %FutureInvitationPrompt{} = p ->
          {:ok, p, :idempotent}

        nil ->
          copy =
            Map.get(attrs, :copy) ||
              "You saved #{t.title}. Would you like to start planning this year’s?"

          {:ok, p} =
            %FutureInvitationPrompt{}
            |> FutureInvitationPrompt.changeset(%{
              tradition_id: t.id,
              conversation_id: t.conversation_id,
              copy: copy,
              status: "proposed",
              visibility: "shared",
              idempotency_key: idem
            })
            |> Repo.insert()

          broadcast(
            t.conversation_id,
            "social_flow:future_invitation",
            %{
              "prompt" => FutureInvitationPrompt.to_contract(p)
            },
            trace_id
          )

          {:ok, p, :created}
      end
    else
      false -> {:error, :tradition_not_active}
      nil -> {:error, :not_found}
      {:error, _} = e -> e
    end
  end

  def respond_future_invitation(attrs) do
    prompt_id = fetch!(attrs, :prompt_id)
    user_id = fetch!(attrs, :user_id)
    decision = fetch!(attrs, :decision)
    trace_id = Map.get(attrs, :trace_id) || @trace

    with %FutureInvitationPrompt{} = p <- Repo.get(FutureInvitationPrompt, prompt_id),
         %SocialTradition{} = t <- Repo.get(SocialTradition, p.tradition_id),
         :ok <- ensure_member(p.conversation_id, user_id) do
      now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

      status =
        case decision do
          "start" -> "started"
          "remind_later" -> "remind_later"
          "skip" -> "skipped"
          "pause" -> "paused"
          "forget" -> "forgotten"
          _ -> "declined"
        end

      {:ok, p} =
        p
        |> FutureInvitationPrompt.changeset(%{
          status: status,
          decision: decision,
          responded_by_user_id: user_id,
          responded_at: now
        })
        |> Repo.update()

      case decision do
        "pause" ->
          pause_tradition(%{tradition_id: t.id, user_id: user_id})

        "forget" ->
          end_tradition(%{tradition_id: t.id, user_id: user_id})

        "start" ->
          # create SF4-style group proposal as new journey seed, not agreed plan
          audit!(
            p.conversation_id,
            user_id,
            "continuity.invitation.started",
            %{
              "tradition_id" => t.id,
              "prompt_id" => p.id,
              "creates_agreed_plan" => false
            },
            trace_id
          )

        _ ->
          :ok
      end

      {:ok, %{prompt: p, tradition_status: Repo.get!(SocialTradition, t.id).status}}
    else
      nil -> {:error, :not_found}
      {:error, _} = e -> e
    end
  end

  # --- Journey E: relationship context pause ---

  def pause_relationship_context(attrs) do
    conversation_id = fetch!(attrs, :conversation_id)
    owner = fetch!(attrs, :owner_user_id)
    stop = Map.get(attrs, :stop_suggestions, true)
    archive = Map.get(attrs, :archive_shared, false)
    idem = Map.get(attrs, :idempotency_key) || "rctx-#{conversation_id}-#{owner}"
    trace_id = Map.get(attrs, :trace_id) || @trace

    with :ok <- ensure_member(conversation_id, owner) do
      now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

      result =
        case Repo.get_by(RelationshipContext,
               conversation_id: conversation_id,
               owner_user_id: owner
             ) do
          %RelationshipContext{} = c ->
            c
            |> RelationshipContext.changeset(%{
              status: "paused",
              stop_suggestions: stop,
              archive_shared: archive,
              paused_at: now
            })
            |> Repo.update()

          nil ->
            %RelationshipContext{}
            |> RelationshipContext.changeset(%{
              conversation_id: conversation_id,
              owner_user_id: owner,
              status: "paused",
              stop_suggestions: stop,
              archive_shared: archive,
              paused_at: now,
              idempotency_key: idem
            })
            |> Repo.insert()
        end

      with {:ok, ctx} <- result do
        if archive do
          from(m in SharedMemory,
            where:
              m.conversation_id == ^conversation_id and m.status == "active" and
                ^owner in m.participant_ids
          )
          |> Repo.update_all(set: [status: "paused", paused_at: now])

          from(t in SocialTradition,
            where:
              t.conversation_id == ^conversation_id and t.status == "active" and
                ^owner in t.participant_ids
          )
          |> Repo.update_all(set: [status: "paused", paused_at: now])
        end

        audit!(
          conversation_id,
          owner,
          "continuity.context.paused",
          %{
            "context_id" => ctx.id,
            "no_breakup_inference" => true
          },
          trace_id
        )

        {:ok, ctx}
      end
    end
  end

  def ensure_context_allows(conversation_id, user_id) do
    case Repo.get_by(RelationshipContext,
           conversation_id: conversation_id,
           owner_user_id: user_id
         ) do
      %RelationshipContext{status: "paused", stop_suggestions: true} ->
        {:error, :context_paused}

      %RelationshipContext{status: s} when s in ~w(stopped archived) ->
        {:error, :context_stopped}

      _ ->
        :ok
    end
  end

  # --- Journey F: family tradition (adults only) ---

  def propose_family_tradition(attrs) do
    attrs =
      attrs
      |> Map.put(:tradition_type, "adult_family")
      |> Map.put_new(:title, "Thanksgiving dinner")

    case propose_recurrence(attrs) do
      {:ok, t, tag} ->
        meta = Map.merge(t.metadata || %{}, %{"adult_accounts_only" => true, "no_youth" => true})

        {:ok, t} =
          t
          |> SocialTradition.changeset(%{metadata: meta, tradition_type: "adult_family"})
          |> Repo.update()

        {:ok, t, tag}

      other ->
        other
    end
  end

  # --- retrieval / sync ---

  def sync_continuity(user_id, conversation_id) do
    with :ok <- ensure_member(conversation_id, user_id) do
      private =
        FollowThrough.list_memories(user_id)
        |> Enum.filter(&(&1["conversation_id"] == conversation_id))

      shared =
        from(m in SharedMemory,
          where:
            m.conversation_id == ^conversation_id and m.deletion_state == "active" and
              m.status in ^["pending_consent", "active", "paused"] and
              ^user_id in m.participant_ids
        )
        |> Repo.all()
        |> Enum.map(&SharedMemory.to_contract/1)

      traditions =
        from(t in SocialTradition,
          where:
            t.conversation_id == ^conversation_id and
              t.status in ^["proposed", "active", "paused"] and ^user_id in t.participant_ids
        )
        |> Repo.all()
        |> Enum.map(&SocialTradition.to_contract/1)

      prompts =
        from(p in FutureInvitationPrompt,
          where: p.conversation_id == ^conversation_id and p.status == "proposed"
        )
        |> Repo.all()
        |> Enum.map(&FutureInvitationPrompt.to_contract/1)

      ctx =
        case Repo.get_by(RelationshipContext,
               conversation_id: conversation_id,
               owner_user_id: user_id
             ) do
          nil -> nil
          c -> RelationshipContext.to_contract(c)
        end

      {:ok,
       %{
         "private_memories" => private,
         "shared_memories" => shared,
         "traditions" => traditions,
         "future_invitations" => prompts,
         "relationship_context" => ctx,
         "no_relationship_score" => true,
         "no_engagement_feed" => true,
         "commercial_use_forbidden" => true
       }}
    end
  end

  def retrieve_for_context(user_id, conversation_id, opts \\ []) do
    # Cross-relationship isolation: only this conversation
    counterpart = Keyword.get(opts, :counterpart_user_id)

    with :ok <- ensure_member(conversation_id, user_id),
         :ok <- ensure_context_allows(conversation_id, user_id) do
      mems =
        from(m in RelationshipMemory,
          where:
            m.owner_user_id == ^user_id and m.conversation_id == ^conversation_id and
              m.deletion_state == "active"
        )
        |> Repo.all()
        |> Enum.filter(fn m ->
          is_nil(counterpart) or m.counterpart_user_id == counterpart
        end)
        |> Enum.map(&RelationshipMemory.to_contract/1)

      {:ok, mems}
    end
  end

  # --- helpers ---

  defp refute_diagnosis!(summary) do
    low = String.downcase(summary || "")

    if Enum.any?(@prohibited, &String.contains?(low, &1)) do
      raise ArgumentError, "prohibited continuity language"
    end

    :ok
  end

  defp member_ids(conversation_id) do
    from(m in ConversationMember,
      where: m.conversation_id == ^conversation_id,
      select: m.user_id
    )
    |> Repo.all()
  end

  defp member?(conversation_id, user_id) do
    from(m in ConversationMember,
      where: m.conversation_id == ^conversation_id and m.user_id == ^user_id
    )
    |> Repo.exists?()
  end

  defp ensure_member(conversation_id, user_id) do
    if member?(conversation_id, user_id), do: :ok, else: {:error, :not_a_member}
  end

  defp fetch!(attrs, key) do
    Map.get(attrs, key) || Map.get(attrs, to_string(key)) ||
      raise ArgumentError, "missing #{inspect(key)}"
  end

  defp audit!(conversation_id, actor, event_type, payload, trace_id) do
    %AuditEvent{}
    |> AuditEvent.changeset(%{
      conversation_id: conversation_id,
      actor_user_id: actor,
      event_type: event_type,
      payload: payload,
      trace_id: trace_id
    })
    |> Repo.insert!()
  end

  defp broadcast(conversation_id, event, payload, trace_id) do
    OpalCoreWeb.Endpoint.broadcast(
      "conversation:#{conversation_id}",
      event,
      Map.put(payload, "trace_id", trace_id)
    )
  end
end
