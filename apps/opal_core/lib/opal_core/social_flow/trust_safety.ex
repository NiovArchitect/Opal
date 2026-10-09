defmodule OpalCore.SocialFlow.TrustSafety do
  @moduledoc """
  Social Flow 9: trust-and-safety control plane.

  Synthetic development foundation only — not legal certification,
  emergency response, or comprehensive abuse-prevention assurance.
  """

  import Ecto.Query

  alias OpalCore.Repo
  alias OpalCore.SocialFlow.AuditEvent
  alias OpalCore.SocialFlow.ApprovedContact
  alias OpalCore.SocialFlow.Family

  alias OpalCore.SocialFlow.{
    AccountRecoveryCase,
    DeviceSession,
    GuardianAuthorityReview,
    SafetyAppeal,
    SafetyBlock,
    SafetyEvidenceRef,
    SafetyReport
  }

  @trace "trace-social-flow-9"
  @rate_limit_max 5
  @rate_window_sec 300

  # --- Journey A: block ---

  def create_block(attrs) do
    blocker = fetch!(attrs, :blocker_user_id)
    blocked = fetch!(attrs, :blocked_user_id)
    scope = Map.get(attrs, :scope) || "relationship"
    idem = Map.get(attrs, :idempotency_key) || "blk-#{blocker}-#{blocked}-#{scope}"
    trace_id = Map.get(attrs, :trace_id) || @trace

    if blocker == blocked do
      {:error, :cannot_block_self}
    else
      case Repo.get_by(SafetyBlock,
             blocker_user_id: blocker,
             blocked_user_id: blocked,
             status: "active"
           ) do
        %SafetyBlock{} = b ->
          {:ok, b, :idempotent}

        nil ->
          contact_id = suspend_approved_contacts!(blocker, blocked)

          {:ok, block} =
            %SafetyBlock{}
            |> SafetyBlock.changeset(%{
              blocker_user_id: blocker,
              blocked_user_id: blocked,
              scope: scope,
              conversation_id: Map.get(attrs, :conversation_id),
              family_id: Map.get(attrs, :family_id),
              status: "active",
              reason_class: Map.get(attrs, :reason_class) || "user_request",
              suspended_contact_id: contact_id,
              idempotency_key: idem
            })
            |> Repo.insert()

          guardian_notice =
            if Map.get(attrs, :notify_guardian) && Map.get(attrs, :family_id) do
              "A youth blocked an approved contact."
            else
              nil
            end

          audit!(
            Map.get(attrs, :conversation_id),
            blocker,
            "safety.block.created",
            %{
              "block_id" => block.id,
              "blocked_user_id" => blocked,
              "no_message_content" => true
            },
            trace_id
          )

          {:ok,
           %{
             block: block,
             guardian_notice: guardian_notice,
             no_report_required: true,
             no_retaliation_notification: true
           }, :created}
      end
    end
  end

  defp suspend_approved_contacts!(blocker, blocked) do
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    from(c in ApprovedContact,
      where:
        c.status == "active" and
          ((c.youth_user_id == ^blocker and c.contact_user_id == ^blocked) or
             (c.youth_user_id == ^blocked and c.contact_user_id == ^blocker))
    )
    |> Repo.update_all(set: [status: "revoked", revoked_at: now])

    nil
  end

  def blocked?(from_user_id, to_user_id) do
    # Cannot send TO someone who blocked you (relationship scope).
    from(b in SafetyBlock,
      where:
        b.status == "active" and b.blocker_user_id == ^to_user_id and
          b.blocked_user_id == ^from_user_id
    )
    |> Repo.exists?()
  end

  @doc """
  Soft contact heuristic for spam throttle: approved contact, established
  relationship, or an explicit RU-1 relationship type counts as a contact.
  """
  def soft_contact?(user_id, peer_id)
      when is_binary(user_id) and is_binary(peer_id) do
    approved_contact?(user_id, peer_id) or
      relationship_established?(user_id, peer_id) or
      relationship_typed?(user_id, peer_id)
  end

  def soft_contact?(_, _), do: false

  defp approved_contact?(a, b) do
    from(c in ApprovedContact,
      where:
        c.status == "active" and
          ((c.youth_user_id == ^a and c.contact_user_id == ^b) or
             (c.youth_user_id == ^b and c.contact_user_id == ^a))
    )
    |> Repo.exists?()
  end

  defp relationship_established?(a, b) do
    from(e in OpalCore.SocialFlow.RelationshipEstablishment,
      where:
        e.status == "active" and
          ^a in e.participant_ids and
          ^b in e.participant_ids
    )
    |> Repo.exists?()
  end

  defp relationship_typed?(a, b) do
    from(r in OpalCore.Relationships.RelationshipType,
      where:
        (r.user_id == ^a and r.contact_user_id == ^b) or
          (r.user_id == ^b and r.contact_user_id == ^a)
    )
    |> Repo.exists?()
  end

  def can_send_message?(from_user_id, to_user_id) do
    if blocked?(from_user_id, to_user_id) do
      {:error, :blocked}
    else
      :ok
    end
  end

  def can_sync_conversation?(user_id, other_user_id) do
    can_send_message?(user_id, other_user_id)
  end

  def can_request_contact?(from_user_id, to_user_id) do
    cond do
      blocked?(from_user_id, to_user_id) ->
        {:error, :blocked}

      contact_request_suspended?(from_user_id, to_user_id) ->
        {:error, :contact_requests_suspended}

      true ->
        check_rate_limit("contact_request", from_user_id, to_user_id)
    end
  end

  def unblock(attrs) do
    blocker = fetch!(attrs, :blocker_user_id)
    block_id = fetch!(attrs, :block_id)

    case Repo.get(SafetyBlock, block_id) do
      %SafetyBlock{blocker_user_id: ^blocker, status: "active"} = b ->
        now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

        b
        |> SafetyBlock.changeset(%{status: "revoked", revoked_at: now})
        |> Repo.update()

      %SafetyBlock{} ->
        {:error, :forbidden}

      nil ->
        {:error, :not_found}
    end
  end

  # --- Journey B: report without block ---

  def create_report(attrs) do
    reporter = fetch!(attrs, :reporter_user_id)
    reported = fetch!(attrs, :reported_user_id)
    category = fetch!(attrs, :category)
    idem = Map.get(attrs, :idempotency_key) || "rpt-#{reporter}-#{reported}-#{category}"
    trace_id = Map.get(attrs, :trace_id) || @trace

    with :ok <- check_rate_limit("report", reporter, reported) do
      case Repo.get_by(SafetyReport, idempotency_key: idem) do
        %SafetyReport{} = r ->
          {:ok, r, :idempotent}

        nil ->
          triage = triage_proposal(category)
          now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

          triage =
            Map.merge(triage, %{
              "venue_id" => Map.get(attrs, :subject_venue_id),
              "live_room_id" => Map.get(attrs, :subject_live_room_id),
              "kind" => Map.get(attrs, :triage_proposal, %{}) |> Map.get("kind")
            })
            |> Enum.reject(fn {_k, v} -> is_nil(v) end)
            |> Map.new()

          {:ok, report} =
            %SafetyReport{}
            |> SafetyReport.changeset(%{
              reporter_user_id: reporter,
              reported_user_id: reported,
              category: category,
              status: "submitted",
              privacy_class: "reporter_confidential",
              note: Map.get(attrs, :note),
              source_request_ids: Map.get(attrs, :source_request_ids) || [],
              source_message_ids: Map.get(attrs, :source_message_ids) || [],
              policy_version: "sf9-dev-0.1",
              triage_proposal: triage,
              reporter_visible_status: "submitted",
              idempotency_key: idem,
              subject_venue_id: Map.get(attrs, :subject_venue_id),
              subject_live_room_id: Map.get(attrs, :subject_live_room_id)
            })
            |> Repo.insert()

          # optional evidence
          Enum.each(Map.get(attrs, :evidence) || [], fn ev ->
            attach_evidence!(report.id, ev)
          end)

          report = maybe_apply_containment(report, triage, now)

          audit!(
            nil,
            reporter,
            "safety.report.created",
            %{
              "report_id" => report.id,
              "category" => category,
              "no_raw_conversation_copy" => true,
              "reporter_confidential" => true
            },
            trace_id
          )

          {:ok,
           %{
             report: report,
             reported_user_sees_nothing: true,
             auto_block: false
           }, :created}
      end
    end
  end

  defp triage_proposal("repeated_unwanted_requests") do
    %{
      "proposal" => "suspend_contact_requests",
      "duration_hours" => 24,
      "manual_review" => false,
      "confidence" => 0.8
    }
  end

  defp triage_proposal(_),
    do: %{"proposal" => "manual_review_needed", "manual_review" => true, "confidence" => 0.5}

  defp maybe_apply_containment(report, %{"proposal" => "suspend_contact_requests"} = triage, now) do
    hours = Map.get(triage, "duration_hours", 24)
    expires = DateTime.add(now, hours * 3600, :second)

    %OpalCore.SocialFlow.ContactRequestSuspension{}
    |> OpalCore.SocialFlow.ContactRequestSuspension.changeset(%{
      actor_user_id: report.reported_user_id,
      target_user_id: report.reporter_user_id,
      status: "active",
      source_report_id: report.id,
      expires_at: expires,
      idempotency_key: "crs-#{report.id}"
    })
    |> Repo.insert()

    {:ok, report} =
      report
      |> SafetyReport.changeset(%{
        status: "action_taken",
        containment_action: "suspend_contact_requests",
        containment_expires_at: expires,
        reporter_visible_status: "action_taken"
      })
      |> Repo.update()

    report
  end

  defp maybe_apply_containment(report, _triage, _now) do
    {:ok, report} =
      report
      |> SafetyReport.changeset(%{
        status: "triaged",
        reporter_visible_status: "under_review"
      })
      |> Repo.update()

    report
  end

  def get_report_for_reporter(report_id, user_id) do
    case Repo.get(SafetyReport, report_id) do
      %SafetyReport{reporter_user_id: ^user_id} = r ->
        {:ok, SafetyReport.to_reporter_contract(r)}

      %SafetyReport{} ->
        {:error, :not_found}

      nil ->
        {:error, :not_found}
    end
  end

  def get_report_for_subject(report_id, user_id) do
    case Repo.get(SafetyReport, report_id) do
      %SafetyReport{reported_user_id: ^user_id} ->
        # no leakage
        {:error, :not_found}

      _ ->
        {:error, :not_found}
    end
  end

  # --- Journey G: evidence ---

  def attach_evidence!(report_id, ev) do
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)
    body = Map.get(ev, :snippet) || Map.get(ev, "snippet") || ""
    hash = :crypto.hash(:sha256, body) |> Base.encode16(case: :lower)

    %SafetyEvidenceRef{}
    |> SafetyEvidenceRef.changeset(%{
      report_id: report_id,
      source_message_id: Map.get(ev, :message_id) || Map.get(ev, "message_id"),
      content_hash: hash,
      minimal_snippet: String.slice(body, 0, 120),
      sender_user_id: Map.get(ev, :sender_user_id) || Map.get(ev, "sender_user_id"),
      conversation_id: Map.get(ev, :conversation_id) || Map.get(ev, "conversation_id"),
      captured_at: now,
      expires_at: DateTime.add(now, 30 * 86_400, :second),
      idempotency_key: Map.get(ev, :idempotency_key) || "ev-#{report_id}-#{hash}"
    })
    |> Repo.insert()
  end

  def list_evidence_for_reporter(report_id, user_id) do
    with {:ok, _} <- get_report_for_reporter(report_id, user_id) do
      refs =
        from(e in SafetyEvidenceRef, where: e.report_id == ^report_id)
        |> Repo.all()
        |> Enum.map(&SafetyEvidenceRef.to_restricted_contract/1)

      {:ok, refs}
    end
  end

  # --- Journey C: sessions ---

  def register_session(attrs) do
    user_id = fetch!(attrs, :user_id)
    label = fetch!(attrs, :device_label)

    ref =
      Map.get(attrs, :session_ref) ||
        "sess-#{:erlang.phash2({user_id, label, System.system_time()})}"

    family = Map.get(attrs, :refresh_family) || "rf-#{user_id}"
    idem = Map.get(attrs, :idempotency_key) || "ds-#{ref}"

    case Repo.get_by(DeviceSession, session_ref: ref) do
      %DeviceSession{} = s ->
        {:ok, s, :idempotent}

      nil ->
        now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

        {:ok, s} =
          %DeviceSession{}
          |> DeviceSession.changeset(%{
            user_id: user_id,
            device_label: label,
            session_ref: ref,
            status: "active",
            platform: Map.get(attrs, :platform) || "phone",
            last_seen_at: now,
            refresh_family: family,
            idempotency_key: idem
          })
          |> Repo.insert()

        {:ok, s, :created}
    end
  end

  def list_sessions(user_id) do
    from(s in DeviceSession, where: s.user_id == ^user_id, order_by: [desc: s.last_seen_at])
    |> Repo.all()
    |> Enum.map(&DeviceSession.to_contract/1)
  end

  def revoke_session(attrs) do
    user_id = fetch!(attrs, :user_id)
    session_id = fetch!(attrs, :session_id)

    case Repo.get(DeviceSession, session_id) do
      %DeviceSession{user_id: ^user_id} = s ->
        now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

        s
        |> DeviceSession.changeset(%{
          status: "revoked",
          revoked_at: now,
          revoked_by_user_id: user_id,
          session_ref: "revoked-#{s.session_ref}"
        })
        |> Repo.update()

      %DeviceSession{} ->
        {:error, :forbidden}

      nil ->
        {:error, :not_found}
    end
  end

  def revoke_all_other_sessions(attrs) do
    user_id = fetch!(attrs, :user_id)
    keep_id = Map.get(attrs, :keep_session_id)
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    q =
      from(s in DeviceSession,
        where: s.user_id == ^user_id and s.status == "active"
      )

    q =
      if keep_id do
        from(s in q, where: s.id != ^keep_id)
      else
        q
      end

    {n, _} =
      Repo.update_all(q,
        set: [
          status: "revoked",
          revoked_at: now,
          revoked_by_user_id: user_id
        ]
      )

    {:ok, %{revoked_count: n}}
  end

  def session_allowed?(session_ref) do
    case Repo.get_by(DeviceSession, session_ref: session_ref) do
      %DeviceSession{status: "active"} -> true
      _ -> false
    end
  end

  # --- Journey D: recovery ---

  def start_recovery(attrs) do
    initiator = fetch!(attrs, :initiator_user_id)
    target = fetch!(attrs, :target_user_id)
    family_id = Map.get(attrs, :family_id)
    proof = Map.get(attrs, :proof_class) || "guardian_session"
    reauth = Map.get(attrs, :reauth_confirmed, false)
    idem = Map.get(attrs, :idempotency_key) || "rec-#{target}-#{initiator}"

    with :ok <- ensure_recovery_authority(initiator, target, family_id),
         true <- reauth or proof == "guardian_session" do
      now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

      case Repo.get_by(AccountRecoveryCase, idempotency_key: idem) do
        %AccountRecoveryCase{status: "completed"} ->
          # replay protection
          {:error, :replay}

        %AccountRecoveryCase{status: "pending"} = c ->
          {:ok, c, :idempotent}

        nil ->
          token = Map.get(attrs, :proof_token) || "dev-recovery-#{target}"
          hash = :crypto.hash(:sha256, token) |> Base.encode16(case: :lower)

          {:ok, c} =
            %AccountRecoveryCase{}
            |> AccountRecoveryCase.changeset(%{
              target_user_id: target,
              initiator_user_id: initiator,
              family_id: family_id,
              proof_class: proof,
              proof_token_hash: hash,
              status: "pending",
              new_device_label: Map.get(attrs, :new_device_label),
              authority_version: Map.get(attrs, :authority_version) || 1,
              expires_at: DateTime.add(now, 3600, :second),
              idempotency_key: idem
            })
            |> Repo.insert()

          {:ok, c, :created}

        %AccountRecoveryCase{} = c ->
          {:ok, c, :idempotent}
      end
    else
      false -> {:error, :reauth_required}
      {:error, _} = e -> e
    end
  end

  defp ensure_recovery_authority(initiator, target, family_id) when is_binary(family_id) do
    Family.ensure_guardian(initiator, target, family_id)
  end

  defp ensure_recovery_authority(_initiator, _target, _), do: {:error, :family_required}

  def complete_recovery(attrs) do
    case_id = fetch!(attrs, :recovery_case_id)
    initiator = fetch!(attrs, :initiator_user_id)
    token = Map.get(attrs, :proof_token) || ""

    with %AccountRecoveryCase{initiator_user_id: ^initiator, status: "pending"} = c <-
           Repo.get(AccountRecoveryCase, case_id),
         true <- DateTime.compare(DateTime.utc_now(), c.expires_at) == :lt,
         true <-
           Base.encode16(:crypto.hash(:sha256, token), case: :lower) == c.proof_token_hash do
      now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

      # revoke target sessions
      from(s in DeviceSession, where: s.user_id == ^c.target_user_id and s.status == "active")
      |> Repo.update_all(set: [status: "revoked", revoked_at: now, revoked_by_user_id: initiator])

      # register new device session if labeled
      if c.new_device_label do
        register_session(%{
          user_id: c.target_user_id,
          device_label: c.new_device_label,
          platform: "phone",
          idempotency_key: "ds-recovery-#{c.id}"
        })
      end

      c
      |> AccountRecoveryCase.changeset(%{status: "completed", completed_at: now})
      |> Repo.update()
    else
      %AccountRecoveryCase{status: "completed"} ->
        {:error, :replay}

      %AccountRecoveryCase{} ->
        {:error, :forbidden}

      false ->
        {:error, :invalid_or_expired}

      nil ->
        {:error, :not_found}
    end
  end

  # --- Journey E: guardian authority review ---

  def request_guardian_removal(attrs) do
    family_id = fetch!(attrs, :family_id)
    requester = fetch!(attrs, :requested_by_user_id)
    target = fetch!(attrs, :target_guardian_user_id)
    youth = fetch!(attrs, :youth_user_id)
    reauth = Map.get(attrs, :reauth_confirmed, false)
    idem = Map.get(attrs, :idempotency_key) || "gar-#{family_id}-#{target}"

    with :ok <- Family.ensure_guardian(requester, youth, family_id),
         true <- reauth do
      # custody-safe: do not auto-approve removal of co-guardian
      {:ok, review} =
        %GuardianAuthorityReview{}
        |> GuardianAuthorityReview.changeset(%{
          family_id: family_id,
          requested_by_user_id: requester,
          target_guardian_user_id: target,
          youth_user_id: youth,
          action: "remove_co_guardian",
          status: "human_review_required",
          requires_reauth: true,
          reauth_confirmed: true,
          authority_version: Map.get(attrs, :authority_version) || 1,
          reason: Map.get(attrs, :reason) || "requested_removal",
          idempotency_key: idem
        })
        |> Repo.insert()

      {:ok, review, :created}
    else
      false -> {:error, :reauth_required}
      {:error, _} = e -> e
    end
  end

  # --- Journey H: appeals ---

  def create_appeal(attrs) do
    appellant = fetch!(attrs, :appellant_user_id)
    decision_id = fetch!(attrs, :decision_id)
    category = fetch!(attrs, :reason_category)
    idem = Map.get(attrs, :idempotency_key) || "apl-#{appellant}-#{decision_id}"

    with :ok <- check_rate_limit("appeal", appellant, decision_id) do
      case Repo.get_by(SafetyAppeal, idempotency_key: idem) do
        %SafetyAppeal{} ->
          {:error, :duplicate_appeal}

        nil ->
          {:ok, appeal} =
            %SafetyAppeal{}
            |> SafetyAppeal.changeset(%{
              appellant_user_id: appellant,
              report_id: Map.get(attrs, :report_id),
              decision_id: decision_id,
              reason_category: category,
              statement: Map.get(attrs, :statement),
              status: "submitted",
              idempotency_key: idem
            })
            |> Repo.insert()

          # deterministic triage: obvious expiry reverse only for suspend actions
          appeal = resolve_appeal(appeal, attrs)
          {:ok, appeal, :created}
      end
    end
  end

  defp resolve_appeal(appeal, attrs) do
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    outcome =
      cond do
        Map.get(attrs, :force_reverse) == true -> "reversed"
        Map.get(attrs, :data_mismatch) == true -> "modified"
        true -> "upheld"
      end

    if outcome == "reversed" do
      # restore only contact-request capability suspension if present
      report_id = appeal.report_id

      if report_id do
        from(s in OpalCore.SocialFlow.ContactRequestSuspension,
          where: s.source_report_id == ^report_id and s.status == "active"
        )
        |> Repo.update_all(set: [status: "revoked"])
      end
    end

    {:ok, a} =
      appeal
      |> SafetyAppeal.changeset(%{
        status: "closed",
        outcome: outcome,
        resolved_at: now
      })
      |> Repo.update()

    a
  end

  # --- rate limits ---

  def check_rate_limit(action, actor_id, target_id) do
    key = "#{action}:#{actor_id}:#{target_id}"

    OpalCore.SocialFlow.RateLimitBucket.hit(key, action,
      max: @rate_limit_max,
      window_sec: @rate_window_sec
    )
  end

  def contact_request_suspended?(actor_id, target_id) do
    now = DateTime.utc_now()

    from(s in OpalCore.SocialFlow.ContactRequestSuspension,
      where:
        s.actor_user_id == ^actor_id and s.target_user_id == ^target_id and s.status == "active" and
          s.expires_at > ^now
    )
    |> Repo.exists?()
  end

  # --- Journey F: bypass attempts ---

  def attempt_bypass(from_user_id, to_user_id, channel) do
    case can_send_message?(from_user_id, to_user_id) do
      :ok ->
        {:ok, :allowed}

      {:error, :blocked} ->
        {:error, :blocked,
         %{
           channel: channel,
           no_object_existence_leak: true,
           account_level: false,
           relationship_level: true
         }}
    end
  end

  # --- helpers ---

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
end
