defmodule OpalCore.SocialFlow.Chronology do
  @moduledoc """
  Durable Opal causal history.

  Unlike ProductSignals (recomputed on read), moments here are written when
  recognition advances and survive refresh / logout / re-login.

  Visibility:
  - shared_progress → all conversation members
  - private_viewer → only viewer_user_id (Extend / Only you)
  """

  import Ecto.Query

  alias OpalCore.Messaging.ConversationMember
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.{
    GroupComposition,
    OpalChronologyMoment,
    ProductSignals,
    SharedRealityPresentation,
    SmokeResidue
  }

  alias OpalCore.Messaging.Message

  # Living record: only consequential social-reality transitions (not inference log).
  @consequential_kinds ~w(
    plan_forming open_loop set follow_through canceled
    shared_reality time_recognized place_open place_constraint food_constraint
    member_added member_removed venue_fit_changed participation
    private_assist private_shortlist private_continuation
  )

  @doc """
  After a new message is accepted, persist consequential moments only.
  Idempotent. Not a glorified signal log of every inference.
  """
  def record_after_message(%Message{} = message) do
    conversation_id = message.conversation_id

    messages =
      from(m in Message,
        where: m.conversation_id == ^conversation_id,
        order_by: [asc: m.server_seq],
        limit: 80
      )
      |> Repo.all()
      |> Enum.reject(&SmokeResidue.smoke_body?(&1.body || ""))

    # Stage transitions only when stage changes (chronological_moments already diffs).
    for moment <- ProductSignals.chronological_moments(messages) do
      persist_moment(conversation_id, moment, messages)
    end

    composition = GroupComposition.compose(conversation_id, messages)
    maybe_record_composition_moments(conversation_id, message, composition, messages)
    maybe_record_shared_reality(conversation_id, message, messages)
    maybe_record_venue_fit(conversation_id, message, composition)

    :ok
  rescue
    _ -> :ok
  end

  def record_after_message(_), do: :ok

  @doc """
  Explicit consequential write (membership add/remove, Extend shortlist, etc.).
  """
  def record_consequential(conversation_id, attrs) when is_binary(conversation_id) and is_map(attrs) do
    kind = to_string(Map.get(attrs, :kind) || Map.get(attrs, "kind") || "shared_reality")

    if kind in @consequential_kinds or String.starts_with?(kind, "private_") do
      insert_if_new(%{
        conversation_id: conversation_id,
        kind: kind,
        lifecycle_stage: Map.get(attrs, :lifecycle_stage) || Map.get(attrs, "lifecycle_stage"),
        label: Map.get(attrs, :label) || Map.get(attrs, "label") || "Update",
        detail: Map.get(attrs, :detail) || Map.get(attrs, "detail"),
        privacy_class:
          Map.get(attrs, :privacy_class) || Map.get(attrs, "privacy_class") || "shared_progress",
        visibility: Map.get(attrs, :visibility) || Map.get(attrs, "visibility") || "shared",
        viewer_user_id: Map.get(attrs, :viewer_user_id) || Map.get(attrs, "viewer_user_id"),
        evidence_message_id:
          Map.get(attrs, :evidence_message_id) || Map.get(attrs, "evidence_message_id"),
        source_message_ids:
          Map.get(attrs, :source_message_ids) || Map.get(attrs, "source_message_ids") || [],
        after_server_seq:
          Map.get(attrs, :after_server_seq) || Map.get(attrs, "after_server_seq") || 0,
        created_from: Map.get(attrs, :created_from) || Map.get(attrs, "created_from") || "explicit",
        composition_snapshot:
          Map.get(attrs, :composition_snapshot) || Map.get(attrs, "composition_snapshot") || %{},
        idempotency_key:
          Map.get(attrs, :idempotency_key) || Map.get(attrs, "idempotency_key") ||
            "exp-#{conversation_id}-#{kind}-#{System.unique_integer([:positive])}"
      })
    else
      {:ok, nil, :skipped_non_consequential}
    end
  end

  @doc """
  Moments visible to a member. Private viewer moments filtered by user_id.
  """
  def list_for_viewer(conversation_id, user_id) do
    if member?(conversation_id, user_id) do
      from(m in OpalChronologyMoment,
        where: m.conversation_id == ^conversation_id,
        where:
          m.visibility == "shared" or
            (m.visibility == "private_viewer" and m.viewer_user_id == ^user_id),
        order_by: [asc: m.after_server_seq, asc: m.inserted_at]
      )
      |> Repo.all()
      |> Enum.map(&OpalChronologyMoment.to_contract/1)
    else
      {:error, :not_a_member}
    end
  end

  @doc "Private-only moment (Extend / Only you). Never shared."
  def record_private(conversation_id, viewer_user_id, attrs) when is_map(attrs) do
    label = Map.get(attrs, :label) || Map.get(attrs, "label") || "Only you"
    key = Map.get(attrs, :idempotency_key) || Map.get(attrs, "idempotency_key")

    key =
      key ||
        "priv-#{conversation_id}-#{viewer_user_id}-#{:erlang.phash2({label, Map.get(attrs, :detail)})}"

    insert_if_new(%{
      conversation_id: conversation_id,
      kind: Map.get(attrs, :kind) || "private_assist",
      lifecycle_stage: Map.get(attrs, :lifecycle_stage),
      label: label,
      detail: Map.get(attrs, :detail) || Map.get(attrs, "detail"),
      privacy_class: "private_viewer",
      visibility: "private_viewer",
      viewer_user_id: viewer_user_id,
      evidence_message_id: Map.get(attrs, :evidence_message_id),
      source_message_ids: Map.get(attrs, :source_message_ids) || [],
      after_server_seq: Map.get(attrs, :after_server_seq) || 0,
      created_from: "private_extend",
      composition_snapshot: %{},
      idempotency_key: key
    })
  end

  defp persist_moment(conversation_id, moment, messages) when is_map(moment) do
    stage = moment["lifecycle_stage"] || "plan_forming"
    evid = moment["evidence_message_id"]
    seq = moment["after_server_seq"] || 0
    key = "chrono-#{conversation_id}-#{stage}-#{evid || seq}"

    composition = GroupComposition.compose(conversation_id, messages)

    insert_if_new(%{
      conversation_id: conversation_id,
      kind: moment["kind"] || "plan_forming",
      lifecycle_stage: stage,
      label: moment["label"] || "Something is forming",
      detail: nil,
      privacy_class: "shared_progress",
      visibility: "shared",
      viewer_user_id: nil,
      evidence_message_id: evid,
      source_message_ids: moment["source_message_ids"] || [],
      after_server_seq: seq,
      created_from: moment["created_from"] || "conversation_evidence",
      composition_snapshot: strip_ids(composition),
      idempotency_key: key
    })
  end

  defp maybe_record_composition_moments(conversation_id, message, composition, _messages) do
    when_m = composition["when"] || %{}
    where_m = composition["where"] || %{}
    food = composition["food"] || %{}
    surface = GroupComposition.human_surface(composition)

    # Consequence language — not constraint spreadsheet.
    maybe =
      []
      |> maybe_push(
        is_binary(when_m["strongest_common_start"]),
        "time_recognized",
        surface["when_line"] || when_m["window_note"],
        "chrono-#{conversation_id}-time-#{when_m["strongest_common_start"]}"
      )
      |> maybe_push(
        where_m["downtown_incompatible"] == true,
        "place_constraint",
        "Downtown drops out for this group",
        "chrono-#{conversation_id}-where-downtown"
      )
      |> maybe_push(
        food["sushi_conflict"] == true,
        "food_constraint",
        "Sushi drops out for this group",
        "chrono-#{conversation_id}-food-sushi"
      )
      |> maybe_push(
        surface["place_gap"] == true,
        "place_open",
        surface["place_line"] || "Place is still open",
        "chrono-#{conversation_id}-place-open"
      )

    Enum.each(maybe, fn attrs ->
      insert_if_new(
        Map.merge(attrs, %{
          conversation_id: conversation_id,
          privacy_class: "shared_progress",
          visibility: "shared",
          viewer_user_id: nil,
          evidence_message_id: message.id,
          source_message_ids: [message.id],
          after_server_seq: message.server_seq,
          created_from: "group_composition",
          composition_snapshot: strip_ids(composition),
          lifecycle_stage: "still_open"
        })
      )
    end)
  end

  defp maybe_record_venue_fit(conversation_id, message, composition) do
    fit = GroupComposition.venue_fit(composition)
    strongest = fit["strongest"]
    if is_map(strongest) and is_binary(strongest["display_name"]) do
      key = "chrono-#{conversation_id}-venue-#{strongest["id"]}-#{fit["party_size"]}"

      insert_if_new(%{
        conversation_id: conversation_id,
        kind: "venue_fit_changed",
        lifecycle_stage: "still_open",
        label: "#{strongest["display_name"]} fits the group",
        detail: fit["note"],
        privacy_class: "shared_progress",
        visibility: "shared",
        viewer_user_id: nil,
        evidence_message_id: message.id,
        source_message_ids: [message.id],
        after_server_seq: message.server_seq,
        created_from: "venue_fit",
        composition_snapshot: %{
          "party_size" => fit["party_size"],
          "strongest_id" => strongest["id"],
          "eliminated" => fit["eliminated"]
        },
        idempotency_key: key
      })
    end
  end

  defp maybe_push(list, truthy, kind, label, key) do
    if truthy && is_binary(label) && label != "" do
      [%{kind: kind, label: label, idempotency_key: key} | list]
    else
      list
    end
  end

  defp maybe_record_shared_reality(conversation_id, message, messages) do
    reality = SharedRealityPresentation.from_messages(messages, :still_open)
    headline = reality["headline"]

    if is_binary(headline) and headline != "" and reality["what"] do
      key = "chrono-#{conversation_id}-sr-#{:erlang.phash2(headline)}"

      insert_if_new(%{
        conversation_id: conversation_id,
        kind: "shared_reality",
        lifecycle_stage: "still_open",
        label: headline,
        detail: reality["detail"],
        privacy_class: "shared_progress",
        visibility: "shared",
        viewer_user_id: nil,
        evidence_message_id: message.id,
        source_message_ids: Enum.map(messages, & &1.id) |> Enum.take(-8),
        after_server_seq: message.server_seq,
        created_from: "shared_reality",
        composition_snapshot: %{
          "what" => reality["what"],
          "when" => reality["when"],
          "where" => reality["where"],
          "gaps" => reality["gaps"]
        },
        idempotency_key: key
      })
    end
  end

  defp insert_if_new(attrs) do
    case Repo.get_by(OpalChronologyMoment, idempotency_key: attrs[:idempotency_key] || attrs["idempotency_key"]) do
      %OpalChronologyMoment{} = existing ->
        {:ok, existing, :idempotent}

      nil ->
        %OpalChronologyMoment{}
        |> OpalChronologyMoment.changeset(attrs)
        |> Repo.insert()
        |> case do
          {:ok, m} -> {:ok, m, :created}
          {:error, %Ecto.Changeset{errors: errors} = cs} ->
            if unique_key_error?(errors) do
              existing =
                Repo.get_by(OpalChronologyMoment,
                  idempotency_key: attrs[:idempotency_key] || attrs["idempotency_key"]
                )

              {:ok, existing, :idempotent}
            else
              {:error, cs}
            end

          {:error, e} ->
            {:error, e}
        end
    end
  end

  defp unique_key_error?(errors) do
    Enum.any?(errors, fn
      {:idempotency_key, {_, opts}} when is_list(opts) -> opts[:constraint] == :unique
      _ -> false
    end)
  end

  defp strip_ids(composition) when is_map(composition) do
    # Shared-safe snapshot: drop raw participant id lists from client contracts if needed later.
    # Keep counts and public constraints only for durability of *facts*, not identity dump.
    who = composition["who"] || %{}

    composition
    |> Map.put("who", %{
      "member_count" => who["member_count"],
      "projected_count" => who["projected_count"],
      "required_affirmed_count" => who["required_affirmed_count"],
      "required_pending_count" => who["required_pending_count"],
      "optional_count" => length(who["optional_participant_ids"] || []),
      "guest_asks" => who["guest_asks"]
    })
  end

  defp strip_ids(_), do: %{}

  defp member?(conversation_id, user_id) do
    from(cm in ConversationMember,
      where: cm.conversation_id == ^conversation_id and cm.user_id == ^user_id
    )
    |> Repo.exists?()
  end
end
