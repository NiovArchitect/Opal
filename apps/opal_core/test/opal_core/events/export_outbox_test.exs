defmodule OpalCore.Events.ExportOutboxTest do
  use OpalCore.DataCase, async: false

  import Ecto.Query

  alias OpalCore.Events.EventOutbox
  alias OpalCore.Repo
  alias Mix.Tasks.Opal.ExportOutbox

  setup do
    System.delete_env("OPAL_FOUNDATION_INGRESS_URL")

    on_exit(fn ->
      System.delete_env("OPAL_FOUNDATION_INGRESS_URL")
    end)

    :ok
  end

  defp insert_pending!(attrs) do
    {:ok, envelope} = OpalCore.Events.DomainEvent.build(attrs)
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    # Insert pending without scheduling Oban (inline Oban would mark published).
    %EventOutbox{}
    |> EventOutbox.changeset(%{
      event_id: envelope["event_id"],
      event_type: envelope["event_type"],
      event_version: envelope["event_version"],
      aggregate_type: envelope["aggregate_type"],
      aggregate_id: envelope["aggregate_id"],
      partition_key: envelope["partition_key"],
      topic_family: envelope["topic_family"],
      privacy_class: envelope["privacy_class"],
      purpose: envelope["purpose"],
      envelope: envelope,
      status: "pending",
      available_at: now
    })
    |> Repo.insert!()
  end

  defp seed_events! do
    inv =
      insert_pending!(%{
        event_type: "invitation.accepted",
        partition_key: "inv-exp-1",
        aggregate_type: "relationship_invitation",
        aggregate_id: "inv-exp-1",
        payload: %{invitation_id: "inv-exp-1", relationship_id: "rel-exp-1"}
      })

    rel =
      insert_pending!(%{
        event_type: "relationship.accepted",
        partition_key: "rel-exp-1",
        aggregate_type: "relationship_establishment",
        aggregate_id: "rel-exp-1",
        payload: %{relationship_id: "rel-exp-1", conversation_id: "c-exp-1"}
      })

    other =
      insert_pending!(%{
        event_type: "invitation.created",
        partition_key: "inv-exp-2",
        aggregate_type: "relationship_invitation",
        aggregate_id: "inv-exp-2",
        payload: %{invitation_id: "inv-exp-2", no_auto_relationship: true}
      })

    %{inv: inv, rel: rel, other: other}
  end

  test "refuses without confirm flag" do
    System.put_env("OPAL_FOUNDATION_INGRESS_URL", "http://127.0.0.1:4100")

    assert catch_exit(ExportOutbox.run([])) == {:shutdown, 1}
  end

  test "refuses when foundation URL unset even with confirm" do
    assert catch_exit(ExportOutbox.run(["--confirm-development-bridge", "--dry-run"])) ==
             {:shutdown, 1}
  end

  test "refuses non-allowlisted event type filter" do
    System.put_env("OPAL_FOUNDATION_INGRESS_URL", "http://127.0.0.1:4100")

    assert catch_exit(
             ExportOutbox.run([
               "--confirm-development-bridge",
               "--dry-run",
               "--event-type",
               "message.accepted"
             ])
           ) == {:shutdown, 1}
  end

  test "refuses excessive limit" do
    System.put_env("OPAL_FOUNDATION_INGRESS_URL", "http://127.0.0.1:4100")

    assert catch_exit(
             ExportOutbox.run([
               "--confirm-development-bridge",
               "--dry-run",
               "--limit",
               "999"
             ])
           ) == {:shutdown, 1}
  end

  test "dry-run changes no state and writes no file" do
    System.put_env("OPAL_FOUNDATION_INGRESS_URL", "http://127.0.0.1:4100")
    %{inv: inv} = seed_events!()

    path =
      Path.join(System.tmp_dir!(), "opal_export_dry_#{System.unique_integer([:positive])}.json")

    File.rm(path)

    before =
      from(o in EventOutbox, select: {o.id, o.status, o.attempts})
      |> Repo.all()
      |> Map.new(fn {id, s, a} -> {id, {s, a}} end)

    ExportOutbox.run([
      "--confirm-development-bridge",
      "--dry-run",
      "--path",
      path,
      "--limit",
      "25"
    ])

    after_rows =
      from(o in EventOutbox, select: {o.id, o.status, o.attempts})
      |> Repo.all()
      |> Map.new(fn {id, s, a} -> {id, {s, a}} end)

    assert before == after_rows
    refute File.exists?(path)

    reloaded = Repo.get!(EventOutbox, inv.id)
    assert reloaded.status == inv.status
    assert reloaded.attempts == inv.attempts
  end

  test "export writes only allowlisted types and respects limit" do
    System.put_env("OPAL_FOUNDATION_INGRESS_URL", "http://127.0.0.1:4100")
    seed_events!()
    path = Path.join(System.tmp_dir!(), "opal_export_#{System.unique_integer([:positive])}.json")

    ExportOutbox.run([
      "--confirm-development-bridge",
      "--path",
      path,
      "--limit",
      "1",
      "--event-type",
      "invitation.accepted"
    ])

    assert File.exists?(path)
    data = path |> File.read!() |> Jason.decode!()
    assert data["count"] == 1
    assert length(data["envelopes"]) == 1
    assert hd(data["envelopes"])["event_type"] == "invitation.accepted"
    File.rm(path)
  end

  test "event-type filter enforced for relationship.accepted only" do
    System.put_env("OPAL_FOUNDATION_INGRESS_URL", "http://127.0.0.1:4100")
    seed_events!()

    path =
      Path.join(System.tmp_dir!(), "opal_export_rel_#{System.unique_integer([:positive])}.json")

    ExportOutbox.run([
      "--confirm-development-bridge",
      "--path",
      path,
      "--event-type",
      "relationship.accepted",
      "--limit",
      "25"
    ])

    data = path |> File.read!() |> Jason.decode!()
    assert data["count"] >= 1
    assert Enum.all?(data["envelopes"], &(&1["event_type"] == "relationship.accepted"))
    File.rm(path)
  end
end
