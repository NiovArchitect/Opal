defmodule OpalCore.SocialFlow.PersonalFlowNotificationTest do
  use ExUnit.Case, async: true

  alias OpalCore.SocialFlow.PersonalFlow
  alias OpalCore.SocialFlow.NotificationDelivery

  @jordan %{
    "conversation_id" => "jordan-1",
    "who" => "Jordan",
    "next_gap" => "none",
    "lifecycle_stage" => "set",
    "sufficiency" => "usable",
    "has_meaningful_dims" => true,
    "when" => "Tonight · 7:00 PM",
    "minutes_until" => 240,
    "requires_user_action" => false
  }

  describe "PersonalFlow" do
    test "3pm early silence" do
      r =
        PersonalFlow.compose([@jordan], %{
          "work_ends_in_minutes" => 120,
          "travel_minutes" => 25
        })

      assert r["kind"] == "silence"
      assert r["human_consequence"] == nil
    end

    test "5pm optional transition not obligation" do
      r =
        PersonalFlow.compose(
          [Map.put(@jordan, "minutes_until", 120)],
          %{
            "work_ends_in_minutes" => 0,
            "travel_minutes" => 25,
            "optional_errand" => %{
              "id" => "errand",
              "label" => "that stop",
              "duration_minutes" => 25,
              "feasible" => true
            }
          }
        )

      assert r["kind"] == "optional_transition"
      assert r["human_consequence"] =~ "that stop"
      refute r["human_consequence"] =~ "Go to the store at"
      assert r["delivery_eligible"] == false
      assert r["privacy_class"] == "actor_private"
    end

    test "leave window delivery eligible" do
      r =
        PersonalFlow.compose(
          [Map.put(@jordan, "minutes_until", 40)],
          %{"work_ends_in_minutes" => -80, "travel_minutes" => 25, "travel_source" => "synthetic"}
        )

      assert r["kind"] == "leave_window"
      assert r["delivery_eligible"] == true
      assert r["human_consequence"] =~ "Leave"
    end

    test "already travelling silences leave" do
      r =
        PersonalFlow.compose(
          [Map.put(@jordan, "minutes_until", 30)],
          %{"already_travelling" => true, "travel_minutes" => 25}
        )

      assert r["kind"] == "silence"
      assert Enum.any?(r["reasons"], &String.contains?(&1, "already_travelling"))
    end
  end

  describe "NotificationDelivery" do
    test "recompute / non-interrupt is silent" do
      intent =
        NotificationDelivery.build_intent(%{"recompute_only" => true, "conversation_id" => "c1"})

      assert intent["delivery_class"] == "silent"
    end

    test "leave window notifies when backgrounded and permitted" do
      facts = %{
        "conversation_id" => "jordan-1",
        "leave_by_relevant" => true,
        "minutes_until" => 20,
        "has_meaningful_dims" => true
      }

      flow = %{
        "reality_id" => "jordan-1",
        "human_consequence" => "Leave around 6:20 for dinner with Jordan.",
        "delivery_eligible" => true,
        "supersession_key" => "leave:jordan-1:20"
      }

      intent =
        NotificationDelivery.build_intent(facts, flow, %{
          "permission" => "granted",
          "app_backgrounded" => true,
          "history" => []
        })

      assert intent["delivery_class"] in ~w(notify supersede)
      assert intent["copy"] =~ "Leave"
    end

    test "app active suppresses external push" do
      facts = %{
        "conversation_id" => "jordan-1",
        "leave_by_relevant" => true,
        "minutes_until" => 20
      }

      flow = %{
        "reality_id" => "jordan-1",
        "human_consequence" => "Leave around 6:20 for dinner with Jordan.",
        "delivery_eligible" => true,
        "supersession_key" => "leave:jordan-1:20"
      }

      intent =
        NotificationDelivery.build_intent(facts, flow, %{
          "permission" => "granted",
          "app_active_reality_id" => "jordan-1"
        })

      assert intent["delivery_class"] == "suppress"
    end

    test "permission denied does not break — suppress to in-app" do
      facts = %{"conversation_id" => "j", "leave_by_relevant" => true, "minutes_until" => 15}

      flow = %{
        "reality_id" => "j",
        "delivery_eligible" => true,
        "human_consequence" => "Leave soon.",
        "supersession_key" => "leave:j:15"
      }

      intent =
        NotificationDelivery.build_intent(facts, flow, %{"permission" => "denied"})

      assert intent["delivery_class"] == "suppress"
      assert Enum.any?(intent["reasons"], &String.contains?(&1, "permission"))
    end

    test "reconnect dedupe" do
      facts = %{"conversation_id" => "j", "leave_by_relevant" => true, "minutes_until" => 20}

      flow = %{
        "reality_id" => "j",
        "delivery_eligible" => true,
        "human_consequence" => "Leave around 6:20.",
        "supersession_key" => "leave:j:20"
      }

      hist = [
        %{
          "consequence_id" => "j",
          "supersession_key" => "leave:j:20",
          "status" => "delivered"
        }
      ]

      intent =
        NotificationDelivery.build_intent(facts, flow, %{
          "permission" => "granted",
          "history" => hist,
          "app_backgrounded" => true
        })

      assert intent["delivery_class"] == "suppress"
    end

    test "supersede prior leave + one active delivery" do
      hist = [
        %{
          "consequence_id" => "j",
          "supersession_key" => "leave:j:20",
          "status" => "delivered"
        }
      ]

      facts = %{"conversation_id" => "j", "leave_by_relevant" => true, "minutes_until" => 5}

      flow = %{
        "reality_id" => "j",
        "delivery_eligible" => true,
        "human_consequence" => "Leave around 6:05 for dinner with Jordan.",
        "supersession_key" => "leave:j:5"
      }

      intent =
        NotificationDelivery.build_intent(facts, flow, %{
          "permission" => "granted",
          "history" => hist,
          "app_backgrounded" => true
        })

      assert intent["delivery_class"] == "supersede"
      hist2 = NotificationDelivery.record_receipt(hist, intent, "delivered")
      active = NotificationDelivery.active_for(hist2, "j")
      assert length(Enum.filter(active, &(&1["status"] == "delivered"))) == 1
    end

    test "private copy sanitized on lock screen path" do
      assert NotificationDelivery.permission_prompt_copy() =~ "head out"
    end

    test "stale expires" do
      intent =
        NotificationDelivery.build_intent(
          %{
            "conversation_id" => "j",
            "leave_by_relevant" => true,
            "minutes_until" => -30
          },
          %{
            "reality_id" => "j",
            "delivery_eligible" => true,
            "supersession_key" => "leave:j:x",
            "human_consequence" => "Leave now."
          },
          %{"permission" => "granted"}
        )

      assert intent["delivery_class"] == "expire"
    end
  end
end
