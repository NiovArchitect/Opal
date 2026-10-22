defmodule OpalCoreWeb.MemoryApiTest do
  @moduledoc "Phase 7A — memory transparency list/delete + owner scoping."
  use OpalCoreWeb.ConnCase

  alias OpalCore.FixturesHelper
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.DurablePreferenceMemory
  alias OpalCore.SocialMemory.PersonMemory
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

  # Repair #24 (WS-5): manual memory mutations now require a live
  # step-up elevation (fresh phone code on the account's own
  # verified number). This helper performs the real step-up over
  # HTTP and returns the elevation token.
  defp step_up(token, phone) do
    conn =
      build_conn()
      |> auth(token)
      |> post("/api/v1/product/memory/step-up/challenges", %{
        "otp_consent_accepted" => true,
        "phone" => phone,
        "device_label" => "stepup-#{System.unique_integer([:positive])}",
        "idempotency_key" => "stepup-#{System.unique_integer([:positive])}"
      })

    body = json_response(conn, 201)

    conn =
      build_conn()
      |> auth(token)
      |> post("/api/v1/product/memory/step-up/verify", %{
        "challenge_id" => body["challenge"]["id"],
        "code" => body["development_code"],
        "phone" => phone
      })

    json_response(conn, 200)["step_up"]["elevation_token"]
  end

  defp elevated(token, elevation) do
    build_conn() |> auth(token) |> put_req_header("x-opal-step-up-elevation", elevation)
  end

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

    elevation = step_up(token_a, @alex)
    conn = elevated(token_a, elevation) |> delete("/api/v1/product/memory/facts/#{mem.id}")
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

    elevation_b = step_up(token_b, @jordan)

    conn =
      elevated(token_b, elevation_b)
      |> delete("/api/v1/product/memory/facts/#{mem.id}")

    assert json_response(conn, 404)["error_code"] == "not_found"

    listed = DurablePreferenceMemory.list_for_owners([user_a])
    assert length(listed) == 1
    assert hd(listed).deletion_state == "active"
  end

  # --- Repair #26 (B-17): PersonMemory.known_facts projections ---

  defp insert_person_memory(account_id, person_id, known_facts) do
    {:ok, row} =
      %PersonMemory{}
      |> PersonMemory.changeset(%{
        account_id: account_id,
        person_id: person_id,
        known_facts: known_facts
      })
      |> Repo.insert()

    row
  end

  test "list includes PersonMemory known_facts projections alongside durable facts", %{
    conn: conn
  } do
    {token_a, user_a} = activate(conn, @alex, "Mem PM", "mem_pm")
    person_id = Ecto.UUID.generate()

    assert {:ok, _, :created} =
             DurablePreferenceMemory.remember_explicit(%{
               "owner_user_id" => user_a,
               "preference" => "quiet restaurants"
             })

    row =
      insert_person_memory(user_a, person_id, %{
        "allergy" => %{
          "value" => "I'm allergic to peanuts",
          "provenance" => "stated",
          "learned_at" => "2026-10-22T00:00:00Z"
        },
        "birthday" => %{"value" => "My birthday is June 5", "provenance" => "stated"}
      })

    conn = build_conn() |> auth(token_a) |> get("/api/v1/product/memory/facts")
    facts = json_response(conn, 200)["facts"]

    # The durable-preference fact is undisturbed.
    assert Enum.any?(facts, &(&1["value"] == "quiet restaurants" and &1["source"] == nil))

    allergy = Enum.find(facts, &(&1["id"] == "pm:#{row.id}:allergy"))
    assert allergy["value"] == "I'm allergic to peanuts"
    assert allergy["label"] == "I'm allergic to peanuts"
    assert allergy["mapped"] == false
    assert allergy["source"] == "person_memory"
    assert allergy["person_id"] == person_id

    birthday = Enum.find(facts, &(&1["id"] == "pm:#{row.id}:birthday"))
    assert birthday["value"] == "My birthday is June 5"
  end

  test "delete pm fact removes the key from known_facts under step-up elevation", %{conn: conn} do
    {token_a, user_a} = activate(conn, @alex, "Mem PM Del", "mem_pm_del")
    person_id = Ecto.UUID.generate()

    row =
      insert_person_memory(user_a, person_id, %{
        "allergy" => %{"value" => "I'm allergic to peanuts", "provenance" => "stated"},
        "mornings" => %{"value" => "I hate mornings", "provenance" => "stated"}
      })

    pm_id = "pm:#{row.id}:allergy"

    # Without elevation: rejected (same gate as the durable path), key survives.
    conn = build_conn() |> auth(token_a) |> delete("/api/v1/product/memory/facts/#{pm_id}")
    assert json_response(conn, 403)["error_code"] == "step_up_required"
    assert Map.has_key?(Repo.get!(PersonMemory, row.id).known_facts, "allergy")

    elevation = step_up(token_a, @alex)
    conn = elevated(token_a, elevation) |> delete("/api/v1/product/memory/facts/#{pm_id}")
    body = json_response(conn, 200)
    assert body["forgotten"] == true
    assert body["fact"]["id"] == pm_id
    assert body["fact"]["value"] == "I'm allergic to peanuts"

    reloaded = Repo.get!(PersonMemory, row.id)
    refute Map.has_key?(reloaded.known_facts, "allergy")
    assert reloaded.known_facts["mornings"]["value"] == "I hate mornings"

    conn = build_conn() |> auth(token_a) |> get("/api/v1/product/memory/facts")
    facts = json_response(conn, 200)["facts"]
    refute Enum.any?(facts, &(&1["id"] == pm_id))
    assert Enum.any?(facts, &(&1["id"] == "pm:#{row.id}:mornings"))
  end

  test "another account sees nothing and cannot delete a pm fact", %{conn: conn} do
    {token_a, user_a} = activate(conn, @alex, "Mem PM Iso A", "mem_pm_iso_a")
    {token_b, _user_b} = activate(build_conn(), @jordan, "Mem PM Iso B", "mem_pm_iso_b")
    person_id = Ecto.UUID.generate()

    row =
      insert_person_memory(user_a, person_id, %{
        "allergy" => %{"value" => "I'm allergic to peanuts", "provenance" => "stated"}
      })

    pm_id = "pm:#{row.id}:allergy"

    # B's list: nothing of A's.
    conn = build_conn() |> auth(token_b) |> get("/api/v1/product/memory/facts")
    assert json_response(conn, 200)["facts"] == []

    # B's delete with B's own valid elevation: 404, A's fact remains.
    elevation_b = step_up(token_b, @jordan)
    conn = elevated(token_b, elevation_b) |> delete("/api/v1/product/memory/facts/#{pm_id}")
    assert json_response(conn, 404)["error_code"] == "not_found"
    assert Map.has_key?(Repo.get!(PersonMemory, row.id).known_facts, "allergy")

    # A still sees it.
    conn = build_conn() |> auth(token_a) |> get("/api/v1/product/memory/facts")
    assert Enum.any?(json_response(conn, 200)["facts"], &(&1["id"] == pm_id))
  end

  test "deleting a non-existent pm fact → 404", %{conn: conn} do
    {token_a, user_a} = activate(conn, @alex, "Mem PM 404", "mem_pm_404")
    person_id = Ecto.UUID.generate()
    elevation = step_up(token_a, @alex)

    # Non-existent row.
    ghost_id = "pm:#{Ecto.UUID.generate()}:allergy"
    conn = elevated(token_a, elevation) |> delete("/api/v1/product/memory/facts/#{ghost_id}")
    assert json_response(conn, 404)["error_code"] == "not_found"

    # Existing row, non-existent key.
    row =
      insert_person_memory(user_a, person_id, %{
        "birthday" => %{"value" => "My birthday is June 5", "provenance" => "stated"}
      })

    missing_key_id = "pm:#{row.id}:allergy"

    conn =
      elevated(token_a, elevation) |> delete("/api/v1/product/memory/facts/#{missing_key_id}")

    assert json_response(conn, 404)["error_code"] == "not_found"
    assert Map.has_key?(Repo.get!(PersonMemory, row.id).known_facts, "birthday")

    # Malformed pm id: 404, not a crash.
    conn = elevated(token_a, elevation) |> delete("/api/v1/product/memory/facts/pm:not-a-uuid:x")
    assert json_response(conn, 404)["error_code"] == "not_found"
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
