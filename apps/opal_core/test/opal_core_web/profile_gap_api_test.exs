defmodule OpalCoreWeb.ProfileGapApiTest do
  @moduledoc """
  Repair #16 W3 — HTTP surface for the Repair #15 ProfileGap mechanism
  (deferred item B6). Proves the full loop over the real endpoints with
  fresh randomized accounts:

    assess (ask, exactly once) → answer → stored fact + durable
    Celebrations row → next assess is `known` with NO ask payload;
    skip → permanent `proceed_without`; invalid answers store nothing.

  Multi-way: the loop is run across relationship types and every family
  subtype, in answer-first, skip-first, and fact-already-known
  orderings. The mechanism takes no relationship-type input, so the
  behavior AND the prompt copy must be identical for every type — that
  identity is asserted, not assumed.

  Adversarial (nag attacks): double/triple assesses, a concurrent
  assess burst, answer-then-reassess, skip-then-reassess,
  dismiss-without-answer (assess in a later flow), skip spam,
  conflicting second answers, cross-owner probes, garbage dates,
  far-past/future dates, and empty payloads. The ledger must hold:
  exactly one row per (owner, person, fact), ever.
  """

  use OpalCoreWeb.ConnCase, async: false

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Celebrations
  alias OpalCore.FixturesHelper
  alias OpalCore.Relationships
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.Execution.{ProfileGap, ProfileGapAsk}
  alias OpalCore.SocialFlow.PhoneVerification.Provider

  @types ~w(spouse partner family close_friend friend business acquaintance)
  @subtypes ~w(parent child sibling grandparent aunt_uncle cousin niece_nephew co_parent)

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

  # --- helpers ---------------------------------------------------------------

  defp uniq, do: System.unique_integer([:positive])

  defp activate_new_owner do
    n = uniq()
    phone = "+1202555" <> String.pad_leading(Integer.to_string(rem(n, 10_000)), 4, "0")
    handle = "pg#{n}"

    conn =
      post(build_conn(), "/api/v1/product/activation/challenges", %{
        "otp_consent_accepted" => true,
        "phone" => phone,
        "device_label" => "#{handle}-web",
        "idempotency_key" => "pg-ch-#{handle}"
      })

    body = json_response(conn, 201)

    conn =
      post(build_conn(), "/api/v1/product/activation/verify", %{
        "challenge_id" => body["challenge"]["id"],
        "code" => body["development_code"],
        "phone" => phone,
        "display_name" => "Owner #{n}",
        "device_label" => "#{handle}-web",
        "handle_hint" => handle,
        "platform" => "web",
        "include_bearer" => true
      })

    body = json_response(conn, 200)
    assert Provider.synthetic_mode?()
    {body["session"]["access_token"], body["user"]["id"]}
  end

  defp mk_person(name \\ nil) do
    n = uniq()

    %User{}
    |> User.changeset(%{
      id: Ecto.UUID.generate(),
      handle: "pg-person-#{n}",
      display_name: name || "Person #{n}"
    })
    |> Repo.insert!()
  end

  defp auth(conn, token), do: put_req_header(conn, "authorization", "Bearer #{token}")

  defp assess(token, person_id, extra \\ %{}) do
    params = Map.merge(%{"person_id" => person_id}, extra)
    conn = build_conn() |> auth(token) |> post("/api/v1/product/profile-gaps/assess", params)
    {conn.status, json_response(conn, conn.status)}
  end

  defp answer(token, person_id, value, extra \\ %{}) do
    params = Map.merge(%{"person_id" => person_id, "value" => value}, extra)
    conn = build_conn() |> auth(token) |> post("/api/v1/product/profile-gaps/answer", params)
    {conn.status, json_response(conn, conn.status)}
  end

  defp skip(token, person_id, extra \\ %{}) do
    params = Map.merge(%{"person_id" => person_id}, extra)
    conn = build_conn() |> auth(token) |> post("/api/v1/product/profile-gaps/skip", params)
    {conn.status, json_response(conn, conn.status)}
  end

  defp ledger_rows(owner_id, person_id, fact_key \\ "birthday") do
    from(a in ProfileGapAsk,
      where:
        a.owner_user_id == ^owner_id and a.person_id == ^person_id and
          a.fact_key == ^fact_key
    )
    |> Repo.all()
  end

  defp set_relationship(owner_id, person_id, type, subtype \\ nil) do
    assert {:ok, _} = Relationships.set_type(owner_id, person_id, type)

    if subtype do
      assert {:ok, _} = Relationships.set_family_subtype(owner_id, person_id, subtype)
    end
  end

  # --- the loop, over HTTP -----------------------------------------------------

  describe "full loop" do
    test "ask once → answer → stored fact + Celebrations row → known, no ask payload" do
      {token, owner_id} = activate_new_owner()
      person = mk_person()

      {200, first} = assess(token, person.id, %{"person_name" => person.display_name})
      gap = first["profile_gap"]
      assert gap["status"] == "ask"
      assert gap["plan_proceeds"] == true
      ask = gap["ask"]
      assert ask["fact_key"] == "birthday"
      assert ask["blocking"] == false
      assert ask["dismissible"] == true
      assert ask["skip_label"] == "Skip"
      assert ask["asked_once"] == true
      assert String.contains?(ask["prompt"], person.display_name)

      {200, second} = assess(token, person.id, %{"person_name" => person.display_name})
      assert second["profile_gap"]["status"] == "proceed_without"
      assert second["profile_gap"]["reason"] == "already_asked"
      assert second["profile_gap"]["ask"] == nil
      assert length(ledger_rows(owner_id, person.id)) == 1

      {200, answered} =
        answer(token, person.id, "2014-03-05", %{"person_name" => person.display_name})

      assert answered["answered"] == true
      assert answered["value"] == "2014-03-05"

      assert [%ProfileGapAsk{status: "answered", answered_value: "2014-03-05"}] =
               ledger_rows(owner_id, person.id)

      {:ok, celebrations} = Celebrations.list_for_user(owner_id)

      assert Enum.any?(
               celebrations,
               &(&1.person_name == person.display_name and &1.month == 3 and &1.day == 5)
             )

      {200, next_time} = assess(token, person.id, %{"person_name" => person.display_name})
      assert next_time["profile_gap"]["status"] == "known"
      assert next_time["profile_gap"]["value"] == "2014-03-05"
      assert next_time["profile_gap"]["ask"] == nil
      assert length(ledger_rows(owner_id, person.id)) == 1
    end

    test "skip → permanent proceed_without; skip spam is idempotent (one row)" do
      {token, owner_id} = activate_new_owner()
      person = mk_person()

      {200, first} = assess(token, person.id, %{"person_name" => person.display_name})
      assert first["profile_gap"]["status"] == "ask"

      for _ <- 1..3 do
        {200, skipped} = skip(token, person.id)
        assert skipped["skipped"] == true
      end

      assert [%ProfileGapAsk{status: "skipped"}] = ledger_rows(owner_id, person.id)

      {200, later} = assess(token, person.id, %{"person_name" => person.display_name})
      assert later["profile_gap"]["status"] == "proceed_without"
      assert later["profile_gap"]["reason"] == "skipped"
      assert later["profile_gap"]["plan_proceeds"] == true
      assert length(ledger_rows(owner_id, person.id)) == 1
    end

    test "fact already known (Celebrations pre-seeded) → known silently, zero ledger rows" do
      {token, owner_id} = activate_new_owner()
      person = mk_person()

      conn =
        build_conn()
        |> auth(token)
        |> post("/api/v1/product/celebrations", %{
          "person_name" => person.display_name,
          "kind" => "birthday",
          "month" => 11,
          "day" => 20
        })

      assert json_response(conn, 201)["celebration"]["person_name"] == person.display_name

      {200, result} = assess(token, person.id, %{"person_name" => person.display_name})
      assert result["profile_gap"]["status"] == "known"
      assert result["profile_gap"]["value"] == "annual:11-20"
      assert result["profile_gap"]["ask"] == nil
      assert ledger_rows(owner_id, person.id) == []
    end

    test "unauthenticated calls are 401 on all three endpoints" do
      person = mk_person()

      for path <- ~w(assess answer skip) do
        conn =
          post(build_conn(), "/api/v1/product/profile-gaps/#{path}", %{
            "person_id" => person.id,
            "value" => "2014-03-05"
          })

        assert json_response(conn, 401)["error_code"] == "auth_required"
      end
    end
  end

  # --- multi-way: relationship types × orderings -------------------------------

  describe "multi-way across relationship types and subtypes" do
    test "answer-first loop is identical for every type and family subtype" do
      prompts =
        for {type, subtype} <- Enum.map(@types, &{&1, nil}) ++ Enum.map(@subtypes, &{"family", &1}) do
          {token, owner_id} = activate_new_owner()
          person = mk_person()
          set_relationship(owner_id, person.id, type, subtype)

          {200, first} = assess(token, person.id, %{"person_name" => person.display_name})
          assert first["profile_gap"]["status"] == "ask", "no ask for #{type}/#{subtype}"
          prompt = first["profile_gap"]["ask"]["prompt"]

          {200, _} =
            answer(token, person.id, "1992-08-17", %{"person_name" => person.display_name})

          {200, next_time} = assess(token, person.id, %{"person_name" => person.display_name})
          assert next_time["profile_gap"]["status"] == "known"
          assert next_time["profile_gap"]["value"] == "1992-08-17"
          assert next_time["profile_gap"]["ask"] == nil
          assert [%ProfileGapAsk{status: "answered"}] = ledger_rows(owner_id, person.id)

          # Normalize the (random) person name out so copy can be compared.
          String.replace(prompt, person.display_name, "<NAME>")
        end

      # No type-driven copy differences exist in the mechanism: the prompt
      # is byte-identical across all 15 type/subtype combinations.
      assert length(Enum.uniq(prompts)) == 1
    end

    test "skip-first loop is identical for every type and family subtype" do
      for {type, subtype} <- Enum.map(@types, &{&1, nil}) ++ Enum.map(@subtypes, &{"family", &1}) do
        {token, owner_id} = activate_new_owner()
        person = mk_person()
        set_relationship(owner_id, person.id, type, subtype)

        {200, first} = assess(token, person.id, %{"person_name" => person.display_name})
        assert first["profile_gap"]["status"] == "ask"

        {200, _} = skip(token, person.id)

        {200, later} = assess(token, person.id, %{"person_name" => person.display_name})
        assert later["profile_gap"]["status"] == "proceed_without"
        assert later["profile_gap"]["reason"] == "skipped"
        assert [%ProfileGapAsk{status: "skipped"}] = ledger_rows(owner_id, person.id)
      end
    end

    test "known-first (pre-seeded) loop holds across a spread of types" do
      combos = [{"partner", nil}, {"family", "co_parent"}, {"family", "grandparent"},
                {"close_friend", nil}, {"business", nil}, {"acquaintance", nil}]

      for {type, subtype} <- combos do
        {token, owner_id} = activate_new_owner()
        person = mk_person()
        set_relationship(owner_id, person.id, type, subtype)

        assert {:ok, _} =
                 Celebrations.create(owner_id, %{
                   "person_name" => person.display_name,
                   "kind" => "birthday",
                   "month" => 6,
                   "day" => 14
                 })

        {200, result} = assess(token, person.id, %{"person_name" => person.display_name})
        assert result["profile_gap"]["status"] == "known"
        assert result["profile_gap"]["ask"] == nil
        assert ledger_rows(owner_id, person.id) == []
      end
    end
  end

  # --- adversarial: nag attacks --------------------------------------------------

  describe "nag attacks — the ask can never fire twice" do
    test "double and triple assess: one ask payload total, one ledger row" do
      {token, owner_id} = activate_new_owner()
      person = mk_person()

      statuses =
        for _ <- 1..3 do
          {200, body} = assess(token, person.id, %{"person_name" => person.display_name})
          body["profile_gap"]["status"]
        end

      assert statuses == ["ask", "proceed_without", "proceed_without"]
      assert length(ledger_rows(owner_id, person.id)) == 1
    end

    test "concurrent assess burst: exactly one ledger row; no re-ask afterwards" do
      {token, owner_id} = activate_new_owner()
      person = mk_person()

      results =
        1..10
        |> Task.async_stream(
          fn _ -> assess(token, person.id, %{"person_name" => person.display_name}) end,
          max_concurrency: 10,
          timeout: 30_000
        )
        |> Enum.map(fn {:ok, result} -> result end)

      assert Enum.all?(results, fn {status, _} -> status == 200 end)
      assert length(ledger_rows(owner_id, person.id)) == 1

      {200, later} = assess(token, person.id, %{"person_name" => person.display_name})
      assert later["profile_gap"]["status"] == "proceed_without"
      assert later["profile_gap"]["ask"] == nil
    end

    test "dismiss-without-answer then a new flow: still never re-asked" do
      {token, owner_id} = activate_new_owner()
      person = mk_person()

      # Flow 1: ask fires; the user dismisses it (no answer, no skip call).
      {200, first} = assess(token, person.id, %{"person_name" => person.display_name})
      assert first["profile_gap"]["status"] == "ask"

      # Flow 2 (a later, separate birthday plan): no second ask, ever.
      {200, second} = assess(token, person.id, %{"person_name" => person.display_name})
      assert second["profile_gap"]["status"] == "proceed_without"
      assert second["profile_gap"]["reason"] == "already_asked"
      assert [%ProfileGapAsk{status: "asked"}] = ledger_rows(owner_id, person.id)
    end

    test "answer-then-reassess and skip-then-reassess never produce a second ask" do
      {token_a, owner_a} = activate_new_owner()
      person_a = mk_person()
      {200, _} = assess(token_a, person_a.id, %{"person_name" => person_a.display_name})
      {200, _} = answer(token_a, person_a.id, "2001-01-30", %{"person_name" => person_a.display_name})

      for _ <- 1..3 do
        {200, body} = assess(token_a, person_a.id, %{"person_name" => person_a.display_name})
        assert body["profile_gap"]["status"] == "known"
        assert body["profile_gap"]["ask"] == nil
      end

      assert length(ledger_rows(owner_a, person_a.id)) == 1

      {token_b, owner_b} = activate_new_owner()
      person_b = mk_person()
      {200, _} = assess(token_b, person_b.id, %{"person_name" => person_b.display_name})
      {200, _} = skip(token_b, person_b.id)

      for _ <- 1..3 do
        {200, body} = assess(token_b, person_b.id, %{"person_name" => person_b.display_name})
        assert body["profile_gap"]["status"] == "proceed_without"
        assert body["profile_gap"]["ask"] == nil
      end

      assert length(ledger_rows(owner_b, person_b.id)) == 1
    end
  end

  # --- adversarial: conflicting answers, cross-owner, garbage --------------------

  describe "conflicting answers and cross-owner probes" do
    test "second answer does not overwrite the durable Celebrations fact" do
      {token, owner_id} = activate_new_owner()
      person = mk_person()
      name = person.display_name

      {200, _} = assess(token, person.id, %{"person_name" => name})
      {200, _} = answer(token, person.id, "2014-03-05", %{"person_name" => name})
      {200, second} = answer(token, person.id, "1999-12-25", %{"person_name" => name})
      assert second["answered"] == true

      # The durable record other flows read keeps the FIRST answered date:
      # the ask path never silently rewrites it.
      {:ok, celebrations} = Celebrations.list_for_user(owner_id)
      rows = Enum.filter(celebrations, &(&1.person_name == name))
      assert length(rows) == 1
      assert hd(rows).month == 3 and hd(rows).day == 5

      {200, result} = assess(token, person.id, %{"person_name" => name})
      assert result["profile_gap"]["status"] == "known"
      assert result["profile_gap"]["value"] == "2014-03-05"
      assert length(ledger_rows(owner_id, person.id)) == 1
    end

    test "cross-owner: B cannot see, answer, or skip A's gap" do
      {token_a, owner_a} = activate_new_owner()
      {token_b, owner_b} = activate_new_owner()
      person = mk_person()
      name = person.display_name

      {200, _} = assess(token_a, person.id, %{"person_name" => name})
      {200, _} = answer(token_a, person.id, "2010-05-09", %{"person_name" => name})

      # B assessing the same person gets B's OWN first ask — A's known
      # fact never leaks into B's response.
      {200, b_view} = assess(token_b, person.id, %{"person_name" => name})
      assert b_view["profile_gap"]["status"] == "ask"
      assert b_view["profile_gap"]["value"] == nil

      # B answering/skipping writes only B's own ledger row.
      {200, _} = skip(token_b, person.id)
      assert [%ProfileGapAsk{status: "skipped"}] = ledger_rows(owner_b, person.id)
      assert [%ProfileGapAsk{status: "answered", answered_value: "2010-05-09"}] =
               ledger_rows(owner_a, person.id)

      # A's state is untouched and still known.
      {200, a_view} = assess(token_a, person.id, %{"person_name" => name})
      assert a_view["profile_gap"]["status"] == "known"
      assert a_view["profile_gap"]["value"] == "2010-05-09"

      {:ok, b_celebrations} = Celebrations.list_for_user(owner_b)
      refute Enum.any?(b_celebrations, &(&1.person_name == name))
    end

    test "invalid and garbage answers store nothing and leave the ledger untouched" do
      {token, owner_id} = activate_new_owner()
      person = mk_person()
      name = person.display_name

      {200, _} = assess(token, person.id, %{"person_name" => name})

      garbage = [
        "not-a-date",
        "2026-02-30",
        "2023-02-29",
        "",
        "   ",
        "12/25/1999",
        %{"month" => 13, "day" => 40},
        %{"month" => 2, "day" => 30},
        %{"month" => "x", "day" => "y"},
        12_345,
        ["2014-03-05"],
        nil
      ]

      for value <- garbage do
        params =
          if is_nil(value),
            do: %{"person_id" => person.id},
            else: %{"person_id" => person.id, "value" => value}

        conn = build_conn() |> auth(token) |> post("/api/v1/product/profile-gaps/answer", params)
        assert conn.status == 422, "expected 422 for #{inspect(value)}, got #{conn.status}"
        assert json_response(conn, 422)["error_code"] == "invalid"
      end

      assert [%ProfileGapAsk{status: "asked", answered_value: nil}] =
               ledger_rows(owner_id, person.id)

      {:ok, celebrations} = Celebrations.list_for_user(owner_id)
      assert celebrations == []

      # The pending ask was NOT resolved by garbage: still no re-ask, and a
      # later valid answer still lands.
      {200, _} = answer(token, person.id, "2014-03-05", %{"person_name" => name})
      {200, result} = assess(token, person.id, %{"person_name" => name})
      assert result["profile_gap"]["status"] == "known"
    end

    test "far-past and far-future valid dates are stored as given (no crash)" do
      {token, _owner_id} = activate_new_owner()

      for {value, person} <- [{"1200-01-15", mk_person()}, {"2999-12-31", mk_person()}] do
        {200, _} = assess(token, person.id, %{"person_name" => person.display_name})
        {200, answered} = answer(token, person.id, value, %{"person_name" => person.display_name})
        assert answered["value"] == value

        {200, result} = assess(token, person.id, %{"person_name" => person.display_name})
        assert result["profile_gap"]["status"] == "known"
        assert result["profile_gap"]["value"] == value
      end
    end

    test "empty and malformed payloads fail closed with 422 and write nothing" do
      {token, owner_id} = activate_new_owner()
      person = mk_person()

      for {path, params} <- [
            {"assess", %{}},
            {"assess", %{"person_id" => "not-a-uuid"}},
            {"assess", %{"person_id" => 42}},
            {"answer", %{"person_id" => person.id}},
            {"answer", %{"value" => "2014-03-05"}},
            {"skip", %{}},
            {"skip", %{"person_id" => "nope"}}
          ] do
        conn = build_conn() |> auth(token) |> post("/api/v1/product/profile-gaps/#{path}", params)
        assert conn.status == 422, "#{path} #{inspect(params)} → #{conn.status}"
      end

      assert Repo.all(ProfileGapAsk) |> Enum.filter(&(&1.owner_user_id == owner_id)) == []
    end

    test "unknown fact keys fail closed: assess proceeds without, answer is 422" do
      {token, owner_id} = activate_new_owner()
      person = mk_person()

      {200, result} =
        assess(token, person.id, %{"fact_key" => "favorite_color", "person_name" => person.display_name})

      assert result["profile_gap"]["status"] == "proceed_without"
      assert result["profile_gap"]["reason"] == "unknown_fact"
      assert ledger_rows(owner_id, person.id, "favorite_color") == []

      {422, _} = answer(token, person.id, "blue", %{"fact_key" => "favorite_color"})
      assert ledger_rows(owner_id, person.id, "favorite_color") == []
    end

    test "mechanism cross-check: endpoint state matches ProfileGap ground truth" do
      {token, owner_id} = activate_new_owner()
      person = mk_person()

      {200, _} = assess(token, person.id, %{"person_name" => person.display_name})

      assert ProfileGap.ledger_row(owner_id, person.id, "birthday").status == "asked"

      assert ProfileGap.birthday_plan_context(owner_id, person.id,
               person_name: person.display_name
             )["reason"] == "already_asked"
    end
  end
end
