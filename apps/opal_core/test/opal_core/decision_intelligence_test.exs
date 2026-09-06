defmodule OpalCore.DecisionIntelligenceTest do
  use OpalCore.DataCase, async: true

  alias OpalCore.Accounts.User
  alias OpalCore.DecisionIntelligence
  alias OpalCore.DecisionIntelligence.DecisionContext
  alias OpalCore.Events.EventOutbox
  alias OpalCore.Repo

  setup do
    alex =
      %User{}
      |> User.changeset(%{handle: "di-alex-#{System.unique_integer([:positive])}", display_name: "Alex"})
      |> Repo.insert!()

    jordan =
      %User{}
      |> User.changeset(%{handle: "di-jordan-#{System.unique_integer([:positive])}", display_name: "Jordan"})
      |> Repo.insert!()

    %{alex: alex, jordan: jordan}
  end

  test "creates durable DecisionContext revision 1 with outbox event", %{alex: alex} do
    assert {:ok, %{context: ctx, evidences: evs}} =
             DecisionIntelligence.create_context(alex.id, %{
               "intent" => "date_ideas",
               "scope_type" => "dyad",
               "participant_ids" => [alex.id],
               "budget_context" => %{"max" => 80},
               "invalidation_conditions" => [
                 %{"type" => "budget_maximum", "version" => 1, "max" => 80}
               ],
               "evidence" => [
                 %{
                   "dimension" => "budget",
                   "claim" => %{"max" => 80},
                   "privacy_class" => "private_user",
                   "source_type" => "user",
                   "owner_user_id" => alex.id,
                   "constraint_kind" => "hard"
                 }
               ],
               "correlation_id" => "corr-1"
             })

    assert ctx.revision == 1
    assert ctx.intent == "date_ideas"
    assert ctx.scope_type == "dyad"
    assert length(evs) == 1

    outbox =
      Repo.one!(from o in EventOutbox, where: o.aggregate_id == ^ctx.id, order_by: [desc: o.inserted_at], limit: 1)

    assert outbox.event_type == "decision.created"
    assert outbox.topic_family == "opal.decision.events"
    assert outbox.partition_key == ctx.id
    assert outbox.envelope["payload"]["revision"] == 1
    refute Map.has_key?(outbox.envelope["payload"], "evidence")
  end

  test "correction increments revision and emits decision.revised", %{alex: alex} do
    {:ok, %{context: ctx}} =
      DecisionIntelligence.create_context(alex.id, %{"intent" => "nearby_now", "scope_type" => "solo"})

    assert {:ok, %{context: updated}} =
             DecisionIntelligence.apply_correction(ctx.id, alex.id, %{
               "operation" => "set_budget",
               "expected_revision" => 1,
               "budget_max" => 60
             })

    assert updated.revision == 2
    assert updated.budget_context["max"] == 60

    types =
      from(o in EventOutbox, where: o.aggregate_id == ^ctx.id, select: o.event_type)
      |> Repo.all()

    assert "decision.created" in types
    assert "decision.revised" in types
  end

  test "noop correction does not increment revision or emit event", %{alex: alex} do
    {:ok, %{context: ctx}} =
      DecisionIntelligence.create_context(alex.id, %{
        "intent" => "nearby_now",
        "budget_context" => %{"max" => 60}
      })

    before = Repo.aggregate(from(o in EventOutbox, where: o.aggregate_id == ^ctx.id), :count)

    assert {:ok, %{context: same}} =
             DecisionIntelligence.apply_correction(ctx.id, alex.id, %{
               "operation" => "set_budget",
               "expected_revision" => 1,
               "budget_max" => 60
             })

    assert same.revision == 1
    after_count = Repo.aggregate(from(o in EventOutbox, where: o.aggregate_id == ^ctx.id), :count)
    assert after_count == before
  end

  test "stale expected_revision is rejected", %{alex: alex} do
    {:ok, %{context: ctx}} =
      DecisionIntelligence.create_context(alex.id, %{"intent" => "weekend_getaway"})

    assert {:ok, %{context: _}} =
             DecisionIntelligence.apply_correction(ctx.id, alex.id, %{
               "operation" => "set_vibe",
               "expected_revision" => 1,
               "vibe" => "quiet"
             })

    assert {:error, :stale_decision_revision} =
             DecisionIntelligence.apply_correction(ctx.id, alex.id, %{
               "operation" => "set_vibe",
               "expected_revision" => 1,
               "vibe" => "loud"
             })
  end

  test "idempotent create returns same decision", %{alex: alex} do
    key = "idem-create-#{System.unique_integer([:positive])}"

    assert {:ok, %{context: a}} =
             DecisionIntelligence.create_context(alex.id, %{
               "intent" => "family_plans",
               "idempotency_key" => key
             })

    assert {:ok, %{context: b}} =
             DecisionIntelligence.create_context(alex.id, %{
               "intent" => "family_plans",
               "idempotency_key" => key
             })

    assert a.id == b.id
    assert a.revision == b.revision
  end

  test "private evidence does not leak to other participant", %{alex: alex, jordan: jordan} do
    assert {:ok, %{context: ctx}} =
             DecisionIntelligence.create_context(alex.id, %{
               "intent" => "date_ideas",
               "scope_type" => "dyad",
               "participant_ids" => [alex.id, jordan.id],
               "evidence" => [
                 %{
                   "dimension" => "budget",
                   "claim" => %{"max" => 40, "secret" => true},
                   "privacy_class" => "private_user",
                   "source_type" => "user",
                   "owner_user_id" => alex.id
                 },
                 %{
                   "dimension" => "vibe",
                   "claim" => %{"vibe" => "calm"},
                   "privacy_class" => "shared_group",
                   "source_type" => "user",
                   "owner_user_id" => alex.id
                 }
               ]
             })

    assert {:ok, %{evidences: alex_ev}} = DecisionIntelligence.get_context(ctx.id, alex.id)
    assert {:ok, %{evidences: jordan_ev}} = DecisionIntelligence.get_context(ctx.id, jordan.id)

    assert Enum.any?(alex_ev, &(&1.privacy_class == "private_user"))
    refute Enum.any?(jordan_ev, &(&1.privacy_class == "private_user"))
    assert Enum.any?(jordan_ev, &(&1.dimension == "vibe"))
  end

  test "forbidden for non-participant", %{alex: alex, jordan: jordan} do
    assert {:ok, %{context: ctx}} =
             DecisionIntelligence.create_context(alex.id, %{"intent" => "solo_night", "scope_type" => "solo"})

    assert {:error, :forbidden} = DecisionIntelligence.get_context(ctx.id, jordan.id)
  end

  test "failed evidence insert rolls back context (atomicity)", %{alex: alex} do
    assert {:error, _} =
             DecisionIntelligence.create_context(alex.id, %{
               "intent" => "date_ideas",
               "evidence" => [
                 %{
                   "dimension" => "budget",
                   "claim" => %{},
                   "privacy_class" => "not_a_real_class",
                   "source_type" => "user"
                 }
               ]
             })

    assert Repo.aggregate(DecisionContext, :count) == 0
    assert Repo.aggregate(EventOutbox, :count) == 0
  end

  test "invalidate emits decision.invalidated", %{alex: alex} do
    {:ok, %{context: ctx}} =
      DecisionIntelligence.create_context(alex.id, %{"intent" => "nearby_now"})

    assert {:ok, %{context: inv}} =
             DecisionIntelligence.invalidate(ctx.id, alex.id, %{"expected_revision" => 1})

    assert inv.status == "invalidated"
    assert inv.revision == 2

    assert Repo.exists?(
             from o in EventOutbox,
               where: o.aggregate_id == ^ctx.id and o.event_type == "decision.invalidated"
           )
  end

  test "decision.* topic family mapping" do
    assert OpalCore.Events.DomainEvent.topic_family("decision.created") == "opal.decision.events"
    assert OpalCore.Events.DomainEvent.topic_family("decision.revised") == "opal.decision.events"
  end
end
