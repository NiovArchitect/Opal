defmodule OpalCore.SocialFlow.RealWorld.Place.PreferenceMemory do
  @moduledoc """
  Preference evidence memory with provenance, scope, and corrections.

  Does not turn every conversational statement into a permanent identity trait.
  Relationship-specific fit supported via scope.
  """

  @doc "Build a preference fact."
  def remember(attrs) when is_map(attrs) do
    a = stringify(attrs)

    cond do
      not is_binary(a["owner_user_id"]) ->
        {:error, :owner_required}

      not is_binary(a["label"]) and not is_binary(a["preference"]) ->
        {:error, :preference_required}

      true ->
        now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

        {:ok,
         %{
           "schema_version" => "0.1.0",
           "owner_user_id" => a["owner_user_id"],
           "preference" => a["preference"] || a["label"],
           "polarity" => a["polarity"] || "prefer",
           "confidence" => to_float(a["confidence"], 0.7),
           "provenance" => a["provenance"] || "conversation",
           "source_message_id" => a["source_message_id"],
           "permission_class" => a["permission_class"] || "owner_private",
           "scope" => a["scope"] || "personal",
           "relationship_id" => a["relationship_id"],
           "observed_at" => now,
           "weight_class" => weight_class(a),
           "revoked" => false,
           "sensitive" => a["sensitive"] == true
         }}
    end
  end

  def remember(_), do: {:error, :invalid}

  def correct(existing, correction) when is_map(existing) and is_map(correction) do
    e = stringify(existing)
    c = stringify(correction)

    {:ok,
     e
     |> Map.put("preference", c["preference"] || c["label"] || e["preference"])
     |> Map.put("polarity", c["polarity"] || e["polarity"])
     |> Map.put("confidence", to_float(c["confidence"], 0.9))
     |> Map.put("provenance", "user_correction")
     |> Map.put("supersedes", e["preference"])
     |> Map.put("observed_at", DateTime.utc_now() |> DateTime.truncate(:microsecond))
     |> Map.put("weight_class", "explicit_current")}
  end

  def correct(_, _), do: {:error, :invalid}

  def weight(%{"weight_class" => "explicit_current"}), do: 1.0
  def weight(%{"weight_class" => "repeated_behavior"}), do: 0.7
  def weight(%{"weight_class" => "old_statement"}), do: 0.35
  def weight(%{"weight_class" => "inferred"}), do: 0.25
  def weight(%{"weight_class" => "relationship_specific"}), do: 0.8
  def weight(_), do: 0.5

  def applicable_to_context?(pref, context) when is_map(pref) and is_map(context) do
    p = stringify(pref)
    c = stringify(context)

    cond do
      p["revoked"] == true -> false
      p["scope"] == "personal" -> true
      p["scope"] == "relationship" and p["relationship_id"] == c["relationship_id"] -> true
      p["scope"] == "relationship" -> false
      true -> true
    end
  end

  def applicable_to_context?(_, _), do: false

  defp weight_class(a) do
    cond do
      a["weight_class"] -> a["weight_class"]
      a["provenance"] == "user_correction" -> "explicit_current"
      a["scope"] == "relationship" -> "relationship_specific"
      to_float(a["confidence"], 0.5) < 0.5 -> "inferred"
      true -> "explicit_current"
    end
  end

  defp to_float(nil, d), do: d
  defp to_float(n, _) when is_number(n), do: n * 1.0
  defp to_float(_, d), do: d

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
