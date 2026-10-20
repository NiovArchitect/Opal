defmodule OpalCoreWeb.Repair19PolishHorizonRevealTest do
  @moduledoc """
  Repair #19 polish P12-4 - the horizon milestone rule in the ONE
  reveal derivation (Reveal.for_viewer):

  - a far-band plan (start more than 30 calendar days out) that is
    ready and needs nothing produces NO reveal item - no countdown
    noise from the horizon;
  - the same far plan DOES surface when it needs the viewer's
    answer (their participant response is pending - a decision
    milestone);
  - a near ready plan is unaffected.
  """
  use OpalCoreWeb.ConnCase, async: false

  alias OpalCore.FixturesHelper
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.PhoneVerification.Provider
  alias OpalCore.SocialFlow.Reveal
  alias OpalCore.SocialFlow.SharedPlan

  @a "+12025550601"
  @b "+12025550602"

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

  defp activate(phone, name, handle) do
    conn =
      post(build_conn(), "/api/v1/product/activation/challenges", %{
        "otp_consent_accepted" => true,
        "phone" => phone,
        "device_label" => "#{handle}-web",
        "idempotency_key" => "horizon-ch-#{handle}-#{System.unique_integer([:positive])}"
      })

    body = json_response(conn, 201)
    code = body["development_code"]
    challenge_id = body["challenge"]["id"]
    assert is_binary(code)
    assert Provider.synthetic_mode?()

    conn =
      post(build_conn(), "/api/v1/product/activation/verify", %{
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

  defp post_json(token, path, params, status \\ 201) do
    build_conn() |> auth(token) |> post(path, params) |> json_response(status)
  end

  defp make_plan(token_a, conv, title, days_out, status) do
    plan =
      post_json(token_a, "/api/v1/product/conversations/#{conv}/plans", %{
        "title" => title,
        "place" => "Juniper and Ivy",
        "location" => "Juniper and Ivy",
        "time_label" => "A day far from now"
      })["plan"]

    start = DateTime.utc_now() |> DateTime.add(days_out * 86_400, :second)

    Repo.get(SharedPlan, plan["id"])
    |> SharedPlan.changeset(%{start_at: start, status: status})
    |> Repo.update!()

    plan["id"]
  end

  defp reveal_items(viewer_id, plan_id, now) do
    Reveal.for_viewer(viewer_id, now: now)["items"]
    |> Enum.filter(&(&1["plan_id"] == plan_id))
  end

  test "far ready plan is reveal-quiet; far pending plan and near ready plan surface" do
    {token_a, user_a} = activate(@a, "Horizon A", "horizon_a")
    {_token_b, user_b} = activate(@b, "Horizon B", "horizon_b")

    conv =
      post_json(token_a, "/api/v1/product/conversations/direct", %{"peer_user_id" => user_b})[
        "conversation_id"
      ]

    now = DateTime.utc_now()
    far_ready = make_plan(token_a, conv, "Far ready dinner", 60, "agreed")
    far_pending = make_plan(token_a, conv, "Far pending dinner", 60, "tentative")
    near_ready = make_plan(token_a, conv, "Near ready dinner", 3, "agreed")

    # The creator's far READY plan needs nothing and is more than
    # 30 days out: no reveal item, no countdown noise.
    assert reveal_items(user_a, far_ready, now) == []

    # The participant's far plan needs their answer (pending): a
    # decision milestone - it surfaces even from the horizon.
    assert reveal_items(user_b, far_pending, now) != []

    # A near ready plan is outside the horizon rule entirely.
    assert reveal_items(user_a, near_ready, now) != []
  end
end
