defmodule OpalCore.Center.ResponseFactContractTest do
  use ExUnit.Case, async: true

  alias OpalCore.Center.{ResponseFactContract, DependencyPlanner}

  test "repairs invented surprise when visibility is normal" do
    draft = "Mexico City for Chanelle — love that. Since it's a surprise, want me to keep options quiet?"
    {text, repairs} = ResponseFactContract.validate(draft, %{"visibility_mode" => "normal"}, %{})
    assert :invented_surprise in repairs
    refute ResponseFactContract.invented_surprise?(text, %{"visibility_mode" => "normal"})
    refute String.match?(text, ~r/since it's a surprise/i)
  end

  test "allows surprise language when surprise=true" do
    draft = "Got it — this is a surprise for Chanelle."
    {text, repairs} = ResponseFactContract.validate(draft, %{"surprise" => true, "visibility_mode" => "surprise"}, %{})
    refute :invented_surprise in repairs
    assert String.contains?(String.downcase(text), "surprise")
  end

  test "enforces one question max" do
    draft = "What time of year are you thinking, and is this a surprise or are you planning it together?"
    {text, repairs} = ResponseFactContract.validate(draft, %{}, %{})
    assert :questions_batched in repairs
    assert ResponseFactContract.question_count(text) <= 1
  end

  test "local San Diego dinner is not travel-applicable" do
    c = %{"destination" => "San Diego", "solo" => true, "wants_restaurant" => true, "venue" => "Tacos"}
    refute DependencyPlanner.travel_applicable?(c)
    assert DependencyPlanner.travel_class(c) == "local_activity"
    assert DependencyPlanner.next_after(c, "venue") == nil or DependencyPlanner.next_after(c, "venue")["id"] != "travel"
  end

  test "Mexico City is travel-applicable" do
    c = %{"destination" => "Mexico City", "who" => ["Pat"], "venue" => "Somewhere"}
    assert DependencyPlanner.travel_applicable?(c)
    assert DependencyPlanner.next_after(c, "venue")["id"] == "travel"
  end
end
