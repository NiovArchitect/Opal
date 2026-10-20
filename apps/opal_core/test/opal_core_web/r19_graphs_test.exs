defmodule OpalCoreWeb.R19GraphsTest do
  @moduledoc """
  Repair #19 W7 - graphs as futures backbone regressions:

  - private flag: the creator's list carries the plan flagged; every
    other participant's list excludes it entirely; non-creator cannot
    set the flag; the plan contract carries is_private.
  - graph lock: set + verify round-trip, wrong code denied, no lock
    set verifies nothing, hash never equals the code.
  - living detail: PlanHistory who rows carry a finished location
    line - not sharing renders no distance; a fresh per-plan share
    plus real place coordinates renders a measured distance; a share
    without place coordinates renders sharing with the distance
    honestly unavailable.
  """
  use OpalCoreWeb.ConnCase, async: false

  alias OpalCore.FixturesHelper
  alias OpalCore.Repo
  alias OpalCore.SocialFlow
  alias OpalCore.SocialFlow.GraphLock
  alias OpalCore.SocialFlow.PhoneVerification.Provider
  alias OpalCore.SocialFlow.PlanHistory
  alias OpalCore.SocialFlow.PlanLocationShare
  alias OpalCore.SocialFlow.PlanParticipant
  alias OpalCore.SocialFlow.PlanTransition
  alias OpalCore.SocialFlow.SharedPlan

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
        "idempotency_key" => "r19-ch-#{handle}-#{System.unique_integer([:positive])}"
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

  defp plan!(creator_id, other_id, attrs \\ %{}) do
    base = %{
      "title" => "R19 plan",
      "status" => "agreed",
      "start_at" => DateTime.utc_now() |> DateTime.truncate(:microsecond),
      "timezone" => "UTC",
      "time_label" => "Saturday 7 PM",
      "location" => "Juniper & Ivy",
      "created_by_user_id" => creator_id,
      "source" => "center",
      "alignment" => %{}
    }

    {:ok, plan} =
      %SharedPlan{}
      |> SharedPlan.changeset(Map.merge(base, attrs))
      |> PlanTransition.guard_changeset(:plan, :create_agreed)
      |> Repo.insert()

    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    for {user_id, role} <- [{creator_id, "lead"}, {other_id, "participant"}] do
      {:ok, _} =
        %PlanParticipant{}
        |> PlanParticipant.changeset(%{
          "plan_id" => plan.id,
          "user_id" => user_id,
          "role" => role,
          "response_state" => "accepted",
          "responded_at" => now
        })
        |> Repo.insert()
    end

    plan
  end

  describe "private graphs (Polish C P3 - per-viewer vault)" do
    # Founder's owner-vault spec supersedes the W7 plan-global flag:
    # hiding is PER-VIEWER. The marker's list flags the plan; every
    # other party keeps the plan in their list with is_private false
    # (the marker never leaks); un-marking restores the marker's own
    # ordinary view. A stranger (no access to the plan) cannot mark.
    test "marking is per-viewer: marker flagged, other party unchanged and unmarked, un-mark restores" do
      {_t1, owner} = activate("+12025550111", "Owner One", "r19owner")
      {_t2, guest} = activate("+12025550112", "Guest Two", "r19guest")
      plan = plan!(owner, guest)

      {:ok, owner_plans0} = SocialFlow.list_plans_for_user(owner)
      owner_row0 = Enum.find(owner_plans0, &(&1["id"] == plan.id))
      assert owner_row0["is_private"] == false

      assert {:ok, contract} = SocialFlow.set_plan_private(plan.id, owner, true)
      assert contract["is_private"] == true

      {:ok, owner_plans} = SocialFlow.list_plans_for_user(owner)
      assert Enum.any?(owner_plans, &(&1["id"] == plan.id and &1["is_private"] == true))

      # The other party's view is UNCHANGED and carries no marker.
      {:ok, guest_plans} = SocialFlow.list_plans_for_user(guest)
      guest_row = Enum.find(guest_plans, &(&1["id"] == plan.id))
      assert guest_row != nil
      assert guest_row["is_private"] == false

      # The guest can vault it for THEMSELVES; the owner's flag is
      # untouched by the guest's mark.
      assert {:ok, guest_contract} = SocialFlow.set_plan_private(plan.id, guest, true)
      assert guest_contract["is_private"] == true
      {:ok, owner_plans2} = SocialFlow.list_plans_for_user(owner)
      assert Enum.any?(owner_plans2, &(&1["id"] == plan.id and &1["is_private"] == true))
      assert {:ok, _} = SocialFlow.set_plan_private(plan.id, guest, false)

      # Clearing restores the marker's ordinary (unflagged) row.
      assert {:ok, _} = SocialFlow.set_plan_private(plan.id, owner, false)
      {:ok, owner_plans3} = SocialFlow.list_plans_for_user(owner)
      owner_row3 = Enum.find(owner_plans3, &(&1["id"] == plan.id))
      assert owner_row3["is_private"] == false
    end

    test "a stranger with no access to the plan cannot mark it" do
      {_t1, owner} = activate("+12025550113", "Owner Three", "r19owner3")
      {_t2, guest} = activate("+12025550114", "Guest Four", "r19guest4")
      {_t3, stranger} = activate("+12025550913", "Stranger", "r19stranger")
      plan = plan!(owner, guest)

      assert {:error, :not_authorized} = SocialFlow.set_plan_private(plan.id, stranger, true)
      refute OpalCore.SocialFlow.PlanPrivacyMark.marked?(stranger, plan.id)
      refute OpalCore.SocialFlow.PlanPrivacyMark.marked?(owner, plan.id)
    end

    test "private endpoint: each party marks their own view; a stranger is refused" do
      {owner_token, owner} = activate("+12025550115", "Owner Five", "r19owner5")
      {guest_token, guest} = activate("+12025550116", "Guest Six", "r19guest6")
      {stranger_token, _stranger} = activate("+12025550915", "Stranger E", "r19strangere")
      plan = plan!(owner, guest)

      conn =
        build_conn()
        |> auth(stranger_token)
        |> post("/api/v1/product/opal/plans/#{plan.id}/private", %{"is_private" => true})

      assert json_response(conn, 403)

      conn =
        build_conn()
        |> auth(owner_token)
        |> post("/api/v1/product/opal/plans/#{plan.id}/private", %{"is_private" => true})

      body = json_response(conn, 200)
      assert body["plan"]["is_private"] == true

      # The guest marking their own view does not flag the owner's.
      conn =
        build_conn()
        |> auth(guest_token)
        |> post("/api/v1/product/opal/plans/#{plan.id}/private", %{"is_private" => true})

      assert json_response(conn, 200)["plan"]["is_private"] == true
      {:ok, owner_plans} = SocialFlow.list_plans_for_user(owner)
      assert Enum.any?(owner_plans, &(&1["id"] == plan.id and &1["is_private"] == true))
      {:ok, guest_plans} = SocialFlow.list_plans_for_user(guest)
      assert Enum.any?(guest_plans, &(&1["id"] == plan.id and &1["is_private"] == true))
    end
  end

  describe "graph lock" do
    test "set + verify round-trip; wrong code and unset lock never verify" do
      {_t, user} = activate("+12025550117", "Lock Seven", "r19lock7")

      refute GraphLock.set?(user)
      refute GraphLock.verify(user, "2468")

      assert :ok = GraphLock.set_passcode(user, "2468")
      assert GraphLock.set?(user)
      assert GraphLock.verify(user, "2468")
      refute GraphLock.verify(user, "0000")
      refute GraphLock.verify(user, "")

      stored = Repo.get_by(GraphLock, user_id: user)
      refute stored.passcode_hash == "2468"
      refute String.contains?(inspect(stored.passcode_hash), "2468")
    end

    test "lock endpoints: wrong code is a 403 with unlocked false" do
      {token, _user} = activate("+12025550118", "Lock Eight", "r19lock8")

      conn = build_conn() |> auth(token) |> post("/api/v1/product/opal/graph-lock", %{"code" => "1357"})
      assert json_response(conn, 200)["passcode_set"] == true

      conn =
        build_conn()
        |> auth(token)
        |> post("/api/v1/product/opal/graph-lock/verify", %{"code" => "9999"})

      assert json_response(conn, 403)["unlocked"] == false

      conn =
        build_conn()
        |> auth(token)
        |> post("/api/v1/product/opal/graph-lock/verify", %{"code" => "1357"})

      assert json_response(conn, 200)["unlocked"] == true
    end

    test "too-short codes are refused" do
      {_t, user} = activate("+12025550119", "Lock Nine", "r19lock9")
      assert {:error, :code_too_short} = GraphLock.set_passcode(user, "12")
      refute GraphLock.set?(user)
    end
  end

  describe "vault marks never gate direct reads (Polish C P3, supersedes BS-03)" do
    alias OpalCore.Artifacts
    alias OpalCore.SocialFlow.Checkin
    alias OpalCore.SocialFlow.JourneyAuthority

    test "participant reads are UNAFFECTED once the owner marks it; the marker reads from the vault" do
      {owner_token, owner} = activate("+12025550131", "Priv Owner", "r19privown")
      {guest_token, guest} = activate("+12025550132", "Priv Guest", "r19privguest")
      plan = plan!(owner, guest)

      # Non-private: every participant read path works.
      assert {:ok, _} = SocialFlow.get_plan_for_user(plan.id, guest)
      assert {:ok, _} = PlanHistory.for_plan(plan.id, guest)
      assert {:ok, _} = JourneyAuthority.get(plan.id, guest)
      assert {:ok, _, _} = SocialFlow.food_step_for_user(plan.id, guest)
      assert {:ok, _} = Artifacts.collect_facts(guest, "event_plan", plan.id)

      assert {:ok, _sweep, :created} =
               Checkin.create_sweep(
                 guest,
                 %{"kind" => "plan", "ref_id" => plan.id},
                 idempotency_key: "bs03-open-#{plan.id}"
               )

      conn =
        build_conn()
        |> auth(guest_token)
        |> get("/api/v1/product/plans/#{plan.id}/execution")

      assert conn.status == 200

      conn =
        build_conn()
        |> auth(guest_token)
        |> get("/api/v1/product/opal/plans/#{plan.id}/history")

      assert json_response(conn, 200)["plan_id"] == plan.id

      # The owner vaults it (per-viewer): the participant keeps EVERY
      # direct read path - hiding governs the marker's surfaces only.
      assert {:ok, _} = SocialFlow.set_plan_private(plan.id, owner, true)

      assert {:ok, _} = SocialFlow.get_plan_for_user(plan.id, guest)
      assert {:ok, _} = PlanHistory.for_plan(plan.id, guest)
      assert {:ok, _} = JourneyAuthority.get(plan.id, guest)
      assert {:ok, _, _} = SocialFlow.food_step_for_user(plan.id, guest)
      assert {:ok, _} = Artifacts.collect_facts(guest, "event_plan", plan.id)

      # The sweep resolves (the pre-mark sweep is still open, so the
      # honest answer is :already_open - the read path itself works).
      assert {:ok, _sweep, :already_open} =
               Checkin.create_sweep(
                 guest,
                 %{"kind" => "plan", "ref_id" => plan.id},
                 idempotency_key: "bs03-priv-#{plan.id}"
               )

      conn =
        build_conn()
        |> auth(guest_token)
        |> get("/api/v1/product/plans/#{plan.id}/execution")

      assert conn.status == 200

      conn =
        build_conn()
        |> auth(guest_token)
        |> get("/api/v1/product/opal/plans/#{plan.id}/history")

      assert json_response(conn, 200)["plan_id"] == plan.id

      # The owner's own reads are unaffected on every path (the
      # vault opens the plan; the mark is not an access denial).
      assert {:ok, _} = SocialFlow.get_plan_for_user(plan.id, owner)
      assert {:ok, _} = PlanHistory.for_plan(plan.id, owner)
      assert {:ok, _} = JourneyAuthority.get(plan.id, owner)
      assert {:ok, _, _} = SocialFlow.food_step_for_user(plan.id, owner)
      assert {:ok, _} = Artifacts.collect_facts(owner, "event_plan", plan.id)

      assert {:ok, _sweep, :created} =
               Checkin.create_sweep(
                 owner,
                 %{"kind" => "plan", "ref_id" => plan.id},
                 idempotency_key: "bs03-owner-#{plan.id}"
               )

      conn =
        build_conn()
        |> auth(owner_token)
        |> get("/api/v1/product/plans/#{plan.id}/execution")

      assert conn.status == 200

      conn =
        build_conn()
        |> auth(owner_token)
        |> get("/api/v1/product/opal/plans/#{plan.id}/history")

      assert json_response(conn, 200)["plan_id"] == plan.id

      # Clearing the mark leaves the participant's reads as they were.
      assert {:ok, _} = SocialFlow.set_plan_private(plan.id, owner, false)
      assert {:ok, _} = SocialFlow.get_plan_for_user(plan.id, guest)
      assert {:ok, _} = PlanHistory.for_plan(plan.id, guest)
    end

    test "a conversation plan the owner vaults stays readable by its conversation members; a non-member stays denied by membership" do
      {_t1, owner} = activate("+12025550133", "Conv Owner", "r19convown")
      {_t2, guest} = activate("+12025550134", "Conv Guest", "r19convguest")
      {_t3, third} = activate("+12025550135", "Conv Third", "r19convthird")

      {:ok, %{conversation_id: conversation_id}} =
        OpalCore.Messages.ensure_direct_conversation(owner, guest)

      plan =
        plan!(owner, guest, %{
          "source" => "conversation",
          "conversation_id" => conversation_id
        })

      # Conversation membership alone read it before the flag.
      assert {:ok, _} = SocialFlow.get_plan_for_user(plan.id, guest)
      assert {:ok, _} = JourneyAuthority.get(plan.id, guest)

      assert {:ok, _} = SocialFlow.set_plan_private(plan.id, owner, true)
      # Per-viewer: members keep their reads; the non-member's denial
      # is the ordinary membership denial, unchanged by the mark.
      assert {:ok, _} = SocialFlow.get_plan_for_user(plan.id, guest)
      assert {:ok, _} = JourneyAuthority.get(plan.id, guest)
      assert {:error, :forbidden} = SocialFlow.get_plan_for_user(plan.id, third)
      assert {:ok, _} = SocialFlow.get_plan_for_user(plan.id, owner)
    end
  end

  describe "living detail location projection" do
    test "not sharing: honest label, no distance, no basis" do
      {_t1, owner} = activate("+12025550120", "Loc Ten", "r19loc10")
      {_t2, guest} = activate("+12025550121", "Loc Eleven", "r19loc11")
      plan = plan!(owner, guest, %{"place_lat" => 32.7231, "place_lon" => -117.1683})

      {:ok, projection} = PlanHistory.for_plan(plan.id, owner)
      guest_row = Enum.find(projection["who"], &(&1["user_id"] == guest))
      assert guest_row["location_state"] == "not_sharing"
      assert guest_row["location_label"] == "Not sharing location"
      assert guest_row["distance_label"] == nil
      assert guest_row["distance_basis"] == nil
    end

    test "sharing with place coordinates: measured distance to the place" do
      {_t1, owner} = activate("+12025550122", "Loc Twelve", "r19loc12")
      {_t2, guest} = activate("+12025550123", "Loc Thirteen", "r19loc13")
      plan = plan!(owner, guest, %{"place_lat" => 32.7231, "place_lon" => -117.1683})

      assert {:ok, _} =
               PlanLocationShare.share(plan.id, guest, %{"lat" => 32.7503, "lon" => -117.16})

      {:ok, projection} = PlanHistory.for_plan(plan.id, owner)
      guest_row = Enum.find(projection["who"], &(&1["user_id"] == guest))
      assert guest_row["location_state"] == "sharing"
      assert guest_row["distance_basis"] == "measured"
      assert is_binary(guest_row["distance_label"])
      assert guest_row["distance_label"] =~ "mi away"
      assert guest_row["location_label"] =~ guest_row["distance_label"]
    end

    test "sharing without place coordinates: sharing, distance honestly unavailable" do
      {_t1, owner} = activate("+12025550124", "Loc Fourteen", "r19loc14")
      {_t2, guest} = activate("+12025550125", "Loc Fifteen", "r19loc15")
      plan = plan!(owner, guest)

      assert {:ok, _} =
               PlanLocationShare.share(plan.id, guest, %{"lat" => 32.7503, "lon" => -117.16})

      {:ok, projection} = PlanHistory.for_plan(plan.id, owner)
      guest_row = Enum.find(projection["who"], &(&1["user_id"] == guest))
      assert guest_row["location_state"] == "sharing"
      assert guest_row["distance_label"] == nil
      assert guest_row["location_label"] =~ "no coordinates"
    end

    test "stopping sharing returns the row to not sharing; expired shares read as not sharing" do
      {_t1, owner} = activate("+12025550126", "Loc Sixteen", "r19loc16")
      {_t2, guest} = activate("+12025550127", "Loc Seventeen", "r19loc17")
      plan = plan!(owner, guest, %{"place_lat" => 32.7231, "place_lon" => -117.1683})

      assert {:ok, share} =
               PlanLocationShare.share(plan.id, guest, %{"lat" => 32.7503, "lon" => -117.16})

      future = DateTime.add(share.expires_at, 60, :second)
      assert PlanLocationShare.fresh_for(plan.id, guest, future) == nil

      assert :ok = PlanLocationShare.stop(plan.id, guest)
      {:ok, projection} = PlanHistory.for_plan(plan.id, owner)
      guest_row = Enum.find(projection["who"], &(&1["user_id"] == guest))
      assert guest_row["location_state"] == "not_sharing"
    end

    test "location-share endpoint: a non-participant cannot share into a plan" do
      {owner_token, owner} = activate("+12025550128", "Loc Eighteen", "r19loc18")
      {_t2, guest} = activate("+12025550129", "Loc Nineteen", "r19loc19")
      {stranger_token, _stranger} = activate("+12025550130", "Loc Twenty", "r19loc20")
      plan = plan!(owner, guest)

      conn =
        build_conn()
        |> auth(stranger_token)
        |> post("/api/v1/product/opal/plans/#{plan.id}/location-share", %{
          "lat" => 32.75,
          "lon" => -117.16
        })

      assert conn.status in [403, 404]

      conn =
        build_conn()
        |> auth(owner_token)
        |> post("/api/v1/product/opal/plans/#{plan.id}/location-share", %{
          "lat" => 32.75,
          "lon" => -117.16
        })

      assert json_response(conn, 200)["sharing"] == true
    end
  end
end
