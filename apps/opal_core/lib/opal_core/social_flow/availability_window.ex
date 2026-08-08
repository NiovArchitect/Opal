defmodule OpalCore.SocialFlow.AvailabilityWindow do
  @moduledoc """
  Owner-private availability interval.

  Never peer-visible by itself. Peer visibility requires an active
  `AvailabilityShare` and is always projected as shared-safe ranges only.
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @sources ~w(manual calendar_free_busy device_inference)
  @statuses ~w(active deleted)

  schema "availability_windows" do
    field :start_at, :utc_datetime_usec
    field :end_at, :utc_datetime_usec
    field :timezone, :string, default: "UTC"
    field :source, :string, default: "manual"
    field :status, :string, default: "active"
    field :expires_at, :utc_datetime_usec

    belongs_to :owner_user, OpalCore.Accounts.User, foreign_key: :owner_user_id

    timestamps(type: :utc_datetime_usec)
  end

  def sources, do: @sources
  def statuses, do: @statuses

  def changeset(window, attrs) do
    window
    |> cast(attrs, [
      :owner_user_id,
      :start_at,
      :end_at,
      :timezone,
      :source,
      :status,
      :expires_at
    ])
    |> validate_required([:owner_user_id, :start_at, :end_at, :timezone, :source, :status])
    |> validate_inclusion(:source, @sources)
    |> validate_inclusion(:status, @statuses)
    |> validate_timezone()
    |> validate_range()
  end

  defp validate_timezone(cs) do
    tz = get_field(cs, :timezone)

    cond do
      not is_binary(tz) or String.trim(tz) == "" ->
        add_error(cs, :timezone, "is required")

      # Computation is always on UTC instants. Timezone is a display label.
      # Accept UTC and IANA-shaped names without requiring the Tzdata package.
      tz in ~w(UTC Etc/UTC GMT) ->
        cs

      Regex.match?(~r/\A[A-Za-z_]+(?:\/[A-Za-z0-9_\+\-]+)+\z/, tz) ->
        cs

      true ->
        add_error(cs, :timezone, "must be UTC or an IANA name like America/Los_Angeles")
    end
  end

  defp validate_range(cs) do
    start_at = get_field(cs, :start_at)
    end_at = get_field(cs, :end_at)

    if start_at && end_at && DateTime.compare(end_at, start_at) != :gt do
      add_error(cs, :end_at, "must be after start_at")
    else
      cs
    end
  end

  @doc "Owner-private contract — never send to a peer."
  def to_owner_contract(%__MODULE__{} = w) do
    %{
      "id" => w.id,
      "start_at" => DateTime.to_iso8601(w.start_at),
      "end_at" => DateTime.to_iso8601(w.end_at),
      "timezone" => w.timezone,
      "source" => w.source,
      "status" => w.status,
      "expires_at" => expires_iso(w.expires_at)
    }
  end

  defp expires_iso(nil), do: nil
  defp expires_iso(%DateTime{} = dt), do: DateTime.to_iso8601(dt)
end
