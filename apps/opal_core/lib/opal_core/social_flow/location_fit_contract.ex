defmodule OpalCore.SocialFlow.LocationFitContract do
  @moduledoc """
  Future-compatible location-fit contracts.

  **Does NOT activate habitual-location collection.**

  Supported *contract kinds* (not live collection):
  - approximate_current_area
  - explicit_shared_location
  - eta
  - selected_meetup_area
  - private_familiar_area
  - home_work_preference
  - travel_time_estimate

  Privacy doctrine:
  - Private inference stays private
  - Shared result exposes **benefit only**
  - Example shared-safe: "This area is easy for both of you."
  - Never: "She is usually here Thursday."
  """

  @kinds ~w(
    approximate_current_area
    explicit_shared_location
    eta
    selected_meetup_area
    private_familiar_area
    home_work_preference
    travel_time_estimate
  )

  @forbidden_shared_keys ~w(
    habitual_location
    home_address
    work_address
    precise_lat
    precise_lng
    raw_coordinates
    usually_here
    device_trail
    private_reason
  )

  def kinds, do: @kinds

  @doc "Build a private location fact (never peer-visible as-is)."
  def private_fact(attrs) when is_map(attrs) do
    a = stringify(attrs)
    kind = a["kind"]

    if kind in @kinds do
      {:ok,
       %{
         "schema_version" => "0.1.0",
         "kind" => kind,
         "owner_user_id" => a["owner_user_id"],
         "area_label" => a["area_label"],
         "approx_geohash" => a["approx_geohash"],
         "permission_scope" => "owner_private",
         "observed_at" => a["observed_at"],
         "valid_until" => a["valid_until"],
         "confidence" => a["confidence"] || 0.5,
         "source" => a["source"] || "unspecified",
         "revoked" => false,
         "shared" => false
       }}
    else
      {:error, :unknown_kind}
    end
  end

  def private_fact(_), do: {:error, :invalid}

  @doc """
  Project shared-safe location **benefit** only.

  Never includes habitual language or precise coordinates.
  """
  def shared_safe_benefit(private_facts) when is_list(private_facts) do
    if Enum.any?(private_facts, fn f -> stringify(f)["revoked"] == true end) do
      {:ok, nil}
    else
      usable =
        private_facts
        |> Enum.map(&stringify/1)
        |> Enum.reject(&(&1["revoked"] == true))

      if length(usable) < 2 do
        {:ok, nil}
      else
        payload = %{
          "schema_version" => "0.1.0",
          "shared_safe" => true,
          "benefit_copy" => "This area is easy for both of you.",
          "area_label" => common_area_label(usable),
          "no_habitual_inference" => true,
          "no_precise_coordinates" => true
        }

        case assert_shared_safe!(payload) do
          :ok -> {:ok, payload}
          err -> err
        end
      end
    end
  end

  def shared_safe_benefit(_), do: {:ok, nil}

  @doc "Reject payloads that would leak private location doctrine."
  def assert_shared_safe!(payload) when is_map(payload) do
    s = stringify(payload)

    for key <- @forbidden_shared_keys do
      if Map.has_key?(s, key) do
        raise "location shared-safe leak: #{key}"
      end
    end

    :ok
  end

  def assert_shared_safe!(_), do: {:error, :invalid}

  defp common_area_label(facts) do
    labels =
      facts
      |> Enum.map(& &1["area_label"])
      |> Enum.reject(&is_nil/1)
      |> Enum.uniq()

    case labels do
      [one] -> one
      _ -> nil
    end
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
