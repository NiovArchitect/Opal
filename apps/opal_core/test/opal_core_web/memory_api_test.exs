defmodule OpalCoreWeb.MemoryApiTest do
  @moduledoc "Phase 7A — memory transparency list/delete + owner scoping."
  use OpalCoreWeb.ConnCase

  alias OpalCore.FixturesHelper
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.DurablePreferenceMemory
  alias OpalCore.SocialFlow.MemoryCandidate
  alias OpalCore.SocialFlow.PhoneVerification.Provider
  alias OpalCore.SocialFlow.RelationshipMemory

  @alex "+12025550101"
  @jordan "+12025550102"

  setup do
    FixturesHelper.seed!()
    previous = Application.get_env(:opal_core, :phone_verify_mode)
    Application.put_env(:opal_core, :phone_verify_mode, :synthetic_development)

    on_exit(fn ->
      if is_nil(previous) do
        Application.delete_env(:opal_core, :phone_verify_mode)
      else
        Application.put_env(:opal_core, :phone_verify_mode, previous)
      end
    end)

    :ok
  end

  defp activate(conn, phone, name, handle) do
    conn =
      post(conn, "/api/v1/product/activation/challenges", %{
        "otp_consent_accepted" => true,
        "phone" => phone,
        "device_label" => "#{handle}-web",
        "idempotency_key" => "mem-ch-#{handle}-#{System.unique_integer([:positive])}"
      })

    body = json_response(conn, 201)
    code = body["development_code"]
    challenge_id = body["challenge"]["id"]
    assert is_binary(code)
    assert Provider.synthetic_mode?()

    conn =
      post(conn, "/api/v1/product/activation/verify", %{
        "challenge_id" => challenge_id,
        "code" => code,
        "phone" => phone,
        "display_name" => name,
        "device_label" => "#{handle}-web",
        "handle_hint" => handle,
        "platform" => "web",
        "include_bearer" => true
      })

    body = json_response(conn, 200)
    {body["session"]["access_token"], body["user"]["id"]}
  end

  defp auth(conn, token), do: put_req_header(conn, "authorization", "Bearer #{token}")

  test "list returns own facts with plain labels; empty for stranger", %{conn: conn} do
    {token_a, user_a} = activate(conn, @alex, "Mem A", "mem_a")
    {token_b, _} = activate(build_conn(), @jordan, "Mem B", "mem_b")

    assert {:ok, _, :created} =
             DurablePreferenceMemory.remember_explicit(%{
               "owner_user_id" => user_a,
               "preference" => "taste:cuisine:italian"
             })

    assert {:ok, _, :created} =
             DurablePreferenceMemory.remember_explicit(%{
               "owner_user_id" => user_a,
               "preference" => "temporal:prefers:friday_evening"
             })

    assert {:ok, _, :created} =
             DurablePreferenceMemory.remember_explicit(%{
               "owner_user_id" => user_a,
               "preference" => "quiet restaurants"
             })

    conn = build_conn() |> auth(token_a) |> get("/api/v1/product/memory/facts")
    facts = json_response(conn, 200)["facts"]
    labels = Enum.map(facts, & &1["label"])

    assert "Prefers Italian food" in labels
    assert "Free Friday evenings" in labels
    assert "quiet restaurants" in labels
    refute Enum.any?(facts, &Map.has_key?(&1, "confidence"))

    # B sees none of A's facts
    conn = build_conn() |> auth(token_b) |> get("/api/v1/product/memory/facts")
    assert json_response(conn, 200)["facts"] == []
  end

  test "delete forgets fact in DB and cleans linked candidates", %{conn: conn} do
    {token_a, user_a} = activate(conn, @alex, "Mem Del", "mem_del")

    assert {:ok, mem, :created} =
             DurablePreferenceMemory.remember_explicit(%{
               "owner_user_id" => user_a,
               "preference" => "taste:cuisine:italian"
             })

    {:ok, cand} =
      %MemoryCandidate{}
      |> MemoryCandidate.changeset(%{
        owner_user_id: user_a,
        candidate_type: "preference",
        candidate_summary: "taste:cuisine:italian",
        value_key: "taste:cuisine:italian",
        status: "approved",
        promoted_memory_id: mem.id,
        memory_class: "preference",
        evidence_kind: "accepted_plan_pattern"
      })
      |> Repo.insert()

    {:ok, orphan_key} =
      %MemoryCandidate{}
      |> MemoryCandidate.changeset(%{
        owner_user_id: user_a,
        candidate_type: "preference",
        candidate_summary: "taste:cuisine:italian",
        value_key: "taste:cuisine:italian",
        status: "proposed",
        memory_class: "preference",
        evidence_kind: "inference"
      })
      |> Repo.insert()

    conn = build_conn() |> auth(token_a) |> delete("/api/v1/product/memory/facts/#{mem.id}")
    body = json_response(conn, 200)
    assert body["forgotten"] == true
    assert body["candidates_removed"] >= 2
    assert body["candidate_cleanup"] == "promoted_memory_id_and_value_key_match"

    # Real DB forget — not a hide
    reloaded = Repo.get!(RelationshipMemory, mem.id)
    assert reloaded.deletion_state == "forgotten"
    assert is_nil(Repo.get(MemoryCandidate, cand.id))
    assert is_nil(Repo.get(MemoryCandidate, orphan_key.id))
    assert DurablePreferenceMemory.list_for_owners([user_a]) == []

    conn = build_conn() |> auth(token_a) |> get("/api/v1/product/memory/facts")
    assert json_response(conn, 200)["facts"] == []
  end

  test "foreign fact delete → 404 and fact remains", %{conn: conn} do
    {_token_a, user_a} = activate(conn, @alex, "Mem Own", "mem_own")
    {token_b, _} = activate(build_conn(), @jordan, "Mem Other", "mem_other")

    assert {:ok, mem, :created} =
             DurablePreferenceMemory.remember_explicit(%{
               "owner_user_id" => user_a,
               "preference" => "quiet restaurants"
             })

    conn =
      build_conn()
      |> auth(token_b)
      |> delete("/api/v1/product/memory/facts/#{mem.id}")

    assert json_response(conn, 404)["error_code"] == "not_found"

    listed = DurablePreferenceMemory.list_for_owners([user_a])
    assert length(listed) == 1
    assert hd(listed).deletion_state == "active"
  end

  test "plain_label maps known keys and keeps unknown raw", %{conn: _conn} do
    assert DurablePreferenceMemory.plain_label("taste:cuisine:italian") == "Prefers Italian food"
    assert DurablePreferenceMemory.plain_label("temporal:prefers:friday_evening") ==
             "Free Friday evenings"
    assert DurablePreferenceMemory.plain_label("temporal:avoids:morning") == "Avoids Morning"
    assert DurablePreferenceMemory.plain_label("mystery:unknown:xyz") == "mystery:unknown:xyz"
    assert DurablePreferenceMemory.plain_label("quiet restaurants") == "quiet restaurants"
  end
end
