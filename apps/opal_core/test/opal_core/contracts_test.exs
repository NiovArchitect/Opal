defmodule OpalCore.ContractsTest do
  use ExUnit.Case, async: true

  alias OpalCore.Contracts

  test "valid message example passes" do
    assert :ok = Contracts.validate_message(Contracts.load_example("message.valid"))
  end

  test "valid ai job request example passes" do
    assert :ok = Contracts.validate_ai_job_request(Contracts.load_example("ai_job_request.valid"))
  end

  test "valid ai job response example passes" do
    assert :ok =
             Contracts.validate_ai_job_response(Contracts.load_example("ai_job_response.valid"))
  end

  test "undeclared fields rejected on message" do
    msg = Contracts.load_example("message.valid") |> Map.put("agent_topology", "nope")
    assert {:error, {:undeclared_fields, ["agent_topology"]}} = Contracts.validate_message(msg)
  end

  test "unsupported schema version rejected" do
    msg = Contracts.load_example("message.valid") |> Map.put("schema_version", "9.0.0")
    assert {:error, {:unsupported_schema_version, "9.0.0"}} = Contracts.validate_message(msg)
  end

  test "oversized context rejected" do
    req = Contracts.load_example("ai_job_request.valid")

    req =
      Map.put(req, "context", [
        %{"type" => "message_body", "value" => String.duplicate("a", 1500), "source_id" => "1"},
        %{"type" => "message_body", "value" => String.duplicate("b", 600), "source_id" => "2"}
      ])

    assert {:error, :context_too_large} = Contracts.validate_ai_job_request(req)
  end

  test "too many context items rejected" do
    req = Contracts.load_example("ai_job_request.valid")

    items =
      for i <- 1..6 do
        %{"type" => "message_body", "value" => "x", "source_id" => "s#{i}"}
      end

    assert {:error, :context_too_many_items} =
             Contracts.validate_ai_job_request(Map.put(req, "context", items))
  end

  test "schemas load from monorepo packages/contracts" do
    schema = Contracts.load_schema("message")
    assert schema["title"] == "Message"
  end
end
