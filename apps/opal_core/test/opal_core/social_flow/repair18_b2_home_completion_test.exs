defmodule OpalCore.SocialFlow.Repair18B2HomeCompletionTest do
  @moduledoc """
  Repair #18 (B2) — drive-level acceptance for plan completion at home:
  virtual guards, the join step, the food step state machine, per-person
  honesty (nobody can confirm for another), solo shape, and the
  physical-plan byte-shape guard (design §5, scenarios S1/S2/S3 at the
  unit layer; the live-stack replays live in shots/regression/cases/
  fr18-b2-*.case.mjs).
  """
  use OpalCore.DataCase, async: false

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Messaging.{Conversation, ConversationMember}
  alias OpalCore.OpalIntent
  alias OpalCore.Repo
  alias OpalCore.SocialFlow
  alias OpalCore.SocialFlow.{PlanCompletion, PlanParticipant, PlanReminder, SharedPlan}
  alias OpalCore.SocialFlow.Execution.FoodHandoff
  alias OpalCore.SocialFlow.FoodStep

  setup do
    ids = for _ <- 1..5, do: Ecto.UUID.generate()
    [a, b, c, d, outsider] = ids

    for {id, name} <- Enum.zip(ids, ["Alex", "Maya", "Jordan", "Priya", "Eve"]) do
      {:ok, _} =
        %User{}
        |> User.changeset(%{id: id, handle: "b2_" <> String.slice(id, 0, 8), display_name: name})
        |> Repo.insert()
    end

    {:ok, conv} =
      %Conversation{} |> Conversation.changeset(%{label: "b2-dinner"}) |> Repo.insert()

    for uid <- [a, b, c, d] do
      %ConversationMember{}
      |> ConversationMember.changeset(%{conversation_id: conv.id, user_id: uid})
      |> Repo.insert!()
    end

    {:ok, a: a, b: b, c: c, d: d, outsider: outsider, conversation_id: conv.id}
  end

  defp make_plan(creator, cid, attrs) do
    {:ok, plan, _} =
      SocialFlow.create_tentative_plan_from_conversation(
        cid,
        creator,
        Map.merge(
          %{"title" => "Plan", "time_label" => "Friday 7 PM"},
          attrs
        )
      )

    Repo.get!(SharedPlan, plan.id)
  end

  # Conversation creates already insert PlanParticipant rows for every
  # conversation member; this helper only tops up anyone missing.
  defp add_participants(plan, _creator, others) do
    for uid <- others do
      unless Repo.get_by(PlanParticipant, plan_id: plan.id, user_id: uid) do
        %PlanParticipant{}
        |> PlanParticipant.changeset(%{
          plan_id: plan.id,
          user_id: uid,
          role: "participant",
          response_state: "accepted"
        })
        |> Repo.insert!()
      end
    end

    Repo.get!(SharedPlan, plan.id)
  end

  defp steps(plan) do
    {:ok, %{steps: steps}} = PlanCompletion.drive(plan.id, plan.created_by_user_id)
    steps
  end

  defp step(steps, id), do: Enum.find(steps, &(&1["id"] == id))

  defp persisted_step(plan_id, id) do
    plan = Repo.get!(SharedPlan, plan_id)
    Enum.find(get_in(plan.alignment, ["completion", "steps"]) || [], &(&1["id"] == id))
  end

  # --- S3 guard: physical plans are byte-shape unchanged -----------------

  test "physical plan: no join/food steps, ride + restaurants behavior unchanged", %{
    a: a,
    conversation_id: cid
  } do
    plan =
      make_plan(a, cid, %{"title" => "Dinner at Nighthawk", "location" => "Nighthawk, Coronado"})

    s = steps(plan)
    ids = Enum.map(s, & &1["id"])
    refute "join" in ids
    refute "food" in ids
    assert "ride" in ids
    contract = SharedPlan.to_contract(Repo.get!(SharedPlan, plan.id))

    if contract["completion"] do
      cids = Enum.map(contract["completion"]["steps"], & &1["id"])
      refute "join" in cids
      refute "food" in cids
    end
  end

  # --- Virtual guards ------------------------------------------------------

  test "virtual plan: no Online Geoapify search, no ride, no directions", %{
    a: a,
    conversation_id: cid
  } do
    plan =
      make_plan(a, cid, %{
        "title" => "Zoom dinner",
        "plan_type" => "virtual",
        "food_at_home" => true
      })

    s = steps(plan)
    ids = Enum.map(s, & &1["id"])
    refute "ride" in ids
    refute "directions" in ids
    # Integration ruling (B1 A4 contract wins over B2's absent-step
    # shape): the restaurants step IS present for virtual plans,
    # carrying the explicit "skipped_virtual" status - and the safety
    # property below (no places search ever starts) is unchanged.
    restaurants_step = Enum.find(s, &(&1["id"] == "restaurants"))
    assert restaurants_step["status"] == "skipped_virtual"

    jobs =
      from(j in OpalCore.Center.ProviderActionJob,
        where: j.plan_id == ^plan.id and j.kind == "places_search"
      )
      |> Repo.all()

    assert jobs == [], "a virtual plan must never start a places search (geography 'Online')"
  end

  test "virtual plan with a venue-shaped name still gets no directions", %{
    a: a,
    conversation_id: cid
  } do
    plan =
      make_plan(a, cid, %{
        "title" => "Virtual dinner",
        "plan_type" => "virtual",
        "food_at_home" => true
      })

    plan
    |> SharedPlan.changeset(%{
      alignment:
        Map.put(plan.alignment, "venue", %{"name" => "Juniper and Ivy", "address" => "1 Main St"})
    })
    |> Repo.update!()

    s = steps(Repo.get!(SharedPlan, plan.id))
    refute step(s, "directions")
  end

  # --- Join step -----------------------------------------------------------

  test "join step: link_missing with no URL anywhere, then link_ready with host only", %{
    a: a,
    conversation_id: cid
  } do
    plan = make_plan(a, cid, %{"title" => "Video call", "plan_type" => "virtual"})
    join = step(steps(plan), "join")
    assert join["status"] == "link_missing"
    assert join["copy"] =~ "Add the meeting link"
    refute Map.has_key?(join, "url")
    refute Map.has_key?(join, "meeting_link")

    plan
    |> SharedPlan.changeset(%{meeting_link: "https://zoom.us/j/4242"})
    |> Repo.update!()

    join2 = step(steps(Repo.get!(SharedPlan, plan.id)), "join")
    assert join2["status"] == "link_ready"
    assert join2["host"] == "zoom.us"
    refute inspect(join2) =~ "j/4242"
  end

  # --- Food triggers --------------------------------------------------------

  test "explicit food signal -> composing with one recipient per participant", %{
    a: a,
    b: b,
    c: c,
    conversation_id: cid
  } do
    plan =
      make_plan(a, cid, %{
        "title" => "Virtual dinner - order in",
        "plan_type" => "virtual",
        "food_at_home" => true
      })
      |> add_participants(a, [b, c])

    food = step(steps(plan), "food")
    assert food["status"] == "composing"
    # one recipient per plan participant (all four conversation members
    # are participants on a conversation-born plan)
    assert length(food["recipients"]) == 4
    assert Enum.all?(food["recipients"], &(&1["handoff_state"] == "not_started"))
  end

  test "meal-shaped virtual plan gets ONE suggested ask; work plan gets none", %{
    a: a,
    conversation_id: cid
  } do
    dinner = make_plan(a, cid, %{"title" => "Virtual dinner Friday", "plan_type" => "virtual"})
    assert step(steps(dinner), "food")["status"] == "suggested"

    # ask-once: declining is terminal across re-drives
    {:ok, _, _} = SocialFlow.food_answer_ask(dinner.id, a, false)
    assert persisted_step(dinner.id, "food")["status"] == "declined"
    assert step(steps(Repo.get!(SharedPlan, dinner.id)), "food")["status"] == "declined"

    standup = make_plan(a, cid, %{"title" => "Zoom standup Tuesday", "plan_type" => "virtual"})
    refute step(steps(standup), "food")
  end

  test "question-form food signal starts suggested, accept promotes to composing", %{
    a: a,
    conversation_id: cid
  } do
    plan =
      make_plan(a, cid, %{
        "title" => "Game night online - sort food?",
        "plan_type" => "virtual",
        "food_at_home" => true,
        "food_question" => true
      })

    assert step(steps(plan), "food")["status"] == "suggested"
    {:ok, _, _} = SocialFlow.food_answer_ask(plan.id, a, true)
    assert persisted_step(plan.id, "food")["status"] == "composing"
  end

  # --- Compose / handoff / self-confirm state machine ----------------------

  test "full S1 leg: compose, per-person handoff, self-confirm only by owner, rollup attributed",
       %{
         a: a,
         b: b,
         c: c,
         d: d,
         conversation_id: cid
       } do
    plan =
      make_plan(a, cid, %{
        "title" => "Virtual dinner - order in from the same place",
        "plan_type" => "virtual",
        "food_at_home" => true
      })
      |> add_participants(a, [b, c, d])

    plan
    |> SharedPlan.changeset(%{
      start_at:
        DateTime.add(DateTime.utc_now(), 3 * 24 * 3600, :second)
        |> DateTime.truncate(:microsecond)
    })
    |> Repo.update!()

    _ = steps(plan)

    # households: b declares they are at the same place as a tonight
    {:ok, _, _} = SocialFlow.food_declare_household(plan.id, b, a)

    # items per person
    {:ok, _, _} = SocialFlow.food_add_items(plan.id, a, ["margherita pizza"])
    {:ok, _, _} = SocialFlow.food_add_items(plan.id, b, ["caesar salad"])
    {:ok, _, _} = SocialFlow.food_add_items(plan.id, c, ["sushi set"])
    {:ok, _, _} = SocialFlow.food_add_items(plan.id, d, ["ramen"])

    # organizer picks the restaurant + marks composed; reminders are born
    {:ok, _, _} =
      SocialFlow.food_select_restaurant(plan.id, a, %{
        "name" => "Juniper and Ivy",
        "website" => "https://example-restaurant.test/",
        "verified" => true
      })

    {:ok, composed, _} = SocialFlow.food_mark_composed(plan.id, a, 30)
    assert composed["status"] == "composed"

    food_reminders =
      from(r in PlanReminder, where: r.plan_id == ^plan.id)
      |> Repo.all()
      |> Enum.filter(&(get_in(&1.source_lineage, ["origin"]) == "food_order"))

    assert Enum.sort(Enum.map(food_reminders, & &1.owner_user_id)) == Enum.sort([a, b, c, d])

    reminder = Enum.find(food_reminders, &(&1.owner_user_id == a))

    assert reminder.visibility == "private"
    assert reminder.content_summary =~ "Time to place your"
    refute FoodStep.banned_claim?(reminder.content_summary)

    # non-organizer cannot pick the restaurant or mark composed
    assert {:error, :organizer_only} =
             SocialFlow.food_select_restaurant(plan.id, b, %{"name" => "X"})

    assert {:error, :organizer_only} = SocialFlow.food_mark_composed(plan.id, b)

    # handoff: b via restaurant site; c via own provider search; d no-rail
    {:ok, started_b} = SocialFlow.food_start_handoff(plan.id, b, %{})
    assert started_b["ordered"] == false
    assert started_b["provider_confirmed"] == false
    assert started_b["claim"] == "handoff_started_not_ordered"
    assert started_b["handoff_url"] == "https://example-restaurant.test/"

    {:ok, started_c} =
      SocialFlow.food_start_handoff(plan.id, c, %{"provider_choice" => "doordash"})

    assert started_c["target_kind"] == "provider_search"
    assert started_c["handoff_url"] =~ "search"
    refute started_c["handoff_url"] =~ "/store/juniper"

    mid = persisted_step(plan.id, "food")
    assert mid["status"] == "handed_off"

    # a return / re-drive promotes NOBODY
    _ = steps(Repo.get!(SharedPlan, plan.id))
    mid2 = persisted_step(plan.id, "food")
    states = Map.new(mid2["recipients"], &{&1["user_id"], &1["handoff_state"]})
    assert states[a] == "not_started"
    assert states[d] == "not_started"

    # self-confirm: each by their own account only
    {:ok, _, _} = SocialFlow.food_self_confirm(plan.id, b)
    {:ok, _, _} = SocialFlow.food_self_confirm(plan.id, c)
    {:ok, _, _} = SocialFlow.food_self_confirm(plan.id, a)

    # d: could not deliver, own alternate, then hands off + confirms
    {:ok, _, _} = SocialFlow.food_could_not_deliver(plan.id, d, "Sushi Place Down The Road")
    {:ok, _, _} = SocialFlow.food_self_confirm(plan.id, d)

    final = persisted_step(plan.id, "food")
    assert final["status"] == "self_confirmed"
    assert final["rollup"]["households_total"] == 3
    assert final["rollup"]["households_confirmed"] == 3
    assert final["rollup"]["label"] == "3 of 3 households confirmed their own orders"
    assert "Maya" in final["rollup"]["confirmed_by"]

    # contract privacy: no household keys, no alternate name, no addresses
    contract = SharedPlan.to_contract(Repo.get!(SharedPlan, plan.id))
    cfood = Enum.find(contract["completion"]["steps"], &(&1["id"] == "food"))
    assert cfood
    blob = inspect(cfood)
    refute blob =~ "household_key"
    refute blob =~ "Sushi Place Down The Road"
    refute blob =~ "home_address"
    refute blob =~ "delivery_address"
    for r <- cfood["recipients"], do: assert(r["alternate_restaurant"] == nil)
  end

  test "organizer CANNOT set another person's recipient state; outsider is denied", %{
    a: a,
    b: b,
    outsider: outsider,
    conversation_id: cid
  } do
    plan =
      make_plan(a, cid, %{
        "title" => "Virtual dinner - order in",
        "plan_type" => "virtual",
        "food_at_home" => true
      })
      |> add_participants(a, [b])

    _ = steps(plan)

    # There is no API shape for confirming for another: food_self_confirm
    # takes only the caller's id. The outsider (not a participant, not a
    # conversation member) is denied by the plan access gate entirely.
    assert {:error, _} = SocialFlow.food_self_confirm(plan.id, outsider)
    assert {:error, _} = SocialFlow.food_add_items(plan.id, outsider, ["x"])
    assert {:error, _} = SocialFlow.food_start_handoff(plan.id, outsider, %{})

    # b's state is untouched by a's own actions
    {:ok, _, _} = SocialFlow.food_self_confirm(plan.id, a)
    food = persisted_step(plan.id, "food")
    b_entry = Enum.find(food["recipients"], &(&1["user_id"] == b))
    assert b_entry["handoff_state"] == "not_started"
  end

  test "no-rail handoff: no website and no provider choice returns the honest no-rail fact", %{
    a: a,
    conversation_id: cid
  } do
    plan =
      make_plan(a, cid, %{
        "title" => "Virtual dinner - order in",
        "plan_type" => "virtual",
        "food_at_home" => true
      })

    _ = steps(plan)

    {:ok, _, _} =
      SocialFlow.food_select_restaurant(plan.id, a, %{
        "name" => "Tiny Corner Place",
        "phone" => "555-0100"
      })

    {:ok, result} = SocialFlow.food_start_handoff(plan.id, a, %{})
    assert result["state"] == "no_rail"
    assert result["handoff_url"] == nil
    assert result["no_rail_reason"] =~ "No ordering link for this restaurant"
    assert result["no_rail_reason"] =~ "555-0100"
    assert result["ordered"] == false

    # no handoff fact was recorded — state stays not_started
    food = persisted_step(plan.id, "food")
    assert hd(food["recipients"])["handoff_state"] == "not_started"
  end

  # --- Solo (S2) --------------------------------------------------------------

  test "solo at-home: one recipient, singular rollup, no households language", %{
    a: a
  } do
    # Solo plans are Center-born (owner-private, scope solo).
    {:ok, plan, _} =
      SocialFlow.create_tentative_plan_from_center(a, %{
        "title" => "Solo movie night at home - order in sushi",
        "time_label" => "Friday",
        "plan_type" => "virtual",
        "food_at_home" => true
      })

    plan = Repo.get!(SharedPlan, plan.id)

    food = step(steps(plan), "food")
    assert length(food["recipients"]) == 1

    assert food["rollup"]["label"] ==
             "Your order list is ready - you place the order with the provider"

    refute food["rollup"]["label"] =~ "households"
  end

  # --- Honesty: capability + banned strings -----------------------------------

  test "capability matrix declares handoff-only truth" do
    m = FoodHandoff.capability_matrix()
    assert m["direct_ordering_api"] == "none_connected"
    assert m["cart_prefill_supported"] == false
    assert m["claims_ordered_on_handoff"] == false
    assert m["payment_handled_by"] == "provider_only"
    assert m["address_handled_by"] == "provider_only"
    assert m["default_mode"] == "handoff"
  end

  test "no food-step output contains a banned claim or a confirmation-shaped field" do
    outputs = [
      FoodHandoff.prepare_handoff(%{
        "restaurant_name" => "X",
        "restaurant_website" => "https://x.test/"
      }),
      FoodHandoff.prepare_handoff(%{"restaurant_name" => "X"}),
      FoodHandoff.no_rail_copy("X", nil),
      FoodStep.rollup(FoodStep.new_recipients([Ecto.UUID.generate()]))
    ]

    blob = inspect(outputs)

    for banned <- FoodStep.banned_claim_strings() do
      refute String.contains?(String.downcase(blob), banned), "banned string present: #{banned}"
    end

    for field <- [
          "order_number",
          "delivery_status",
          "tracking",
          "\"eta\"",
          "provider_confirmed\" => true"
        ] do
      refute blob =~ field
    end

    assert FoodStep.banned_claim?("Your order is confirmed and on its way")
  end

  test "handoff start requires the recipient's own authorization flag" do
    {:ok, prep} =
      FoodHandoff.prepare_handoff(%{
        "restaurant_name" => "X",
        "restaurant_website" => "https://x.test/"
      })

    assert {:error, :user_authorization_required} = FoodHandoff.start_handoff(prep, [])
    assert {:ok, started} = FoodHandoff.start_handoff(prep, user_authorized: true)
    assert started["claim"] == "handoff_started_not_ordered"
  end

  # --- Intent -------------------------------------------------------------------

  test "intent: virtual dinner + order-in carries food_at_home; standup does not", %{} do
    ctx = %{social: %{frequent_contacts: [%{display_name: "Maya", user_id: "x"}]}}

    assert {:ok, intent} =
             OpalIntent.classify(
               "Virtual dinner with Maya this Friday at 7 - Zoom, and let us all order in from the same place",
               ctx
             )

    assert intent.entities.plan_type == "virtual"
    assert intent.entities.food_at_home == true
    assert intent.entities.food_question == false

    assert {:ok, q} =
             OpalIntent.classify(
               "Game night online with Maya and Jordan tomorrow - can Opal sort food for everyone at their own homes?",
               ctx
             )

    assert q.entities.plan_type == "virtual"
    assert q.entities.food_at_home == true
    assert q.entities.food_question == true

    assert {:ok, control} = OpalIntent.classify("Zoom standup with the team Tuesday", ctx)
    assert control.entities.plan_type == "virtual"
    refute Map.has_key?(control.entities, :food_at_home)
  end

  test "contract emits completion additively only when a record exists", %{
    a: a,
    conversation_id: cid
  } do
    plan = make_plan(a, cid, %{"title" => "Plain call", "plan_type" => "virtual"})
    refute Map.has_key?(SharedPlan.to_contract(plan), "completion")
    _ = steps(plan)
    contract = SharedPlan.to_contract(Repo.get!(SharedPlan, plan.id))
    assert is_list(contract["completion"]["steps"])
    assert Enum.find(contract["completion"]["steps"], &(&1["id"] == "join"))
  end
end
