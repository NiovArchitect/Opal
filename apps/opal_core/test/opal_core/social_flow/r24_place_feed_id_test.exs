defmodule OpalCore.SocialFlow.R24PlaceFeedIdTest do
  @moduledoc """
  Repair #24 (D-P1) - the home feed card carries the moment
  record's stable place identity (its place_ref provider_place_id,
  normalized at publish) as place_id, additively, so the client's
  place builder can group on identity where identity honestly
  exists. A moment whose place_ref carries no provider identity
  projects place_id nil - never a derived or invented id.
  """
  use OpalCore.DataCase, async: false

  alias OpalCore.Accounts.User
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.{HomeFeed, SocialMomentPublishing}

  defp insert_user!(handle, name) do
    %User{}
    |> User.changeset(%{handle: handle, display_name: name})
    |> Repo.insert!()
  end

  test "feed card carries place_id from the record's place_ref, and nil when the record carries none" do
    author = insert_user!("r24_author", "R24 Author")

    {:ok, with_id} =
      SocialMomentPublishing.publish(author.id, %{
        "caption" => "At the pier",
        "visibility" => "private",
        "media_ids" => [],
        "place_ref" => %{
          "display_name" => "Oceanside Pier",
          "provider_place_id" => "places/ChIJ_r24_pier",
          "provider" => "recorded_fixture"
        }
      })

    {:ok, without_id} =
      SocialMomentPublishing.publish(author.id, %{
        "caption" => "At the depot",
        "visibility" => "private",
        "media_ids" => [],
        "place_ref" => %{"display_name" => "The Depot"}
      })

    feed = HomeFeed.compose(author.id, limit: 20)
    cards = Map.new(feed["objects"], &{&1["id"], &1})

    pier = cards[with_id["moment"]["id"]]
    assert pier["place_label"] == "Oceanside Pier"
    assert pier["place_id"] == "places/ChIJ_r24_pier"

    depot = cards[without_id["moment"]["id"]]
    assert depot["place_label"] == "The Depot"
    assert depot["place_id"] == nil
  end
end
