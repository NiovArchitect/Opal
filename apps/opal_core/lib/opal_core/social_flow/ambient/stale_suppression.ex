defmodule OpalCore.SocialFlow.Ambient.StaleSuppression do
  @moduledoc """
  Do not spend resources recomputing or resurfacing unchanged opportunity.

  Fingerprint social + world + participation state. If unchanged since last
  evaluation, return suppress without re-running providers/models.

  Uses ETS so tests work without full app supervision.
  """

  @table :opal_ambient_stale_suppression

  def ensure_started do
    case :ets.whereis(@table) do
      :undefined ->
        try do
          :ets.new(@table, [:named_table, :public, :set, read_concurrency: true])
          :ok
        rescue
          ArgumentError -> :ok
        end

      _ ->
        :ok
    end
  end

  def reset do
    ensure_started()
    :ets.delete_all_objects(@table)
    :ok
  end

  @doc """
  Stable fingerprint of meaningful alignment/world inputs (not noise clocks).
  """
  def fingerprint(attrs) when is_map(attrs) do
    a = stringify(attrs)

    material = %{
      "conversation_id" => a["conversation_id"],
      "plan_version" => a["plan_version"] || a["proposal_version"] || 0,
      "participant_ids" => Enum.sort(List.wrap(a["participant_ids"])),
      "in_ids" => Enum.sort(List.wrap(a["in_ids"])),
      "out_ids" => Enum.sort(List.wrap(a["out_ids"])),
      "maybe_ids" => Enum.sort(List.wrap(a["maybe_ids"])),
      "required_ids" => Enum.sort(List.wrap(a["required_ids"])),
      "time_compatible" => a["time_compatible"] == true,
      "proximity_ok" => a["proximity_ok"] == true,
      "destination_area" => a["destination_area"] || a["area_label"],
      "category" => a["category"],
      "relationship_context" => a["relationship_context"] || a["purpose"],
      "provider_available" => a["provider_available"],
      "provider_snapshot" => a["provider_snapshot"],
      "world_opportunity" => a["world_opportunity"] == true,
      "topic_changed" => a["topic_changed"] == true,
      "hard_constraints" => normalize_constraints(a["hard_constraints"]),
      "option_ids" => option_ids(a["options"]),
      "blocked" => a["blocked"] == true
    }

    :crypto.hash(:sha256, :erlang.term_to_binary(material))
    |> Base.encode16(case: :lower)
  end

  def fingerprint(_), do: "invalid"

  @doc """
  Whether to skip recompute for this context key.

  Returns {:skip, meta} | {:compute, fp}
  """
  def decide(context_key, attrs) when is_binary(context_key) do
    ensure_started()
    fp = fingerprint(attrs)
    force = attrs["force_recompute"] == true or attrs[:force_recompute] == true

    if force do
      {:compute, fp}
    else
      case :ets.lookup(@table, context_key) do
        [{^context_key, %{fingerprint: ^fp, surface: surface, quiet_until: quiet}}] ->
          cond do
            attrs["topic_changed"] == true ->
              {:compute, fp}

            match?(%DateTime{}, quiet) and
              DateTime.compare(quiet, DateTime.utc_now()) == :gt and
                surface == :opportunity ->
              {:skip,
               %{
                 "reason" => "quiet_after_surface",
                 "fingerprint" => fp,
                 "prior_surface" => surface,
                 "recomputed" => false
               }}

            true ->
              {:skip,
               %{
                 "reason" => "state_unchanged",
                 "fingerprint" => fp,
                 "prior_surface" => surface,
                 "recomputed" => false
               }}
          end

        [{^context_key, %{fingerprint: ^fp} = prev}] ->
          {:skip,
           %{
             "reason" => "state_unchanged",
             "fingerprint" => fp,
             "prior_surface" => Map.get(prev, :surface),
             "recomputed" => false
           }}

        _ ->
          {:compute, fp}
      end
    end
  end

  def decide(_, attrs), do: {:compute, fingerprint(attrs)}

  @doc "Record evaluation outcome for suppression."
  def record(context_key, fp, surface_atom, opts \\ [])
      when is_binary(context_key) and is_binary(fp) do
    ensure_started()
    quiet_sec = Keyword.get(opts, :quiet_seconds, 45 * 60)

    quiet_until =
      if surface_atom == :opportunity do
        DateTime.utc_now() |> DateTime.add(quiet_sec, :second) |> DateTime.truncate(:second)
      else
        nil
      end

    :ets.insert(@table, {
      context_key,
      %{
        fingerprint: fp,
        surface: surface_atom,
        quiet_until: quiet_until,
        recorded_at: DateTime.utc_now() |> DateTime.truncate(:second)
      }
    })

    :ok
  end

  defp option_ids(opts) when is_list(opts) do
    opts
    |> Enum.map(fn
      %{"id" => id} -> id
      %{"provider_place_id" => id} -> id
      %{"name" => n} -> n
      _ -> nil
    end)
    |> Enum.reject(&is_nil/1)
    |> Enum.sort()
  end

  defp option_ids(_), do: []

  defp normalize_constraints(nil), do: []
  defp normalize_constraints(list) when is_list(list), do: Enum.sort(Enum.map(list, &to_string/1))
  defp normalize_constraints(other), do: [to_string(other)]

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
