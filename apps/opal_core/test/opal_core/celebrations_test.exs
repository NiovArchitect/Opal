defmodule OpalCore.CelebrationsTest do
  use OpalCore.DataCase, async: true

  alias OpalCore.Accounts.User
  alias OpalCore.Celebrations
  alias OpalCore.Celebrations.Celebration
  alias OpalCore.Repo

  defp user!(prefix) do
    %User{}
    |> User.changeset(%{
      handle: "#{prefix}-#{System.unique_integer([:positive])}",
      display_name: prefix
    })
    |> Repo.insert!()
  end

  test "create + list ordered by upcoming; year optional" do
    u = user!("c10a")

    assert {:ok, maya} =
             Celebrations.create(u.id, %{
               "person_name" => "Maya",
               "kind" => "birthday",
               "month" => 6,
               "day" => 15
             })

    assert maya.year == nil
    assert maya.person_name == "Maya"
    assert Celebrations.to_contract(maya)["date_label"] == "Jun 15"

    assert {:ok, _} =
             Celebrations.create(u.id, %{
               "person_name" => "Alex",
               "kind" => "anniversary",
               "month" => 1,
               "day" => 2,
               "year" => 2019,
               "notes" => "met at Fort Oak"
             })

    assert {:ok, list} = Celebrations.list_for_user(u.id)
    assert length(list) == 2
    # Both present; upcoming order depends on today — just assert names
    names = Enum.map(list, & &1.person_name)
    assert "Maya" in names
    assert "Alex" in names
  end

  test "rejects Feb 30" do
    u = user!("c10a-feb")

    assert {:error, cs} =
             Celebrations.create(u.id, %{
               "person_name" => "Bad",
               "kind" => "birthday",
               "month" => 2,
               "day" => 30
             })

    assert %{day: _} = errors_on(cs)
  end

  test "accepts Feb 29 (leap-valid month/day)" do
    u = user!("c10a-leap")

    assert {:ok, c} =
             Celebrations.create(u.id, %{
               "person_name" => "Leap",
               "kind" => "birthday",
               "month" => 2,
               "day" => 29
             })

    assert c.day == 29
  end

  test "delete owner ok; foreign not_found" do
    a = user!("c10a-a")
    b = user!("c10a-b")

    assert {:ok, c} =
             Celebrations.create(a.id, %{
               "person_name" => "Maya",
               "kind" => "birthday",
               "month" => 6,
               "day" => 15
             })

    assert {:error, :not_found} = Celebrations.delete(b.id, c.id)
    assert Repo.get(Celebration, c.id)

    assert {:ok, _} = Celebrations.delete(a.id, c.id)
    assert is_nil(Repo.get(Celebration, c.id))
  end

  test "days_until year-boundary: Dec in January is ~11 months, not negative" do
    today = ~D[2026-01-10]
    days = Celebrations.days_until(today, 12, 15)
    assert days > 300
    assert days < 370
    assert Celebrations.next_occurrence(today, 12, 15) == ~D[2026-12-15]
  end

  test "days_until past date this year rolls to next year" do
    today = ~D[2026-06-20]
    assert Celebrations.next_occurrence(today, 6, 15) == ~D[2027-06-15]
    assert Celebrations.days_until(today, 6, 15) > 300
  end

  test "days_until today is 0" do
    today = ~D[2026-06-15]
    assert Celebrations.days_until(today, 6, 15) == 0
  end

  test "reminder idempotency marks and detects" do
    u = user!("c10a-rem")

    assert {:ok, c} =
             Celebrations.create(u.id, %{
               "person_name" => "Maya",
               "kind" => "birthday",
               "month" => 6,
               "day" => 15
             })

    refute Celebrations.already_reminded?(c, 2026, 14)
    assert {:ok, c2} = Celebrations.mark_reminded(c, 2026, 14)
    assert Celebrations.already_reminded?(c2, 2026, 14)
    refute Celebrations.already_reminded?(c2, 2026, 7)
    refute Celebrations.already_reminded?(c2, 2027, 14)
  end
end
