defmodule OpalCore.InvitesTest do
  use OpalCore.DataCase, async: false
  use Oban.Testing, repo: OpalCore.Repo

  alias OpalCore.Accounts.User
  alias OpalCore.FixturesHelper
  alias OpalCore.Invites
  alias OpalCore.Invites.DeliverInviteSmsWorker
  alias OpalCore.Invites.Invite
  alias OpalCore.Relationships
  alias OpalCore.Repo

  setup do
    FixturesHelper.seed!()
    :ok
  end

  defp fresh_user!(prefix, name) do
    %User{}
    |> User.changeset(%{
      handle: "#{prefix}_#{System.unique_integer([:positive])}",
      display_name: name
    })
    |> Repo.insert!()
  end

  test "create_invite generates unique code and sets expiry" do
    u = fresh_user!("ne1_a", "Maya Chen")
    assert {:ok, inv} = Invites.create_invite(u.id, %{})
    assert inv.status == "sent"
    assert inv.code =~ ~r/^MAYA-[A-Z0-9]{8}$/
    assert DateTime.diff(inv.expires_at, inv.inserted_at, :day) in 29..30
  end

  test "create_invite code uses first-name prefix" do
    u = fresh_user!("ne1_b", "Jordan")
    assert {:ok, inv} = Invites.create_invite(u.id, %{})
    assert String.starts_with?(inv.code, "JORD-")
  end

  test "get_by_code returns nil for expired" do
    u = fresh_user!("ne1_exp", "Alex")
    assert {:ok, inv} = Invites.create_invite(u.id, %{})

    past =
      DateTime.utc_now()
      |> DateTime.add(-2 * 24 * 3600, :second)
      |> DateTime.truncate(:microsecond)

    inv
    |> Invite.changeset(%{expires_at: past})
    |> Repo.update!()

    assert Invites.get_by_code(inv.code) == nil
  end

  test "get_by_code returns invite when valid" do
    u = fresh_user!("ne1_get", "Sam")
    assert {:ok, inv} = Invites.create_invite(u.id, %{})
    assert %Invite{id: id} = Invites.get_by_code(inv.code)
    assert id == inv.id
  end

  test "mark_opened is idempotent" do
    u = fresh_user!("ne1_open", "Pat")
    assert {:ok, inv} = Invites.create_invite(u.id, %{})
    assert {:ok, opened} = Invites.mark_opened(inv.code)
    assert opened.status == "opened"
    assert {:ok, again} = Invites.mark_opened(inv.code)
    assert again.status == "opened"
  end

  test "mark_joined links users, creates friend relationship, increments rewards" do
    inviter = fresh_user!("ne1_inv", "Maya Chen")
    invitee = fresh_user!("ne1_join", "Chris")
    assert {:ok, inv} = Invites.create_invite(inviter.id, %{})

    assert {:ok, joined, welcome} = Invites.mark_joined(inv.code, invitee.id)
    assert joined.status == "joined"
    assert joined.joined_user_id == invitee.id
    assert welcome =~ "Maya Chen invited you to Opal"
    assert welcome =~ "connected"

    assert Relationships.get_type(inviter.id, invitee.id) == "friend"
    assert Relationships.get_type(invitee.id, inviter.id) == "friend"

    rewards = Invites.rewards_for(inviter.id)
    assert rewards.successful_invites == 1
  end

  test "mark_joined rejects already joined" do
    inviter = fresh_user!("ne1_dup", "Maya")
    a = fresh_user!("ne1_a2", "A")
    b = fresh_user!("ne1_b2", "B")
    assert {:ok, inv} = Invites.create_invite(inviter.id, %{})
    assert {:ok, _, _} = Invites.mark_joined(inv.code, a.id)
    assert {:error, :already_joined} = Invites.mark_joined(inv.code, b.id)
  end

  test "mark_joined rejects own invite" do
    u = fresh_user!("ne1_own", "Self")
    assert {:ok, inv} = Invites.create_invite(u.id, %{})
    assert {:error, :cannot_join_own} = Invites.mark_joined(inv.code, u.id)
  end

  test "code collision retries then errors" do
    u = fresh_user!("ne1_col", "Maya Chen")
    assert {:ok, first} = Invites.create_invite(u.id, %{})

    # Force every generate to collide with first code.
    Application.put_env(:opal_core, :invite_code_random, fn ->
      String.split(first.code, "-") |> List.last()
    end)

    on_exit(fn -> Application.delete_env(:opal_core, :invite_code_random) end)

    assert {:error, :code_collision} = Invites.create_invite(u.id, %{})
  end

  test "rate limit max 10 invites per day" do
    u = fresh_user!("ne1_rate", "Rate")

    for _ <- 1..10 do
      assert {:ok, _} = Invites.create_invite(u.id, %{})
    end

    assert {:error, :rate_limited} = Invites.create_invite(u.id, %{})
  end

  test "for_inviter and pending_for_inviter" do
    u = fresh_user!("ne1_list", "List")
    assert {:ok, a} = Invites.create_invite(u.id, %{})
    assert {:ok, _} = Invites.mark_opened(a.code)
    assert {:ok, _} = Invites.create_invite(u.id, %{})

    list = Invites.for_inviter(u.id)
    assert length(list) == 2
    assert Invites.pending_for_inviter(u.id) == 2
  end

  test "SMS honest when phone provided but Twilio not configured" do
    u = fresh_user!("ne1_sms", "Maya Chen")

    System.delete_env("OPAL_TWILIO_ACCOUNT_SID")
    System.delete_env("OPAL_TWILIO_AUTH_TOKEN")
    System.delete_env("OPAL_TWILIO_FROM_NUMBER")
    System.delete_env("OPAL_TWILIO_MESSAGING_SERVICE_SID")

    assert {:ok, inv} =
             Invites.create_invite(u.id, %{"invitee_phone" => "+12025550199"})

    delivery = Invites.maybe_deliver(inv, u)
    assert delivery["sms_queued"] == false
    assert delivery["sms_adapter"] == "disabled"
    assert delivery["sms_honest"] =~ "Twilio"
    assert delivery["share_url"] =~ "/invite/#{inv.code}"
    refute_enqueued(worker: DeliverInviteSmsWorker)
  end

  test "SMS queued when phone provided and Twilio ready" do
    u = fresh_user!("ne1_sms_ready", "Maya Chen")

    System.put_env("OPAL_TWILIO_ACCOUNT_SID", "ACtest")
    System.put_env("OPAL_TWILIO_AUTH_TOKEN", "token")
    System.put_env("OPAL_TWILIO_FROM_NUMBER", "+15551234567")

    on_exit(fn ->
      System.delete_env("OPAL_TWILIO_ACCOUNT_SID")
      System.delete_env("OPAL_TWILIO_AUTH_TOKEN")
      System.delete_env("OPAL_TWILIO_FROM_NUMBER")
    end)

    Oban.Testing.with_testing_mode(:manual, fn ->
      assert {:ok, inv} =
               Invites.create_invite(u.id, %{"invitee_phone" => "+12025550199"})

      delivery = Invites.maybe_deliver(inv, u)
      assert delivery["sms_queued"] == true
      assert delivery["sms_adapter"] == "twilio"
      assert_enqueued(worker: DeliverInviteSmsWorker)
    end)
  end

  test "no SMS when phone absent — share link only" do
    u = fresh_user!("ne1_link", "Maya")
    assert {:ok, inv} = Invites.create_invite(u.id, %{})
    delivery = Invites.maybe_deliver(inv, u)
    assert delivery["sms_queued"] == false
    assert delivery["share_url"] =~ "/invite/#{inv.code}"
  end

  test "email without mailer logs and returns share note" do
    u = fresh_user!("ne1_em", "Maya")
    assert {:ok, inv} = Invites.create_invite(u.id, %{"invitee_email" => "friend@example.com"})
    delivery = Invites.maybe_deliver(inv, u)
    assert delivery["email_queued"] == false
    assert delivery["email_note"] == "no_email_system_use_share_link"
  end

  test "validate_code ok then already_joined" do
    inviter = fresh_user!("ne1_val", "Maya")
    invitee = fresh_user!("ne1_val2", "Jo")
    assert {:ok, inv} = Invites.create_invite(inviter.id, %{})
    assert {:ok, _} = Invites.validate_code(inv.code)
    assert {:ok, _, _} = Invites.mark_joined(inv.code, invitee.id)
    assert {:error, :already_joined} = Invites.validate_code(inv.code)
  end

  test "share_url format" do
    url = Invites.share_url("MAYA-X7K2")
    assert url =~ ~r{/invite/MAYA-X7K2$}
    assert String.starts_with?(url, "http")
  end
end
