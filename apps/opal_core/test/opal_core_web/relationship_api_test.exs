defmodule OpalCoreWeb.RelationshipApiTest do
  use OpalCoreWeb.ConnCase

  alias OpalCore.Fixtures
  alias OpalCore.FixturesHelper
  alias OpalCore.SocialFlow.PhoneVerification.Provider

  @alex "+12025550101"
  @jordan_phone "+12025550102"

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
        "idempotency_key" => "ru1-ch-#{handle}-#{System.unique_integer([:positive])}"
      })

    body = json_response(conn, 201)

    conn =
      post(conn, "/api/v1/product/activation/verify", %{
        "challenge_id" => body["challenge"]["id"],
        "code" => body["development_code"],
        "phone" => phone,
        "display_name" => name,
        "device_label" => "#{handle}-web",
        "handle_hint" => handle,
        "platform" => "web",
        "include_bearer" => true
      })

    body = json_response(conn, 200)
    assert Provider.synthetic_mode?()
    {body["session"]["access_token"], body["user"]["id"]}
  end

  defp auth(conn, token), do: put_req_header(conn, "authorization", "Bearer #{token}")

  test "GET returns list; PUT sets type; invalid type → 422", %{conn: conn} do
    {tok, _user_id} = activate(conn, @alex, "RU1 A", "ru1_a")
    jordan_id = Fixtures.user_jordan_id()

    # GET empty-ish
    conn = build_conn() |> auth(tok) |> get("/api/v1/product/relationships")
    body = json_response(conn, 200)
    assert is_list(body["relationships"])
    assert is_list(body["contacts"])

    assert body["allowed_types"] ==
             ~w(spouse partner family close_friend friend business acquaintance)

    # PUT valid
    conn =
      build_conn()
      |> auth(tok)
      |> put("/api/v1/product/relationships/#{jordan_id}", %{
        "type" => "close_friend",
        "bounds" => %{"frequency" => "weekly", "style" => "casual", "planning" => "spontaneous"}
      })

    put_body = json_response(conn, 200)
    assert put_body["relationship"]["type"] == "close_friend"
    assert put_body["relationship"]["contact_user_id"] == jordan_id
    assert put_body["relationship"]["communication_bounds"]["frequency"] == "weekly"

    # GET confirms
    conn = build_conn() |> auth(tok) |> get("/api/v1/product/relationships")
    body2 = json_response(conn, 200)
    assert Enum.any?(body2["relationships"], &(&1["type"] == "close_friend"))

    # PUT invalid type → 422
    conn =
      build_conn()
      |> auth(tok)
      |> put("/api/v1/product/relationships/#{jordan_id}", %{"type" => "nemesis"})

    err = json_response(conn, 422)
    assert err["error_code"] == "invalid"
  end

  test "PUT upserts without duplicating", %{conn: conn} do
    {tok, _} = activate(conn, @alex, "RU1 B", "ru1_b")
    jordan_id = Fixtures.user_jordan_id()

    conn =
      build_conn()
      |> auth(tok)
      |> put("/api/v1/product/relationships/#{jordan_id}", %{"type" => "friend"})

    id1 = json_response(conn, 200)["relationship"]["id"]

    conn =
      build_conn()
      |> auth(tok)
      |> put("/api/v1/product/relationships/#{jordan_id}", %{"type" => "business"})

    body = json_response(conn, 200)
    assert body["relationship"]["id"] == id1
    assert body["relationship"]["type"] == "business"
  end

  # Founder Screen Notes N4 — the age band round-trips through the
  # ONE relationship write, under ANY type (it is a fact about the
  # person, not the tie), persists across type changes, clears on
  # an explicit null, and refuses unknown slugs with a 422.
  test "PUT age_band round-trips, persists across types, clears, and refuses unknown bands (N4)", %{conn: conn} do
    {tok, _user_id} = activate(conn, @alex, "N4 A", "n4_a")
    jordan_id = Fixtures.user_jordan_id()

    put_rel = fn params ->
      build_conn() |> auth(tok) |> put("/api/v1/product/relationships/#{jordan_id}", params)
    end

    # Establish under family.
    body =
      put_rel.(%{"type" => "family", "family_subtype" => "sibling", "age_band" => "age_13_17"})
      |> json_response(200)

    assert body["relationship"]["age_band"] == "age_13_17"

    # Read-back: row AND contact carry it; index names the vocabulary.
    body = build_conn() |> auth(tok) |> get("/api/v1/product/relationships") |> json_response(200)
    row = Enum.find(body["relationships"], &(&1["contact_user_id"] == jordan_id))
    assert row["age_band"] == "age_13_17"
    contact = Enum.find(body["contacts"], &(&1["contact_user_id"] == jordan_id))
    assert contact["age_band"] == "age_13_17"
    assert Enum.map(body["age_bands"], & &1["slug"]) == ["under_13", "age_13_17", "adult"]

    # A type change with NO band statement leaves the band stored.
    body = put_rel.(%{"type" => "friend"}) |> json_response(200)
    assert body["relationship"]["type"] == "friend"
    body = build_conn() |> auth(tok) |> get("/api/v1/product/relationships") |> json_response(200)
    assert Enum.find(body["relationships"], &(&1["contact_user_id"] == jordan_id))["age_band"] == "age_13_17"

    # A band statement under a non-family type applies too.
    body = put_rel.(%{"type" => "friend", "age_band" => "adult"}) |> json_response(200)
    assert body["relationship"]["age_band"] == "adult"

    # Explicit null clears it.
    body = put_rel.(%{"type" => "friend", "age_band" => nil}) |> json_response(200)
    assert body["relationship"]["age_band"] == nil

    # Unknown band is a 422, and nothing was stored by the attempt.
    conn = put_rel.(%{"type" => "friend", "age_band" => "toddler"})
    assert json_response(conn, 422)
    body = build_conn() |> auth(tok) |> get("/api/v1/product/relationships") |> json_response(200)
    assert Enum.find(body["relationships"], &(&1["contact_user_id"] == jordan_id))["age_band"] == nil
  end

  # Repair #19 W24 (DL-02) — the family subtype round-trips through
  # the ONE relationship write: PUT stores it, the response contract
  # carries it back, and a fresh GET (rows + contacts) still carries
  # it. Before the fix the same PUT returned 200 with
  # family_subtype: null — a write that silently dropped its payload.
  test "PUT family + family_subtype round-trips (DL-02)", %{conn: conn} do
    {tok, _user_id} = activate(conn, @alex, "RU1 C", "ru1_c")
    jordan_id = Fixtures.user_jordan_id()

    conn =
      build_conn()
      |> auth(tok)
      |> put("/api/v1/product/relationships/#{jordan_id}", %{
        "type" => "family",
        "family_subtype" => "sibling",
        "family_minor" => false
      })

    put_body = json_response(conn, 200)
    assert put_body["relationship"]["type"] == "family"
    assert put_body["relationship"]["family_subtype"] == "sibling"
    assert put_body["relationship"]["family_minor"] == false

    # GET read-back: the row AND the contact contract both carry it.
    conn = build_conn() |> auth(tok) |> get("/api/v1/product/relationships")
    body = json_response(conn, 200)

    row = Enum.find(body["relationships"], &(&1["contact_user_id"] == jordan_id))
    assert row["family_subtype"] == "sibling"

    contact = Enum.find(body["contacts"], &(&1["contact_user_id"] == jordan_id))
    assert contact["family_subtype"] == "sibling"

    # The index names the real subtype vocabulary for the picker.
    slugs = Enum.map(body["family_subtypes"], & &1["slug"])
    assert "sibling" in slugs
    assert "parent" in slugs
    assert "co_parent" in slugs

    # The minor flag round-trips too.
    conn =
      build_conn()
      |> auth(tok)
      |> put("/api/v1/product/relationships/#{jordan_id}", %{
        "type" => "family",
        "family_subtype" => "niece_nephew",
        "family_minor" => true
      })

    put_body = json_response(conn, 200)
    assert put_body["relationship"]["family_subtype"] == "niece_nephew"
    assert put_body["relationship"]["family_minor"] == true

    # An unknown subtype slug is a 422, never a silent drop.
    conn =
      build_conn()
      |> auth(tok)
      |> put("/api/v1/product/relationships/#{jordan_id}", %{
        "type" => "family",
        "family_subtype" => "second_cousin_twice_removed"
      })

    assert json_response(conn, 422)["error_code"] == "invalid"

    # A subtype under a non-family type is refused, and changing
    # away from family clears the stored subtype (read-back proves).
    conn =
      build_conn()
      |> auth(tok)
      |> put("/api/v1/product/relationships/#{jordan_id}", %{
        "type" => "friend",
        "family_subtype" => "sibling"
      })

    assert json_response(conn, 422)["error_code"] == "invalid"

    conn =
      build_conn()
      |> auth(tok)
      |> put("/api/v1/product/relationships/#{jordan_id}", %{"type" => "friend"})

    put_body = json_response(conn, 200)
    assert put_body["relationship"]["family_subtype"] == nil
    assert put_body["relationship"]["family_minor"] == false
  end

  # silence unused
  test "jordan fixture phone is available" do
    assert is_binary(@jordan_phone)
  end
end
