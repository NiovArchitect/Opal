defmodule OpalCore.SocialFlow.PlanLocationShare do
  @moduledoc """
  Repair #19 W7 - per-plan location sharing consent (the missing
  backbone behind the graph detail's "who's coming and where they
  are").

  A row exists ONLY when a plan participant has explicitly opted in
  to share their location FOR THIS PLAN. Sharing is time-bounded
  (default 4 hours from the share, matching the journey-presence
  expiry discipline) and the stored coords are coarse - validated and
  rounded by `OpalCore.Center.DeviceLocation.validate_coords/1`
  (3-decimal, ~110 m), the same coarsening the Center ingest uses.

  There is deliberately NO read of any other location store here:
  Center device coords exist for venue ranking under a different
  consent and are never repurposed as plan sharing (DeviceLocation's
  own privacy law). No row, or an expired row, means "not sharing" -
  surfaces must render exactly that, never a guessed position.
  """

  use Ecto.Schema
  import Ecto.Changeset
  import Ecto.Query

  alias OpalCore.Center.DeviceLocation
  alias OpalCore.Repo

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @share_window_seconds 4 * 3600

  schema "plan_location_shares" do
    field :lat, :float
    field :lon, :float
    field :expires_at, :utc_datetime_usec

    belongs_to :plan, OpalCore.SocialFlow.SharedPlan, foreign_key: :plan_id
    belongs_to :user, OpalCore.Accounts.User, foreign_key: :user_id

    timestamps(type: :utc_datetime_usec)
  end

  def share_window_seconds, do: @share_window_seconds

  @doc """
  Opt the user in (or refresh their position) for one plan._coords go
  through the Center coarsening validator; raw client precision is
  never stored. Caller must already have established plan access.
  """
  def share(plan_id, user_id, coords) when is_binary(plan_id) and is_binary(user_id) do
    case DeviceLocation.validate_coords(coords) do
      {:ok, %{"lat" => lat, "lon" => lon}} ->
        now = DateTime.utc_now()
        expires = DateTime.add(now, @share_window_seconds, :second)

        %__MODULE__{plan_id: plan_id, user_id: user_id}
        |> changeset(%{lat: lat * 1.0, lon: lon * 1.0, expires_at: expires})
        |> Repo.insert(
          on_conflict: {:replace, [:lat, :lon, :expires_at, :updated_at]},
          conflict_target: [:plan_id, :user_id]
        )

      {:error, reason} ->
        {:error, reason}
    end
  end

  def share(_, _, _), do: {:error, :invalid}

  @doc "Stop sharing for one plan. Absent row is a successful no-op."
  def stop(plan_id, user_id) when is_binary(plan_id) and is_binary(user_id) do
    from(s in __MODULE__, where: s.plan_id == ^plan_id and s.user_id == ^user_id)
    |> Repo.delete_all()

    :ok
  end

  def stop(_, _), do: :ok

  @doc """
  The fresh (unexpired) share for one plan + user, or nil. Expired is
  indistinguishable from never shared - that is the honesty rule the
  detail projection renders.
  """
  def fresh_for(plan_id, user_id, now \\ DateTime.utc_now()) do
    from(s in __MODULE__,
      where: s.plan_id == ^plan_id and s.user_id == ^user_id and s.expires_at > ^now
    )
    |> Repo.one()
  end

  defp changeset(share, attrs) do
    share
    |> cast(attrs, [:lat, :lon, :expires_at])
    |> validate_required([:plan_id, :user_id, :lat, :lon, :expires_at])
    |> validate_number(:lat, greater_than_or_equal_to: -90, less_than_or_equal_to: 90)
    |> validate_number(:lon, greater_than_or_equal_to: -180, less_than_or_equal_to: 180)
    |> unique_constraint([:plan_id, :user_id], name: :plan_location_shares_plan_user_index)
  end
end
