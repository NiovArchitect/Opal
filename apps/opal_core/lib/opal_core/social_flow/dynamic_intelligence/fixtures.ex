defmodule OpalCore.SocialFlow.DynamicIntelligence.Fixtures do
  @moduledoc """
  Synthetic quiet-dinner-for-three Phase 1 fixtures.

  No real phone numbers, GPS, addresses, providers, or production users.
  """

  alias OpalCore.Fixtures

  # Phase 1 pure-fixture id (not necessarily DB-backed).
  @conversation_id "bddddddd-dddd-4ddd-8ddd-dddddddddddd"

  def conversation_id, do: @conversation_id

  # Phase 2 durable path uses seeded group conversation with A/B/C members.
  def conversation_id_for_durable, do: Fixtures.conv_group_friends_id()

  def user_a_id, do: Fixtures.user_alex_id()
  def user_b_id, do: Fixtures.user_jordan_id()
  def user_c_id, do: Fixtures.user_maya_id()
  def user_d_outsider_id, do: Fixtures.user_taylor_id()

  def member_ids, do: [user_a_id(), user_b_id(), user_c_id()]

  def participants do
    [
      %{
        "user_id" => user_a_id(),
        "role" => "initiator",
        "area" => "area_a",
        "available_after" => "19:00",
        "shared_preferences" => %{"open_to_new" => true},
        "private_constraints" => %{}
      },
      %{
        "user_id" => user_b_id(),
        "role" => "participant",
        "area" => "area_b",
        "available_after" => "19:30",
        "shared_preferences" => %{"quiet" => true},
        "private_constraints" => %{}
      },
      %{
        "user_id" => user_c_id(),
        "role" => "participant",
        "area" => "area_c",
        "available_after" => "19:00",
        "shared_preferences" => %{},
        # Private hard constraint. Never appears in shared copy.
        "private_constraints" => %{"max_price_band" => "$$"}
      }
    ]
  end

  def dinner_messages do
    [
      %{"user_id" => user_a_id(), "body" => "We should get dinner Friday."},
      %{
        "user_id" => user_b_id(),
        "body" => "I can go after 7:30, but somewhere quiet."
      },
      %{"user_id" => user_c_id(), "body" => "I might be down."}
    ]
  end

  def weak_hangout_messages do
    [
      %{"user_id" => user_a_id(), "body" => "Maybe we should hang out sometime."},
      %{"user_id" => user_b_id(), "body" => "Yeah, someday."}
    ]
  end

  def quiet_ordinary_messages do
    [
      %{"user_id" => user_a_id(), "body" => "Hey, how are you?"},
      %{"user_id" => user_b_id(), "body" => "Doing well. Long day."}
    ]
  end

  def venues do
    [
      %{
        "id" => "venue_1",
        "display_name" => "Quiet bistro fixture",
        "quiet" => true,
        "price_band" => "$$",
        "available_at" => "19:45",
        "travel_friction" => "balanced",
        "similar_to_past" => true
      },
      %{
        "id" => "venue_2",
        "display_name" => "Loud market hall fixture",
        "quiet" => false,
        "price_band" => "$",
        "available_at" => "19:30",
        "travel_friction" => "short",
        "similar_to_past" => false
      },
      %{
        "id" => "venue_3",
        "display_name" => "Quiet high-end fixture",
        "quiet" => true,
        "price_band" => "$$$",
        "available_at" => "20:00",
        "travel_friction" => "balanced",
        "similar_to_past" => true
      },
      %{
        "id" => "venue_4",
        "display_name" => "Quiet cafe fixture far away",
        "quiet" => true,
        "price_band" => "$",
        "available_at" => "19:40",
        "travel_friction" => "long",
        "similar_to_past" => false
      }
    ]
  end

  def time_window, do: %{"label" => "Friday after 7:30 PM", "earliest" => "19:30"}

  def dinner_scenario(opts \\ []) do
    %{
      conversation_id: Keyword.get(opts, :conversation_id, conversation_id()),
      member_ids: Keyword.get(opts, :member_ids, member_ids()),
      messages: Keyword.get(opts, :messages, dinner_messages()),
      participants: Keyword.get(opts, :participants, participants()),
      venues: Keyword.get(opts, :venues, venues()),
      time_window: Keyword.get(opts, :time_window, time_window()),
      corrections: Keyword.get(opts, :corrections, []),
      recent_suggestion_count: Keyword.get(opts, :recent_suggestion_count, 0),
      permission_revoked: Keyword.get(opts, :permission_revoked, false),
      python_proposal: Keyword.get(opts, :python_proposal, nil),
      idempotency_key: Keyword.get(opts, :idempotency_key, "dsi-phase1-dinner-1")
    }
  end
end
