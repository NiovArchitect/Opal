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
    destination venue when when_resolved when_time what
    category quality_intent wants_restaurant solo
    plan_id visibility_mode surprise
    dependencies next_dependency
    intent_scope initial_planning_visibility who_unresolved
    search_mode requested_venue_name requested_venue_locality
    opportunity_fingerprint
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
          # who/participants clear must wipe the whole person cluster.
          if key in ~w(who primary_person participants) do
            acc
            |> Map.delete("who")
            |> Map.delete("primary_person")
            |> Map.delete("participants")
          else
            Map.delete(acc, key)
          end

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
      # Slot isolation: real destination/venue patches cannot invent who.
      # "__clear__" is not a destination patch — and explicit who clear must win.
      who_cleared? =
        Map.get(patch_s, "who") == "__clear__" or
          Map.get(patch_s, "primary_person") == "__clear__" or
          Map.get(patch_s, "participants") == "__clear__"

      dest_val = Map.get(patch_s, "destination")
      venue_val = Map.get(patch_s, "venue")

      dest_patched? = is_binary(dest_val) and dest_val != "__clear__"
      venue_patched? = is_binary(venue_val) and venue_val != "__clear__"
      who = Map.get(prior_s, "who")

      if not who_cleared? and (dest_patched? or venue_patched?) and not is_nil(who) do
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

        # Clock-time corrections: "change the time to 8 PM", "make it 8pm", "actually 7:30"
        m =
            Regex.run(
              ~r/\b(?:actually|make it|change (?:the )?(?:time|it|that) to)\s+(\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?))\b/i,
              raw
            ) ->
          Map.put(patch, "when_time", normalize_clock(Enum.at(m, 1)))

        m = Regex.run(~r/\b(?:actually|make it)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/i, raw) ->
          Map.put(patch, "when_time", normalize_clock(Enum.at(m, 1)))

        true ->
          patch
      end

    patch =
      cond do
        Regex.match?(
          ~r/\b(?:don'?t|do not|no longer|stop)\s+(?:make it |keep it )?a?\s*surprise\b/i,
          raw
        ) or Regex.match?(~r/\bnot a surprise\b/i, raw) or
            Regex.match?(~r/\breveal (?:it|the plan|this)\b/i, raw) ->
          Map.merge(patch, %{
            "visibility_mode" => "normal",
            "surprise" => false,
            "reveal_blocked" => false,
            "invite_blocked" => false
          })

        Regex.match?(~r/\bsurprise\b/i, raw) ->
          Map.merge(patch, %{"visibility_mode" => "surprise", "surprise" => true})

        true ->
          patch
      end

    patch =
      if solo_intent?(raw) do
        Map.merge(patch, %{
          "solo" => true,
          "who" => "__clear__",
          "primary_person" => "__clear__",
          "participants" => "__clear__"
        })
      else
        patch
      end

    # Intent-scope isolation: generic "someone close" must NOT inherit prior WHO.
    patch =
      if generic_open_window?(raw) do
        Map.merge(patch, %{
          "intent_scope" => "generic_open_window",
          "who" => "__clear__",
          "primary_person" => "__clear__",
          "participants" => "__clear__",
          "solo" => false
        })
      else
        patch
      end

    # Birthday / celebration opportunity — owner-private by default; new scope.
    # Possessive "River's birthday" sets WHO from the utterance (person-agnostic).
    patch =
      if birthday_intent?(raw) do
        base = %{
          "intent_scope" => "birthday",
          "initial_planning_visibility" => "owner_private",
          "category" => "celebration"
        }

        who_from_text =
          case Regex.run(~r/\b([A-Z][a-zA-Z']{1,30})(?:'s|’s)\s+birthday\b/, raw) do
            [_, name] -> name
            _ -> nil
          end

        if is_binary(who_from_text) do
          Map.merge(base, %{"who" => who_from_text, "primary_person" => who_from_text})
        else
          base
        end
        |> then(&Map.merge(patch, &1))
      else
        patch
      end

    # Scope change clears prior trip/venue so Mexico City etc. cannot ride into Friday dinner.
    # (No Map.get/2 in guards — illegal in Elixir.)
    patch =
      case {Map.get(prior, "intent_scope"), Map.get(patch, "intent_scope")} do
        {old, new} when is_binary(old) and is_binary(new) and old != new ->
          Map.merge(patch, %{
            "destination" => "__clear__",
            "venue" => "__clear__",
            "plan_id" => "__clear__",
            "wants_restaurant" => "__clear__",
            "when_time" => "__clear__"
          })

        {nil, new} when is_binary(new) ->
          prior_plan_id = Map.get(prior, "plan_id")

          if is_binary(prior_plan_id) do
            # Prior durable trip without scope → entering a named opportunity clears trip slots.
            Map.merge(patch, %{
              "destination" => "__clear__",
              "venue" => "__clear__",
              "plan_id" => "__clear__"
            })
          else
            patch
          end

        _ ->
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
          [_, t] -> Map.put(patch, "when_time", normalize_clock(t))
          _ -> patch
        end
      else
        patch
      end

    # Exact named venue: "Nighthawk in Coronado", "take us to Pujol in Mexico City"
    patch =
      case extract_exact_venue(raw) do
        %{name: name, locality: locality} ->
          Map.merge(patch, %{
            "search_mode" => "exact_entity",
            "requested_venue_name" => name,
            "requested_venue_locality" => locality,
            "venue" => name,
            "destination" => locality,
            "category" => Map.get(patch, "category") || "restaurant",
            "wants_restaurant" => true
          })

        nil ->
          patch
      end

    # Opportunity fingerprint for pending-plan resume (same intent → same plan).
    patch =
      if is_binary(Map.get(patch, "intent_scope")) or is_binary(Map.get(patch, "when")) or
           is_binary(Map.get(patch, "requested_venue_name")) do
        fp =
          opportunity_fingerprint(%{
            "intent_scope" => Map.get(patch, "intent_scope") || prior["intent_scope"],
            "when" => Map.get(patch, "when") || prior["when"],
            "destination" => Map.get(patch, "destination") || prior["destination"],
            "who" => Map.get(patch, "who") || prior["who"],
            "requested_venue_name" =>
              Map.get(patch, "requested_venue_name") || prior["requested_venue_name"],
            "search_mode" => Map.get(patch, "search_mode") || prior["search_mode"]
          })

        Map.put(patch, "opportunity_fingerprint", fp)
      else
        patch
      end

    patch
  end

  @doc "True when user explicitly asked for solo / just-for-me planning."
  def solo_intent?(raw) when is_binary(raw) do
    Regex.match?(
      ~r/\b(?:just for me|for myself|by myself|solo|alone|on my own)\b/i,
      raw
    )
  end

  def solo_intent?(_), do: false

  @doc """
  Generic open-window opportunity — WHO unresolved; never inherit prior person.

  Covers unspecified Friday/dinner/opportunity phrasing without a named person.
  Explicit "with Maya" / "with River" is not generic.
  """
  def generic_open_window?(raw) when is_binary(raw) do
    named_person? = Regex.match?(~r/\bwith\s+[A-Z][a-zA-Z']{1,30}\b/, raw)

    generic_cue? =
      Regex.match?(
        ~r/\b(?:someone close|someone nearby|with someone|dinner with someone|open\s+—\s+dinner|still open)\b/i,
        raw
      ) or
        Regex.match?(
          ~r/\b(?:friday|saturday|sunday|tonight|this weekend)\b.*\b(?:dinner|plans?|eat|restaurant)\b/i,
          raw
        ) or
        Regex.match?(
          ~r/\b(?:dinner|plans?|eat|restaurant)\b.*\b(?:friday|saturday|sunday|tonight|this weekend)\b/i,
          raw
        ) or
        Regex.match?(~r/\b(?:open opportunity|friday opportunity|dinner opportunity)\b/i, raw)

    # "Dinner Friday" without a named person is generic — WHO stays unspecified.
    # Exclude exact named-venue requests (those carry their own WHO rules).
    exact_venue? = match?(%{name: _}, extract_exact_venue(raw))

    generic_cue? and not named_person? and not exact_venue? and not solo_intent?(raw)
  end

  def generic_open_window?(_), do: false

  @doc """
  Detect exact named-venue intent: proper-name venue + locality cue.

  Person-agnostic — no hardcoded venue or city fixtures.
  Examples: "Nighthawk in Coronado", "take us to Pujol in Mexico City".
  """
  def extract_exact_venue(raw) when is_binary(raw) do
    # Discovery phrasing must not become exact entity.
    discovery? =
      Regex.match?(
        ~r/\b(?:find|look for|search for|somewhere|options?|recommendations?|top restaurant|best restaurant|a restaurant|some restaurants)\b/i,
        raw
      )

    # Patterns: "to/at/for NAME in LOCALITY" or "NAME in LOCALITY"
    patterns = [
      ~r/\b(?:take (?:us|me|her|him|them) to|go to|meet (?:at|us at)|dinner at|eat at|reservations? at)\s+([A-Z][\w'&.]*(?:\s+[A-Z][\w'&.]*){0,4})\s+(?:in|on|at)\s+([A-Z][\w]+(?:\s+[A-Z][\w]+){0,3})\b/,
      ~r/\b([A-Z][\w'&.]*(?:\s+[A-Z][\w'&.]*){0,4})\s+in\s+([A-Z][\w]+(?:\s+[A-Z][\w]+){0,3})\b/
    ]

    stop = MapSet.new(~w(
      Friday Saturday Sunday Monday Tuesday Wednesday Thursday Tonight Tomorrow Weekend
      Dinner Lunch Brunch Breakfast Restaurant Plans Something Somewhere Mexico City
      San Diego The A An
    ))

    found =
      Enum.find_value(patterns, fn re ->
        case Regex.run(re, raw) do
          [_, name, locality] ->
            name = String.trim(name)
            locality = String.trim(locality)

            if MapSet.member?(stop, name) or MapSet.member?(stop, locality) or
                 String.downcase(name) in ~w(friday saturday sunday monday tuesday wednesday thursday tonight tomorrow dinner lunch brunch) do
              nil
            else
              %{name: name, locality: locality}
            end

          _ ->
            nil
        end
      end)

    cond do
      discovery? and not Regex.match?(~r/\b(?:take|go to|meet|dinner at|eat at|reservations? at)\b/i, raw) ->
        nil

      match?(%{name: _}, found) ->
        found

      true ->
        nil
    end
  end

  def extract_exact_venue(_), do: nil

  @doc "Stable fingerprint for pending-intent resume (same intent → same plan)."
  def opportunity_fingerprint(ctx) when is_map(ctx) do
    c = stringify(ctx)

    parts =
      [
        c["intent_scope"] || "",
        c["when"] || "",
        c["destination"] || "",
        c["requested_venue_name"] || "",
        c["search_mode"] || "",
        who_fp(c["who"])
      ]
      |> Enum.map(&String.downcase(String.trim(to_string(&1))))

    :crypto.hash(:sha256, Enum.join(parts, "|"))
    |> Base.encode16(case: :lower)
    |> binary_part(0, 16)
  end

  def opportunity_fingerprint(_), do: nil

  defp who_fp(nil), do: ""
  defp who_fp("__clear__"), do: ""
  defp who_fp(w) when is_binary(w), do: String.downcase(w)
  defp who_fp([h | _]) when is_binary(h), do: String.downcase(h)
  defp who_fp(_), do: ""

  defp normalize_clock(raw) when is_binary(raw) do
    t = String.trim(raw) |> String.replace(~r/\./, "") |> String.upcase()

    cond do
      Regex.match?(~r/^\d{1,2}:\d{2}\s*[AP]M$/i, t) -> t
      Regex.match?(~r/^\d{1,2}\s*[AP]M$/i, t) -> String.replace(t, ~r/\s+/, " ")
      Regex.match?(~r/^\d{1,2}:\d{2}$/, t) -> t
      Regex.match?(~r/^\d{1,2}$/, t) -> t
      true -> t
    end
  end

  defp normalize_clock(other), do: other

  @doc "Birthday / celebration planning opportunity."
  def birthday_intent?(raw) when is_binary(raw) do
    Regex.match?(~r/\bbirthday\b/i, raw)
  end

  def birthday_intent?(_), do: false

  @doc "Nudge tap already affirmed planning — skip second 'Want me to set this up?'."
  def nudge_affirmed?(raw) when is_binary(raw) do
    down = String.downcase(raw)

    String.starts_with?(down, "yes") or
      Regex.match?(~r/\bwant me to plan something\b/i, raw) or
      Regex.match?(~r/\bplan something for .+birthday\b/i, raw)
  end

  def nudge_affirmed?(_), do: false

  @doc "True when patch only mutates listed slots (for PLAN_ID_STABLE proofs)."
  def slots_changed(prior, next) do
    prior = stringify(prior)
    next = stringify(next)

    @slot_keys
    |> Enum.filter(fn k -> Map.get(prior, k) != Map.get(next, k) end)
  end

  @doc """
  Slots the patch explicitly intends to change (absent keys = unchanged).

  Prefer this for correction evidence — comparing prior/next alone can hide a
  no-op re-assertion of the same value.
  """
  def slots_changed_by_patch(patch) when is_map(patch) do
    patch
    |> stringify()
    |> Map.keys()
    |> Enum.filter(&(&1 in @slot_keys))
    |> Enum.sort()
  end

  def slots_changed_by_patch(_), do: []

  # Clear must win before generic who write (otherwise sanitize nil keeps prior WHO).
  defp put_slot(acc, "who", "__clear__") do
    acc
    |> Map.delete("who")
    |> Map.delete("primary_person")
    |> Map.delete("participants")
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

  defp put_slot(acc, key, "__clear__") when key in ~w(who primary_person participants) do
    acc
    |> Map.delete("who")
    |> Map.delete("primary_person")
    |> Map.delete("participants")
  end

  defp put_slot(acc, key, "__clear__")
       when key in ~w(destination venue plan_id wants_restaurant when_time) do
    Map.delete(acc, key)
  end

  defp put_slot(acc, "surprise", false) do
    acc
    |> Map.put("surprise", false)
    |> Map.put("visibility_mode", "normal")
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
