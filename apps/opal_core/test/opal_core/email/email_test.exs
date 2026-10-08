defmodule OpalCore.EmailTest do
  use OpalCore.DataCase, async: false
  use Oban.Testing, repo: OpalCore.Repo

  alias OpalCore.Accounts.User
  alias OpalCore.Bookings.Service
  alias OpalCore.Email
  alias OpalCore.Email.ConfirmationWatchWorker
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.RealWorld.ProviderConnections
  alias OpalCore.SocialMemory.Commitment

  defmodule FakeGmailHTTP do
    def get_json(url, _opts) do
      cond do
        String.contains?(url, "/messages?") and String.contains?(url, "q=") ->
          {:ok, %{"messages" => [%{"id" => "m1"}], "resultSizeEstimate" => 1}}

        String.contains?(url, "/messages/m1") ->
          subject = "Your flight confirmation ABC1234"
          body_b64 = Base.encode64("Confirmation number: ABC1234. Have a nice trip.")

          {:ok,
           %{
             "id" => "m1",
             "threadId" => "t1",
             "snippet" => "Confirmation number: ABC1234",
             "payload" => %{
               "headers" => [
                 %{"name" => "Subject", "value" => subject},
                 %{"name" => "From", "value" => "noreply@airline.test"}
               ],
               "body" => %{"data" => body_b64}
             }
           }}

        true ->
          {:error, :unexpected_url}
      end
    end
  end

  setup do
    prior = Application.get_env(:opal_core, :gmail_http_client)
    Application.put_env(:opal_core, :gmail_http_client, FakeGmailHTTP)
    Application.put_env(:opal_core, :google_calendar_client_id, "cid")
    Application.put_env(:opal_core, :google_calendar_client_secret, "csec")

    on_exit(fn ->
      restore(:gmail_http_client, prior)
      Application.delete_env(:opal_core, :google_calendar_client_id)
      Application.delete_env(:opal_core, :google_calendar_client_secret)
    end)

    {:ok, user} =
      %User{}
      |> User.changeset(%{display_name: "Em", handle: "em-#{System.unique_integer([:positive])}"})
      |> Repo.insert()

    assert {:ok, _} =
             ProviderConnections.upsert_tokens(user.id, "google_calendar", %{
               access_token: "ya29.access",
               refresh_token: "1//refresh",
               token_expires_at: DateTime.add(DateTime.utc_now(), 3600, :second),
               scopes: OpalCore.Calendar.oauth_scopes(),
               metadata: %{}
             })

    %{user: user}
  end

  defp restore(key, nil), do: Application.delete_env(:opal_core, key)
  defp restore(key, val), do: Application.put_env(:opal_core, key, val)

  test "search requires non-empty query — audit never full-inbox" do
    assert Email.requires_non_empty_query?() == true
    assert {:error, :empty_query} = Email.search(Ecto.UUID.generate(), "")
    assert {:error, :empty_query} = Email.search(Ecto.UUID.generate(), "   ")
    assert {:error, :empty_query} = Email.search(Ecto.UUID.generate(), nil)
  end

  test "targeted search + get_message extracts facts without email_body", %{user: user} do
    assert {:ok, %{"message_ids" => ["m1"]}} = Email.search(user.id, "confirmation flight")
    assert {:ok, facts} = Email.get_message(user.id, "m1")

    assert facts["confirmation_number"] == "ABC1234"
    assert facts["subject"] =~ "confirmation"
    refute Map.has_key?(facts, "email_body")
    refute Map.has_key?(facts, "body")
    refute Map.has_key?(facts, "raw")
  end

  test "confirmation watch worker writes commitment_ledger without body column", %{user: user} do
    assert {:ok, %{kind: :search_results, booking: booking}} =
             Service.search(user.id, %{"booking_type" => "flight", "destination" => "SFO"},
               allow_test_mock: true
             )

    assert {:ok, %{kind: :confirmed, booking: confirmed}} =
             Service.confirm(user.id, %{"id" => booking["id"], "offer_id" => "mock-offer"},
               allow_test_mock: true
             )

    # Short window in test — run worker immediately
    assert :ok =
             perform_job(ConfirmationWatchWorker, %{
               "account_id" => user.id,
               "booking_id" => confirmed["id"],
               "attempt" => 0,
               "window_sec" => 30,
               "started_at" => DateTime.utc_now() |> DateTime.to_iso8601()
             })

    commits = Repo.all(Commitment)
    assert Enum.any?(commits, fn c -> c.account_id == user.id and c.description =~ "Email confirmation" end)

    # Schema has no email_body field
    refute Map.has_key?(%Commitment{}, :email_body)
  end

  test "disconnected user search is honest" do
    assert {:error, :disconnected} = Email.search(Ecto.UUID.generate(), "anything real")
  end
end
