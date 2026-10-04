defmodule OpalCoreWeb.RecommendationCurateApiTest do
  @moduledoc "Phase 1C — POST /api/v1/product/recommendations/curate"
  use OpalCoreWeb.ConnCase

  alias OpalCore.Accounts.User
  alias OpalCore.Auth.ProductSession
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.{DeviceSession, DurablePreferenceMemory}

  setup do
    viewer =
      %User{}
      |> User.changeset(%{handle: "rc-v-#{System.unique_integer([:positive])}", display_name: "Viewer"})
      |> Repo.insert!()

    peer =
      %User{}
      |> User.changeset(%{handle: "rc-p-#{System.unique_integer([:positive])}", display_name: "Peer"})
      |> Repo.insert!()

    token = issue_token!(viewer.id, "rc-web")
    %{viewer: viewer, peer: peer, token: token}
  end

  defp auth(conn, token), do: put_req_header(conn, "authorization", "Bearer #{token}")

  defp issue_token!(user_id, label) do
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)
    n = System.unique_integer([:positive])

    session =
      %DeviceSession{}
      |> DeviceSession.changeset(%{
        user_id: user_id,
        device_label: label,
        platform: "web",
        status: "active",
        session_ref: "ref-#{n}",
        refresh_family: "rf-#{n}",
        idempotency_key: "idem-rc-#{n}",
        last_seen_at: now
      })
      |> Repo.insert!()

    {:ok, payload} = ProductSession.issue(session)
    payload.access_token
  end

  test "2 people + dinner → 200 with ≤3 ranked; commits nothing", %{
    conn: conn,
    viewer: viewer,
    peer: peer,
    token: token
  } do
    conn =
      conn
      |> auth(token)
      |> post("/api/v1/product/recommendations/curate", %{
        "user_ids" => [viewer.id, peer.id],
        "activity" => "dinner",
        "relationship_context" => "friends",
        "limit" => 3
      })

    body = json_response(conn, 200)
    ranked = body["ranked"]
    assert is_list(ranked)
    assert length(ranked) <= 3
    assert length(ranked) >= 1
    assert body["commits_shared_plan"] == false
    assert body["writes_durable_memory"] == false
    assert body["authority"] == "candidate_hypothesis"
    assert body["privacy"] == "shared_reasons_permissioned_only"
    assert body["group_fit_model"] == "overlap_not_average"
    assert body["activity"] == "dinner"

    Enum.each(ranked, fn c ->
      assert is_binary(c["display_name"] || c["id"])
      assert c["fit_hypothesis"] == true
      assert is_list(c["shared_reasons"])
    end)
  end

  test "unknown user → 404", %{conn: conn, viewer: viewer, token: token} do
    ghost = Ecto.UUID.generate()

    conn =
      conn
      |> auth(token)
      |> post("/api/v1/product/recommendations/curate", %{
        "user_ids" => [viewer.id, ghost],
        "activity" => "dinner"
      })

    body = json_response(conn, 404)
    assert body["error_code"] == "unknown_users"
  end

  test "privacy: peer private pref text never appears in shared_reasons", %{
    conn: conn,
    viewer: viewer,
    peer: peer,
    token: token
  } do
    secret = "peer-only-quiet-sanctuary-#{System.unique_integer([:positive])}"

    assert {:ok, _, _} =
             DurablePreferenceMemory.remember_explicit(%{
               "owner_user_id" => peer.id,
               "preference" => secret,
               "polarity" => "prefer"
             })

    conn =
      conn
      |> auth(token)
      |> post("/api/v1/product/recommendations/curate", %{
        "user_ids" => [viewer.id, peer.id],
        "activity" => "dinner",
        "limit" => 3
      })

    body = json_response(conn, 200)

    for c <- body["ranked"] do
      shared = Enum.join(List.wrap(c["shared_reasons"]), " ")
      refute String.contains?(shared, secret),
             "shared_reasons leaked peer private pref: #{inspect(c["shared_reasons"])}"

      signals = Jason.encode!(c["signals"] || [])
      refute String.contains?(signals, secret)
    end
  end

  test "missing user_ids → 422", %{conn: conn, token: token} do
    conn =
      conn
      |> auth(token)
      |> post("/api/v1/product/recommendations/curate", %{"activity" => "dinner"})

    body = json_response(conn, 422)
    assert body["error_code"] == "user_ids_required"
  end
end
