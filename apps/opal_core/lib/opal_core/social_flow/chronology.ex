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
    ConversationMomentBridge,
    GroupComposition,
    OpalChronologyMoment,
    ProductSignals,
    SocialReality,
    SmokeResidue
  }

  alias OpalCore.Messaging.Message

  # Living record: only consequential social-reality transitions (not inference log).
  @consequential_kinds ~w(
    plan_forming open_loop set follow_through canceled
    shared_reality time_recognized time_resolved time_reopened
    place_open place_resolved place_reopened place_constraint
    activity_resolved food_constraint
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
      |> Enum.filter(&moment_supported?(&1, conversation_id))
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

    bodies = Enum.map(messages, &(&1.body || ""))
    label = moment["label"] || "Something is forming"

    if OpalCore.SocialFlow.SeedFixtureLeak.label_supported_by_messages?(label, bodies) do
      composition = GroupComposition.compose(conversation_id, messages)

    insert_if_new(%{
      conversation_id: conversation_id,
      kind: moment["kind"] || "plan_forming",
      lifecycle_stage: stage,
      label: label,
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
    else
      {:ok, nil, :unsupported_label}
    end
  end

  defp moment_supported?(moment, conversation_id) do
    bodies =
      from(m in Message, where: m.conversation_id == ^conversation_id, select: m.body)
      |> Repo.all()

    OpalCore.SocialFlow.SeedFixtureLeak.label_supported_by_messages?(
      moment["label"] || "",
      bodies
    )
  end

  defp maybe_record_composition_moments(conversation_id, message, composition, messages) do
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
      # Only first time place gap is consequential after plan content exists.
      |> maybe_push(
        surface["place_gap"] == true and
          (is_binary(when_m["strongest_common_start"]) or is_binary(when_m["day"])),
        "place_open",
        surface["place_line"] || "Place is still open",
        "chrono-#{conversation_id}-place-open"
      )

    bodies = Enum.map(messages, &(&1.body || ""))

    Enum.each(maybe, fn attrs ->
      label = attrs[:label] || attrs["label"] || ""
      if OpalCore.SocialFlow.SeedFixtureLeak.label_supported_by_messages?(label, bodies) do
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
      end
    end)
  end

  # Living-record rule: persist only if removing the moment would make it harder
  # to reconstruct how humans got from conversation → reality. Venue twitch ≠ change.
  defp maybe_record_venue_fit(conversation_id, message, composition) do
    fit = GroupComposition.venue_fit(composition)
    strongest = fit["strongest"]

    named_in_message? =
      is_map(strongest) and is_binary(strongest["display_name"]) and
        String.contains?(
          String.downcase(message.body || ""),
          String.downcase(strongest["display_name"])
        )

    if named_in_message? do
      party = fit["party_size"]
      sid = strongest["id"]
      prev = last_snapshot(conversation_id, "venue_fit_changed")

      prev_sid = get_in(prev, ["composition_snapshot", "strongest_id"])
      prev_party = get_in(prev, ["composition_snapshot", "party_size"])

      meaningful? =
        is_nil(prev) or
          (is_binary(sid) and sid != prev_sid) or
          (is_integer(party) and party != prev_party)

      if meaningful? do
        insert_if_new(%{
          conversation_id: conversation_id,
          kind: "venue_fit_changed",
          lifecycle_stage: "still_open",
          label:
            if(is_nil(prev),
              do: "#{strongest["display_name"]} fits the group",
              else: "Place options changed for #{party} people"
            ),
          detail: fit["note"],
          privacy_class: "shared_progress",
          visibility: "shared",
          viewer_user_id: nil,
          evidence_message_id: message.id,
          source_message_ids: [message.id],
          after_server_seq: message.server_seq,
          created_from: "venue_fit",
          composition_snapshot: %{
            "party_size" => party,
            "strongest_id" => sid,
            "eliminated" => fit["eliminated"]
          },
          # Key includes change fingerprint so party/venue flips persist once each.
          idempotency_key: "chrono-#{conversation_id}-venue-#{sid}-#{party}"
        })
      end
    end
  end

  defp last_snapshot(conversation_id, kind) do
    from(m in OpalChronologyMoment,
      where: m.conversation_id == ^conversation_id and m.kind == ^kind,
      order_by: [desc: m.inserted_at],
      limit: 1
    )
    |> Repo.one()
    |> case do
      nil -> nil
      m -> OpalChronologyMoment.to_contract(m)
    end
  end

  defp maybe_push(list, truthy, kind, label, key) do
    if truthy && is_binary(label) && label != "" do
      [%{kind: kind, label: label, idempotency_key: key} | list]
    else
      list
    end
  end

  # H4 repair: chronology from REALITY DELTAS, not hard-coded still_open dumps.
  # BEFORE reality vs AFTER reality → only consequential dimension changes.
  defp maybe_record_shared_reality(conversation_id, message, messages) do
    after_msgs = Enum.reject(messages, &SmokeResidue.smoke_body?(&1.body || ""))
    before_msgs = Enum.reject(after_msgs, fn m -> m.id == message.id end)

    after_r = SocialReality.project(after_msgs, project_stage(after_msgs))
    before_r =
      if before_msgs == [] do
        empty_reality()
      else
        SocialReality.project(before_msgs, project_stage(before_msgs))
      end

    stage_s = project_stage_string(after_r, after_msgs)

    for delta <- reality_deltas(before_r, after_r) do
      key =
        "chrono-#{conversation_id}-#{delta.kind}-#{message.server_seq}-#{:erlang.phash2({delta.dimension, delta.previous, delta.new})}"

      insert_if_new(%{
        conversation_id: conversation_id,
        kind: delta.kind,
        lifecycle_stage: stage_s,
        label: delta.label,
        detail: delta.detail,
        privacy_class: "shared_progress",
        visibility: "shared",
        viewer_user_id: nil,
        evidence_message_id: message.id,
        source_message_ids: Enum.map(after_msgs, & &1.id) |> Enum.take(-8),
        after_server_seq: message.server_seq,
        created_from: "reality_delta",
        composition_snapshot: %{
          "dimension" => delta.dimension,
          "previous_value" => delta.previous,
          "new_value" => delta.new,
          "what" => after_r["what"],
          "when" => after_r["when"],
          "where" => after_r["where"],
          "next_gap" => after_r["next_gap"],
          "gaps" => after_r["gaps"]
        },
        idempotency_key: key
      })
    end
  end

  defp empty_reality do
    %{
      "what" => nil,
      "when" => nil,
      "where" => nil,
      "next_gap" => "none",
      "gaps" => [],
      "dimensions" => %{}
    }
  end

  defp project_stage(messages) do
    # Stage for projection richness only — not Set authority.
    r = SocialReality.project(messages, :still_open)
    dims = r["dimensions"] || %{}

    cond do
      dims["when_known"] == true and dims["what_known"] == true and
          (r["speaker_count"] || dims["speaker_count"] || 0) >= 2 ->
        :set

      dims["what_known"] == true or dims["when_known"] == true ->
        :still_open

      true ->
        :plan_forming
    end
  end

  defp project_stage_string(reality, messages) do
    cond do
      present?(reality["what"]) and present?(reality["when"]) and present?(reality["where"]) ->
        "set"

      present?(reality["what"]) and present?(reality["when"]) ->
        "still_open"

      true ->
        Atom.to_string(project_stage(messages))
    end
  end

  defp reality_deltas(before_r, after_r) do
    []
    |> maybe_dim_delta(before_r, after_r, "what", "activity_resolved", fn v ->
      "#{v} became the plan."
    end)
    |> maybe_dim_delta(before_r, after_r, "when", "time_resolved", fn v ->
      "#{v} became the time."
    end)
    |> maybe_dim_delta(before_r, after_r, "where", "place_resolved", fn v ->
      "#{v} became the place."
    end)
    |> maybe_reopen(before_r, after_r, "when", "time_reopened", fn prev ->
      if present?(prev), do: "#{prev} no longer works.", else: "Time reopened."
    end)
    |> maybe_reopen(before_r, after_r, "where", "place_reopened", fn prev ->
      if present?(prev), do: "#{prev} is no longer the place.", else: "Place reopened."
    end)
    |> maybe_replace(before_r, after_r, "when", "time_resolved", fn prev, new_v ->
      "#{new_v} replaced #{prev}."
    end)
    |> maybe_replace(before_r, after_r, "where", "place_resolved", fn prev, new_v ->
      "#{new_v} replaced #{prev}."
    end)
  end

  defp maybe_dim_delta(acc, before_r, after_r, dim, kind, label_fn) do
    prev = before_r[dim]
    new_v = after_r[dim]

    cond do
      # First recognition: nil → value
      not present?(prev) and present?(new_v) ->
        [
          %{
            dimension: dim,
            previous: nil,
            new: new_v,
            kind: kind,
            label: label_fn.(new_v),
            detail: after_r["detail"]
          }
          | acc
        ]

      true ->
        acc
    end
  end

  defp maybe_reopen(acc, before_r, after_r, dim, kind, label_fn) do
    prev = before_r[dim]
    new_v = after_r[dim]

    if present?(prev) and not present?(new_v) do
      [
        %{
          dimension: dim,
          previous: prev,
          new: nil,
          kind: kind,
          label: label_fn.(prev),
          detail: nil
        }
        | acc
      ]
    else
      acc
    end
  end

  defp maybe_replace(acc, before_r, after_r, dim, kind, label_fn) do
    prev = before_r[dim]
    new_v = after_r[dim]

    if present?(prev) and present?(new_v) and normalize_dim(prev) != normalize_dim(new_v) do
      [
        %{
          dimension: dim,
          previous: prev,
          new: new_v,
          kind: kind,
          label: label_fn.(prev, new_v),
          detail: after_r["detail"]
        }
        | acc
      ]
    else
      acc
    end
  end

  defp present?(nil), do: false
  defp present?(""), do: false
  defp present?(s) when is_binary(s), do: String.trim(s) != ""
  defp present?(_), do: true

  defp normalize_dim(s) when is_binary(s), do: s |> String.downcase() |> String.trim()
  defp normalize_dim(other), do: other

  defp insert_if_new(attrs) do
    case Repo.get_by(OpalChronologyMoment, idempotency_key: attrs[:idempotency_key] || attrs["idempotency_key"]) do
      %OpalChronologyMoment{} = existing ->
        {:ok, existing, :idempotent}

      nil ->
        %OpalChronologyMoment{}
        |> OpalChronologyMoment.changeset(attrs)
        |> Repo.insert()
        |> case do
          {:ok, m} ->
            # Phase 1A: chronology → SocialMoment. Never fail the message path.
            _ = ConversationMomentBridge.maybe_publish_from_chronology(m, m.conversation_id)
            {:ok, m, :created}

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
