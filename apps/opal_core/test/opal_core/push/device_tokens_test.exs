defmodule OpalCore.Push.DeviceTokensTest do
  use OpalCore.DataCase, async: false

  alias OpalCore.Push.DeviceToken
  alias OpalCore.Push.DeviceTokens
  alias OpalCore.Repo

  @user "push-user-1"
  @token "device-token-abc12345"

  test "upsert inserts a new active token" do
    assert {:ok, row} =
             DeviceTokens.upsert(@user, %{
               "platform" => "ios",
               "token" => @token,
               "env" => "sandbox"
             })

    assert row.user_id == @user
    assert row.platform == "ios"
    assert row.token == @token
    assert row.env == "sandbox"
    assert is_nil(row.disabled_at)
    assert DeviceToken.to_contract(row)["active"] == true
  end

  test "upsert updates same token and reassigns user / re-enables" do
    assert {:ok, _} =
             DeviceTokens.upsert(@user, %{
               "platform" => "ios",
               "token" => @token,
               "env" => "sandbox"
             })

    assert {:ok, disabled} = DeviceTokens.disable(@user, @token)
    assert disabled.disabled_at

    assert {:ok, row} =
             DeviceTokens.upsert("push-user-2", %{
               "platform" => "android",
               "token" => @token,
               "env" => "production"
             })

    assert row.user_id == "push-user-2"
    assert row.platform == "android"
    assert row.env == "production"
    assert is_nil(row.disabled_at)
    assert Repo.aggregate(DeviceToken, :count) == 1
  end

  test "disable soft-sets disabled_at and never hard-deletes" do
    assert {:ok, _} =
             DeviceTokens.upsert(@user, %{
               "platform" => "ios",
               "token" => @token,
               "env" => "sandbox"
             })

    assert {:ok, row} = DeviceTokens.disable(@user, @token)
    assert row.disabled_at
    assert Repo.get_by(DeviceToken, token: @token)
    assert DeviceTokens.list_active(@user) == []
  end

  test "disable is idempotent for already-disabled tokens" do
    assert {:ok, _} =
             DeviceTokens.upsert(@user, %{
               "platform" => "ios",
               "token" => @token,
               "env" => "sandbox"
             })

    assert {:ok, _} = DeviceTokens.disable(@user, @token)
    assert {:ok, row} = DeviceTokens.disable(@user, @token)
    assert row.disabled_at
  end

  test "disable of another user's token is forbidden" do
    assert {:ok, _} =
             DeviceTokens.upsert(@user, %{
               "platform" => "ios",
               "token" => @token,
               "env" => "sandbox"
             })

    assert {:error, :forbidden} = DeviceTokens.disable("other-user", @token)
  end

  test "list_active returns only non-disabled tokens for user" do
    assert {:ok, _} =
             DeviceTokens.upsert(@user, %{
               "platform" => "ios",
               "token" => "tok-active-11111111",
               "env" => "sandbox"
             })

    assert {:ok, _} =
             DeviceTokens.upsert(@user, %{
               "platform" => "android",
               "token" => "tok-disabled-2222222",
               "env" => "sandbox"
             })

    assert {:ok, _} = DeviceTokens.disable(@user, "tok-disabled-2222222")

    active = DeviceTokens.list_active(@user)
    assert length(active) == 1
    assert hd(active).token == "tok-active-11111111"
  end
end
