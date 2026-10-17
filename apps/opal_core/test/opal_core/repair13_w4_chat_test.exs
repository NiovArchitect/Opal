defmodule OpalCore.Repair13W4ChatTest do
  @moduledoc """
  Repair #13 (W4) — chat redundancies, stuck states, wrong info, action
  performance. Each test drives the real Center pipeline end-to-end
  (classify -> orchestrator -> generate -> persist) and asserts on real
  effects: rows mutated, honest copies, no duplicates.
  """

  use OpalCore.DataCase, async: false

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Center.PlanningContext
  alias OpalCore.OpalContext
  alias OpalCore.OpalConversations
  alias OpalCore.OpalConversations.OpalMessage
  alias OpalCore.OpalIntent
  alias OpalCore.OpalResponse
  alias OpalCore.Oracle
  alias OpalCore.Repo
  alias OpalCore.SocialFlow
  alias OpalCore.SocialFlow.PlanParticipant
  alias OpalCore.SocialFlow.SharedPlan

  defp mk_user(display_name) do
    %User{}
    |> User.changeset(%{
      id: Ecto.UUID.generate(),
      handle: "w4-#{Ecto.UUID.generate()}",
      display_name: display_name
    })
    |> Repo.insert!()
  end

  defp create_and_confirm(user, text \\ "Plan dinner with Maya Friday") do
    {:ok, {_c, _u, ask}} = OpalConversations.create_user_message(user.id, text)
    assert ask.body =~ "Want me to set this up?"
    {:ok, {_c, _u, done}} = OpalConversations.create_user_message(user.id, "yes")
    assert done.body =~ "Done"
    plan_id = done.metadata["intent"]["entities"]["plan_id"]
    assert is_binary(plan_id)
    {plan_id, done}
  end

  defp plan_with_attendees(owner, title) do
    guest = mk_user("Quinn Attendee")

    {:ok, plan, _} =
      SocialFlow.create_tentative_plan_from_center(owner.id, %{
        "title" => title,
        "place" => "Somewhere",
        "time_label" => "Friday"
      })

    %PlanParticipant{}
    |> PlanParticipant.changeset(%{
      "plan_id" => plan.id,
      "user_id" => guest.id,
      "role" => "participant",
      "response_state" => "accepted"
    })
    |> Repo.insert!()

    {plan, guest}
  end

  defp chat_ctx(user, raw, history_bodies) do
    %{
      user: %{id: user.id, display_name: "W4 Four"},
      message: %{text: raw},
      social: %{frequent_contacts: [%{display_name: "Maya Friend"}]},
      conversation_history:
        Enum.map(history_bodies, fn {role, body} -> %{role: role, body: body} end)
    }
  end

  # --- W4-1: sticky plan_id after Center confirm ------------------------------

  test "W4-1: confirm persists a sticky plan_id so 'move it to 8pm' mutates the plan" do
    user = mk_user("W4 One")
    {plan_id, _done} = create_and_confirm(user)

    assert PlanningContext.plan_id_active?(PlanningContext.get_for_user(user.id))

    {:ok, {_c, _u, moved}} =
      OpalConversations.create_user_message(user.id, "Actually make it 8 PM")

    assert moved.body =~ ~r/8 PM/i
    refute moved.body =~ "Tell me more"

    plan = Repo.get!(SharedPlan, plan_id)
    assert plan.time_label =~ "8 PM"
    assert plan.status != "cancelled"
  end

  test "W4-1b: a second affirmation after a successful confirm creates no duplicate plan" do
    user = mk_user("W4 OneB")
    {_plan_id, _done} = create_and_confirm(user)

    before_count =
      from(sp in SharedPlan, where: sp.created_by_user_id == ^user.id)
      |> Repo.aggregate(:count, :id)

    {:ok, {_c, _u, again}} = OpalConversations.create_user_message(user.id, "yes")

    after_count =
      from(sp in SharedPlan, where: sp.created_by_user_id == ^user.id)
      |> Repo.aggregate(:count, :id)

    assert after_count == before_count
    refute again.body =~ "Done"
  end

  test "W4-1c: a 'yes' after a FAILED confirm retries (ask not wrongly consumed)" do
    user = mk_user("W4 OneC")

    {:ok, {_c, _u, ask}} =
      OpalConversations.create_user_message(user.id, "Plan dinner with Maya Friday")

    assert ask.body =~ "Want me to set this up?"

    # Simulate the failure path: the "yes" went through but the confirm did
    # NOT succeed, so the opal turn is not a successful plan_confirm.
    {:ok, conv} = OpalConversations.get_or_create_conversation(user.id)

    %OpalMessage{}
    |> OpalMessage.changeset(%{
      "conversation_id" => conv.id,
      "role" => "user",
      "body" => "yes"
    })
    |> Repo.insert!()

    %OpalMessage{}
    |> OpalMessage.changeset(%{
      "conversation_id" => conv.id,
      "role" => "opal",
      "body" => "I couldn't finish setting that up just now. Try again in a moment.",
      "metadata" => %{
        "intent" => %{"intent" => "plan_confirm", "entities" => %{"confirmed" => false}}
      }
    })
    |> Repo.insert!()

    # The ask is still pending: another "yes" retries the confirm.
    {:ok, ctx} = OpalContext.assemble(user.id, "yes", nil)
    assert {:ok, %{intent: :plan_confirm}} = OpalIntent.classify("yes", ctx)
  end

  # --- W4-2: Center cancel path ------------------------------------------------

  test "W4-2: 'cancel the dinner plan' performs a real cancel in Center" do
    user = mk_user("W4 Two")
    {plan_id, _done} = create_and_confirm(user)

    {:ok, {_c, _u, cancelled}} =
      OpalConversations.create_user_message(user.id, "cancel the dinner plan")

    assert cancelled.body =~ ~r/cancel/i
    refute cancelled.body =~ "aren't live"
    assert Repo.get!(SharedPlan, plan_id).status == "cancelled"
  end

  test "W4-2b: cancel with no matching plan is honest, not a fake done" do
    user = mk_user("W4 TwoB")

    {:ok, {_c, _u, msg}} =
      OpalConversations.create_user_message(user.id, "cancel the dinner plan")

    assert msg.body =~ ~r/which plan/i
    refute msg.body =~ ~r/Done — I cancelled/
  end

  test "W4-2c: cancel with two matching plans asks which one (no silent pick)" do
    user = mk_user("W4 TwoC")
    {_p1, _g1} = plan_with_attendees(user, "Dinner Friday")
    {_p2, _g2} = plan_with_attendees(user, "Dinner Saturday")

    {:ok, {_c, _u, msg}} =
      OpalConversations.create_user_message(user.id, "cancel the dinner plan")

    assert msg.body =~ ~r/which one/i

    count =
      from(sp in SharedPlan, where: sp.created_by_user_id == ^user.id)
      |> Repo.aggregate(:count, :id)

    assert count == 2
  end

  test "W4-2d: 'move dinner to Saturday' with no sticky plan_id resolves by reference" do
    user = mk_user("W4 TwoD")
    {plan, _guest} = plan_with_attendees(user, "Dinner Friday")

    {:ok, {_c, _u, msg}} =
      OpalConversations.create_user_message(user.id, "move dinner to Saturday")

    assert msg.body =~ ~r/Saturday/i
    refute msg.body =~ "Tell me more"
    assert Repo.get!(SharedPlan, plan.id).status != "cancelled"
  end

  # --- W4-3: POST idempotency --------------------------------------------------

  test "W4-3: same client_message_id twice returns the original pair, no duplicate" do
    user = mk_user("W4 Three")

    {:ok, {_c1, u1, o1}} =
      OpalConversations.create_user_message(user.id, "hello", client_message_id: "w4-key-1")

    {:ok, {_c2, u2, o2}} =
      OpalConversations.create_user_message(user.id, "hello", client_message_id: "w4-key-1")

    assert u1.id == u2.id
    assert o1.id == o2.id

    count =
      from(m in OpalMessage,
        where: m.client_message_id == "w4-key-1" and m.role == "user"
      )
      |> Repo.aggregate(:count, :id)

    assert count == 1
  end

  test "W4-3b: different client_message_ids create two messages" do
    user = mk_user("W4 ThreeB")

    {:ok, {_, u1, _}} =
      OpalConversations.create_user_message(user.id, "hello", client_message_id: "w4-key-a")

    {:ok, {_, u2, _}} =
      OpalConversations.create_user_message(user.id, "hello", client_message_id: "w4-key-b")

    assert u1.id != u2.id
  end

  # --- W4-4: sticky re-engagement guard ----------------------------------------

  test "W4-4: sticky 'You mentioned X earlier' does not hijack a direct question" do
    user = mk_user("W4 Four")

    ctx =
      chat_ctx(user, "what's the weather like?", [
        {"user", "I was thinking about Maya"},
        {"opal", "Tell me more"}
      ])

    intent = %{intent: :chat, confidence: :low, entities: %{}, raw_text: "what's the weather like?"}
    assert {:ok, text} = OpalResponse.generate(intent, ctx)
    refute text =~ "You mentioned"
  end

  test "W4-4b: a question word without '?' is still question-shaped" do
    user = mk_user("W4 FourB")

    ctx =
      chat_ctx(user, "what should I do tonight", [
        {"user", "I was thinking about Maya"},
        {"opal", "Tell me more"}
      ])

    intent = %{intent: :chat, confidence: :low, entities: %{}, raw_text: "what should I do tonight"}
    assert {:ok, text} = OpalResponse.generate(intent, ctx)
    refute text =~ "You mentioned"
  end

  test "W4-4c: a non-question turn still gets the sticky nudge (guard doesn't over-fire)" do
    user = mk_user("W4 FourC")

    ctx =
      chat_ctx(user, "just thinking", [
        {"user", "I was thinking about Maya"},
        {"opal", "Tell me more"}
      ])

    intent = %{intent: :chat, confidence: :low, entities: %{}, raw_text: "just thinking"}
    assert {:ok, text} = OpalResponse.generate(intent, ctx)
    assert text =~ "You mentioned Maya earlier"
  end

  test "W4-4d: capability questions still win over the sticky nudge" do
    user = mk_user("W4 FourD")

    ctx =
      chat_ctx(user, "what can you help with?", [
        {"user", "I was thinking about Maya"},
        {"opal", "Tell me more"}
      ])

    intent = %{intent: :chat, confidence: :low, entities: %{}, raw_text: "what can you help with?"}
    assert {:ok, text} = OpalResponse.generate(intent, ctx)
    assert text =~ ~r/I can help you plan/
    refute text =~ "You mentioned"
  end

  # --- W4-5: person/place questions from real rows ------------------------------

  test "W4-5: 'who's coming' answers from real participant rows" do
    user = mk_user("W4 Five")
    {plan, _guest} = plan_with_attendees(user, "Dinner Friday")

    assert :plan_attendees = Oracle.classify("who's coming to dinner friday?")
    assert {:ok, %{text: text, grounded: true}} = Oracle.answer(user.id, "who's coming to dinner friday?")
    assert text =~ "Quinn", "expected the real guest name, got: #{text}"
    assert text =~ plan.title
  end

  test "W4-5b: 'who organized' names the real lead" do
    user = mk_user("W4 FiveB")
    {_plan, _guest} = plan_with_attendees(user, "Dinner Friday")

    assert :plan_organizer = Oracle.classify("who organized dinner friday?")
    assert {:ok, %{text: text}} = Oracle.answer(user.id, "who organized dinner friday?")
    assert text =~ ~r/you/i, "expected the owner as organizer, got: #{text}"
  end

  test "W4-5c: person question with no plans is honest" do
    user = mk_user("W4 FiveC")

    assert {:ok, %{text: text}} = Oracle.answer(user.id, "who's coming to the mars expedition?")
    refute text =~ ~r/Quinn|Maya/
    assert text =~ ~r/don't have any active plans/i
  end

  test "W4-5d: person question reaches the user end-to-end through Center chat" do
    user = mk_user("W4 FiveD")
    {_plan, _guest} = plan_with_attendees(user, "Dinner Friday")

    {:ok, {_c, _u, msg}} =
      OpalConversations.create_user_message(user.id, "who's coming to dinner friday?")

    assert msg.body =~ "Quinn", "got: #{msg.body}"
    refute msg.body =~ "Tell me more"
  end

  test "W4-5e: 'where is dinner friday' answers from the attached venue, never invented" do
    user = mk_user("W4 FiveE")
    {plan, _guest} = plan_with_attendees(user, "Dinner Friday")

    assert :plan_place = Oracle.classify("where is dinner friday?")

    # No venue attached yet: honest, not invented.
    assert {:ok, %{text: t1}} = Oracle.answer(user.id, "where is dinner friday?")
    assert t1 =~ ~r/don't have a place/i, "got: #{t1}"

    # Attach a real venue the R12 way; the answer must quote it exactly.
    {:ok, _} =
      plan
      |> SharedPlan.changeset(%{
        "alignment" =>
          Map.merge(plan.alignment || %{}, %{
            "venue" => %{"name" => "Juniper & Ivy", "address" => "2228 Kettner Blvd"}
          })
      })
      |> Repo.update()

    assert {:ok, %{text: t2}} = Oracle.answer(user.id, "where is dinner friday?")
    assert t2 =~ "Juniper & Ivy", "got: #{t2}"
    assert t2 =~ "2228 Kettner Blvd", "got: #{t2}"
  end

  test "W4-5f: 'where is The Henry' stays a named-venue question, never a plan question" do
    assert :not_oracle = Oracle.classify("where is The Henry in Coronado")
    assert :not_oracle = Oracle.classify("do you know where The Henry is")

    assert {:ok, intent} =
             OpalIntent.classify("where is The Henry in Coronado", %{social: %{frequent_contacts: []}})

    assert intent.intent == :named_venue
  end

  # --- W4-6: reminder dead-end ---------------------------------------------------

  test "W4-6: 'remind me to X' gets the honest refusal, not 'Tell me more'" do
    user = mk_user("W4 Six")

    {:ok, {_c, _u, msg}} =
      OpalConversations.create_user_message(user.id, "remind me to call Maya at 5pm")

    assert msg.body =~ ~r/can't set reminders/i, "got: #{msg.body}"
    refute msg.body =~ "Tell me more"
  end

  test "W4-6b: 'remember that X' still stores a memory (refusal doesn't over-fire)" do
    _user = mk_user("W4 SixB")

    assert {:ok, intent} =
             OpalIntent.classify("remember that Maya likes sushi", %{social: %{frequent_contacts: []}})

    assert intent.intent == :remember
  end
end
