defmodule OpalCore.FinancialProfiles do
  @moduledoc """
  Phase RU-3 — financial comfort profiles.

  User-controlled spending preferences. Trust-gated at trusted+.
  No banks, no inference, never shared socially.
  """

  alias OpalCore.FinancialProfiles.FinancialProfile
  alias OpalCore.Repo
  alias OpalCore.TrustTiers

  @default_dining %{
    "budget" => %{"min" => 0, "max" => 25},
    "moderate" => %{"min" => 25, "max" => 60},
    "comfortable" => %{"min" => 60, "max" => 150},
    "luxury" => %{"min" => 150, "max" => 500}
  }

  @default_activity %{
    "budget" => %{"min" => 0, "max" => 20},
    "moderate" => %{"min" => 20, "max" => 60},
    "comfortable" => %{"min" => 60, "max" => 150},
    "luxury" => %{"min" => 150, "max" => 500}
  }

  @level_labels %{
    "budget" => "Under $25/person dining. Free/low-cost activities. Opal prioritizes value.",
    "moderate" => "$25–60/person dining. Mid-range activities. The default.",
    "comfortable" => "$60–150/person dining. Premium activities OK.",
    "luxury" => "$150+/person dining. High-end experiences welcome."
  }

  @doc "Allowed comfort_level strings."
  def allowed_levels, do: FinancialProfile.allowed_levels()

  @doc "Plain-language description for a comfort level."
  def level_description(level) when is_binary(level), do: Map.get(@level_labels, level)
  def level_description(_), do: nil

  @doc """
  Return the profile for `user_id`, or nil.

  Trust gate: below trusted returns nil (does not leak that a row exists).
  """
  def get_profile(user_id) when is_binary(user_id) do
    if TrustTiers.can_access?(user_id, :financial) do
      Repo.get_by(FinancialProfile, user_id: user_id)
    else
      nil
    end
  end

  def get_profile(_), do: nil

  @doc """
  Create or update the financial profile.

  Requires trusted+ tier. Validates comfort_level and ranges (min < max).
  """
  def set_profile(user_id, attrs) when is_binary(user_id) and is_map(attrs) do
    if TrustTiers.can_access?(user_id, :financial) do
      normalized = normalize_attrs(attrs)

      case Repo.get_by(FinancialProfile, user_id: user_id) do
        nil ->
          %FinancialProfile{}
          |> FinancialProfile.changeset(Map.put(normalized, :user_id, user_id))
          |> Repo.insert()

        %FinancialProfile{} = existing ->
          existing
          |> FinancialProfile.changeset(normalized)
          |> Repo.update()
      end
    else
      {:error, :forbidden}
    end
  end

  def set_profile(_, _), do: {:error, :invalid}

  @doc """
  Delete the profile for `user_id`.

  Requires trusted+. Returns `{:ok, :deleted}` or `{:ok, :absent}` when none.
  Below trusted → `{:error, :forbidden}`.
  """
  def delete_profile(user_id) when is_binary(user_id) do
    if TrustTiers.can_access?(user_id, :financial) do
      case Repo.get_by(FinancialProfile, user_id: user_id) do
        nil ->
          {:ok, :absent}

        %FinancialProfile{} = row ->
          case Repo.delete(row) do
            {:ok, _} -> {:ok, :deleted}
            other -> other
          end
      end
    else
      {:error, :forbidden}
    end
  end

  def delete_profile(_), do: {:error, :invalid}

  @doc """
  Spending hint for recommendations.

  Returns `%{dining: {min, max}, activity: {min, max}, level: string}` or nil
  when no accessible profile (don't assume).
  """
  def spending_hint(user_id) when is_binary(user_id) do
    case get_profile(user_id) do
      %FinancialProfile{} = p ->
        dining = range_tuple(p.dining_range) || default_dining_tuple(p.comfort_level)
        activity = range_tuple(p.activity_range) || default_activity_tuple(p.comfort_level)

        %{
          dining: dining,
          activity: activity,
          level: p.comfort_level
        }

      nil ->
        nil
    end
  end

  def spending_hint(_), do: nil

  @doc """
  OC-2 financial slice (no notes).

  `%{level: string, dining_range: %{min:, max:} | nil}` or nil.
  """
  def context_slice(user_id) when is_binary(user_id) do
    case get_profile(user_id) do
      %FinancialProfile{} = p ->
        %{
          level: p.comfort_level,
          dining_range: public_range(p.dining_range)
        }

      nil ->
        nil
    end
  end

  def context_slice(_), do: nil

  @doc "API contract map (includes notes for the owner's GET)."
  def to_contract(%FinancialProfile{} = p) do
    %{
      "id" => p.id,
      "user_id" => p.user_id,
      "comfort_level" => p.comfort_level,
      "dining_range" => public_range(p.dining_range),
      "activity_range" => public_range(p.activity_range),
      "notes" => p.notes,
      "inserted_at" => datetime(p.inserted_at),
      "updated_at" => datetime(p.updated_at)
    }
  end

  def to_contract(_), do: nil

  defp normalize_attrs(attrs) do
    %{
      comfort_level: attrs[:comfort_level] || attrs["comfort_level"],
      dining_range: attrs[:dining_range] || attrs["dining_range"],
      activity_range: attrs[:activity_range] || attrs["activity_range"],
      notes: attrs[:notes] || attrs["notes"]
    }
    |> Enum.reject(fn {_k, v} -> is_nil(v) end)
    |> Map.new()
  end

  defp public_range(%{"min" => min, "max" => max}) when is_integer(min) and is_integer(max) do
    %{"min" => min, "max" => max}
  end

  defp public_range(%{min: min, max: max}) when is_integer(min) and is_integer(max) do
    %{"min" => min, "max" => max}
  end

  defp public_range(_), do: nil

  defp range_tuple(%{"min" => min, "max" => max}) when is_integer(min) and is_integer(max),
    do: {min, max}

  defp range_tuple(%{min: min, max: max}) when is_integer(min) and is_integer(max),
    do: {min, max}

  defp range_tuple(_), do: nil

  defp default_dining_tuple(level) do
    case Map.get(@default_dining, level) do
      %{"min" => min, "max" => max} -> {min, max}
      _ -> nil
    end
  end

  defp default_activity_tuple(level) do
    case Map.get(@default_activity, level) do
      %{"min" => min, "max" => max} -> {min, max}
      _ -> nil
    end
  end

  defp datetime(%DateTime{} = dt), do: DateTime.to_iso8601(dt)
  defp datetime(_), do: nil
end
