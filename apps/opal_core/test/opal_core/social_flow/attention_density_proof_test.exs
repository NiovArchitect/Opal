defmodule OpalCore.SocialFlow.AttentionDensityProofTest do
  @moduledoc "Pass 11 high-density compression funnel — ranking before caps."
  use ExUnit.Case, async: true

  alias OpalCore.SocialFlow.AttentionAuthority
  alias OpalCore.SocialFlow.ExperienceContinuation

  def density_items do
    realities = [
      {%{
         "conversation_id" => "jordan_dinner",
         "next_gap" => "place",
         "requires_user_action" => true,
         "has_meaningful_dims" => true,
         "minutes_until" => 55,
         "sufficiency" => "converging",
         "lifecycle_stage" => "still_open"
       }, :jordan},
      {%{
         "conversation_id" => "friends_saturday",
         "next_gap" => "place",
         "requires_user_action" => true,
         "has_meaningful_dims" => true,
         "minutes_until" => 2880,
         "sufficiency" => "converging",
         "lifecycle_stage" => "still_open",
         "member_count" => 6
       }, :friends},
      {%{
         "conversation_id" => "maya_coffee",
         "has_meaningful_dims" => true,
         "minutes_until" => 7200,
         "sufficiency" => "intention",
         "lifecycle_stage" => "still_open"
       }, :maya},
      {%{
         "conversation_id" => "personal_work",
         "participant_count" => 1,
         "has_meaningful_dims" => true,
         "minutes_until" => 90,
         "sufficiency" => "usable",
         "lifecycle_stage" => "set"
       }, :work},
      {%{
         "conversation_id" => "personal_errand",
         "participant_count" => 1,
         "sufficiency" => "intention",
         "lifecycle_stage" => "quiet"
       }, :errand},
      {%{
         "conversation_id" => "later_commit",
         "participant_count" => 1,
         "minutes_until" => 480,
         "sufficiency" => "usable",
         "lifecycle_stage" => "set",
         "has_meaningful_dims" => true
       }, :later}
    ]

    noise = [
      {%{"conversation_id" => "jordan_dinner", "recompute_only" => true}, :noise_re},
      {%{"private_memory_only" => true, "conversation_id" => "mem1"}, :mem1},
      {%{"private_memory_only" => true, "conversation_id" => "mem2"}, :mem2},
      {%{"kind" => "proposal", "conversation_id" => "jordan_dinner"}, :prop}
    ]

    satellites =
      for i <- 1..5 do
        {%{
           "conversation_id" => "jordan_dinner",
           "next_gap" => "place",
           "requires_user_action" => true,
           "has_meaningful_dims" => true,
           "minutes_until" => 55 + i,
           "sufficiency" => "converging",
           "lifecycle_stage" => "still_open"
         }, {:sat, i}}
      end

    realities ++ noise ++ satellites
  end

  test "density funnel: few Home rows; Jordan ranks first in NOW" do
    items = density_items()
    explain = AttentionAuthority.compose_home_field_explain(items)

    assert length(explain.candidates) >= 15
    assert length(explain.after_collapse) < length(explain.candidates)
    assert length(explain.surfaced) <= 6
    assert length(explain.surfaced) < length(explain.after_collapse) or length(explain.after_collapse) <= 6

    now = Enum.filter(explain.surfaced, &(&1.band == "now"))
    assert hd(now).item == :jordan

    # memory/recompute suppressed
    assert Enum.any?(explain.suppressed, &(&1.suppress_reason =~ "silence" or &1.suppress_reason =~ "memory" or &1.suppress_reason =~ "recompute" or &1.suppress_reason =~ "collapse"))
  end

  test "continuation dayparts and suppression" do
    assert ExperienceContinuation.present(%{"hour" => 9})["label"] =~ ~r/morning|day/i
    refute ExperienceContinuation.present(%{"hour" => 9})["label"] =~ ~r/night/i
    assert ExperienceContinuation.present(%{"hour" => 22})["daypart"] == "night"
    assert ExperienceContinuation.present(%{"remote?" => true})["daypart"] == "remote"
    assert {true, _} = ExperienceContinuation.suppressed?(%{"minutes_to_next_commitment" => 20})
  end

  test "notification funnel scenarios" do
    assert AttentionAuthority.notification_policy(%{"recompute_only" => true}, nil).action == :silent

    leave =
      AttentionAuthority.notification_policy(
        %{
          "leave_by_relevant" => true,
          "minutes_until" => 25,
          "conversation_id" => "j",
          "leave_by" => "18:20"
        },
        nil
      )

    assert leave.action == :notify

    super =
      AttentionAuthority.notification_policy(
        %{
          "leave_by_relevant" => true,
          "minutes_until" => 15,
          "conversation_id" => "j",
          "leave_by" => "18:00"
        },
        %{
          "consequence_id" => "j",
          "class" => "time_sensitive",
          "payload_key" => "|||18:20|"
        }
      )

    assert super.action == :supersede
  end
end
