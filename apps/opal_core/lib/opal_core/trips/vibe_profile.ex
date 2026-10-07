defmodule OpalCore.Trips.VibeProfile do
  @moduledoc """
  Learned person vibe for trip curation.

  Not a settings page. Sleep bias, energy windows, and interest tags are
  inferred from activity RSVPs and venue tags — what people actually do.
  """

  use Ecto.Schema
  import Ecto.Changeset

  @sleep_biases ~w(early flexible late)

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "vibe_profiles" do
    field :user_id, :binary_id
    field :sleep_bias, :string, default: "flexible"
    field :energy_windows, {:array, :string}, default: []
    field :interest_tags, {:array, :string}, default: []
    field :evidence, {:array, :map}, default: []
    field :last_learned_at, :utc_datetime_usec

    timestamps(type: :utc_datetime_usec)
  end

  def sleep_biases, do: @sleep_biases

  def changeset(row, attrs) do
    row
    |> cast(attrs, [
      :user_id,
      :sleep_bias,
      :energy_windows,
      :interest_tags,
      :evidence,
      :last_learned_at
    ])
    |> validate_required([:user_id, :sleep_bias])
    |> validate_inclusion(:sleep_bias, @sleep_biases)
    |> unique_constraint(:user_id, name: :vibe_profiles_user_id_index)
  end

  def to_contract(%__MODULE__{} = p) do
    %{
      "user_id" => p.user_id,
      "sleep_bias" => p.sleep_bias,
      "energy_windows" => p.energy_windows || [],
      "interest_tags" => p.interest_tags || [],
      "evidence_count" => length(p.evidence || []),
      "last_learned_at" => dt(p.last_learned_at)
    }
  end

  defp dt(nil), do: nil
  defp dt(%DateTime{} = d), do: DateTime.to_iso8601(d)
end
