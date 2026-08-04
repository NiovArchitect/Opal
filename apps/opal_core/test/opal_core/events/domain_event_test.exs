defmodule OpalCore.Events.DomainEventTest do
  use OpalCore.DataCase, async: true

  alias OpalCore.Events.DomainEvent
  alias OpalCore.Events.EventOutbox
  alias OpalCore.Events.Publisher
  alias OpalCore.Repo

  test "builds versioned envelope with topic family and partition key" do
    assert {:ok, env} =
             DomainEvent.build(%{
               event_type: "invitation.created",
               partition_key: "inv-1",
               aggregate_type: "relationship_invitation",
               aggregate_id: "inv-1",
               payload: %{invitation_id: "inv-1", no_auto_relationship: true}
             })

    assert env["event_type"] == "invitation.created"
    assert env["topic_family"] == "opal.invitation.events"
    assert env["partition_key"] == "inv-1"
    assert env["producer"] == "opal_core"
    assert env["event_version"] == 1
    assert is_binary(env["event_id"])
  end

  test "rejects forbidden payload keys" do
    assert_raise ArgumentError, fn ->
      DomainEvent.build(%{
        event_type: "invitation.created",
        partition_key: "inv-1",
        payload: %{phone: "+12025550101"}
      })
    end
  end

  test "publisher records outbox row" do
    assert {:ok, row} =
             Publisher.record(%{
               event_type: "relationship.accepted",
               partition_key: "rel-1",
               aggregate_type: "relationship_establishment",
               aggregate_id: "rel-1",
               payload: %{relationship_id: "rel-1", conversation_id: "c-1"}
             })

    loaded = Repo.get!(EventOutbox, row.id)
    assert loaded.status in ~w(pending publishing published)
    assert loaded.topic_family == "opal.relationship.events"
    assert loaded.envelope["event_type"] == "relationship.accepted"
  end
end

