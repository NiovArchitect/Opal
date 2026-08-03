defmodule OpalCore.SocialFlow.Onboarding do
  @moduledoc """
  Social Flow 10: trusted relationship onboarding and communication identity.

  Synthetic development foundation only — not legal identity verification,
  carrier-level ownership assurance, production telecom certification,
  or comprehensive fraud prevention.
  """

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Messaging.{Conversation, ConversationMember}
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.AuditEvent
  alias OpalCore.SocialFlow.Family
  alias OpalCore.SocialFlow.RelationshipContext
  alias OpalCore.SocialFlow.TrustSafety

  alias OpalCore.SocialFlow.{
    AccountLinkRequest,
    CommunicationIdentifier,
    ContactResolutionRequest,
    DiscoverabilityPolicy,
    IdentifierOwnershipReview,
    RelationshipEstablishment,
    RelationshipInvitation,
    VerificationChallenge,
    VerifiedCommunicationIdentifier
  }

  @trace "trace-social-flow-10"
  @pepper "sf10-dev-lookup-pepper-not-for-production"
  @challenge_ttl_sec 600
  @invite_ttl_sec 86_400
  @resolution_ttl_sec 900
  @rate_max 5
  @rate_window_sec 300

  # Synthetic E.164 map (display only; storage uses digests)
  @synthetic_codes %{
    "+12025550101" => "111111",
    "+12025550102" => "222222",
    "+12025550103" => "333333",
    "+12025550104" => "444444",
    "+12025550105" => "555555",
    "+12025550106" => "666666",
    "+12025550107" => "777777",
    "+12025550108" => "888888"
  }

  # --- normalization / privacy ---

  def normalize_e164(raw) when is_binary(raw) do
    digits = raw |> String.replace(~r/[^\d+]/, "")

    cond do
      String.starts_with?(digits, "+") and String.length(digits) >= 11 ->
        {:ok, digits}

      String.match?(digits, ~r/^1\d{10}$/) ->
        {:ok, "+" <> digits}

      String.match?(digits, ~r/^\d{10}$/) ->
        {:ok, "+1" <> digits}

      true ->
        {:error, :invalid_identifier}
    end
  end

  def normalize_e164(_), do: {:error, :invalid_identifier}

  def lookup_digest(e164) when is_binary(e164) do
    :crypto.mac(:hmac, :sha256, @pepper, e164)
    |> Base.encode16(case: :lower)
  end

  def secure_ref(e164) when is_binary(e164) do
    # Synthetic sealed ref — not raw in ordinary audit/logs.
    Base.encode64("sf10ref:" <> e164, padding: false)
  end

  def supported_region?("+1" <> _), do: true
  def supported_region?(_), do: false

  # --- Journey A / B: verification ---

  def start_verification(attrs) do
    raw = fetch!(attrs, :identifier_raw)
    purpose = Map.get(attrs, :purpose) || "account_create"
    device = Map.get(attrs, :device_label) || "UnknownDevice"
    idem = Map.get(attrs, :idempotency_key) || "vc-#{:erlang.phash2({raw, purpose, device})}"
    trace_id = Map.get(attrs, :trace_id) || @trace

    with {:ok, e164} <- normalize_e164(raw),
         true <- supported_region?(e164) || {:error, :unsupported_region},
         :ok <- ensure_preview_fixture_allowed(e164),
         :ok <- check_rate_limit("verification", lookup_digest(e164), device) do
      case Repo.get_by(VerificationChallenge, idempotency_key: idem) do
        %VerificationChallenge{} = c ->
          {:ok, public_challenge(c), :idempotent}

        nil ->
          digest = lookup_digest(e164)
          ident = ensure_identifier!(digest, e164, idem)

          if ident.status in ~w(quarantined reassignment_suspected) do
            {:error, :identifier_quarantined}
          else
            code = synthetic_code(e164)
            code_digest = hash_code(code, digest)
            now = now()
            exp = DateTime.add(now, @challenge_ttl_sec, :second)

            {:ok, challenge} =
              %VerificationChallenge{}
              |> VerificationChallenge.changeset(%{
                communication_identifier_id: ident.id,
                purpose: purpose,
                challenge_digest: code_digest,
                attempt_count: 0,
                max_attempts: 5,
                status: "pending",
                expires_at: exp,
                provider_reference: "synthetic-sms-#{digest |> String.slice(0, 8)}",
                device_label: device,
                bound_account_id: Map.get(attrs, :bound_account_id),
                idempotency_key: idem
              })
              |> Repo.insert()

            audit!(
              nil,
              nil,
              "onboarding.verification.started",
              %{
                "challenge_id" => challenge.id,
                "purpose" => purpose,
                "no_raw_identifier" => true,
                "not_legal_identity" => true
              },
              trace_id
            )

            # Dev-only return of code under synthetic provider; never store plaintext.
            {:ok,
             Map.merge(public_challenge(challenge), %{
               "synthetic_provider_code" => code,
               "message" => "Your number verification was started.",
               "not_legal_identity" => true
             }), :created}
          end
      end
    end
  end

  def complete_verification(attrs) do
    challenge_id = fetch!(attrs, :challenge_id)
    code = fetch!(attrs, :code)
    display_name = Map.get(attrs, :display_name) || "User"
    device = Map.get(attrs, :device_label) || "Device"
    handle_hint = Map.get(attrs, :handle_hint)
    trace_id = Map.get(attrs, :trace_id) || @trace

    case Repo.get(VerificationChallenge, challenge_id) do
      nil ->
        {:error, :not_found}

      %VerificationChallenge{status: "used"} ->
        {:error, :replay}

      %VerificationChallenge{status: s} when s in ~w(expired locked failed) ->
        {:error, :challenge_inactive}

      %VerificationChallenge{} = c ->
        now = now()

        cond do
          DateTime.compare(now, c.expires_at) == :gt ->
            c |> VerificationChallenge.changeset(%{status: "expired"}) |> Repo.update()
            {:error, :expired}

          c.attempt_count >= c.max_attempts ->
            c
            |> VerificationChallenge.changeset(%{status: "locked", locked_at: now})
            |> Repo.update()

            {:error, :locked}

          true ->
            digest =
              Repo.get!(CommunicationIdentifier, c.communication_identifier_id).lookup_digest

            if hash_code(code, digest) != c.challenge_digest do
              c
              |> VerificationChallenge.changeset(%{attempt_count: c.attempt_count + 1})
              |> Repo.update()

              {:error, :invalid_code}
            else
              finish_verified(c, display_name, device, handle_hint, trace_id, attrs)
            end
        end
    end
  end

  defp finish_verified(c, display_name, device, handle_hint, trace_id, attrs) do
    now = now()
    ident = Repo.get!(CommunicationIdentifier, c.communication_identifier_id)

    if ident.status in ~w(quarantined reassignment_suspected) do
      {:error, :identifier_quarantined}
    else
      existing_link =
        from(v in VerifiedCommunicationIdentifier,
          where:
            v.communication_identifier_id == ^ident.id and v.verification_state == "active" and
              is_nil(v.detached_at)
        )
        |> Repo.one()

      {account, account_outcome} =
        case {existing_link, c.purpose, c.bound_account_id} do
          {%VerifiedCommunicationIdentifier{human_account_id: uid}, _, _} ->
            {Repo.get!(User, uid), :existing_account}

          {nil, "device_link", bound} when is_binary(bound) ->
            {Repo.get!(User, bound), :device_link}

          {nil, _, _} ->
            user = create_human_account!(display_name, handle_hint)
            {user, :created}
        end

      c
      |> VerificationChallenge.changeset(%{status: "used", used_at: now})
      |> Repo.update!()

      ident
      |> CommunicationIdentifier.changeset(%{status: "active"})
      |> Repo.update!()

      link =
        case existing_link do
          %VerifiedCommunicationIdentifier{} = v ->
            v

          nil ->
            {:ok, v} =
              %VerifiedCommunicationIdentifier{}
              |> VerifiedCommunicationIdentifier.changeset(%{
                communication_identifier_id: ident.id,
                human_account_id: account.id,
                verification_state: "active",
                verified_at: now,
                provider_reference: c.provider_reference,
                ownership_version: ident.ownership_version,
                idempotency_key: "vci-#{ident.id}-#{account.id}-#{ident.ownership_version}"
              })
              |> Repo.insert()

            v
        end

      ensure_discoverability!(account.id, ident.id)

      platform = Map.get(attrs, :platform) || "phone"

      {:ok, session, _} =
        TrustSafety.register_session(%{
          user_id: account.id,
          device_label: device,
          platform: platform,
          idempotency_key: "ds-sf10-#{account.id}-#{device}-#{c.id}"
        })

      audit!(
        nil,
        account.id,
        "onboarding.verification.completed",
        %{
          "challenge_id" => c.id,
          "account_outcome" => Atom.to_string(account_outcome),
          "session_id" => session.id,
          "no_raw_identifier" => true,
          "not_legal_identity" => true,
          "no_auto_contacts" => true,
          "no_auto_relationship" => true
        },
        trace_id
      )

      {:ok,
       %{
         account_id: account.id,
         identifier_id: ident.id,
         verified_link_id: link.id,
         session: session,
         account_outcome: account_outcome,
         message: "Your number is verified.",
         not_legal_identity: true,
         no_auto_relationship: true
       }, :created}
    end
  end

  # --- Journey C: contact resolution ---

  def resolve_contact(attrs) do
    requester = fetch!(attrs, :requester_user_id)
    raw = fetch!(attrs, :identifier_raw)
    label = Map.get(attrs, :local_display_label)
    idem = Map.get(attrs, :idempotency_key) || "cr-#{requester}-#{:erlang.phash2(raw)}"
    trace_id = Map.get(attrs, :trace_id) || @trace

    # Youth cannot use adult free contact matching
    if youth_account?(requester) do
      {:error, :youth_adult_matching_denied}
    else
      with {:ok, e164} <- normalize_e164(raw),
           :ok <- check_rate_limit("contact_resolve", requester, lookup_digest(e164)) do
        case Repo.get_by(ContactResolutionRequest, idempotency_key: idem) do
          %ContactResolutionRequest{} = r ->
            {:ok, ContactResolutionRequest.to_contract(r), :idempotent}

          nil ->
            digest = lookup_digest(e164)
            {outcome, matched} = resolution_outcome(requester, digest)
            now = now()

            {:ok, req} =
              %ContactResolutionRequest{}
              |> ContactResolutionRequest.changeset(%{
                requester_user_id: requester,
                identifier_lookup_digest: digest,
                local_display_label: label,
                purpose: "invite",
                status: "resolved",
                outcome: outcome,
                matched_user_id: matched,
                policy_version: "sf10-dev-0.1",
                expires_at: DateTime.add(now, @resolution_ttl_sec, :second),
                resolved_at: now,
                idempotency_key: idem
              })
              |> Repo.insert()

            audit!(
              nil,
              requester,
              "onboarding.contact.resolved",
              %{
                "request_id" => req.id,
                "outcome" => outcome,
                "no_membership_oracle" => true,
                "no_full_address_book" => true
              },
              trace_id
            )

            {:ok,
             Map.merge(ContactResolutionRequest.to_contract(req), %{
               "matched_user_id" => matched,
               "invite_prompt" => invite_prompt(outcome, label)
             }), :created}
        end
      end
    end
  end

  defp resolution_outcome(requester, digest) do
    case active_owner(digest) do
      nil ->
        {"invite_ready", nil}

      owner_id when owner_id == requester ->
        {"unavailable", owner_id}

      owner_id ->
        cond do
          TrustSafety.blocked?(requester, owner_id) or TrustSafety.blocked?(owner_id, requester) ->
            {"blocked", nil}

          already_connected?(requester, owner_id) ->
            {"already_connected", owner_id}

          pending_invitation?(requester, owner_id) ->
            {"invitation_pending", owner_id}

          discoverability_allows_invite?(owner_id) ->
            # invite_ready without revealing platform membership phrasing
            {"invite_ready", owner_id}

          true ->
            {"unavailable", nil}
        end
    end
  end

  defp invite_prompt("already_connected", _), do: "You are already connected."
  defp invite_prompt("blocked", _), do: "Invitation unavailable."
  defp invite_prompt("invitation_pending", _), do: "Invitation pending."
  defp invite_prompt("policy_restricted", _), do: "Invitation unavailable."
  defp invite_prompt("unavailable", _), do: "Send an Opal invitation."

  defp invite_prompt("invite_ready", label) when is_binary(label) and label != "",
    do: "Invite #{label} to connect."

  defp invite_prompt("invite_ready", _), do: "Send an Opal invitation."
  defp invite_prompt(_, _), do: "Send an Opal invitation."

  # --- Journey D / E: invitations ---

  def create_invitation(attrs) do
    inviter = fetch!(attrs, :inviter_user_id)
    recipient = Map.get(attrs, :intended_recipient_user_id)
    digest = Map.get(attrs, :intended_identifier_digest)
    idem = Map.get(attrs, :idempotency_key) || "inv-#{inviter}-#{recipient || digest}"
    purpose = Map.get(attrs, :purpose) || "connect"
    msg = Map.get(attrs, :bounded_message)
    device = Map.get(attrs, :source_device_label)
    trace_id = Map.get(attrs, :trace_id) || @trace

    cond do
      youth_account?(inviter) ->
        {:error, :youth_adult_invite_denied}

      is_nil(recipient) and is_nil(digest) ->
        {:error, :recipient_required}

      recipient && TrustSafety.blocked?(inviter, recipient) ->
        {:error, :blocked}

      recipient && TrustSafety.blocked?(recipient, inviter) ->
        {:error, :blocked}

      true ->
        with :ok <-
               check_rate_limit(
                 "invitation",
                 inviter,
                 recipient || digest || "unknown"
               ) do
          case Repo.get_by(RelationshipInvitation, idempotency_key: idem) do
            %RelationshipInvitation{} = i ->
              {:ok, i, :idempotent}

            nil ->
              now = now()

              {:ok, inv} =
                %RelationshipInvitation{}
                |> RelationshipInvitation.changeset(%{
                  inviter_user_id: inviter,
                  intended_recipient_user_id: recipient,
                  intended_identifier_digest: digest,
                  relationship_context_type:
                    Map.get(attrs, :relationship_context_type) || "adult_1to1",
                  purpose: purpose,
                  bounded_message: msg && String.slice(msg, 0, 200),
                  status: "sent",
                  policy_version: "sf10-dev-0.1",
                  source_device_label: device,
                  delivered_at: now,
                  expires_at: DateTime.add(now, @invite_ttl_sec, :second),
                  idempotency_key: idem
                })
                |> Repo.insert()

              audit!(
                nil,
                inviter,
                "onboarding.invitation.created",
                %{
                  "invitation_id" => inv.id,
                  "status" => "sent",
                  "no_auto_relationship" => true
                },
                trace_id
              )

              {:ok, inv, :created}
          end
        end
    end
  end

  def view_invitation(invitation_id, viewer_id) do
    case Repo.get(RelationshipInvitation, invitation_id) do
      %RelationshipInvitation{intended_recipient_user_id: ^viewer_id, status: status} = i
      when status in ~w(sent delivered viewed) ->
        now = now()

        {:ok, updated} =
          i
          |> RelationshipInvitation.changeset(%{status: "viewed", viewed_at: now})
          |> Repo.update()

        {:ok, updated}

      %RelationshipInvitation{intended_recipient_user_id: ^viewer_id} = i ->
        {:ok, i}

      %RelationshipInvitation{} ->
        {:error, :forbidden}

      nil ->
        {:error, :not_found}
    end
  end

  def accept_invitation(attrs) do
    invitation_id = fetch!(attrs, :invitation_id)
    acceptor = fetch!(attrs, :acceptor_user_id)
    trace_id = Map.get(attrs, :trace_id) || @trace

    case Repo.get(RelationshipInvitation, invitation_id) do
      nil ->
        {:error, :not_found}

      %RelationshipInvitation{status: "accepted"} = inv ->
        cond do
          inv.intended_recipient_user_id != acceptor ->
            {:error, :invitation_inactive}

          true ->
            case Repo.get_by(RelationshipEstablishment, invitation_id: invitation_id) do
              %RelationshipEstablishment{} = e ->
                {:ok, e, :idempotent}

              nil ->
                {:error, :invitation_inactive}
            end
        end

      %RelationshipInvitation{status: status}
      when status in ~w(declined expired revoked blocked) ->
        {:error, :invitation_inactive}

      %RelationshipInvitation{intended_recipient_user_id: recipient} = inv ->
        cond do
          recipient != acceptor ->
            {:error, :forbidden}

          DateTime.compare(now(), inv.expires_at) == :gt ->
            inv |> RelationshipInvitation.changeset(%{status: "expired"}) |> Repo.update()
            {:error, :expired}

          TrustSafety.blocked?(inv.inviter_user_id, acceptor) or
              TrustSafety.blocked?(acceptor, inv.inviter_user_id) ->
            inv |> RelationshipInvitation.changeset(%{status: "blocked"}) |> Repo.update()
            {:error, :blocked}

          true ->
            case Repo.get_by(RelationshipEstablishment, invitation_id: invitation_id) do
              %RelationshipEstablishment{} = e ->
                {:ok, e, :idempotent}

              nil ->
                establish!(inv, acceptor, trace_id)
            end
        end
    end
  end

  defp establish!(inv, acceptor, trace_id) do
    now = now()
    inviter = inv.inviter_user_id

    {:ok, conv} =
      %Conversation{}
      |> Conversation.changeset(%{
        label: "connection-#{String.slice(inviter, 0, 8)}-#{String.slice(acceptor, 0, 8)}"
      })
      |> Repo.insert()

    Enum.each([inviter, acceptor], fn uid ->
      %ConversationMember{}
      |> ConversationMember.changeset(%{
        conversation_id: conv.id,
        user_id: uid
      })
      |> Repo.insert()
    end)

    {:ok, ctx} =
      %RelationshipContext{}
      |> RelationshipContext.changeset(%{
        conversation_id: conv.id,
        owner_user_id: inviter,
        status: "active",
        idempotency_key: "rc-sf10-#{inv.id}"
      })
      |> Repo.insert()

    inv
    |> RelationshipInvitation.changeset(%{status: "accepted", accepted_at: now})
    |> Repo.update!()

    {:ok, est} =
      %RelationshipEstablishment{}
      |> RelationshipEstablishment.changeset(%{
        invitation_id: inv.id,
        relationship_context_id: ctx.id,
        conversation_id: conv.id,
        participant_ids: [inviter, acceptor],
        status: "active",
        established_at: now,
        idempotency_key: "re-#{inv.id}"
      })
      |> Repo.insert()

    audit!(
      conv.id,
      acceptor,
      "onboarding.relationship.established",
      %{
        "establishment_id" => est.id,
        "invitation_id" => inv.id,
        "no_historical_messages" => true,
        "no_private_memory_share" => true
      },
      trace_id
    )

    {:ok,
     %{
       establishment: est,
       conversation_id: conv.id,
       relationship_context_id: ctx.id,
       message: "You are connected.",
       no_historical_messages: true
     }, :created}
  end

  def decline_invitation(attrs) do
    invitation_id = fetch!(attrs, :invitation_id)
    decliner = fetch!(attrs, :decliner_user_id)

    case Repo.get(RelationshipInvitation, invitation_id) do
      %RelationshipInvitation{intended_recipient_user_id: ^decliner, status: s} = i
      when s in ~w(sent delivered viewed) ->
        now = now()

        {:ok, updated} =
          i
          |> RelationshipInvitation.changeset(%{status: "declined", declined_at: now})
          |> Repo.update()

        # Neutral sender-facing state only
        {:ok, %{invitation: updated, sender_visible_state: "Invitation unavailable."}}

      %RelationshipInvitation{} ->
        {:error, :forbidden}

      nil ->
        {:error, :not_found}
    end
  end

  def revoke_invitation(attrs) do
    invitation_id = fetch!(attrs, :invitation_id)
    inviter = fetch!(attrs, :inviter_user_id)

    case Repo.get(RelationshipInvitation, invitation_id) do
      %RelationshipInvitation{inviter_user_id: ^inviter, status: s} = i
      when s in ~w(sent delivered viewed) ->
        now = now()

        i
        |> RelationshipInvitation.changeset(%{status: "revoked", revoked_at: now})
        |> Repo.update()

      %RelationshipInvitation{} ->
        {:error, :forbidden}

      nil ->
        {:error, :not_found}
    end
  end

  def sender_invitation_state(invitation_id, inviter_id) do
    case Repo.get(RelationshipInvitation, invitation_id) do
      %RelationshipInvitation{inviter_user_id: ^inviter_id, status: status} ->
        visible =
          case status do
            s when s in ~w(declined blocked revoked expired) -> "Invitation unavailable."
            "accepted" -> "You are connected."
            "sent" -> "Invitation sent."
            "delivered" -> "Invitation sent."
            "viewed" -> "Invitation sent."
            _ -> "Invitation unavailable."
          end

        {:ok, %{status_class: status, visible: visible, no_retaliation_detail: true}}

      _ ->
        {:error, :not_found}
    end
  end

  # --- Journey F: reassignment ---

  def signal_reassignment(attrs) do
    digest =
      case Map.get(attrs, :identifier_raw) do
        raw when is_binary(raw) ->
          {:ok, e164} = normalize_e164(raw)
          lookup_digest(e164)

        _ ->
          fetch!(attrs, :lookup_digest)
      end

    reason = Map.get(attrs, :reason) || "provider_reassignment_signal"
    claimant = Map.get(attrs, :claimant_account_id)
    idem = Map.get(attrs, :idempotency_key) || "ior-#{digest}-#{:erlang.phash2(reason)}"
    trace_id = Map.get(attrs, :trace_id) || @trace

    case Repo.get_by(CommunicationIdentifier, lookup_digest: digest) do
      nil ->
        {:error, :not_found}

      %CommunicationIdentifier{} = ident ->
        now = now()

        ident
        |> CommunicationIdentifier.changeset(%{
          status: "reassignment_suspected",
          quarantined_at: now
        })
        |> Repo.update!()

        # Detach active verified links — history stays on old account
        from(v in VerifiedCommunicationIdentifier,
          where: v.communication_identifier_id == ^ident.id and v.verification_state == "active"
        )
        |> Repo.update_all(
          set: [verification_state: "quarantined", detached_at: now, last_reviewed_at: now]
        )

        existing =
          from(v in VerifiedCommunicationIdentifier,
            where: v.communication_identifier_id == ^ident.id,
            order_by: [desc: v.inserted_at],
            limit: 1
          )
          |> Repo.one()

        existing_account = existing && existing.human_account_id

        case Repo.get_by(IdentifierOwnershipReview, idempotency_key: idem) do
          %IdentifierOwnershipReview{} = r ->
            {:ok, r, :idempotent}

          nil ->
            {:ok, review} =
              %IdentifierOwnershipReview{}
              |> IdentifierOwnershipReview.changeset(%{
                communication_identifier_id: ident.id,
                existing_account_id: existing_account,
                claimant_account_id: claimant,
                reason: reason,
                status: "human_review_required",
                provider_signal: Map.get(attrs, :provider_signal) || "synthetic_reassigned",
                idempotency_key: idem
              })
              |> Repo.insert()

            audit!(
              nil,
              existing_account,
              "onboarding.identifier.reassignment",
              %{
                "review_id" => review.id,
                "status" => "human_review_required",
                "no_auto_history_grant" => true,
                "no_raw_identifier" => true
              },
              trace_id
            )

            {:ok, review, :created}
        end
    end
  end

  def historical_access_allowed?(account_id, other_account_id) do
    # Reassignment never grants old history to new claimants automatically
    account_id == other_account_id
  end

  # --- Journey G: account link ---

  def preview_account_link(attrs) do
    requester = fetch!(attrs, :requesting_user_id)
    primary = fetch!(attrs, :primary_account_id)
    secondary = fetch!(attrs, :secondary_account_id)
    reauth = Map.get(attrs, :reauth_confirmed, false)
    idem = Map.get(attrs, :idempotency_key) || "alr-#{primary}-#{secondary}"

    cond do
      not reauth ->
        {:error, :reauth_required}

      requester not in [primary, secondary] ->
        {:error, :forbidden}

      primary == secondary ->
        {:error, :same_account}

      youth_account?(primary) or youth_account?(secondary) ->
        {:error, :youth_adult_tier_conflict}

      true ->
        preview = %{
          "relationships" => "category_only",
          "devices" => "category_only",
          "plans" => "category_only",
          "memories" => "category_only",
          "family_context" => "category_only",
          "safety_state" => "preserved",
          "no_private_content_dump" => true
        }

        case Repo.get_by(AccountLinkRequest, idempotency_key: idem) do
          %AccountLinkRequest{} = a ->
            {:ok, a, :idempotent}

          nil ->
            {:ok, a} =
              %AccountLinkRequest{}
              |> AccountLinkRequest.changeset(%{
                requesting_user_id: requester,
                primary_account_id: primary,
                secondary_account_id: secondary,
                proof_state: "reauth_confirmed",
                review_state: "preview",
                status: "preview",
                preview: preview,
                idempotency_key: idem
              })
              |> Repo.insert()

            {:ok, a, :created}
        end
    end
  end

  def confirm_account_link(attrs) do
    link_id = fetch!(attrs, :link_request_id)
    requester = fetch!(attrs, :requesting_user_id)
    choice = Map.get(attrs, :choice) || "link_identifiers"

    case Repo.get(AccountLinkRequest, link_id) do
      %AccountLinkRequest{requesting_user_id: ^requester, status: "preview"} = a ->
        now = now()

        case choice do
          "link_identifiers" ->
            # Prefer linking identifiers onto primary — not destructive merge
            from(v in VerifiedCommunicationIdentifier,
              where:
                v.human_account_id == ^a.secondary_account_id and
                  v.verification_state == "active"
            )
            |> Repo.update_all(set: [human_account_id: a.primary_account_id])

            a
            |> AccountLinkRequest.changeset(%{
              status: "linked",
              review_state: "completed",
              completed_at: now
            })
            |> Repo.update()

          "keep_separate" ->
            a
            |> AccountLinkRequest.changeset(%{
              status: "keep_separate",
              completed_at: now
            })
            |> Repo.update()

          "cancel" ->
            a
            |> AccountLinkRequest.changeset(%{status: "cancelled", completed_at: now})
            |> Repo.update()

          _ ->
            {:error, :invalid_choice}
        end

      %AccountLinkRequest{} ->
        {:error, :forbidden}

      nil ->
        {:error, :not_found}
    end
  end

  # --- Journey H: youth path uses Family ---

  def youth_request_contact(attrs) do
    # Delegate to SF8 authority; adult matching denied for youth
    youth = fetch!(attrs, :youth_user_id)

    if youth_account?(youth) do
      Family.request_approved_contact(attrs)
    else
      # adults use invitation path
      {:error, :not_youth}
    end
  end

  # --- helpers ---

  defp ensure_identifier!(digest, e164, idem_base) do
    case Repo.get_by(CommunicationIdentifier, lookup_digest: digest) do
      %CommunicationIdentifier{} = i ->
        i

      nil ->
        {:ok, i} =
          %CommunicationIdentifier{}
          |> CommunicationIdentifier.changeset(%{
            identifier_type: "phone_number",
            lookup_digest: digest,
            secure_ref: secure_ref(e164),
            region: "US",
            status: "unverified",
            ownership_version: 1,
            idempotency_key: "ci-#{digest}"
          })
          |> Repo.insert()

        _ = idem_base
        i
    end
  end

  defp create_human_account!(display_name, handle_hint) do
    handle =
      handle_hint ||
        "u" <> (Ecto.UUID.generate() |> String.replace("-", "") |> String.slice(0, 12))

    {:ok, user} =
      %User{}
      |> User.changeset(%{handle: handle, display_name: display_name})
      |> Repo.insert()

    user
  end

  defp ensure_discoverability!(user_id, ident_id) do
    case Repo.get_by(DiscoverabilityPolicy, user_id: user_id) do
      %DiscoverabilityPolicy{} ->
        :ok

      nil ->
        %DiscoverabilityPolicy{}
        |> DiscoverabilityPolicy.changeset(%{
          user_id: user_id,
          communication_identifier_id: ident_id,
          policy_state: "invite_only",
          allowed_audiences: ["invited"],
          version: 1,
          idempotency_key: "dp-#{user_id}"
        })
        |> Repo.insert()

        :ok
    end
  end

  defp active_owner(digest) do
    from(i in CommunicationIdentifier,
      join: v in VerifiedCommunicationIdentifier,
      on: v.communication_identifier_id == i.id,
      where:
        i.lookup_digest == ^digest and i.status == "active" and
          v.verification_state == "active" and is_nil(v.detached_at),
      select: v.human_account_id,
      limit: 1
    )
    |> Repo.one()
  end

  defp discoverability_allows_invite?(user_id) do
    case Repo.get_by(DiscoverabilityPolicy, user_id: user_id) do
      nil -> true
      %DiscoverabilityPolicy{policy_state: s} when s in ~w(invite_only existing_contacts) -> true
      %DiscoverabilityPolicy{policy_state: "hidden"} -> false
      %DiscoverabilityPolicy{policy_state: "disabled"} -> false
      _ -> true
    end
  end

  defp already_connected?(a, b) do
    from(e in RelationshipEstablishment,
      where: e.status == "active" and ^a in e.participant_ids and ^b in e.participant_ids
    )
    |> Repo.exists?()
  end

  defp pending_invitation?(a, b) do
    from(i in RelationshipInvitation,
      where:
        i.status in ^~w(sent delivered viewed) and
          ((i.inviter_user_id == ^a and i.intended_recipient_user_id == ^b) or
             (i.inviter_user_id == ^b and i.intended_recipient_user_id == ^a))
    )
    |> Repo.exists?()
  end

  defp youth_account?(user_id) do
    from(m in OpalCore.SocialFlow.FamilyMembership,
      where:
        m.user_id == ^user_id and m.account_kind == "guardian_managed_youth" and
          m.status == "active"
    )
    |> Repo.exists?()
  end

  defp synthetic_code(e164), do: Map.get(@synthetic_codes, e164, "000000")

  # Hosted synthetic preview: only approved fixtures when flag is exactly true.
  defp ensure_preview_fixture_allowed(e164) do
    # Use == true so nil/missing never raises (Elixir `not` requires boolean).
    if Application.get_env(:opal_core, :synthetic_fixture_only) == true do
      if Map.has_key?(@synthetic_codes, e164) do
        :ok
      else
        {:error, :number_not_enabled}
      end
    else
      :ok
    end
  end

  defp hash_code(code, digest) do
    :crypto.mac(:hmac, :sha256, @pepper, code <> ":" <> digest)
    |> Base.encode16(case: :lower)
  end

  defp public_challenge(%VerificationChallenge{} = c) do
    VerificationChallenge.to_contract(c)
    |> Map.put("expires_at", DateTime.to_iso8601(c.expires_at))
    |> Map.put("communication_identifier_id", c.communication_identifier_id)
  end

  def check_rate_limit(action, actor_id, target_id) do
    key = "sf10:#{action}:#{actor_id}:#{target_id}"
    now = now()

    case Repo.get_by(OpalCore.SocialFlow.RateLimitBucket, bucket_key: key, action: action) do
      nil ->
        %OpalCore.SocialFlow.RateLimitBucket{}
        |> OpalCore.SocialFlow.RateLimitBucket.changeset(%{
          bucket_key: key,
          action: action,
          count: 1,
          window_started_at: now
        })
        |> Repo.insert()

        :ok

      %OpalCore.SocialFlow.RateLimitBucket{} = b ->
        if b.blocked_until && DateTime.compare(now, b.blocked_until) == :lt do
          {:error, :rate_limited}
        else
          window_expired? = DateTime.diff(now, b.window_started_at, :second) > @rate_window_sec

          {count, started} =
            if window_expired?, do: {1, now}, else: {b.count + 1, b.window_started_at}

          if count > @rate_max do
            blocked = DateTime.add(now, @rate_window_sec, :second)

            b
            |> OpalCore.SocialFlow.RateLimitBucket.changeset(%{
              count: count,
              window_started_at: started,
              blocked_until: blocked
            })
            |> Repo.update()

            {:error, :rate_limited}
          else
            b
            |> OpalCore.SocialFlow.RateLimitBucket.changeset(%{
              count: count,
              window_started_at: started,
              blocked_until: nil
            })
            |> Repo.update()

            :ok
          end
        end
    end
  end

  defp now, do: DateTime.utc_now() |> DateTime.truncate(:microsecond)

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
