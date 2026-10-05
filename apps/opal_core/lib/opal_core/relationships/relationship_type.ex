defmodule OpalCore.Relationships.RelationshipType do
  @moduledoc """
  Phase RU-1 — how the user relates to one contact.

  One row per (user_id, contact_user_id). Not a score — an explicit type.
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  # Exact RU-1 taxonomy (7). Documented defaults for tone/planning.
  # spouse: highest intimacy. Planning: spontaneous OK. Style: warm.
  # partner: romantic partner (not married). Planning: spontaneous OK. Style: warm.
  # family: parent, child, sibling. Planning: planned preferred. Style: warm.
  # close_friend: inner circle. Planning: spontaneous OK. Style: casual.
  # friend: social friend. Planning: planned. Style: casual.
  # business: work contact. Planning: planned, formal. Style: formal.
  # acquaintance: knows them. Planning: planned. Style: formal.
  @allowed_types ~w(spouse partner family close_friend friend business acquaintance)

  schema "relationship_types" do
    field :type, :string
    field :communication_bounds, :map

    belongs_to :user, OpalCore.Accounts.User, foreign_key: :user_id
    belongs_to :contact_user, OpalCore.Accounts.User, foreign_key: :contact_user_id

    timestamps(type: :utc_datetime_usec)
  end

  def allowed_types, do: @allowed_types

  def changeset(rel, attrs) do
    rel
    |> cast(attrs, [:user_id, :contact_user_id, :type, :communication_bounds])
    |> validate_required([:user_id, :contact_user_id, :type])
    |> validate_inclusion(:type, @allowed_types)
    |> validate_not_self()
    |> validate_bounds()
    |> unique_constraint([:user_id, :contact_user_id])
    |> foreign_key_constraint(:user_id)
    |> foreign_key_constraint(:contact_user_id)
  end

  defp validate_not_self(cs) do
    user_id = get_field(cs, :user_id)
    contact_id = get_field(cs, :contact_user_id)

    if is_binary(user_id) and user_id == contact_id do
      add_error(cs, :contact_user_id, "cannot be self")
    else
      cs
    end
  end

  defp validate_bounds(cs) do
    case get_change(cs, :communication_bounds) || get_field(cs, :communication_bounds) do
      nil ->
        cs

      bounds when is_map(bounds) ->
        freq = bounds["frequency"] || bounds[:frequency]
        style = bounds["style"] || bounds[:style]
        planning = bounds["planning"] || bounds[:planning]

        cs
        |> maybe_bounds_error(:frequency, freq, ~w(daily weekly occasional))
        |> maybe_bounds_error(:style, style, ~w(casual formal warm))
        |> maybe_bounds_error(:planning, planning, ~w(spontaneous planned))

      _ ->
        add_error(cs, :communication_bounds, "must be a map")
    end
  end

  defp maybe_bounds_error(cs, _key, nil, _allowed), do: cs

  defp maybe_bounds_error(cs, key, value, allowed) when is_binary(value) do
    if value in allowed do
      cs
    else
      add_error(cs, :communication_bounds, "invalid #{key}")
    end
  end

  defp maybe_bounds_error(cs, key, _value, _allowed) do
    add_error(cs, :communication_bounds, "invalid #{key}")
  end
end
