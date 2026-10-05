defmodule OpalCore.RelationshipsTest do
  use OpalCore.DataCase, async: false

  import Ecto.Query

  alias OpalCore.Fixtures
  alias OpalCore.FixturesHelper
  alias OpalCore.OpalContext
  alias OpalCore.Relationships
  alias OpalCore.Relationships.RelationshipType
  alias OpalCore.Repo
  alias OpalCore.TrustTiers

  setup do
    FixturesHelper.seed!()
    :ok
  end

  defp alex, do: Fixtures.user_alex_id()
  defp jordan, do: Fixtures.user_jordan_id()
  defp taylor, do: Fixtures.user_taylor_id()

  test "set_type validates type — invalid → error" do
    assert {:error, %Ecto.Changeset{} = cs} =
             Relationships.set_type(alex(), jordan(), "bestie")

    assert %{type: _} = errors_on(cs)
  end

  test "set_type validates type — self → error" do
    assert {:error, %Ecto.Changeset{} = cs} =
             Relationships.set_type(alex(), alex(), "friend")

    assert %{contact_user_id: _} = errors_on(cs)
  end

  test "set_type upserts — calling twice updates, does not duplicate" do
    assert {:ok, r1} = Relationships.set_type(alex(), jordan(), "friend")
    assert r1.type == "friend"

    assert {:ok, r2} =
             Relationships.set_type(alex(), jordan(), "close_friend", %{
               "frequency" => "weekly",
               "style" => "casual",
               "planning" => "spontaneous"
             })

    assert r2.id == r1.id
    assert r2.type == "close_friend"
    assert r2.communication_bounds["frequency"] == "weekly"

    count =
      from(r in RelationshipType, where: r.user_id == ^alex() and r.contact_user_id == ^jordan())
      |> Repo.aggregate(:count, :id)

    assert count == 1
  end

  test "get_type returns nil for unset" do
    assert Relationships.get_type(alex(), taylor()) == nil
  end

  test "get_type returns type after set" do
    assert {:ok, _} = Relationships.set_type(alex(), jordan(), "spouse")
    assert Relationships.get_type(alex(), jordan()) == "spouse"
  end

  test "for_user returns all relationship types for this user" do
    assert {:ok, _} = Relationships.set_type(alex(), jordan(), "family")
    assert {:ok, _} = Relationships.set_type(alex(), taylor(), "business")

    list = Relationships.for_user(alex())
    types = Enum.map(list, & &1.type) |> Enum.sort()
    assert types == ["business", "family"]
  end

  test "unique constraint enforced at DB level" do
    assert {:ok, _} = Relationships.set_type(alex(), jordan(), "friend")

    assert {:error, %Ecto.Changeset{} = cs} =
             %RelationshipType{}
             |> RelationshipType.changeset(%{
               user_id: alex(),
               contact_user_id: jordan(),
               type: "acquaintance"
             })
             |> Repo.insert()

    assert %{user_id: _} = errors_on(cs)
  end

  test "context includes relationships map" do
    assert {:ok, _} = TrustTiers.grant_tier(alex(), "known", "system")
    assert {:ok, _} = TrustTiers.grant_tier(alex(), "trusted", "system")
    assert {:ok, _} = Relationships.set_type(alex(), jordan(), "partner")
    assert {:ok, ctx} = OpalContext.assemble(alex(), "hi")

    assert Map.has_key?(ctx, :relationships)
    assert is_map(ctx.relationships)
    assert ctx.relationships[jordan()] == "partner"
  end

  test "context relationships empty map when unset" do
    assert {:ok, ctx} = OpalContext.assemble(alex(), "hi")
    assert ctx.relationships == %{} or not Map.has_key?(ctx.relationships, jordan())
  end

  test "allowed_types are exactly the RU-1 seven" do
    assert Relationships.allowed_types() ==
             ~w(spouse partner family close_friend friend business acquaintance)
  end

  test "set_type rejects invalid bounds frequency" do
    assert {:error, %Ecto.Changeset{} = cs} =
             Relationships.set_type(alex(), jordan(), "friend", %{"frequency" => "hourly"})

    assert %{communication_bounds: _} = errors_on(cs)
  end

  test "type_map_for returns contact_user_id => type" do
    assert {:ok, _} = Relationships.set_type(alex(), jordan(), "business")
    assert Relationships.type_map_for(alex()) == %{jordan() => "business"}
  end
end
