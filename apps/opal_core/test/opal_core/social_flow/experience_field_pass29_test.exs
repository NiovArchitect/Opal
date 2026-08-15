defmodule OpalCore.SocialFlow.ExperienceFieldPass29Test do
  use ExUnit.Case, async: true

  alias OpalCore.SocialFlow.{ExperienceField, FollowGraph}

  test "not a feed: caps visible cards from large candidate set" do
    moments =
      for i <- 1..100 do
        %{
          "id" => "m#{i}",
          "author_user_id" => "c#{rem(i, 10)}",
          "caption" => if(rem(i, 3) == 0, do: "jazz night", else: "coffee morning"),
          "views" => i * 10_000,
          "commission_value" => i * 5,
          "author_posts_today" => i,
          "place_ref" => %{"display_name" => "Venue #{i}", "city" => "San Diego"}
        }
      end

    {:ok, g, _} = FollowGraph.follow(FollowGraph.new(), "viewer", "c1")

    field =
      ExperienceField.for_viewer("viewer", moments, %{
        "follow_graph" => g,
        "hour" => 21,
        "viewer_city" => "San Diego",
        "max_visible" => 3
      })

    assert field["not_a_feed_engine"] == true
    assert field["not_home_attention"] == true
    assert field["discovery_uses_commission"] == false
    assert field["discovery_uses_raw_views"] == false
    assert field["candidate_count"] == 100
    assert field["card_count"] <= 3
    assert field["card_count"] <= field["visible_cap"]
    assert length(field["cards"]) == field["card_count"]
    # High commission / views must not force card identity
    refute Enum.any?(field["cards"], &(&1["commerce_led"] == true))
  end

  test "commission and views do not outrank fit" do
    moments = [
      %{
        "id" => "spam",
        "author_user_id" => "viral",
        "caption" => "random post",
        "views" => 9_999_999,
        "commission_value" => 9999,
        "author_posts_today" => 50,
        "place_ref" => %{"display_name" => "Ad Spot", "city" => "San Diego"}
      },
      %{
        "id" => "fit",
        "author_user_id" => "friend1",
        "caption" => "jazz night with friends",
        "views" => 12,
        "commission_value" => 0,
        "from_friend" => true,
        "place_ref" => %{"display_name" => "Local Club", "city" => "San Diego"}
      }
    ]

    field =
      ExperienceField.for_viewer("viewer", moments, %{
        "hour" => 22,
        "viewer_city" => "San Diego",
        "max_visible" => 2
      })

    assert hd(field["cards"])["moment_id"] == "fit"
  end

  test "morning field suppresses nightlife-first" do
    moments = [
      %{
        "id" => "night",
        "author_user_id" => "a",
        "caption" => "club late night",
        "place_ref" => %{"city" => "San Diego", "display_name" => "Club"}
      },
      %{
        "id" => "am",
        "author_user_id" => "b",
        "caption" => "coffee morning walk",
        "from_friend" => true,
        "place_ref" => %{"city" => "San Diego", "display_name" => "Cafe"}
      }
    ]

    field =
      ExperienceField.for_viewer("viewer", moments, %{"hour" => 9, "viewer_city" => "San Diego"})

    assert hd(field["cards"])["moment_id"] == "am"
  end

  test "different city is pattern-only not local execution" do
    moments = [
      %{
        "id" => "tokyo",
        "author_user_id" => "cre",
        "caption" => "ramen jazz night",
        "place_ref" => %{"display_name" => "Tokyo Ramen", "city" => "Tokyo"}
      }
    ]

    {:ok, g, _} = FollowGraph.follow(FollowGraph.new(), "viewer", "cre")

    field =
      ExperienceField.for_viewer("viewer", moments, %{
        "follow_graph" => g,
        "viewer_city" => "San Diego",
        "hour" => 21
      })

    [c] = field["cards"]
    assert c["remote_experience_pattern_only"] == true
    assert c["local_execution"] == false
  end

  test "scale 1000 candidates stays dense and timely" do
    probe = ExperienceField.scale_probe("viewer", 1000, %{"hour" => 19, "viewer_city" => "San Diego"})
    assert probe["pass"] == true
    assert probe["visible_count"] <= 5
    assert probe["not_rendered_all"] == true
    # Soft latency bound for local test env (10s)
    assert probe["latency_ms"] < 10_000
  end

  test "invariants remain frozen" do
    refute ExperienceField.discovery_uses_commission?()
    refute ExperienceField.doomscroll_required?()
    refute ExperienceField.discovery_uses_raw_views?()
    refute ExperienceField.discovery_uses_posting_volume?()
    refute ExperienceField.discovery_newest_wins?()
    assert ExperienceField.not_home_attention?()
  end
end
