defmodule OpalCore.Intelligence.ColdStartTest do
  use OpalCore.DataCase, async: false

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Intelligence.{AttentionBudget, ColdStart, PromptBuilder}
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.AssistancePreference
  alias OpalCore.SocialMemory.{ConversationIndex, PersonMemory, Routine, TemporalAnchor}

  setup do
    account_id = Ecto.UUID.generate()

    {:ok, _} =
      %User{}
      |> User.changeset(%{
        id: account_id,
        handle: "cold_" <> String.slice(account_id, 0, 8),
        display_name: "Cold"
      })
      |> Repo.insert()

    {:ok, account_id: account_id}
  end

  test "new maturity blocks routine_break; time_critical allowed", %{account_id: aid} do
    assert ColdStart.maturity_of(aid) == :new

    assert {:denied, :maturity_gate} =
             AttentionBudget.request_slot(aid, "routine_break", "routine_break", %{
               person_id: Ecto.UUID.generate(),
               topic: "coffee",
               provenance: "observed"
             })

    assert {:granted, _} =
             AttentionBudget.request_slot(aid, "mediation", "mediation", %{
               person_id: Ecto.UUID.generate(),
               topic: "split",
               provenance: "observed"
             })
  end

  test "thresholds promote to learning then established", %{account_id: aid} do
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    {:ok, _} =
      %ConversationIndex{}
      |> ConversationIndex.changeset(%{
        account_id: aid,
        conversation_id: Ecto.UUID.generate(),
        message_count: 60,
        last_activity_at: now
      })
      |> Repo.insert()

    # Force recompute — message_count >= 50 → learning
    assert ColdStart.compute_maturity(aid) == :learning

    {:ok, row} =
      Repo.get_by(ConversationIndex, account_id: aid)
      |> ConversationIndex.changeset(%{message_count: 500})
      |> Repo.update()

    assert row.message_count == 500
    assert ColdStart.compute_maturity(aid) == :established
  end

  test "seed Q&A skippable; skip marks complete without memories", %{account_id: aid} do
    assert {:ok, _msg} = ColdStart.maybe_seed_onboarding(aid)
    assert {:ok, :skipped} = ColdStart.handle_seed_reply(aid, "skip")

    pref = Repo.get_by(AssistancePreference, user_id: aid)
    assert match?(%DateTime{}, pref.onboarding_seed_completed_at)

    assert Repo.get_by(PersonMemory, account_id: aid, person_id: aid) == nil
  end

  test "seed reply stores stated facts + low-confidence routine", %{account_id: aid} do
    assert {:ok, _} = ColdStart.maybe_seed_onboarding(aid)

    assert {:ok, :seeded} =
             ColdStart.handle_seed_reply(
               aid,
               "I usually see Sam every Tuesday; Maya's birthday is June 14"
             )

    pm = Repo.get_by(PersonMemory, account_id: aid, person_id: aid)
    assert pm.known_facts["onboarding_note"]["provenance"] == "stated"

    assert Repo.exists?(from(r in Routine, where: r.account_id == ^aid and r.confidence == 0.4))

    anchor = Repo.get_by(TemporalAnchor, account_id: aid, anchor_type: "birthday")
    assert anchor.needs_confirmation == true
    assert String.starts_with?(anchor.source_text, "[stated]")
  end

  test "learning questions max 3/day", %{account_id: aid} do
    assert ColdStart.allow_learning_question?(aid)
    assert ColdStart.allow_learning_question?(aid)
    assert ColdStart.allow_learning_question?(aid)
    refute ColdStart.allow_learning_question?(aid)
  end

  test "PromptBuilder maturity_instruction additive", %{account_id: aid} do
    text = PromptBuilder.maturity_instruction(aid)
    assert is_binary(text)
    assert text =~ ~r/curious|new relationship/i
  end
end
