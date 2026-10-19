defmodule OpalCore.Bookings.OpenTableCallToBookTest do
  use OpalCore.DataCase, async: false

  alias OpalCore.Bookings.OpenTable

  setup do
    prior = System.get_env("OPENTABLE_API_KEY")
    prior_places = System.get_env("GOOGLE_PLACES_API_KEY")
    System.put_env("OPENTABLE_API_KEY", "ot_test_key")
    System.delete_env("GOOGLE_PLACES_API_KEY")

    on_exit(fn ->
      restore("OPENTABLE_API_KEY", prior)
      restore("GOOGLE_PLACES_API_KEY", prior_places)
    end)

    :ok
  end

  defp restore(name, nil), do: System.delete_env(name)
  defp restore(name, val), do: System.put_env(name, val)

  # Repair #18 FALSE-fix F-01: with a key provisioned, search must NOT
  # echo the query back as a result row — no partner search call exists,
  # so search reports disabled truthfully in the keyed state too.
  test "search with a key provisioned is honestly disabled, never a query echo" do
    assert {:disabled, msg} =
             OpenTable.search(%{"query" => "Contramar", "party_size" => 2, "when" => "Friday 7pm"})

    assert is_binary(msg)
    assert msg =~ "not connected"
  end

  test "book never invents confirmation" do
    assert {:disabled, msg} = OpenTable.book(%{"query" => "Contramar"})
    assert is_binary(msg)
    refute String.contains?(String.downcase(msg), "confirmed")
  end

  test "build_call_to_book helper draft" do
    ctb = OpenTable.build_call_to_book("Pujol", 2, "Saturday 8pm", nil)
    assert ctb["call_to_book"] == true
    assert String.contains?(ctb["draft_message"], "Pujol")
  end
end
