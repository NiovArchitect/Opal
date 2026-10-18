defmodule OpalCore.SocialFlow.CareRotationsTest do
  use OpalCore.DataCase, async: false

  alias OpalCore.Accounts.User
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.AttentionCenter
  alias OpalCore.SocialFlow.CareRotations
  alias OpalCore.SocialFlow.Clock

  @cadence %{"frequency" => "daily", "local_time" => "18:00", "window_hours" => 4}

  setup do
    Clock.unfreeze()
    on_exit(fn -> Clock.unfreeze() end)

    suffix = System.unique_integer([:positive])

    users =
      for {handle, name} <- [
            {"ana-#{suffix}", "Ana"},
            {"ben-#{suffix}", "Ben"},
            {"cora-#{suffix}", "Cora"},
            {"out-#{suffix}", "Out"}
          ] do
        %User{} |> User.changeset(%{handle: handle, display_name: name}) |> Repo.insert!()
      end

    [ana, ben, cora, outsider] = users

    # Established maturity: the AttentionBudget maturity gate is
    # product law — brand-new accounts are (correctly) denied proactive
    # slots, so tests use established accounts like the walk seed does.
    for u <- users do
      %OpalCore.SocialFlow.AssistancePreference{}
      |> OpalCore.SocialFlow.AssistancePreference.changeset(%{
        user_id: u.id,
        timezone: "America/Los_Angeles",
        intelligence_maturity: "established"
      })
      |> Repo.insert!()
    end

    {:ok, ana: ana, ben: ben, cora: cora, outsider: outsider}
  end

  defp rotation!(ana, others) do
    {:ok, rotation} =
      CareRotations.create_rotation(ana.id, %{
        "subject_label" => "Mom",
        "member_user_ids" => Enum.map(others, & &1.id),
        "cadence" => @cadence,
        "timezone" => "America/New_York"
      })

    Enum.each(others, fn u -> {:ok, _} = CareRotations.accept_membership(rotation.id, u.id) end)
    Repo.get!(OpalCore.SocialFlow.CareRotation, rotation.id)
  end

  defp occurrence(rotation, date) do
    contract = CareRotations.to_contract(rotation)
    Enum.find(contract["check_ins"], &(&1["occurrence_key"] == "care:#{rotation.id}:#{date}"))
  end

  test "laws: no health data, no escalation, no scores, no shadow accounts, no new scheduler",
       _ctx do
    refute CareRotations.health_data_collected?()
    refute CareRotations.escalation_ladder?()
    refute CareRotations.miss_surfaces_more_than_once?()
    refute CareRotations.per_member_miss_scores?()
    refute CareRotations.shadow_subject_accounts?()
    refute CareRotations.new_scheduler?()
  end

  test "create: creator is sole active member until invitees accept", %{ana: ana, ben: ben} do
    {:ok, rotation} =
      CareRotations.create_rotation(ana.id, %{
        "subject_label" => "Mom",
        "member_user_ids" => [ben.id],
        "cadence" => @cadence,
        "timezone" => "America/New_York"
      })

    assert rotation.member_user_ids == [ana.id]
    assert rotation.pending_member_user_ids == [ben.id]

    assert {:error, :not_invited} =
             CareRotations.accept_membership(rotation.id, Ecto.UUID.generate())

    {:ok, accepted} = CareRotations.accept_membership(rotation.id, ben.id)
    assert accepted.member_user_ids == [ana.id, ben.id]
  end

  test "create: unknown member and oversize set rejected", %{ana: ana} do
    assert {:error, :unknown_member} =
             CareRotations.create_rotation(ana.id, %{
               "subject_label" => "Mom",
               "member_user_ids" => [Ecto.UUID.generate()],
               "cadence" => @cadence
             })

    assert {:error, :invalid_frequency} =
             CareRotations.create_rotation(ana.id, %{
               "subject_label" => "Mom",
               "cadence" => %{
                 "frequency" => "minutely",
                 "local_time" => "18:00",
                 "window_hours" => 4
               }
             })
  end

  test "rotation advances daily and completes record done with note", %{
    ana: ana,
    ben: ben,
    cora: cora
  } do
    rotation = rotation!(ana, [ben, cora])
    # Mon 18:05 ET
    Clock.freeze(~U[2026-10-19 22:05:00.000000Z])
    CareRotations.materialize_active()
    mon = occurrence(rotation, "2026-10-19")
    assert mon["assignee_user_id"] == ana.id
    assert mon["status"] == "open"

    {:ok, done} =
      CareRotations.complete_check_in(rotation.id, mon["occurrence_key"], ana.id, "Talked")

    assert done.status == "done"
    assert done.note == "Talked"

    Clock.freeze(~U[2026-10-20 22:05:00.000000Z])
    CareRotations.materialize_active()
    assert occurrence(rotation, "2026-10-20")["assignee_user_id"] == ben.id

    # Materialization is idempotent.
    assert %{materialized: 0} = CareRotations.materialize_active()
    contract = CareRotations.to_contract(rotation)

    assert Enum.count(
             contract["check_ins"],
             &(&1["occurrence_key"] == "care:#{rotation.id}:2026-10-20")
           ) == 1
  end

  test "non-member cannot complete or pass; member pass hands off and TFT follows", %{
    ana: ana,
    ben: ben,
    cora: cora,
    outsider: outsider
  } do
    rotation = rotation!(ana, [ben, cora])
    Clock.freeze(~U[2026-10-19 22:05:00.000000Z])
    CareRotations.materialize_active()
    mon = occurrence(rotation, "2026-10-19")

    assert {:error, :not_a_member} =
             CareRotations.complete_check_in(rotation.id, mon["occurrence_key"], outsider.id)

    assert {:error, :not_a_member} =
             CareRotations.pass_check_in(rotation.id, mon["occurrence_key"], outsider.id, cora.id)

    # Non-assignee member cannot pass someone else's turn.
    assert {:error, :not_assignee} =
             CareRotations.pass_check_in(rotation.id, mon["occurrence_key"], ben.id, cora.id)

    {:ok, passed} =
      CareRotations.pass_check_in(rotation.id, mon["occurrence_key"], ana.id, cora.id, "swap")

    assert passed.assignee_user_id == cora.id
    assert passed.handoff_from_user_id == ana.id

    # Completion by the new assignee is done, not covered.
    {:ok, done} = CareRotations.complete_check_in(rotation.id, mon["occurrence_key"], cora.id)
    assert done.status == "done"
  end

  test "miss surfaces exactly once to exactly the set; late cover retracts", %{
    ana: ana,
    ben: ben,
    cora: cora,
    outsider: outsider
  } do
    rotation = rotation!(ana, [ben, cora])
    Clock.freeze(~U[2026-10-19 22:05:00.000000Z])
    CareRotations.materialize_active()
    mon = occurrence(rotation, "2026-10-19")
    key = mon["occurrence_key"]
    missed_key = "care:#{key}:missed"

    # Inside the window (incl. LA-pin variance): no surface.
    assert %{surfaced: 0} = CareRotations.surface_missed(~U[2026-10-20 01:59:00.000000Z])

    # Past window end (Tue 02:00Z): surface once.
    Clock.freeze(~U[2026-10-20 02:01:00.000000Z])
    assert %{surfaced: 1} = CareRotations.surface_missed()
    assert %{surfaced: 0} = CareRotations.surface_missed()
    assert %{surfaced: 0} = CareRotations.surface_missed()

    for user <- [ana, ben, cora] do
      feed = AttentionCenter.feed(user.id, refresh_temporal: false)
      rows = Enum.filter(feed["needs_you"], &(&1["dedupe_key"] == missed_key))
      assert length(rows) == 1, "each set member has exactly one miss row"
      assert hd(rows)["title"] =~ "No check-in logged for Mom"
    end

    out_feed = AttentionCenter.feed(outsider.id, refresh_temporal: false)
    assert Enum.filter(out_feed["needs_you"], &(&1["dedupe_key"] == missed_key)) == []

    # Late cover by a non-assignee: covered, and the surface retracts for all.
    {:ok, covered} = CareRotations.complete_check_in(rotation.id, key, cora.id)
    assert covered.status == "covered"
    assert covered.done_by_user_id == cora.id

    for user <- [ana, ben, cora] do
      feed = AttentionCenter.feed(user.id, refresh_temporal: false)
      assert Enum.filter(feed["needs_you"], &(&1["dedupe_key"] == missed_key)) == []
    end
  end

  test "duplicate completion race: second completion returns the same row unchanged", %{
    ana: ana,
    ben: ben
  } do
    rotation = rotation!(ana, [ben])
    Clock.freeze(~U[2026-10-19 22:05:00.000000Z])
    CareRotations.materialize_active()
    mon = occurrence(rotation, "2026-10-19")

    {:ok, first} =
      CareRotations.complete_check_in(rotation.id, mon["occurrence_key"], ana.id, "first")

    {:ok, second} =
      CareRotations.complete_check_in(rotation.id, mon["occurrence_key"], ben.id, "second")

    assert second.id == first.id
    assert second.note == "first"
    assert second.done_by_user_id == ana.id
  end

  test "ending mid-window cancels the open occurrence; no miss ever surfaces", %{
    ana: ana,
    ben: ben
  } do
    rotation = rotation!(ana, [ben])
    Clock.freeze(~U[2026-10-19 22:05:00.000000Z])
    CareRotations.materialize_active()
    mon = occurrence(rotation, "2026-10-19")

    assert {:error, :not_admin} = CareRotations.end_rotation(rotation.id, ben.id)
    {:ok, _} = CareRotations.end_rotation(rotation.id, ana.id)
    assert occurrence(rotation, "2026-10-19")["status"] == "cancelled"

    Clock.freeze(~U[2026-10-20 03:00:00.000000Z])
    assert %{surfaced: 0} = CareRotations.surface_missed()
    feed = AttentionCenter.feed(ben.id, refresh_temporal: false)

    assert Enum.filter(
             feed["needs_you"],
             &(&1["dedupe_key"] == "care:#{mon["occurrence_key"]}:missed")
           ) == []
  end

  test "member removal: open occurrence becomes unassigned; set of zero ends", %{
    ana: ana,
    ben: ben,
    cora: cora
  } do
    rotation = rotation!(ana, [ben, cora])
    Clock.freeze(~U[2026-10-19 22:05:00.000000Z])
    CareRotations.materialize_active()

    {:ok, _} = CareRotations.remove_member(rotation.id, ana.id, ana.id)
    occ = occurrence(rotation, "2026-10-19")
    assert occ["assignee_user_id"] == nil
    assert occ["status"] == "open"

    contract = CareRotations.to_contract(Repo.get!(OpalCore.SocialFlow.CareRotation, rotation.id))
    assert contract["member_user_ids"] == [ben.id, cora.id]
  end

  test "subject link requires the subject's own consent; notes never reach the subject view", %{
    ana: ana,
    ben: ben,
    outsider: subject
  } do
    rotation = rotation!(ana, [ben])
    Clock.freeze(~U[2026-10-19 22:05:00.000000Z])
    CareRotations.materialize_active()
    mon = occurrence(rotation, "2026-10-19")

    {:ok, _} =
      CareRotations.complete_check_in(rotation.id, mon["occurrence_key"], ana.id, "private note")

    assert {:error, :not_found} = CareRotations.get_for_user(rotation.id, subject.id)
    {:ok, _} = CareRotations.propose_subject_link(rotation.id, ana.id, subject.id)
    # Proposed is not linked.
    assert {:error, :not_found} = CareRotations.get_for_user(rotation.id, subject.id)
    {:ok, _} = CareRotations.accept_subject_link(rotation.id, subject.id)
    # Linked but visibility still off.
    assert {:error, :not_found} = CareRotations.get_for_user(rotation.id, subject.id)
    {:ok, _} = CareRotations.set_subject_visible(rotation.id, subject.id, true)

    {:ok, view} = CareRotations.get_for_user(rotation.id, subject.id)
    assert view["subject_view"] == true
    assert [%{"status" => "done"}] = view["check_ins"]
    refute inspect(view) =~ "private note"
  end

  test "paused rotation materializes nothing", %{ana: ana, ben: ben} do
    rotation = rotation!(ana, [ben])
    {:ok, _} = CareRotations.pause(rotation.id, ana.id)
    Clock.freeze(~U[2026-10-19 22:05:00.000000Z])
    assert %{materialized: 0} = CareRotations.materialize_active()
  end
end
