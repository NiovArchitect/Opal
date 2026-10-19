defmodule OpalCore.Repair18FixwaveCenterTest do
  @moduledoc """
  Repair #18 fix wave — Center / Oracle proofs:

  * RF-2 (FR-17-03): a bare category answer ("Food") is consumed by
    the planning flow that asked; the stale-entity re-engagement line
    is never emitted over an answer.
  * RF-3 (FR-08-01): an explicit clock time and named venue survive
    parse -> confirmation copy -> the confirmed plan record.
  * RF-4 (FR-13-03): "Where is dinner?" resolves against the user's
    real plan rows and answers from the row; genuinely absent plans
    keep the honest dead-end.
  """

  use OpalCore.DataCase, async: false

  alias OpalCore.Accounts.User
  alias OpalCore.Messages
  alias OpalCore.OpalConversations
  alias OpalCore.OpalIntent
  alias OpalCore.OpalResponse
  alias OpalCore.Oracle
  alias OpalCore.Repo
  alias OpalCore.SocialFlow
  alias OpalCore.SocialFlow.SharedPlan

  defp mk_user(display_name) do
    %User{}
    |> User.changeset(%{
      id: Ecto.UUID.generate(),
      handle: "fw-#{Ecto.UUID.generate()}",
      display_name: display_name
    })
    |> Repo.insert!()
  end

  defp send_center(user, body) do
    {:ok, {_c, _u, opal}} = OpalConversations.create_user_message(user.id, body)
    opal.body
  end

  # --- RF-3 -------------------------------------------------------------------

  test "RF-3: the intent carries the explicit clock and venue from the utterance" do
    {:ok, result} =
      OpalIntent.classify("Plan brunch at The Henry in Coronado on Sunday at 10 AM", %{})

    assert result.intent == :plan_create
    assert result.entities[:when_time] == "10 AM"
    assert result.entities[:venue] == "The Henry"
    assert result.entities[:venue_locality] == "Coronado"
  end

  test "RF-3: the confirmation quotes time and venue, and the confirmed plan row carries them" do
    user = mk_user("Fixwave Brunch")

    ask = send_center(user, "Plan brunch at The Henry in Coronado on Sunday at 10 AM")
    assert ask =~ "10 AM"
    assert ask =~ "The Henry"
    assert ask =~ "Coronado"
    refute ask =~ "7:30"

    {:ok, {_c, _u, done}} = OpalConversations.create_user_message(user.id, "yes")
    assert done.body =~ "Done"
    assert done.body =~ "10 AM"
    assert done.body =~ "The Henry"

    plan_id = done.metadata["intent"]["entities"]["plan_id"]
    assert is_binary(plan_id)
    plan = Repo.get!(SharedPlan, plan_id)
    assert plan.time_label =~ "10 AM"
    assert plan.time_label =~ "Sunday"
    assert plan.location == "The Henry"
  end

  # --- RF-2 -------------------------------------------------------------------

  for answer <- ["Food", "Outdoors", "Nightlife"] do
    test "RF-2: the category answer #{answer} is consumed, never re-engaged over" do
      user = mk_user("Fixwave Cat #{unquote(answer)}")
      _ = send_center(user, "I want to plan something fun for Maya's birthday this weekend")
      _ = send_center(user, "What kind of thing should we do for it?")

      reply = send_center(user, unquote(answer))
      refute reply =~ "You mentioned"
      refute reply =~ "earlier"
      assert String.contains?(String.downcase(reply), String.downcase(unquote(answer)))
    end
  end

  test "RF-2: the sticky nudge still serves an idle non-answer turn (W4-4c shape)" do
    user = mk_user("Fixwave Idle")

    ctx = %{
      user: %{id: user.id, display_name: "Fixwave Idle"},
      message: %{text: "just thinking"},
      social: %{frequent_contacts: [%{display_name: "Maya Friend"}]},
      conversation_history: [
        %{role: "user", body: "We talked about Maya's gift ideas"},
        %{role: "opal", body: "Tell me more"}
      ]
    }

    assert {:ok, text} =
             OpalResponse.generate(%{intent: :chat, confidence: :low, entities: %{}}, ctx)

    assert text =~ "You mentioned Maya"
  end

  test "RF-2: a bare category word never draws the sticky nudge at the emitter" do
    user = mk_user("Fixwave Emitter")

    ctx = %{
      user: %{id: user.id, display_name: "Fixwave Emitter"},
      message: %{text: "Food"},
      social: %{frequent_contacts: [%{display_name: "Maya Friend"}]},
      conversation_history: [
        %{role: "user", body: "We talked about Maya's gift ideas"},
        %{role: "opal", body: "Tell me more"}
      ]
    }

    assert {:ok, text} =
             OpalResponse.generate(%{intent: :chat, confidence: :low, entities: %{}}, ctx)

    refute text =~ "You mentioned"
  end

  # --- RF-4 -------------------------------------------------------------------

  defp dinner_plan(owner) do
    guest = mk_user("Quinn Guest")

    {:ok, direct} = Messages.ensure_direct_conversation(owner.id, guest.id)

    assert {:ok, plan, _participants} =
             SocialFlow.create_tentative_plan_from_conversation(
               direct.conversation_id,
               owner.id,
               %{
                 "title" => "Dinner Saturday",
                 "place" => "Juniper and Ivy",
                 "time_label" => "Saturday 7:30 PM"
               }
             )

    {plan, guest}
  end

  test "RF-4: 'Where is dinner?' answers from the real plan row" do
    owner = mk_user("Fixwave Host")
    {_plan, _guest} = dinner_plan(owner)

    assert {:ok, %{text: text}} = Oracle.answer(owner.id, "Where is dinner?")
    assert text =~ "Juniper and Ivy"
    refute text =~ "don't see a plan"
  end

  test "RF-4: 'Who's coming to dinner?' names the real attendee" do
    owner = mk_user("Host Person")
    {_plan, guest} = dinner_plan(owner)

    assert {:ok, %{text: text}} = Oracle.answer(owner.id, "Who's coming to dinner?")
    assert text =~ "Quinn"
    assert guest.display_name == "Quinn Guest"
  end

  test "RF-4: a genuinely absent plan keeps the honest dead-end" do
    owner = mk_user("Fixwave Host3")
    {_plan, _guest} = dinner_plan(owner)

    assert {:ok, %{text: text}} = Oracle.answer(owner.id, "Where is brunch?")
    assert text =~ "don't see a plan by that name"
    refute text =~ "Juniper"
  end

  test "RF-4: a named-venue question is never answered with a different plan's venue" do
    owner = mk_user("Fixwave Host4")
    {_plan, _guest} = dinner_plan(owner)

    # The named-venue question is not an Oracle plan question at all
    # (:not_oracle — it routes to venue lookup); if it ever is
    # answered, the answer must not borrow the dinner plan's venue.
    case Oracle.answer(owner.id, "Where is The Henry in Coronado?") do
      :not_oracle -> :ok
      {:ok, %{text: text}} -> refute text =~ "Juniper"
    end
  end
end
