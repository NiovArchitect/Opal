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

  test "search includes call_to_book draft without inventing phone" do
    assert {:ok, [row]} =
             OpenTable.search(%{"query" => "Contramar", "party_size" => 2, "when" => "Friday 7pm"})

    assert row["call_to_book"] == true
    assert row["bookable"] == false
    assert is_binary(row["draft_message"])
    assert row["phone"] == nil
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
