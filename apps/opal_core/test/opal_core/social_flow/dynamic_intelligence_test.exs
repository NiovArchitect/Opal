defmodule OpalCore.SocialFlow.DynamicIntelligenceTest do
  use ExUnit.Case, async: true

  alias OpalCore.SocialFlow.DynamicIntelligence
  alias OpalCore.SocialFlow.DynamicIntelligence.{Audience, Context, Fixtures, Participation}

  describe "context detection" do
    test "forming dinner context detected" do
      ctx = Context.detect(Fixtures.dinner_messages())
      assert ctx["kind"] == "dinner_forming"
      assert ctx["forming?"] == true
      assert ctx["activity"] == "dinner"
      assert ctx["confidence"] >= 0.6
    end

    test "weak hangout remains non-forming" do
      ctx = Context.detect(Fixtures.weak_hangout_messages())
      assert ctx["forming?"] == false
      assert ctx["confidence"] < 0.6
    end

    test "quiet ordinary conversation is ordinary" do
      ctx = Context.detect(Fixtures.quiet_ordinary_messages())
      assert ctx["kind"] == "ordinary"
      assert ctx["forming?"] == false
    end
  end

  describe "quiet dinner for three" do
    test "detects dinner, ranks venue_1, surfaces one preferred option" do
      assert {:ok, result} = DynamicIntelligence.evaluate(Fixtures.dinner_scenario())

      assert result.surface == :opportunity
      assert result.preferred["id"] == "venue_1"
      assert result.preferred["display_name"] == "Quiet bistro fixture"
      assert result.options != []
      assert match?([_ | _], result.options)
      assert Enum.count(result.options) <= 3
      assert hd(result.options)["id"] == "venue_1"

      refute Enum.any?(result.options, &(&1["id"] == "venue_2")),
             "loud venue must fail quiet hard constraint"

      refute Enum.any?(result.options, &(&1["id"] == "venue_3")),
             "high cost must fail private budget hard constraint"

      assert result.shared["headline"] =~ "This could work for the three of you"
      assert result.shared["primary_option"] == "Quiet bistro fixture"
      assert result.shared["not_a_chat_participant"] == true
      assert "interested" in result.shared["actions"]
      assert "see_why" in result.shared["actions"]
      assert result.audit["private_budget_used"] == true
      assert result.audit["private_budget_in_shared"] == false
    end

    test "private budget never enters shared payload" do
      assert {:ok, result} = DynamicIntelligence.evaluate(Fixtures.dinner_scenario())
      blob = Jason.encode!(result.shared) |> String.downcase()

      for banned <- Audience.forbidden_substrings() do
        refute String.contains?(blob, String.downcase(banned)),
               "shared payload leaked #{banned}"
      end

      refute String.contains?(blob, "maya")
      refute String.contains?(blob, "cannot afford")
    end

    test "group-safe see why has no private reasons" do
      assert {:ok, result} = DynamicIntelligence.evaluate(Fixtures.dinner_scenario())
      why = String.downcase(result.shared["see_why"])
      refute why =~ "budget"
      refute why =~ "afford"
      refute why =~ "sensory"
      assert why =~ "timing" or why =~ "quiet" or why =~ "convenient" or why =~ "preferences"
    end

    test "hard constraints satisfied on preferred option" do
      assert {:ok, result} = DynamicIntelligence.evaluate(Fixtures.dinner_scenario())
      assert result.preferred["hard_constraints_satisfied"] == true
    end
  end

  describe "restraint and quiet state" do
    test "weak context stays silent" do
      input =
        Fixtures.dinner_scenario(
          messages: Fixtures.weak_hangout_messages(),
          idempotency_key: "weak-1"
        )

      assert {:ok, result} = DynamicIntelligence.evaluate(input)
      assert result.surface == :silence
      assert result.shared == nil
      assert result.options == []
      assert result.journey_state == "quiet"
    end

    test "quiet ordinary conversation produces no surface" do
      input =
        Fixtures.dinner_scenario(
          messages: Fixtures.quiet_ordinary_messages(),
          idempotency_key: "quiet-1"
        )

      assert {:ok, result} = DynamicIntelligence.evaluate(input)
      assert result.surface == :silence
      assert result.reason in ["context_not_forming", "low_context_confidence"]
    end

    test "no valid candidates returns silence" do
      venues =
        Enum.map(Fixtures.venues(), fn v ->
          Map.merge(v, %{"quiet" => false, "price_band" => "$$$$"})
        end)

      input = Fixtures.dinner_scenario(venues: venues, idempotency_key: "novalid-1")
      assert {:ok, result} = DynamicIntelligence.evaluate(input)
      assert result.surface == :silence
      assert result.reason == "no_valid_options"
    end

    test "permission revocation blocks use" do
      input = Fixtures.dinner_scenario(permission_revoked: true, idempotency_key: "rev-1")
      assert {:ok, result} = DynamicIntelligence.evaluate(input)
      assert result.surface == :silence
      assert result.reason == "permission_revoked"
    end
  end

  describe "private participation" do
    test "private decline does not leak reason to shared summary" do
      assert {:ok, result} = DynamicIntelligence.evaluate(Fixtures.dinner_scenario())
      a = Fixtures.user_a_id()
      b = Fixtures.user_b_id()
      c = Fixtures.user_c_id()

      assert {:ok, result} = DynamicIntelligence.respond(result, a, "interested")
      assert {:ok, result} = DynamicIntelligence.respond(result, b, "interested")

      assert {:ok, result} =
               DynamicIntelligence.respond(result, c, "not_this_time",
                 private_reason: "budget too high"
               )

      summary = result.shared["participation_summary"]
      refute summary =~ "budget"
      refute summary =~ "User C"
      refute summary =~ c
      assert summary =~ "interested" or summary =~ "Still open"

      assert {:ok, private} = Participation.private_view(result.participation, c)
      assert private["state"] == "not_this_time"
      assert private["private_reason"] == "budget too high"
    end

    test "group may see aggregate interest without private reasons" do
      assert {:ok, result} = DynamicIntelligence.evaluate(Fixtures.dinner_scenario())

      assert {:ok, result} =
               DynamicIntelligence.respond(result, Fixtures.user_a_id(), "interested")

      assert {:ok, result} =
               DynamicIntelligence.respond(result, Fixtures.user_b_id(), "interested")

      assert result.journey_state in ["still_open", "ready"]
      assert result.shared["participation_summary"] =~ "interested"
      blob = Jason.encode!(result.shared)
      refute blob =~ "budget"
    end
  end

  describe "correction" do
    test "not with this group suppresses future dinner for this group" do
      assert {:ok, first} = DynamicIntelligence.evaluate(Fixtures.dinner_scenario())
      assert first.surface == :opportunity

      assert {:ok, correction} =
               DynamicIntelligence.apply_correction(
                 first,
                 Fixtures.user_a_id(),
                 "Not with this group."
               )

      assert correction["kind"] == "suppress_group_context"
      assert correction["global_label"] == false
      assert correction["friendship_score_change"] == false

      assert {:ok, second} =
               DynamicIntelligence.evaluate_with_correction(
                 Fixtures.dinner_scenario(),
                 correction
               )

      assert second.surface == :silence
      assert second.reason == "group_correction"
    end
  end

  describe "outsider isolation" do
    test "user D outsider cannot view or respond" do
      assert {:ok, result} = DynamicIntelligence.evaluate(Fixtures.dinner_scenario())
      outsider = Fixtures.user_d_outsider_id()

      assert {:error, :forbidden} =
               DynamicIntelligence.respond(result, outsider, "interested")

      assert {:error, :forbidden} =
               Audience.authorize_view(result.member_ids, outsider)

      assert {:error, :forbidden} =
               DynamicIntelligence.apply_correction(result, outsider, "Not with this group.")
    end
  end

  describe "python proposal boundary" do
    test "elixir validates python proposal and drops hard-constraint failures" do
      proposal = %{
        "result_type" => "collective_fit_ranking",
        "collective_fit_ranking" => %{
          "ranked_candidate_ids" => ["venue_2", "venue_1", "venue_3"],
          "explanations" => [
            %{"candidate_id" => "venue_2", "text" => "Loud and cheap."},
            %{"candidate_id" => "venue_1", "text" => "Quiet and convenient for everyone."},
            %{"candidate_id" => "venue_3", "text" => "Quiet but expensive."}
          ]
        }
      }

      input = Fixtures.dinner_scenario(python_proposal: proposal, idempotency_key: "py-1")
      assert {:ok, result} = DynamicIntelligence.evaluate(input)
      assert result.surface == :opportunity
      # venue_2 fails quiet; venue_3 fails private budget; venue_1 remains.
      assert result.preferred["id"] == "venue_1"
      refute Enum.any?(result.options, &(&1["id"] == "venue_2"))
      refute Enum.any?(result.options, &(&1["id"] == "venue_3"))
    end

    test "python private-leak explanation is sanitized or rejected path still safe" do
      proposal = %{
        "result_type" => "collective_fit_ranking",
        "collective_fit_ranking" => %{
          "ranked_candidate_ids" => ["venue_1"],
          "explanations" => [
            %{
              "candidate_id" => "venue_1",
              "text" => "User C cannot afford the alternatives."
            }
          ]
        }
      }

      input = Fixtures.dinner_scenario(python_proposal: proposal, idempotency_key: "py-leak")
      assert {:ok, result} = DynamicIntelligence.evaluate(input)
      # Either silenced due to leak rejection falling back to local rank, or sanitized.
      if result.surface == :opportunity do
        blob = Jason.encode!(result.shared) |> String.downcase()
        refute blob =~ "cannot afford"
        refute blob =~ "budget"
      end
    end

    test "duplicate evaluate is stable for same fixture key" do
      input = Fixtures.dinner_scenario(idempotency_key: "idem-1")
      assert {:ok, a} = DynamicIntelligence.evaluate(input)
      assert {:ok, b} = DynamicIntelligence.evaluate(input)
      assert a.surface == b.surface
      assert a.preferred["id"] == b.preferred["id"]
      assert a.idempotency_key == b.idempotency_key
    end
  end

  describe "maximum options" do
    test "returns at most three options" do
      # Add more valid quiet moderate venues
      extra =
        for i <- 5..10 do
          %{
            "id" => "venue_#{i}",
            "display_name" => "Quiet extra #{i}",
            "quiet" => true,
            "price_band" => "$$",
            "available_at" => "19:45",
            "travel_friction" => "balanced",
            "similar_to_past" => false
          }
        end

      input =
        Fixtures.dinner_scenario(
          venues: Fixtures.venues() ++ extra,
          idempotency_key: "max3"
        )

      assert {:ok, result} = DynamicIntelligence.evaluate(input)
      assert result.surface == :opportunity
      assert Enum.count(result.options) <= 3
    end
  end
end
