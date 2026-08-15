defmodule OpalCore.SocialFlow.FollowEdge do
  @moduledoc """
  Durable one-way follow edge (Pass 25).

  NEVER grants friend visibility / calendar / Reality access.
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "follow_edges" do
    field :follower_user_id, :binary_id
    field :creator_user_id, :binary_id
    field :status, :string, default: "active"
    field :grants_friend_visibility, :boolean, default: false
    field :meta, :map, default: %{}
    timestamps(type: :utc_datetime_usec)
  end

  def changeset(row, attrs) do
    row
    |> cast(attrs, [
      :follower_user_id,
      :creator_user_id,
      :status,
      :grants_friend_visibility,
      :meta
    ])
    |> validate_required([:follower_user_id, :creator_user_id, :status])
    |> validate_inclusion(:status, ~w(active revoked))
    |> validate_change(:grants_friend_visibility, fn :grants_friend_visibility, v ->
      if v == true, do: [grants_friend_visibility: "follow must never grant friend visibility"], else: []
    end)
    |> unique_constraint([:follower_user_id, :creator_user_id],
      name: :follow_edges_follower_creator_index
    )
  end
end
