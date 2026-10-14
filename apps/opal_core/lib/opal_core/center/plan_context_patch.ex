defmodule OpalCore.Center.PlanContextPatch do
  @moduledoc """
  Conversational turn produces a **delta**, not a full plan rebuild.

  Missing fields mean **unchanged**, not null.
  Explicit correction outranks inference.
  Fixture names are never special-cased — person-agnostic.
  """

  alias OpalCore.Center.PlanningContext

  @slot_keys ~w(
    who primary_person participants
    destination venue when when_resolved what
    category quality_intent wants_restaurant
    plan_id visibility_mode surprise
    dependencies next_dependency
  )

  @doc """
  Apply a patch map onto prior planning context.

  - `nil` / missing keys → leave prior value
  - explicit `{:clear, key}` or `"__clear__"` → remove slot
  - destination/venue patches never wipe who
  """
  def apply(prior, patch) when is_map(prior) and is_map(patch) do
    prior_s = stringify(prior)
    patch_s = stringify(patch)

    Enum.reduce(@slot_keys, prior_s, fn key, acc ->
      case Map.fetch(patch_s, key) do
        :error ->
          acc

        {:ok, "__clear__"} ->
          Map.delete(acc, key)

        {:ok, nil} ->
          # Missing/null in patch means unchanged (contract).
          acc

        {:ok, ""} ->
          acc

        {:ok, []} ->
          acc

        {:ok, value} ->
          put_slot(acc, key, value)
      end
    end)
    |> then(fn ctx ->
      # Slot isolation: destination/venue patches cannot invent who.
      dest_patched? = is_binary(Map.get(patch_s, "destination"))
      venue_patched? = is_binary(Map.get(patch_s, "venue"))
      who = Map.get(prior_s, "who")

      if (dest_patched? or venue_patched?) and not is_nil(who) do
        primary_person =
          prior_s["primary_person"] ||
            who |> PlanningContext.sanitize_who(ctx["destination"]) |> primary()

        ctx
        |> Map.put("who", who)
        |> Map.put("primary_person", primary_person)
        |> Map.put("participants", who)
      else
        ctx
      end
    end)
    |> Map.put("updated_at", DateTime.utc_now() |> DateTime.to_iso8601())
  end

  def apply(prior, _), do: stringify(prior || %{})

  @doc "Extract a patch from user text relative to prior context."
  def extract_from_text(raw, prior \\ %{}) when is_binary(raw) do
    prior = stringify(prior)
    down = String.downcase(raw)
    patch = %{}

    patch =
      cond do
        Regex.match?(~r/\b(?:actually|make it|change (?:it|that) to)\s+sunday\b/i, raw) ->
          Map.put(patch, "when", "Sunday")

        Regex.match?(~r/\b(?:actually|make it|change (?:it|that) to)\s+saturday\b/i, raw) ->
          Map.put(patch, "when", "Saturday")

        Regex.match?(~r/\b(?:actually|make it|change (?:it|that) to)\s+friday\b/i, raw) ->
          Map.put(patch, "when", "Friday")

        m = Regex.run(~r/\b(?:actually|make it)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/i, raw) ->
          Map.put(patch, "when_time", Enum.at(m, 1))

        true ->
          patch
      end

    patch =
      if Regex.match?(~r/\bsurprise\b/i, raw) do
        Map.merge(patch, %{"visibility_mode" => "surprise", "surprise" => true})
      else
        patch
      end

    patch =
      cond do
        Regex.match?(
          ~r/\b(?:cancel|drop|remove)\s+(?:the\s+)?(?:restaurant|venue|dinner|reservation)\b/i,
          raw
        ) and
            (String.contains?(down, "keep") or String.contains?(down, "still") or
               Map.get(prior, "destination") != nil) ->
          Map.merge(patch, %{
            "venue" => "__clear__",
            "cancel_venue_keep_plan" => true
          })

        true ->
          patch
      end

    # Soft time assumption class A — only if when present without clock.
    patch =
      if is_nil(Map.get(patch, "when_time")) and is_binary(prior["when"]) and
           Regex.match?(~r/\baround\s+(\d{1,2})/i, raw) do
        case Regex.run(~r/\baround\s+(\d{1,2}(?::\d{2})?)/i, raw) do
          [_, t] -> Map.put(patch, "when_time", t)
          _ -> patch
        end
      else
        patch
      end

    patch
  end

  @doc "True when patch only mutates listed slots (for PLAN_ID_STABLE proofs)."
  def slots_changed(prior, next) do
    prior = stringify(prior)
    next = stringify(next)

    @slot_keys
    |> Enum.filter(fn k -> Map.get(prior, k) != Map.get(next, k) end)
  end

  defp put_slot(acc, "who", value) do
    clean = PlanningContext.sanitize_who(value, acc["destination"])

    if clean do
      acc
      |> Map.put("who", clean)
      |> Map.put("participants", clean)
      |> Map.put("primary_person", primary(clean))
    else
      acc
    end
  end

  defp put_slot(acc, "venue", "__clear__") do
    acc
    |> Map.delete("venue")
    |> Map.put("venue_cancelled", true)
  end

  defp put_slot(acc, key, value), do: Map.put(acc, key, value)

  defp primary(who) when is_binary(who), do: who
  defp primary([n | _]) when is_binary(n), do: n
  defp primary(_), do: nil

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end

  defp stringify(_), do: %{}
end
