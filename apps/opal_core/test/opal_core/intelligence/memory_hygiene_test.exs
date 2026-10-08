defmodule OpalCore.Intelligence.MemoryHygieneTest do
  use OpalCore.DataCase, async: false

  alias OpalCore.Accounts.User
  alias OpalCore.Intelligence.{MemoryHygiene, OutcomeLearning}
  alias OpalCore.Repo
  alias OpalCore.SocialMemory.{OutcomeSignal, PersonMemory, Routine, SocialPattern, TemporalAnchor}
  alias OpalCore.SocialMemory.Workers.MemoryHygieneWorker

  setup do
    account_id = Ecto.UUID.generate()

    {:ok, _} =
      %User{}
      |> User.changeset(%{
        id: account_id,
        handle: "hyg_" <> String.slice(account_id, 0, 8),
        display_name: "Hyg"
      })
      |> Repo.insert()

    {:ok, account_id: account_id}
  end

  test "fact confidence decays at 90d/180d and flags revalidation", %{account_id: aid} do
    old = DateTime.utc_now() |> DateTime.add(-200 * 86_400, :second) |> DateTime.to_iso8601()

    {:ok, _} =
      %PersonMemory{}
      |> PersonMemory.changeset(%{
        account_id: aid,
        person_id: aid,
        known_facts: %{
          "birthday" => %{"value" => "June 14", "learned_at" => old, "confidence" => 0.5}
        }
      })
      |> Repo.insert()

    assert {:ok, %{facts: 1}} = MemoryHygieneWorker.run_for(aid)

    pm = Repo.get_by(PersonMemory, account_id: aid, person_id: aid)
    fact = pm.known_facts["birthday"]
    assert fact["confidence"] == 0.25
    assert fact["needs_revalidation"] == true
    assert MemoryHygiene.revalidation_prompt_instruction(aid) =~ "birthday"
  end

  test "routines decay then archive; never delete", %{account_id: aid} do
    old = DateTime.utc_now() |> DateTime.add(-130 * 86_400, :second) |> DateTime.truncate(:microsecond)

    {:ok, r} =
      %Routine{}
      |> Routine.changeset(%{
        account_id: aid,
        activity: "coffee",
        cadence: "weekly",
        confidence: 0.8,
        detection_count: 3,
        last_occurrence_at: old
      })
      |> Repo.insert()

    assert {:ok, %{routines: 1}} = MemoryHygieneWorker.run_for(aid)
    r2 = Repo.get!(Routine, r.id)
    assert r2.archived == true
    assert match?(%DateTime{}, r2.archived_at)
  end

  test "stale social_pattern evidence stops counting", %{account_id: aid} do
    old = DateTime.utc_now() |> DateTime.add(-100 * 86_400, :second) |> DateTime.truncate(:microsecond)

    {:ok, s} =
      %SocialPattern{}
      |> SocialPattern.changeset(%{
        account_id: aid,
        pattern_type: "slow_responder",
        description: "slow",
        confidence: 0.8,
        evidence_count: 5,
        last_evidence_at: old,
        surfaced: true
      })
      |> Repo.insert()

    assert {:ok, %{patterns: 1}} = MemoryHygieneWorker.run_for(aid)
    s2 = Repo.get!(SocialPattern, s.id)
    assert s2.confidence == 0.4
  end

  test "outcome_signals 180d decay path exists; 365d archive", %{account_id: aid} do
    old = DateTime.utc_now() |> DateTime.add(-400 * 86_400, :second) |> DateTime.truncate(:microsecond)

    {:ok, o} =
      OutcomeLearning.record(%{
        account_id: aid,
        signal_type: "nudge_dismissed",
        ref_type: "nudge",
        outcome: "negative",
        strength: 0.9,
        context: %{"what" => "x"}
      })

    # Backdate
    {:ok, o} =
      o
      |> OutcomeSignal.changeset(%{recorded_at: old})
      |> Repo.update()

    assert OutcomeLearning.effective_strength(o) == 0.45
    assert {:ok, %{outcomes: 1}} = MemoryHygieneWorker.run_for(aid)
    assert Repo.get!(OutcomeSignal, o.id).archived == true
  end

  test "contradiction: winner kept, loser archived with superseded_by", %{account_id: aid} do
    person = Ecto.UUID.generate()

    {:ok, a} =
      %TemporalAnchor{}
      |> TemporalAnchor.changeset(%{
        account_id: aid,
        person_id: person,
        anchor_type: "birthday",
        date: ~D[2026-06-14],
        confidence: 0.9,
        confirmed: true
      })
      |> Repo.insert()

    {:ok, b} =
      %TemporalAnchor{}
      |> TemporalAnchor.changeset(%{
        account_id: aid,
        person_id: person,
        anchor_type: "birthday",
        date: ~D[2026-06-15],
        confidence: 0.4
      })
      |> Repo.insert()

    assert [[_, _] = pair] = MemoryHygiene.detect_anchor_contradictions(aid)
    assert length(pair) == 2

    assert {:ok, %{winner: w, loser: l}} =
             MemoryHygiene.resolve_anchor_contradiction(aid, a.id, b.id)

    assert w.id == a.id
    assert l.archived == true
    assert l.superseded_by == a.id
  end
end
