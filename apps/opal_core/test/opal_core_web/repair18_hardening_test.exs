defmodule OpalCoreWeb.Repair18HardeningTest do
  @moduledoc """
  Repair #18 hardening micro-wave - two shipped defects, pinned.

  Defect 1 (support intake idempotency): the 4.C7 report-from-
  anywhere intake filed a NEW report on every submit, so a client
  retry / double-submit duplicated the report. Now a client
  idempotency key dedupes on (reporter, key) before insert, backed
  by the (user_id, idempotency_key) unique index; keyless submits
  keep one-report-per-submit semantics (pinned, not assumed).

  Defect 2 (deletion receipt retry): AccountDeletion issued its
  DEL- receipt with a unique-indexed reference but no generation
  retry, so a collision raised inside the deletion transaction and
  the deletion failed. Now generation retries bounded times per
  attempt transaction; exhaustion is the named
  :receipt_reference_exhausted error with no deletion committed.

  Synthetic accounts only; no user data is touched.
  """

  use OpalCoreWeb.ConnCase, async: false

  import Ecto.Query

  alias OpalCore.Accounts.AccountDeletion
  alias OpalCore.Accounts.DeletionReceipt
  alias OpalCore.Accounts.User
  alias OpalCore.Repo
  alias OpalCore.Settings.SavedLogins
  alias OpalCore.Support.SupportReport

  # --- helpers (same activation shape as adopt2_account_settings) ---

  defp activate(conn, tag) do
    uniq = System.unique_integer([:positive]) |> rem(900_000) |> Kernel.+(100_000)

    conn =
      post(conn, "/api/v1/product/activation/challenges", %{
        "otp_consent_accepted" => true,
        "phone" => "+1202555#{rem(uniq, 9000) + 1000}",
        "device_label" => "#{tag}-web",
        "idempotency_key" => "hard-ch-#{tag}-#{uniq}"
      })

    body = json_response(conn, 201)
    code = body["development_code"]
    challenge_id = body["challenge"]["id"]
    assert is_binary(code)

    conn =
      post(conn, "/api/v1/product/activation/verify", %{
        "challenge_id" => challenge_id,
        "code" => code,
        "phone" => "+1202555#{rem(uniq, 9000) + 1000}",
        "display_name" => "Hard #{tag}",
        "device_label" => "#{tag}-web",
        "handle_hint" => "hard_#{tag}_#{uniq}",
        "platform" => "web",
        "include_bearer" => true
      })

    body = json_response(conn, 200)
    {body["session"]["access_token"], body["user"]["id"]}
  end

  defp authed(token), do: build_conn() |> put_req_header("authorization", "Bearer #{token}")

  defp fresh(conn, tag) do
    OpalCore.FixturesHelper.seed!()
    activate(conn, tag)
  end

  defp submit_report(token, payload) do
    authed(token) |> post("/api/v1/product/support/reports", payload)
  end

  defp report_count(user_id) do
    Repo.aggregate(from(r in SupportReport, where: r.user_id == ^user_id), :count)
  end

  defp bare_user!(tag) do
    uniq = System.unique_integer([:positive])

    {:ok, user} =
      %User{}
      |> User.changeset(%{
        display_name: "Hard bare #{tag} #{uniq}",
        handle: "hard-bare-#{tag}-#{uniq}"
      })
      |> Repo.insert()

    user
  end

  defp seed_receipt!(user_id, reference) do
    %DeletionReceipt{user_id: user_id, reference: reference}
    |> DeletionReceipt.changeset(%{mode: "data", source: "self_serve", summary: %{}})
    |> Repo.insert!()
  end

  # ------------------------------------------------------------------
  # Defect 1 - support intake idempotency
  # ------------------------------------------------------------------

  test "(a) same key submitted twice: one row, same reference, same payload both times", %{
    conn: conn
  } do
    {token, user_id} = fresh(conn, "idem-a")

    payload = %{
      "kind" => "problem",
      "category" => "something_broke",
      "body" => "The card never loaded.",
      "idempotency_key" => "retry-key-a-#{System.unique_integer([:positive])}"
    }

    first = json_response(submit_report(token, payload), 201)
    second = json_response(submit_report(token, payload), 201)

    assert second["report"] == first["report"]
    assert first["report"]["reference"] =~ ~r/^OPAL-[A-Z0-9]+$/
    assert report_count(user_id) == 1

    stored = Repo.one(from(r in SupportReport, where: r.user_id == ^user_id))
    assert stored.reference == first["report"]["reference"]
    assert stored.idempotency_key == payload["idempotency_key"]
  end

  test "(b) two different keys file two distinct reports", %{conn: conn} do
    {token, user_id} = fresh(conn, "idem-b")
    uniq = System.unique_integer([:positive])

    references =
      for suffix <- ["one", "two"] do
        body =
          json_response(
            submit_report(token, %{
              "kind" => "feedback",
              "category" => "something_else",
              "body" => "Note #{suffix}.",
              "idempotency_key" => "key-b-#{uniq}-#{suffix}"
            }),
            201
          )

        body["report"]["reference"]
      end

    assert length(Enum.uniq(references)) == 2
    assert report_count(user_id) == 2
  end

  test "(c) keyless double-submit is unchanged: two reports (semantics pinned)", %{conn: conn} do
    {token, user_id} = fresh(conn, "idem-c")

    payload = %{
      "kind" => "problem",
      "category" => "hard_to_use",
      "body" => "Sent twice on purpose, no key."
    }

    first = json_response(submit_report(token, payload), 201)
    second = json_response(submit_report(token, payload), 201)

    assert first["report"]["reference"] != second["report"]["reference"]
    assert report_count(user_id) == 2

    assert Repo.all(
             from(r in SupportReport, where: r.user_id == ^user_id, select: r.idempotency_key)
           ) == [nil, nil]
  end

  test "(e) cross-account: A's key never returns B's report - B files B's own", %{conn: conn} do
    {token_a, user_a} = fresh(conn, "idem-ea")
    {token_b, user_b} = activate(conn, "idem-eb")
    key = "shared-key-e-#{System.unique_integer([:positive])}"

    a_body =
      json_response(
        submit_report(token_a, %{
          "kind" => "problem",
          "category" => "account",
          "body" => "A's report under the shared key.",
          "idempotency_key" => key
        }),
        201
      )

    b_body =
      json_response(
        submit_report(token_b, %{
          "kind" => "problem",
          "category" => "account",
          "body" => "B's report under the same key.",
          "idempotency_key" => key
        }),
        201
      )

    # B's submit is NOT a replay of A's report: it is B's own row,
    # with B's own reference and B's own words.
    assert b_body["report"]["reference"] != a_body["report"]["reference"]
    assert report_count(user_a) == 1
    assert report_count(user_b) == 1

    b_stored = Repo.one(from(r in SupportReport, where: r.user_id == ^user_b))
    assert b_stored.body == "B's report under the same key."
    assert b_stored.reference == b_body["report"]["reference"]

    # And B's own retry under the key still dedupes to B's report.
    b_retry =
      json_response(
        submit_report(token_b, %{
          "kind" => "problem",
          "category" => "account",
          "body" => "B's report under the same key.",
          "idempotency_key" => key
        }),
        201
      )

    assert b_retry["report"] == b_body["report"]
    assert report_count(user_b) == 1
  end

  # ------------------------------------------------------------------
  # Defect 2 - deletion receipt reference retry
  # ------------------------------------------------------------------

  test "(d) forced receipt-reference collision: deletion completes with a distinct receipt reference" do
    victim = bare_user!("d-victim")
    other = bare_user!("d-other")
    colliding = "DEL-HARDCOLLIDE"
    seed_receipt!(other.id, colliding)

    # First generated reference collides with the seeded receipt;
    # the retry must regenerate and land a distinct one.
    queue =
      start_supervised!(
        {Agent, fn -> [colliding, "DEL-HARDRETRY#{System.unique_integer([:positive])}"] end}
      )

    Application.put_env(:opal_core, :deletion_receipt_reference_fun, fn ->
      Agent.get_and_update(queue, fn
        [head | tail] -> {head, tail}
        [] -> {"DEL-HARDFALLBACK#{System.unique_integer([:positive])}", []}
      end)
    end)

    on_exit(fn -> Application.delete_env(:opal_core, :deletion_receipt_reference_fun) end)

    {:ok, _} = SavedLogins.add(victim.id, "bank.example.com", "hard-d-secret")

    assert {:ok, receipt} = AccountDeletion.execute(victim.id, "account")
    assert receipt.reference != colliding
    assert receipt.reference =~ ~r/^DEL-/
    assert Repo.get!(DeletionReceipt, receipt.id).reference == receipt.reference

    # The deletion itself really ran (not skipped to dodge the
    # collision): private data gone, account anonymized in place.
    assert SavedLogins.list_for_user(victim.id) == []
    assert Repo.get!(User, victim.id).display_name == "Deleted member"
    assert not is_nil(Repo.get!(User, victim.id).deleted_at)

    # The other account's seeded receipt stands untouched.
    assert Repo.get_by!(DeletionReceipt, reference: colliding).user_id == other.id
  end

  test "(d2) exhaustion: every attempt collides - named error, no deletion writes committed" do
    victim = bare_user!("dx-victim")
    other = bare_user!("dx-other")
    colliding = "DEL-HARDEXHAUST"
    seed_receipt!(other.id, colliding)

    Application.put_env(:opal_core, :deletion_receipt_reference_fun, fn -> colliding end)
    on_exit(fn -> Application.delete_env(:opal_core, :deletion_receipt_reference_fun) end)

    {:ok, _} = SavedLogins.add(victim.id, "keep.example.com", "hard-dx-secret")

    assert {:error, :receipt_reference_exhausted} =
             AccountDeletion.execute(victim.id, "account")

    # No half-deleted state: the account stands, its data stands,
    # and no receipt was issued for the victim.
    survivor = Repo.get!(User, victim.id)
    assert survivor.deleted_at == nil
    assert survivor.display_name =~ "Hard bare"
    assert length(SavedLogins.list_for_user(victim.id)) == 1
    assert Repo.aggregate(from(r in DeletionReceipt, where: r.user_id == ^victim.id), :count) == 0
  end
end
