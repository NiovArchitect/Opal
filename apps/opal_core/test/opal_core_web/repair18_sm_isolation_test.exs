defmodule OpalCoreWeb.Repair18SmIsolationTest do
  @moduledoc """
  Repair #18 SM scoped build - W-GAP-32 SCOPED: the permanent
  TWO-ACCOUNT ISOLATION PROOF SUITE for the personal-memory capsule
  class (SM-ISO-01 / SM-ISO-02 for this class).

  Law proven here, on synthetic accounts only: account B can never
  read account A's capsules through ANY path -

  - the HTTP API (including the raw response body - no summary, no
    provenance, no count derived from A's data, in any form,
    including aggregate),
  - the mediated facade (strict and browse forms),
  - the scoped-context assembly, AND the literal LLM prompt payload
    the PromptBuilder emits.

  Positive controls ride along in every leg: B's own capsules DO
  come back to B through the same path, so an empty-because-broken
  path cannot pass as isolation.
  """
  use OpalCoreWeb.ConnCase

  alias OpalCore.FixturesHelper
  alias OpalCore.Intelligence.PromptBuilder
  alias OpalCore.MemoryWallet.{CapsuleRead, ScopedContext}
  alias OpalCore.SocialFlow.DurablePreferenceMemory
  alias OpalCore.SocialFlow.PhoneVerification.Provider
  alias OpalCore.SocialMemory

  @alex "+12025550201"
  @jordan "+12025550202"

  @a_capsule "A private mango fact ZX1"
  @a_fragment "A private durian preference ZX2"
  @b_capsule "B own kiwi fact ZX3"

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
        "idempotency_key" => "sm-ch-#{handle}-#{System.unique_integer([:positive])}"
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

  # Seed the store with A's data (a new capsule, a durable fragment,
  # and a relationship-scoped capsule) and B's own capsule. A's data
  # is IN THE STORE for every assertion below.
  defp seed_store!(conn) do
    {token_a, user_a} = activate(conn, @alex, "Iso A", "iso_a")
    {token_b, user_b} = activate(build_conn(), @jordan, "Iso B", "iso_b")

    elevation_a = step_up(token_a, @alex)

    conn_a =
      build_conn() |> auth(token_a) |> put_req_header("x-opal-step-up-elevation", elevation_a)

    created =
      post(conn_a, "/api/v1/product/memory-wallet/capsules", %{"summary" => @a_capsule})

    a_capsule_id = json_response(created, 201)["capsule"]["id"]
    assert is_binary(a_capsule_id)

    assert {:ok, _, :created} =
             DurablePreferenceMemory.remember_explicit(%{
               "owner_user_id" => user_a,
               "preference" => @a_fragment
             })

    assert {:ok, scoped} =
             CapsuleRead.remember(user_a, %{
               "summary" => "A scoped pomelo fact ZX4",
               "scope_kind" => "relationship",
               "scope_id" => user_b
             })

    elevation_b = step_up(token_b, @jordan)

    conn_b =
      build_conn() |> auth(token_b) |> put_req_header("x-opal-step-up-elevation", elevation_b)

    created_b =
      post(conn_b, "/api/v1/product/memory-wallet/capsules", %{"summary" => @b_capsule})

    assert json_response(created_b, 201)["capsule"]["summary"] == @b_capsule

    %{
      token_a: token_a,
      user_a: user_a,
      token_b: token_b,
      user_b: user_b,
      elevation_a: elevation_a,
      elevation_b: elevation_b,
      a_capsule_id: a_capsule_id,
      a_scoped_id: scoped.id
    }
  end

  test "API path - B's wallet response contains none of A's capsules, in any form", %{conn: conn} do
    s = seed_store!(conn)

    conn_b = build_conn() |> auth(s.token_b) |> get("/api/v1/product/memory-wallet")
    body = json_response(conn_b, 200)
    raw = conn_b.resp_body

    # Positive control: B's own capsule IS there, through this path.
    summaries = Enum.map(body["capsules"], & &1["summary"])
    assert @b_capsule in summaries
    # A's capsules: no summary, no fragment text, no id, no count.
    refute @a_capsule in summaries

    for needle <- [@a_capsule, @a_fragment, "ZX4", s.a_capsule_id, s.a_scoped_id] do
      refute String.contains?(raw, needle),
             "A-derived content leaked into B's API body: #{needle}"
    end

    assert body["capsule_count"] == 1
    assert body["wallet"]["owner_user_id"] == s.user_b

    # And A reads A's own data back through the same path.
    conn_a = build_conn() |> auth(s.token_a) |> get("/api/v1/product/memory-wallet")
    a_summaries = Enum.map(json_response(conn_a, 200)["capsules"], & &1["summary"])
    assert @a_capsule in a_summaries
    assert @a_fragment in a_summaries
  end

  test "facade path - B's strict and browse reads never surface A", %{conn: conn} do
    s = seed_store!(conn)

    for capsules <- [
          CapsuleRead.list_for_owner(s.user_b),
          CapsuleRead.list_for_owner_browse(s.user_b),
          CapsuleRead.list_for_owner(s.user_b, purpose: "personal_memory")
        ] do
      summaries = Enum.map(capsules, & &1.payload["summary"])
      assert @b_capsule in summaries
      refute @a_capsule in summaries
      refute @a_fragment in summaries
      refute "A scoped pomelo fact ZX4" in summaries
    end

    assert {:error, :not_found} = CapsuleRead.read_one(s.user_b, s.a_capsule_id)
    assert {:error, :not_found} = CapsuleRead.read_one(s.user_b, s.a_scoped_id, browse: true)
  end

  test "SM-ISO-01 scope policy - A's relationship-scoped capsule is inadmissible outside its exact scope, even to A",
       %{
         conn: conn
       } do
    s = seed_store!(conn)

    # Not in A's plain assembly, not in B's anything.
    a_plain = Enum.map(CapsuleRead.list_for_owner(s.user_a), & &1.payload["summary"])
    refute "A scoped pomelo fact ZX4" in a_plain

    # Admissible only at the policy layer with the exact context.
    scoped =
      CapsuleRead.list_for_owner(s.user_a, scope_kind: "relationship", scope_id: s.user_b)

    assert "A scoped pomelo fact ZX4" in Enum.map(scoped, & &1.payload["summary"])

    # B requesting that same scope context gets B's capsules only -
    # the scope names a relationship, never a window into A.
    b_scoped =
      CapsuleRead.list_for_owner(s.user_b, scope_kind: "relationship", scope_id: s.user_b)

    refute "A scoped pomelo fact ZX4" in Enum.map(b_scoped, & &1.payload["summary"])
  end

  test "assembly + LLM prompt path - B's package and prompt contain zero A-derived content, including aggregate",
       %{
         conn: conn
       } do
    s = seed_store!(conn)

    package = ScopedContext.assemble(s.user_b)
    assert package.account_id == s.user_b
    assert String.contains?(package.text || "", @b_capsule)
    # The count is B's alone: A's three held capsules move nothing.
    assert package.capsule_count == 1

    for needle <- [@a_capsule, @a_fragment, "ZX4", s.a_capsule_id] do
      refute String.contains?(package.text || "", needle)
      refute needle in Enum.map(package.capsules, & &1["id"])
    end

    # The literal LLM prompt payload for B.
    built =
      PromptBuilder.build(
        SocialMemory.for_account(s.user_b),
        Ecto.UUID.generate(),
        "what should we do this weekend?",
        []
      )

    prompt = built.what_you_know || built.system_extra || ""
    assert String.contains?(prompt, @b_capsule)
    refute String.contains?(prompt, @a_capsule)
    refute String.contains?(prompt, @a_fragment)
    refute String.contains?(prompt, "ZX4")

    # Positive control: A's own prompt carries A's user-scoped capsule.
    built_a =
      PromptBuilder.build(
        SocialMemory.for_account(s.user_a),
        Ecto.UUID.generate(),
        "what should we do this weekend?",
        []
      )

    assert String.contains?(built_a.what_you_know || "", @a_capsule)
  end

  test "forget path - B cannot forget A's capsule; A's own forget truly deletes", %{conn: conn} do
    s = seed_store!(conn)

    conn_b =
      build_conn()
      |> auth(s.token_b)
      |> put_req_header("x-opal-step-up-elevation", s.elevation_b)
      |> delete("/api/v1/product/memory-wallet/capsules/#{s.a_capsule_id}")

    assert json_response(conn_b, 404)["error_code"] == "not_found"
    # A's capsule still stands.
    conn_a = build_conn() |> auth(s.token_a) |> get("/api/v1/product/memory-wallet")
    assert @a_capsule in Enum.map(json_response(conn_a, 200)["capsules"], & &1["summary"])

    conn_a2 =
      build_conn()
      |> auth(s.token_a)
      |> put_req_header("x-opal-step-up-elevation", s.elevation_a)
      |> delete("/api/v1/product/memory-wallet/capsules/#{s.a_capsule_id}")

    assert json_response(conn_a2, 200)["forgotten"] == true

    conn_a3 = build_conn() |> auth(s.token_a) |> get("/api/v1/product/memory-wallet")
    refute @a_capsule in Enum.map(json_response(conn_a3, 200)["capsules"], & &1["summary"])
    assert is_nil(OpalCore.Repo.get(OpalCore.MemoryWallet.MemoryCapsule, s.a_capsule_id))
  end

  test "soul path - A's soul edits never appear as B's soul; B reads and edits only B's", %{
    conn: conn
  } do
    s = seed_store!(conn)

    conn_a =
      build_conn()
      |> auth(s.token_a)
      |> patch("/api/v1/product/memory-wallet/soul", %{"assistance_level" => "proactive"})

    assert json_response(conn_a, 200)["soul"]["assistance_level"] == "proactive"

    conn_b = build_conn() |> auth(s.token_b) |> get("/api/v1/product/memory-wallet")
    assert json_response(conn_b, 200)["soul"]["assistance_level"] == "balanced"

    conn_a2 = build_conn() |> auth(s.token_a) |> get("/api/v1/product/memory-wallet")
    assert json_response(conn_a2, 200)["soul"]["assistance_level"] == "proactive"

    assert json_response(conn_a2, 200)["soul"]["assistance_level_label"] ==
             "More forward, within my quiet hours"
  end
end
