# Seed Walk B (other user) Live for founder Walk A visibility proofs.
# Usage (from apps/opal_core):
#   mix run ../../scripts/seed_other_user_live.exs
#
# Writes /tmp/opal_other_user_live.json (never commit tokens).

import Ecto.Query

alias OpalCore.Lives
alias OpalCore.Repo
alias OpalCore.Lives.LiveRoom
alias OpalCore.SocialFlow.RelationshipGraph

walk_a = "47aa5856-8c56-4b18-a4d4-6a9b456516a8"
walk_b = "b599fcd7-7a97-4736-8221-86e0a6d8dc7a"

unless RelationshipGraph.friend_visibility_authorized?(walk_a, walk_b) do
  IO.puts("WARN: Walk A/B friend edge missing — visible list may omit other-user Live")
end

# End any active Walk B lives so fixture is deterministic.
for room <-
      from(r in LiveRoom,
        where: r.host_account_id == ^walk_b and r.status == "live"
      )
      |> Repo.all() do
  _ = Lives.end_live(room.id, walk_b)
end

# Reuse known test venue place_id to avoid new_venue_rate_limited.
{:ok, %{live_room: room, venue: venue}} =
  Lives.go_live(walk_b, "test-maya-spot-san-diego",
    name: "Maya Spot",
    address: "San Diego",
    title: "Walk B Live fixture",
    allow_fixture: true,
    allow_provisional: true,
    test_only: true,
    audience: "friends",
    location_precision: "venue"
  )

visible_a = Lives.list_visible_lives(walk_a)
other =
  Enum.find(visible_a, fn row ->
    get_in(row, ["live_room", "id"]) == room.id
  end)

out = %{
  "host_user_id" => walk_b,
  "viewer_user_id" => walk_a,
  "live_room_id" => room.id,
  "venue_id" => venue.id,
  "venue_name" => venue.name,
  "place_id" => venue.place_id,
  "audience" => "friends",
  "location_precision" => "venue",
  "visible_to_walk_a" => not is_nil(other),
  "visible_count_walk_a" => length(visible_a)
}

path = "/tmp/opal_other_user_live.json"
File.write!(path, Jason.encode!(out, pretty: true))
IO.puts("WROTE #{path}")
IO.puts(Jason.encode!(out))
