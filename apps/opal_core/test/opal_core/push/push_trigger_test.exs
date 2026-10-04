defmodule OpalCore.Push.PushTriggerTest do
  @moduledoc """
  Phase 2A — AttentionCenter ingest → Oban push job trigger.

  AttentionAuthority law: urgent/attention enqueue; silent/ambient never push.
  """

  use OpalCore.DataCase, async: false
  use Oban.Testing, repo: OpalCore.Repo

  import ExUnit.CaptureLog

  alias OpalCore.Push.DeviceTokens
  alias OpalCore.Push.Workers.DeliverPushWorker
  alias OpalCore.SocialFlow.AttentionCenter, as: AC

  test "urgent/attention item enqueues DeliverPushWorker" do
    Oban.Testing.with_testing_mode(:manual, fn ->
      assert {:ok, items} =
               AC.ingest(%{
                 "items" => [
                   %{
                     "recipient_user_id" => "walk-b",
                     "level" => "urgent",
                     "action_required" => true,
                     "dedupe_key" => "push:urgent:1",
                     "title" => "Fort Oak",
                     "copy" => "Needs your answer now",
                     "source_type" => "proposal",
                     "conversation_id" => "conv-push-1",
                     "reason" => "decision_required"
                   }
                 ]
               })

      assert length(items) == 1
      assert hd(items).level == "urgent"

      assert_enqueued(
        worker: DeliverPushWorker,
        args: %{
          "user_id" => "walk-b",
          "title" => "Fort Oak"
        }
      )
    end)
  end

  test "attention level also enqueues push job" do
    Oban.Testing.with_testing_mode(:manual, fn ->
      assert {:ok, _} =
               AC.ingest(%{
                 "items" => [
                   %{
                     "recipient_user_id" => "walk-b",
                     "level" => "attention",
                     "action_required" => true,
                     "dedupe_key" => "push:attention:1",
                     "title" => "Plan",
                     "copy" => "Needs your answer",
                     "source_type" => "proposal",
                     "conversation_id" => "conv-push-att",
                     "reason" => "decision_required"
                   }
                 ]
               })

      assert_enqueued(worker: DeliverPushWorker)
    end)
  end

  test "silent item NEVER enqueues push job (AttentionAuthority law)" do
    Oban.Testing.with_testing_mode(:manual, fn ->
      assert {:ok, items} =
               AC.ingest(%{
                 "items" => [
                   %{
                     "recipient_user_id" => "walk-b",
                     "level" => "silent",
                     "action_required" => false,
                     "dedupe_key" => "push:silent:1",
                     "title" => "Quiet",
                     "copy" => "Should not push",
                     "source_type" => "memory"
                   }
                 ]
               })

      assert items == []
      refute_enqueued(worker: DeliverPushWorker)
    end)
  end

  test "ambient item NEVER enqueues push job (AttentionAuthority law)" do
    Oban.Testing.with_testing_mode(:manual, fn ->
      assert {:ok, items} =
               AC.ingest(%{
                 "items" => [
                   %{
                     "recipient_user_id" => "walk-a",
                     "level" => "ambient",
                     "action_required" => false,
                     "dedupe_key" => "push:ambient:1",
                     "title" => "Fort Oak",
                     "copy" => "Waiting on Walk B",
                     "source_type" => "waiting_on",
                     "conversation_id" => "conv-push-amb",
                     "reason" => "waiting_on_others"
                   }
                 ]
               })

      # Ambient waiting may be stored, but must not push.
      assert Enum.all?(items, &(&1.level == "ambient"))
      refute_enqueued(worker: DeliverPushWorker)
    end)
  end

  test "push_levels only includes urgent and attention" do
    assert AC.push_levels() == ["urgent", "attention"]
    refute "silent" in AC.push_levels()
    refute "ambient" in AC.push_levels()
  end

  test "VERIFY: register token → ingest urgent → job → synthetic log with user_id/title" do
    assert {:ok, _} =
             DeviceTokens.upsert("walk-b", %{
               "platform" => "ios",
               "token" => "verify-token-abcdef12",
               "env" => "sandbox"
             })

    Oban.Testing.with_testing_mode(:manual, fn ->
      assert {:ok, _} =
               AC.ingest(%{
                 "items" => [
                   %{
                     "recipient_user_id" => "walk-b",
                     "level" => "urgent",
                     "action_required" => true,
                     "dedupe_key" => "push:verify:1",
                     "title" => "Fort Oak",
                     "copy" => "Needs your answer",
                     "source_type" => "proposal",
                     "conversation_id" => "conv-verify",
                     "reason" => "decision_required"
                   }
                 ]
               })

      assert_enqueued(worker: DeliverPushWorker, args: %{"user_id" => "walk-b"})

      prev = Logger.level()
      Logger.configure(level: :info)

      log =
        try do
          capture_log(fn ->
            assert :ok =
                     perform_job(DeliverPushWorker, %{
                       "user_id" => "walk-b",
                       "title" => "Fort Oak",
                       "body" => "Needs your answer",
                       "data" => %{
                         "attention_item_id" => "item-verify",
                         "level" => "urgent"
                       }
                     })
          end)
        after
          Logger.configure(level: prev)
        end

      assert log =~ "push.synthetic"
      assert log =~ "user_id=walk-b"
      assert log =~ "Fort Oak"
      refute log =~ "delivered"
    end)
  end

  test "VERIFY: ingest silent → assert NO job" do
    Oban.Testing.with_testing_mode(:manual, fn ->
      assert {:ok, []} =
               AC.ingest(%{
                 "items" => [
                   %{
                     "recipient_user_id" => "walk-b",
                     "level" => "silent",
                     "dedupe_key" => "push:verify-silent",
                     "title" => "Nope",
                     "copy" => "silent"
                   }
                 ]
               })

      refute_enqueued(worker: DeliverPushWorker)
    end)
  end
end
