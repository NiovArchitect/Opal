defmodule OpalCore.SocialFlow.GoogleOfflineRefreshTest do
  use OpalCore.DataCase

  alias OpalCore.Accounts.User
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.RealWorld.Calendar.GoogleAdapter
  alias OpalCore.SocialFlow.RealWorld.ProviderConnections

  defmodule HTTPNoRefreshOnReauth do
    def post_form(_url, body) do
      cond do
        body["grant_type"] == "authorization_code" and body["code"] == "first" ->
          {:ok,
           %{
             "access_token" => "access-1",
             "refresh_token" => "refresh-keep",
             "expires_in" => 3600,
             "scope" => GoogleAdapter.preferred_scope()
           }}

        body["grant_type"] == "authorization_code" ->
          # Re-auth often omits refresh_token
          {:ok,
           %{
             "access_token" => "access-2",
             "expires_in" => 3600,
             "scope" => GoogleAdapter.preferred_scope()
           }}

        body["grant_type"] == "refresh_token" ->
          {:ok,
           %{
             "access_token" => "access-refreshed",
             "expires_in" => 3600
             # no refresh_token rotation
           }}

        true ->
          {:error, :http_error}
      end
    end

    def post_json(_url, _body, _opts),
      do: {:ok, %{"calendars" => %{"primary" => %{"busy" => []}}}}
  end

  setup do
    previous = Application.get_env(:opal_core, :google_calendar_http_client)
    Application.put_env(:opal_core, :google_calendar_http_client, HTTPNoRefreshOnReauth)
    Application.put_env(:opal_core, :google_calendar_client_id, "cid")
    Application.put_env(:opal_core, :google_calendar_client_secret, "csec")

    Application.put_env(
      :opal_core,
      :google_calendar_redirect_uri,
      GoogleAdapter.hosted_redirect_uri()
    )

    on_exit(fn ->
      Application.put_env(:opal_core, :google_calendar_http_client, previous)
      Application.delete_env(:opal_core, :google_calendar_client_id)
      Application.delete_env(:opal_core, :google_calendar_client_secret)
      Application.delete_env(:opal_core, :google_calendar_redirect_uri)
    end)

    {:ok, user} =
      %User{}
      |> User.changeset(%{
        display_name: "G",
        handle: "goff-#{System.unique_integer([:positive])}"
      })
      |> Repo.insert()

    %{user: user}
  end

  test "authorize URL requests offline access and consent for refresh token" do
    assert {:ok, url} = GoogleAdapter.authorize_url("state", code_challenge: "ch")
    assert url =~ "access_type=offline"
    assert url =~ "prompt=consent"
    assert url =~ "code_challenge=ch"
    # Hosted default when env set in setup
    assert url =~ URI.encode_www_form(GoogleAdapter.hosted_redirect_uri()) or
             url =~ "api.opal.niovlabs.com"
  end

  test "preserves refresh token when Google omits it on re-exchange", %{user: user} do
    assert {:ok, first} = GoogleAdapter.exchange_code("first")
    assert first.refresh_token == "refresh-keep"
    assert {:ok, _} = ProviderConnections.upsert_tokens(user.id, "google_calendar", first)

    assert {:ok, second} = GoogleAdapter.exchange_code("second")
    assert is_nil(second.refresh_token)
    assert {:ok, _} = ProviderConnections.upsert_tokens(user.id, "google_calendar", second)

    row = ProviderConnections.get(user.id, "google_calendar")
    assert {:ok, "refresh-keep"} = ProviderConnections.refresh_token(row)
    assert {:ok, "access-2"} = ProviderConnections.access_token(row)
  end

  test "hosted redirect URI constant is exact Opal API path" do
    assert GoogleAdapter.hosted_redirect_uri() ==
             "https://api.opal.niovlabs.com/api/v1/product/connectors/google_calendar/callback"
  end

  test "authorized_redirect_uris lists every console paste target" do
    uris = GoogleAdapter.authorized_redirect_uris()

    assert GoogleAdapter.hosted_redirect_uri() in uris
    assert GoogleAdapter.local_redirect_uri() in uris
    assert GoogleAdapter.hosted_oauth_redirect_uri() in uris
    assert GoogleAdapter.local_oauth_redirect_uri() in uris

    assert "https://api.opal.niovlabs.com/api/v1/product/oauth/google/callback" in uris
    assert "http://127.0.0.1:4000/api/v1/product/oauth/google/callback" in uris
  end
end
