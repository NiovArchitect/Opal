defmodule OpalCore.SocialFlow.OpalCalendar do
  @moduledoc """
  Native Opal calendar — canonical schedule for commitments created inside Opal.

  Authority:
  AlignmentAuthority / Set → Opal Calendar commitment
  Calendar never elevates to Set.

  External calendars (Google/etc.) are optional free/busy sources and optional
  sync sinks — never required for Set, conflict detection, or native reminders.
  """

  import Ecto.Query

  alias OpalCore.Repo
  alias OpalCore.SocialFlow.OpalCalendar.Commitment
  alias OpalCore.SocialFlow.SharedPlan
  alias OpalCore.SocialFlow.PlanParticipant

  @doc """
  Project an agreed SharedPlan into per-participant Opal calendar commitments.

  Called after Set/plan agreement. Idempotent for same plan version.
  """
  def project_from_shared_plan(%SharedPlan{} = plan, opts \\ []) do
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)
    version = Keyword.get(opts, :plan_version, plan_version(plan))
    {start_at, end_at} = resolve_time_range(plan, opts)

    participant_ids =
      from(p in PlanParticipant, where: p.plan_id == ^plan.id, select: p.user_id)
      |> Repo.all()
      |> Enum.uniq()

    participant_ids =
      if participant_ids == [] and plan.created_by_user_id,
        do: [plan.created_by_user_id],
        else: participant_ids

    results =
      Enum.map(participant_ids, fn uid ->
        upsert_active(%{
          conversation_id: plan.conversation_id,
          shared_plan_id: plan.id,
          owner_user_id: uid,
          start_at: start_at,
          end_at: end_at,
          timezone: plan.timezone || "UTC",
          label: plan.time_label || plan.title,
          place_label: plan.location,
          plan_version: version,
          participant_user_ids: participant_ids,
          created_from_alignment: true,
          metadata: %{"projected_at" => DateTime.to_iso8601(now)}
        })
      end)

    case Enum.find(results, &match?({:error, _}, &1)) do
      {:error, _} = err -> err
      nil -> {:ok, Enum.map(results, fn {:ok, c} -> c end)}
    end
  end

  @doc "Record commitment directly (tests / alignment projection without SharedPlan row)."
  def record_commitment(attrs) when is_map(attrs) do
    upsert_active(attrs)
  end

  @doc "Reschedule: supersede old version, write new active commitment."
  def reschedule(commitment_id, attrs) when is_binary(commitment_id) and is_map(attrs) do
    case Repo.get(Commitment, commitment_id) do
      nil ->
        {:error, :not_found}

      %Commitment{status: "active"} = old ->
        Repo.transaction(fn ->
          new_version = old.plan_version + 1

          {:ok, new} =
            upsert_active(%{
              conversation_id: old.conversation_id,
              shared_plan_id: old.shared_plan_id,
              owner_user_id: old.owner_user_id,
              start_at: Map.get(attrs, :start_at) || Map.get(attrs, "start_at"),
              end_at: Map.get(attrs, :end_at) || Map.get(attrs, "end_at"),
              timezone: Map.get(attrs, :timezone) || Map.get(attrs, "timezone") || old.timezone,
              label: Map.get(attrs, :label) || Map.get(attrs, "label") || old.label,
              place_label:
                Map.get(attrs, :place_label) || Map.get(attrs, "place_label") || old.place_label,
              plan_version: new_version,
              participant_user_ids: old.participant_user_ids,
              created_from_alignment: old.created_from_alignment,
              proposal_key: old.proposal_key,
              metadata: Map.merge(old.metadata || %{}, %{"rescheduled_from" => old.id})
            })

          {:ok, _} =
            old
            |> Commitment.changeset(%{
              status: "superseded",
              superseded_by_id: new.id
            })
            |> Repo.update()

          new
        end)

      %Commitment{} ->
        {:error, :not_active}
    end
  end

  @doc "Cancel commitment (plan cancelled)."
  def cancel(commitment_id, opts \\ []) when is_binary(commitment_id) do
    case Repo.get(Commitment, commitment_id) do
      nil ->
        {:error, :not_found}

      c ->
        now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

        c
        |> Commitment.changeset(%{
          status: "cancelled",
          cancelled_at: now,
          external_sync_status:
            if(c.external_sync_status == "synced",
              do: "sync_requested",
              else: c.external_sync_status
            ),
          metadata:
            Map.merge(c.metadata || %{}, %{
              "cancel_reason" => Keyword.get(opts, :reason, "plan_cancelled")
            })
        })
        |> Repo.update()
    end
  end

  def cancel_for_plan(shared_plan_id) when is_binary(shared_plan_id) do
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    from(c in Commitment,
      where: c.shared_plan_id == ^shared_plan_id and c.status == "active"
    )
    |> Repo.update_all(set: [status: "cancelled", cancelled_at: now, updated_at: now])

    :ok
  end

  @doc "Active busy blocks for owner (privacy-safe abstraction)."
  def busy_blocks_for_user(owner_user_id, range \\ %{}) when is_binary(owner_user_id) do
    q =
      from(c in Commitment,
        where: c.owner_user_id == ^owner_user_id and c.status == "active"
      )

    q =
      case {range[:start_at] || range["start_at"], range[:end_at] || range["end_at"]} do
        {%DateTime{} = s, %DateTime{} = e} ->
          from(c in q, where: c.end_at > ^s and c.start_at < ^e)

        _ ->
          q
      end

    q
    |> Repo.all()
    |> Enum.map(&Commitment.to_busy_block/1)
  end

  @doc """
  Whether candidate interval conflicts with owner's Opal commitments.

  `exclude_conversation_id` skips the same conversation's plan (reschedule).
  """
  def conflicts?(owner_user_id, start_at, end_at, opts \\ [])
      when is_binary(owner_user_id) do
    exclude = Keyword.get(opts, :exclude_conversation_id)

    busy_blocks_for_user(owner_user_id, %{start_at: start_at, end_at: end_at})
    |> Enum.reject(fn b ->
      exclude && b["conversation_id"] == exclude
    end)
    |> Enum.any?(fn b ->
      overlaps?(b["start_at"], b["end_at"], start_at, end_at)
    end)
  end

  @doc """
  Privacy-safe conflict surface for the owner.

  Never reveals other conversation's who/what/where.
  """
  def private_conflict_guidance(owner_user_id, start_at, end_at, opts \\ []) do
    if conflicts?(owner_user_id, start_at, end_at, opts) do
      %{
        "conflicts" => true,
        "private" => true,
        "private_copy" => "That time conflicts with something on your schedule.",
        "peer_safe_copy" => nil,
        "reveals_other_plan" => false,
        "authorizes_set" => false
      }
    else
      %{"conflicts" => false, "private" => true, "authorizes_set" => false}
    end
  end

  def list_mine(owner_user_id) when is_binary(owner_user_id) do
    from(c in Commitment,
      where: c.owner_user_id == ^owner_user_id and c.status == "active",
      order_by: [asc: c.start_at]
    )
    |> Repo.all()
    |> Enum.map(&Commitment.to_owner_contract/1)
  end

  def authorizes_set?, do: false

  # --- internals ---

  defp upsert_active(attrs) do
    attrs = atomize_keys(attrs)
    owner = attrs.owner_user_id
    plan_id = Map.get(attrs, :shared_plan_id)
    version = Map.get(attrs, :plan_version, 1)

    existing =
      if is_binary(plan_id) do
        Repo.get_by(Commitment,
          shared_plan_id: plan_id,
          owner_user_id: owner,
          plan_version: version,
          status: "active"
        )
      end

    params = %{
      conversation_id: attrs.conversation_id,
      shared_plan_id: plan_id,
      owner_user_id: owner,
      status: "active",
      start_at: attrs.start_at,
      end_at: attrs.end_at,
      timezone: Map.get(attrs, :timezone) || "UTC",
      label: Map.get(attrs, :label),
      place_label: Map.get(attrs, :place_label),
      plan_version: version,
      proposal_key: Map.get(attrs, :proposal_key),
      participant_user_ids: Map.get(attrs, :participant_user_ids, []),
      created_from_alignment: Map.get(attrs, :created_from_alignment, true),
      external_sync_status: "not_synced",
      metadata: Map.get(attrs, :metadata, %{})
    }

    case existing do
      %Commitment{} = c ->
        c |> Commitment.changeset(params) |> Repo.update()

      nil ->
        %Commitment{} |> Commitment.changeset(params) |> Repo.insert()
    end
  end

  defp plan_version(%SharedPlan{current_revision_id: nil}), do: 1
  defp plan_version(%SharedPlan{}), do: 1

  defp resolve_time_range(%SharedPlan{} = plan, opts) do
    start_at =
      Keyword.get(opts, :start_at) || plan.start_at ||
        default_start_from_label(plan.time_label)

    end_at =
      Keyword.get(opts, :end_at) || plan.end_at ||
        DateTime.add(start_at, 2 * 3600, :second)

    {start_at, end_at}
  end

  # When plan only has time_label, place a provisional future window (still authoritative Opal busy).
  defp default_start_from_label(_label) do
    DateTime.utc_now()
    |> DateTime.add(24 * 3600, :second)
    |> DateTime.truncate(:microsecond)
  end

  defp overlaps?(s1, e1, s2, e2) do
    DateTime.compare(e1, s2) == :gt and DateTime.compare(e2, s1) == :gt
  end

  defp atomize_keys(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {k, v}
      {"conversation_id", v} -> {:conversation_id, v}
      {"shared_plan_id", v} -> {:shared_plan_id, v}
      {"owner_user_id", v} -> {:owner_user_id, v}
      {"start_at", v} -> {:start_at, v}
      {"end_at", v} -> {:end_at, v}
      {"timezone", v} -> {:timezone, v}
      {"label", v} -> {:label, v}
      {"place_label", v} -> {:place_label, v}
      {"plan_version", v} -> {:plan_version, v}
      {"proposal_key", v} -> {:proposal_key, v}
      {"participant_user_ids", v} -> {:participant_user_ids, v}
      {"created_from_alignment", v} -> {:created_from_alignment, v}
      {"metadata", v} -> {:metadata, v}
      {_k, _v} -> {:__drop__, nil}
    end)
    |> Map.delete(:__drop__)
  end
end
