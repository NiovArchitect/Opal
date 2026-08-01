defmodule OpalCore.SocialFlow.Family do
  @moduledoc """
  Social Flow 8: guardian-managed family coordination foundation.

  Development fixtures only. Not COPPA/production youth certification.
  No stranger discovery, no background location, no commercial targeting.
  """

  import Ecto.Query

  alias OpalCore.Repo
  alias OpalCore.Messaging.ConversationMember
  alias OpalCore.SocialFlow.AuditEvent

  alias OpalCore.SocialFlow.{
    ApprovedContact,
    ApprovedContactRequest,
    ApprovedDevice,
    FamilyContext,
    FamilyConversation,
    FamilyMembership,
    FamilyPermissionRequest,
    FamilyPlan,
    FamilyPlanRevision,
    GuardianRelationship,
    YouthCapabilityPolicy,
    YouthPrivateReminder
  }

  @trace "trace-social-flow-8"
  @youth_default_caps %{
    "private_reminder" => "allowed",
    "propose_plan_detail" => "approval_required",
    "permission_request" => "allowed",
    "add_contact" => "approval_required",
    "share_location" => "denied",
    "public_discovery" => "denied",
    "payments" => "denied",
    "media_external_links" => "denied"
  }

  # --- Bootstrap family ---

  def create_family_context(attrs) do
    label = Map.get(attrs, :label) || "Carter Family"
    idem = Map.get(attrs, :idempotency_key) || "fam-#{:erlang.phash2(label)}"

    case Repo.get_by(FamilyContext, idempotency_key: idem) do
      %FamilyContext{} = f ->
        {:ok, f, :idempotent}

      nil ->
        {:ok, f} =
          %FamilyContext{}
          |> FamilyContext.changeset(%{
            label: label,
            status: "active",
            policy_version: "sf8-dev-0.1",
            legal_disclaimer: "dev_fixture_not_certified",
            idempotency_key: idem
          })
          |> Repo.insert()

        {:ok, f, :created}
    end
  end

  def add_member(attrs) do
    family_id = fetch!(attrs, :family_id)
    user_id = fetch!(attrs, :user_id)
    role = fetch!(attrs, :role)

    kind =
      Map.get(attrs, :account_kind) ||
        if(role == "youth", do: "guardian_managed_youth", else: "adult")

    idem = Map.get(attrs, :idempotency_key) || "fm-#{family_id}-#{user_id}"

    case Repo.get_by(FamilyMembership, family_id: family_id, user_id: user_id) do
      %FamilyMembership{} = m ->
        {:ok, m, :idempotent}

      nil ->
        {:ok, m} =
          %FamilyMembership{}
          |> FamilyMembership.changeset(%{
            family_id: family_id,
            user_id: user_id,
            role: role,
            account_kind: kind,
            status: "active",
            display_name: Map.get(attrs, :display_name),
            idempotency_key: idem
          })
          |> Repo.insert()

        {:ok, m, :created}
    end
  end

  def link_guardian(attrs) do
    family_id = fetch!(attrs, :family_id)
    guardian = fetch!(attrs, :guardian_user_id)
    youth = fetch!(attrs, :youth_user_id)
    class = Map.get(attrs, :authority_class) || "primary"
    idem = Map.get(attrs, :idempotency_key) || "gr-#{family_id}-#{guardian}-#{youth}"

    with :ok <- ensure_family_role(family_id, guardian, ~w(guardian co_guardian)),
         :ok <- ensure_family_role(family_id, youth, ~w(youth)) do
      case Repo.get_by(GuardianRelationship,
             family_id: family_id,
             guardian_user_id: guardian,
             youth_user_id: youth,
             status: "active"
           ) do
        %GuardianRelationship{} = g ->
          {:ok, g, :idempotent}

        nil ->
          {:ok, g} =
            %GuardianRelationship{}
            |> GuardianRelationship.changeset(%{
              family_id: family_id,
              guardian_user_id: guardian,
              youth_user_id: youth,
              authority_class: class,
              status: "active",
              authority_version: 1,
              idempotency_key: idem
            })
            |> Repo.insert()

          seed_youth_policies!(family_id, youth)
          {:ok, g, :created}
      end
    end
  end

  def link_conversation(attrs) do
    family_id = fetch!(attrs, :family_id)
    conversation_id = fetch!(attrs, :conversation_id)
    idem = Map.get(attrs, :idempotency_key) || "fc-#{conversation_id}"

    case Repo.get_by(FamilyConversation, conversation_id: conversation_id) do
      %FamilyConversation{} = c ->
        {:ok, c, :idempotent}

      nil ->
        {:ok, c} =
          %FamilyConversation{}
          |> FamilyConversation.changeset(%{
            family_id: family_id,
            conversation_id: conversation_id,
            kind: "guardian_youth",
            idempotency_key: idem
          })
          |> Repo.insert()

        {:ok, c, :created}
    end
  end

  defp seed_youth_policies!(family_id, youth_id) do
    Enum.each(@youth_default_caps, fn {cap, mode} ->
      unless Repo.get_by(YouthCapabilityPolicy,
               family_id: family_id,
               youth_user_id: youth_id,
               capability: cap
             ) do
        %YouthCapabilityPolicy{}
        |> YouthCapabilityPolicy.changeset(%{
          family_id: family_id,
          youth_user_id: youth_id,
          capability: cap,
          mode: mode,
          status: "active",
          idempotency_key: "ycp-#{family_id}-#{youth_id}-#{cap}"
        })
        |> Repo.insert()
      end
    end)
  end

  # --- Authority ---

  def guardian_of?(guardian_id, youth_id, family_id) do
    from(g in GuardianRelationship,
      where:
        g.family_id == ^family_id and g.guardian_user_id == ^guardian_id and
          g.youth_user_id == ^youth_id and g.status == "active"
    )
    |> Repo.exists?()
  end

  def ensure_guardian(guardian_id, youth_id, family_id) do
    if guardian_of?(guardian_id, youth_id, family_id),
      do: :ok,
      else: {:error, :not_guardian}
  end

  def revoke_guardian(attrs) do
    family_id = fetch!(attrs, :family_id)
    guardian = fetch!(attrs, :guardian_user_id)
    youth = fetch!(attrs, :youth_user_id)
    actor = fetch!(attrs, :actor_user_id)

    with :ok <- ensure_guardian(actor, youth, family_id),
         %GuardianRelationship{} = g <-
           Repo.get_by(GuardianRelationship,
             family_id: family_id,
             guardian_user_id: guardian,
             youth_user_id: youth,
             status: "active"
           ) do
      now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

      g
      |> GuardianRelationship.changeset(%{
        status: "revoked",
        revoked_at: now,
        authority_version: g.authority_version + 1
      })
      |> Repo.update()
    else
      nil -> {:error, :not_found}
      {:error, _} = e -> e
    end
  end

  def youth_capability(family_id, youth_id, capability) do
    case Repo.get_by(YouthCapabilityPolicy,
           family_id: family_id,
           youth_user_id: youth_id,
           capability: capability,
           status: "active"
         ) do
      %YouthCapabilityPolicy{mode: mode} -> mode
      nil -> Map.get(@youth_default_caps, capability, "denied")
    end
  end

  # --- Journey A: family pickup plan ---

  def propose_pickup_plan(attrs) do
    family_id = fetch!(attrs, :family_id)
    conversation_id = fetch!(attrs, :conversation_id)
    guardian = fetch!(attrs, :guardian_user_id)
    youth = fetch!(attrs, :youth_user_id)
    time_label = Map.get(attrs, :time_label) || "5:00 PM"
    idem = Map.get(attrs, :idempotency_key) || "fplan-#{conversation_id}-#{time_label}"
    trace_id = Map.get(attrs, :trace_id) || @trace

    with :ok <- ensure_family_member(family_id, guardian),
         :ok <- ensure_family_member(family_id, youth),
         :ok <- ensure_member(conversation_id, guardian),
         :ok <- ensure_member(conversation_id, youth) do
      case Repo.get_by(FamilyPlan, idempotency_key: idem) do
        %FamilyPlan{} = p ->
          {:ok, p, :idempotent}

        nil ->
          g_copy =
            Map.get(attrs, :shared_copy) ||
              "Practice now ends at #{time_label}. A guardian offered to pick up the youth."

          {:ok, plan} =
            %FamilyPlan{}
            |> FamilyPlan.changeset(%{
              family_id: family_id,
              conversation_id: conversation_id,
              created_by_user_id: guardian,
              title: Map.get(attrs, :title) || "Practice pickup",
              status: "proposed",
              time_label: time_label,
              location_label: Map.get(attrs, :location_label) || "main gate",
              youth_user_id: youth,
              guardian_user_id: guardian,
              copy_guardian: g_copy,
              copy_youth: "Pickup may be arranged for #{time_label}.",
              no_precise_location: true,
              no_background_tracking: true,
              source_message_ids: Map.get(attrs, :source_message_ids) || [],
              idempotency_key: idem
            })
            |> Repo.insert()

          broadcast(
            conversation_id,
            "social_flow:family_plan",
            %{
              "plan" => FamilyPlan.to_contract(plan, "guardian"),
              "actions" => ["Confirm pickup", "Change plan", "Not a commitment"]
            },
            trace_id
          )

          {:ok, plan, :created}
      end
    end
  end

  def confirm_pickup(attrs) do
    plan_id = fetch!(attrs, :plan_id)
    guardian = fetch!(attrs, :guardian_user_id)
    trace_id = Map.get(attrs, :trace_id) || @trace

    with %FamilyPlan{} = plan <- Repo.get(FamilyPlan, plan_id),
         :ok <- ensure_guardian(guardian, plan.youth_user_id, plan.family_id),
         true <- plan.status in ~w(proposed revised) do
      now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

      {:ok, plan} =
        plan
        |> FamilyPlan.changeset(%{
          status: "confirmed",
          confirmed_at: now,
          guardian_user_id: guardian,
          copy_guardian: "Pickup confirmed for #{plan.time_label}.",
          copy_youth: "Pickup confirmed for #{plan.time_label}."
        })
        |> Repo.update()

      broadcast(
        plan.conversation_id,
        "social_flow:family_plan",
        %{
          "plan_guardian" => FamilyPlan.to_contract(plan, "guardian"),
          "plan_youth" => FamilyPlan.to_contract(plan, "youth")
        },
        trace_id
      )

      audit!(
        plan.conversation_id,
        guardian,
        "family.plan.confirmed",
        %{
          "plan_id" => plan.id,
          "no_precise_location" => true
        },
        trace_id
      )

      {:ok, plan}
    else
      nil -> {:error, :not_found}
      false -> {:error, :invalid_status}
      {:error, _} = e -> e
    end
  end

  def propose_plan_revision(attrs) do
    plan_id = fetch!(attrs, :plan_id)
    user_id = fetch!(attrs, :proposed_by_user_id)
    changes = fetch!(attrs, :changes)
    idem = Map.get(attrs, :idempotency_key) || "frev-#{plan_id}-#{:erlang.phash2(changes)}"

    with %FamilyPlan{} = plan <- Repo.get(FamilyPlan, plan_id),
         :ok <- ensure_family_member(plan.family_id, user_id) do
      # youth propose detail may require approval
      youth? = membership_role(plan.family_id, user_id) == "youth"

      if youth? and youth_capability(plan.family_id, user_id, "propose_plan_detail") == "denied" do
        {:error, :capability_denied}
      else
        rev_n = plan.current_revision + 1

        {:ok, _rev} =
          %FamilyPlanRevision{}
          |> FamilyPlanRevision.changeset(%{
            plan_id: plan_id,
            proposed_by_user_id: user_id,
            revision_number: rev_n,
            proposed_changes: changes,
            status: "proposed",
            shared_reason: Map.get(attrs, :shared_reason),
            idempotency_key: idem
          })
          |> Repo.insert()

        # current plan unchanged until guardian approves
        {:ok,
         %{
           plan: plan,
           revision_number: rev_n,
           status: "proposed",
           plan_time_unchanged: plan.time_label,
           requires_guardian_approval: youth?
         }}
      end
    end
  end

  def approve_plan_revision(attrs) do
    plan_id = fetch!(attrs, :plan_id)
    guardian = fetch!(attrs, :guardian_user_id)
    changes = fetch!(attrs, :changes)
    trace_id = Map.get(attrs, :trace_id) || @trace

    with %FamilyPlan{} = plan <- Repo.get(FamilyPlan, plan_id),
         :ok <- ensure_guardian(guardian, plan.youth_user_id, plan.family_id) do
      time = Map.get(changes, "time_label") || Map.get(changes, :time_label) || plan.time_label

      loc =
        Map.get(changes, "location_label") || Map.get(changes, :location_label) ||
          plan.location_label

      now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

      {:ok, plan} =
        plan
        |> FamilyPlan.changeset(%{
          status: "confirmed",
          time_label: time,
          location_label: loc,
          current_revision: plan.current_revision + 1,
          confirmed_at: now,
          copy_guardian: "Pickup updated to #{time}" <> if(loc, do: " at #{loc}.", else: "."),
          copy_youth: "Pickup changed: #{time}" <> if(loc, do: ", #{loc}.", else: ".")
        })
        |> Repo.update()

      broadcast(
        plan.conversation_id,
        "social_flow:family_plan",
        %{
          "plan_youth" => FamilyPlan.to_contract(plan, "youth"),
          "reconnect_copy" =>
            "Pickup changed while you were away:\n• #{time}\n• #{loc || "same place"}"
        },
        trace_id
      )

      {:ok, plan}
    end
  end

  # --- Journey B: permission request ---

  def create_permission_request(attrs) do
    family_id = fetch!(attrs, :family_id)
    conversation_id = fetch!(attrs, :conversation_id)
    youth = fetch!(attrs, :youth_user_id)
    summary = fetch!(attrs, :summary)
    idem = Map.get(attrs, :idempotency_key) || "fperm-#{:erlang.phash2(summary)}"
    trace_id = Map.get(attrs, :trace_id) || @trace

    with :ok <- ensure_family_role(family_id, youth, ~w(youth)),
         "allowed" <- youth_capability(family_id, youth, "permission_request") do
      missing =
        Map.get(attrs, :missing_details) ||
          ["time", "location", "supervising_adult", "transportation", "approved_contact_status"]

      {:ok, req} =
        %FamilyPermissionRequest{}
        |> FamilyPermissionRequest.changeset(%{
          family_id: family_id,
          conversation_id: conversation_id,
          youth_user_id: youth,
          summary: summary,
          status: "pending_review",
          missing_details: missing,
          details: Map.get(attrs, :details) || %{},
          guardian_copy: Map.get(attrs, :guardian_copy) || summary,
          youth_copy: "Waiting for guardian review.",
          idempotency_key: idem
        })
        |> Repo.insert()

      broadcast(
        conversation_id,
        "social_flow:family_permission",
        %{
          "request_guardian" => FamilyPermissionRequest.to_contract(req, "guardian"),
          "request_youth" => FamilyPermissionRequest.to_contract(req, "youth"),
          "actions" => ["Review request", "Ask for details", "Decline", "Remind me later"],
          "no_auto_contact" => true
        },
        trace_id
      )

      {:ok, req, :created}
    else
      mode when mode in ~w(denied approval_required) -> {:error, :capability_denied}
      {:error, _} = e -> e
    end
  end

  def review_permission_request(attrs) do
    request_id = fetch!(attrs, :request_id)
    guardian = fetch!(attrs, :guardian_user_id)
    decision = fetch!(attrs, :decision)
    details = Map.get(attrs, :details) || %{}
    trace_id = Map.get(attrs, :trace_id) || @trace

    with %FamilyPermissionRequest{} = req <- Repo.get(FamilyPermissionRequest, request_id),
         :ok <- ensure_guardian(guardian, req.youth_user_id, req.family_id) do
      now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

      case decision do
        "decline" ->
          {:ok, req} =
            req
            |> FamilyPermissionRequest.changeset(%{
              status: "declined",
              reviewed_by_user_id: guardian,
              reviewed_at: now,
              youth_copy: "Request was not approved.",
              guardian_copy: "Request declined."
            })
            |> Repo.update()

          {:ok, %{request: req, plan: nil}}

        "ask_details" ->
          {:ok, req} =
            req
            |> FamilyPermissionRequest.changeset(%{
              status: "needs_details",
              reviewed_by_user_id: guardian,
              reviewed_at: now,
              youth_copy: "More details are needed before a decision."
            })
            |> Repo.update()

          {:ok, %{request: req, plan: nil}}

        "approve" ->
          merged = Map.merge(req.details || %{}, details)
          still_missing = required_missing(merged, req.missing_details)

          if still_missing != [] do
            {:error, {:missing_details, still_missing}}
          else
            # silence is not approval — explicit approve only
            {:ok, plan, _} =
              propose_pickup_plan(%{
                family_id: req.family_id,
                conversation_id: req.conversation_id,
                guardian_user_id: guardian,
                youth_user_id: req.youth_user_id,
                time_label: Map.get(merged, "time") || "Saturday",
                location_label: Map.get(merged, "location"),
                title: req.summary,
                shared_copy: "Approved family plan: #{req.summary}",
                idempotency_key: "fplan-from-#{req.id}"
              })

            {:ok, plan} = confirm_pickup(%{plan_id: plan.id, guardian_user_id: guardian})

            {:ok, req} =
              req
              |> FamilyPermissionRequest.changeset(%{
                status: "approved",
                reviewed_by_user_id: guardian,
                reviewed_at: now,
                details: merged,
                missing_details: [],
                resulting_plan_id: plan.id,
                youth_copy: "Approved: #{req.summary}"
              })
              |> Repo.update()

            broadcast(
              req.conversation_id,
              "social_flow:family_permission",
              %{
                "request" => FamilyPermissionRequest.to_contract(req, "youth"),
                "plan" => FamilyPlan.to_contract(plan, "youth")
              },
              trace_id
            )

            {:ok, %{request: req, plan: plan}}
          end

        _ ->
          {:error, :invalid_decision}
      end
    else
      nil -> {:error, :not_found}
      {:error, _} = e -> e
    end
  end

  defp required_missing(details, required) do
    Enum.reject(required || [], fn k ->
      v = Map.get(details, k) || Map.get(details, to_string(k))
      is_binary(v) and String.trim(v) != ""
    end)
  end

  # --- Journey C: approved contacts ---

  def request_approved_contact(attrs) do
    family_id = fetch!(attrs, :family_id)
    youth = fetch!(attrs, :youth_user_id)
    contact = fetch!(attrs, :requested_contact_user_id)
    reason = fetch!(attrs, :reason)
    idem = Map.get(attrs, :idempotency_key) || "acr-#{youth}-#{contact}"

    with :ok <- ensure_family_role(family_id, youth, ~w(youth)),
         "approval_required" <- youth_capability(family_id, youth, "add_contact") do
      {:ok, req} =
        %ApprovedContactRequest{}
        |> ApprovedContactRequest.changeset(%{
          family_id: family_id,
          youth_user_id: youth,
          requested_contact_user_id: contact,
          reason: reason,
          requested_capability: "bounded_chat",
          status: "pending",
          idempotency_key: idem
        })
        |> Repo.insert()

      {:ok,
       %{
         id: req.id,
         status: "pending",
         youth_cannot_add_directly: true,
         no_stranger_discovery: true
       }, :created}
    else
      "denied" -> {:error, :capability_denied}
      "allowed" -> {:error, :policy_requires_approval}
      {:error, _} = e -> e
    end
  end

  def approve_contact(attrs) do
    family_id = fetch!(attrs, :family_id)
    guardian = fetch!(attrs, :guardian_user_id)
    youth = fetch!(attrs, :youth_user_id)
    contact = fetch!(attrs, :contact_user_id)
    scope = Map.get(attrs, :scope) || "project"
    days = Map.get(attrs, :expires_in_days) || 5
    idem = Map.get(attrs, :idempotency_key) || "ac-#{youth}-#{contact}-#{scope}"
    trace_id = Map.get(attrs, :trace_id) || @trace

    with :ok <- ensure_guardian(guardian, youth, family_id) do
      now = DateTime.utc_now() |> DateTime.truncate(:microsecond)
      expires = DateTime.add(now, days * 86_400, :second)

      case Repo.get_by(ApprovedContact, idempotency_key: idem) do
        %ApprovedContact{} = c ->
          {:ok, c, :idempotent}

        nil ->
          {:ok, c} =
            %ApprovedContact{}
            |> ApprovedContact.changeset(%{
              family_id: family_id,
              youth_user_id: youth,
              contact_user_id: contact,
              scope: scope,
              status: "active",
              capabilities: ["bounded_chat"],
              expires_at: expires,
              no_location_sharing: true,
              no_contact_forwarding: true,
              idempotency_key: idem
            })
            |> Repo.insert()

          audit!(
            nil,
            guardian,
            "family.contact.approved",
            %{
              "contact_id" => c.id,
              "scope" => scope,
              "no_forwarding" => true
            },
            trace_id
          )

          {:ok, c, :created}
      end
    end
  end

  def revoke_contact(%{contact_id: id, guardian_user_id: guardian}) do
    with %ApprovedContact{} = c <- Repo.get(ApprovedContact, id),
         :ok <- ensure_guardian(guardian, c.youth_user_id, c.family_id) do
      now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

      c
      |> ApprovedContact.changeset(%{
        status: "revoked",
        revoked_at: now,
        revoked_by_user_id: guardian
      })
      |> Repo.update()
    else
      nil -> {:error, :not_found}
      {:error, _} = e -> e
    end
  end

  def contact_active?(youth_id, contact_id) do
    now = DateTime.utc_now()

    from(c in ApprovedContact,
      where:
        c.youth_user_id == ^youth_id and c.contact_user_id == ^contact_id and c.status == "active" and
          (is_nil(c.expires_at) or c.expires_at > ^now)
    )
    |> Repo.exists?()
  end

  # --- Journey D: devices ---

  def request_device(attrs) do
    family_id = fetch!(attrs, :family_id)
    user_id = fetch!(attrs, :user_id)
    label = fetch!(attrs, :device_label)
    platform = Map.get(attrs, :platform) || "tablet"
    idem = Map.get(attrs, :idempotency_key) || "dev-#{user_id}-#{label}"

    with :ok <- ensure_family_member(family_id, user_id) do
      case Repo.get_by(ApprovedDevice, idempotency_key: idem) do
        %ApprovedDevice{} = d ->
          {:ok, d, :idempotent}

        nil ->
          {:ok, d} =
            %ApprovedDevice{}
            |> ApprovedDevice.changeset(%{
              family_id: family_id,
              user_id: user_id,
              device_label: label,
              platform: platform,
              status: "pending",
              session_ref: "sess-#{:erlang.phash2({user_id, label})}",
              idempotency_key: idem
            })
            |> Repo.insert()

          {:ok, d, :created}
      end
    end
  end

  def approve_device(attrs) do
    device_id = fetch!(attrs, :device_id)
    guardian = fetch!(attrs, :guardian_user_id)

    with %ApprovedDevice{} = d <- Repo.get(ApprovedDevice, device_id),
         :ok <- ensure_family_role(d.family_id, guardian, ~w(guardian co_guardian)),
         # youth devices need guardian of that youth
         :ok <- maybe_guardian_for_device(guardian, d) do
      now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

      d
      |> ApprovedDevice.changeset(%{
        status: "approved",
        approved_by_user_id: guardian,
        approved_at: now,
        last_seen_at: now
      })
      |> Repo.update()
    else
      nil -> {:error, :not_found}
      {:error, _} = e -> e
    end
  end

  defp maybe_guardian_for_device(guardian, %ApprovedDevice{user_id: user_id, family_id: family_id}) do
    case membership_role(family_id, user_id) do
      "youth" -> ensure_guardian(guardian, user_id, family_id)
      _ -> :ok
    end
  end

  def revoke_device(%{device_id: id, guardian_user_id: guardian}) do
    with %ApprovedDevice{} = d <- Repo.get(ApprovedDevice, id),
         :ok <- maybe_guardian_for_device(guardian, d) do
      now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

      d
      |> ApprovedDevice.changeset(%{status: "revoked", revoked_at: now, session_ref: nil})
      |> Repo.update()
    end
  end

  def device_session_allowed?(user_id, device_id) do
    case Repo.get(ApprovedDevice, device_id) do
      %ApprovedDevice{user_id: ^user_id, status: "approved"} -> true
      _ -> false
    end
  end

  # --- Journey E: private reminder ---

  def create_youth_private_reminder(attrs) do
    family_id = fetch!(attrs, :family_id)
    youth = fetch!(attrs, :owner_user_id)
    body = fetch!(attrs, :body)
    idem = Map.get(attrs, :idempotency_key) || "ypr-#{youth}-#{:erlang.phash2(body)}"

    with :ok <- ensure_family_role(family_id, youth, ~w(youth)),
         "allowed" <- youth_capability(family_id, youth, "private_reminder"),
         :ok <- ensure_safe_reminder(body) do
      {:ok, r} =
        %YouthPrivateReminder{}
        |> YouthPrivateReminder.changeset(%{
          family_id: family_id,
          owner_user_id: youth,
          body: body,
          status: "active",
          visibility: "youth_private",
          expires_at:
            DateTime.add(DateTime.utc_now(), 7 * 86_400, :second)
            |> DateTime.truncate(:microsecond),
          idempotency_key: idem
        })
        |> Repo.insert()

      {:ok, r, :created}
    else
      mode when mode in ~w(denied approval_required) -> {:error, :capability_denied}
      {:error, _} = e -> e
    end
  end

  def get_youth_reminder(reminder_id, user_id) do
    case Repo.get(YouthPrivateReminder, reminder_id) do
      %YouthPrivateReminder{owner_user_id: ^user_id, status: "active"} = r ->
        {:ok, r}

      %YouthPrivateReminder{} ->
        {:error, :forbidden}

      nil ->
        {:error, :not_found}
    end
  end

  defp ensure_safe_reminder(body) do
    low = String.downcase(body || "")

    if String.contains?(low, "meet stranger") or String.contains?(low, "hide from parent") do
      {:error, :prohibited_content}
    else
      :ok
    end
  end

  # --- Sync ---

  def sync_family(user_id, family_id) do
    with :ok <- ensure_family_member(family_id, user_id) do
      role = membership_role(family_id, user_id)

      plans =
        from(p in FamilyPlan,
          where: p.family_id == ^family_id,
          order_by: [desc: p.inserted_at],
          limit: 10
        )
        |> Repo.all()
        |> Enum.map(
          &FamilyPlan.to_contract(&1, if(role == "youth", do: "youth", else: "guardian"))
        )

      requests =
        from(r in FamilyPermissionRequest, where: r.family_id == ^family_id, limit: 10)
        |> Repo.all()
        |> Enum.map(
          &FamilyPermissionRequest.to_contract(
            &1,
            if(role == "youth", do: "youth", else: "guardian")
          )
        )

      contacts =
        if role == "youth" do
          from(c in ApprovedContact,
            where: c.youth_user_id == ^user_id and c.status == "active"
          )
          |> Repo.all()
          |> Enum.map(&ApprovedContact.to_contract/1)
        else
          from(c in ApprovedContact, where: c.family_id == ^family_id and c.status == "active")
          |> Repo.all()
          |> Enum.map(&ApprovedContact.to_contract/1)
        end

      devices =
        from(d in ApprovedDevice, where: d.user_id == ^user_id)
        |> Repo.all()
        |> Enum.map(&ApprovedDevice.to_contract/1)

      reminders =
        if role == "youth" do
          from(r in YouthPrivateReminder,
            where: r.owner_user_id == ^user_id and r.status == "active"
          )
          |> Repo.all()
          |> Enum.map(&YouthPrivateReminder.to_contract/1)
        else
          # guardians do not receive youth private reminder content
          []
        end

      {:ok,
       %{
         "role" => role,
         "plans" => plans,
         "permission_requests" => requests,
         "approved_contacts" => contacts,
         "devices" => devices,
         "private_reminders" => reminders,
         "no_precise_location" => true,
         "no_public_discovery" => true,
         "no_behavior_score" => true,
         "not_production_certified" => true
       }}
    end
  end

  def family_for_conversation(conversation_id) do
    case Repo.get_by(FamilyConversation, conversation_id: conversation_id) do
      %FamilyConversation{family_id: id} -> id
      nil -> nil
    end
  end

  # --- helpers ---

  defp membership_role(family_id, user_id) do
    case Repo.get_by(FamilyMembership, family_id: family_id, user_id: user_id, status: "active") do
      %FamilyMembership{role: role} -> role
      _ -> nil
    end
  end

  defp ensure_family_member(family_id, user_id) do
    if Repo.get_by(FamilyMembership, family_id: family_id, user_id: user_id, status: "active"),
      do: :ok,
      else: {:error, :not_family_member}
  end

  defp ensure_family_role(family_id, user_id, roles) do
    role = membership_role(family_id, user_id)

    if is_binary(role) and role in roles do
      :ok
    else
      {:error, :forbidden_role}
    end
  end

  defp ensure_member(conversation_id, user_id) do
    exists? =
      from(m in ConversationMember,
        where: m.conversation_id == ^conversation_id and m.user_id == ^user_id
      )
      |> Repo.exists?()

    if exists?, do: :ok, else: {:error, :not_a_member}
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
