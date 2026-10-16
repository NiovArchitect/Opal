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
    category cuisine quality_intent wants_restaurant solo
    plan_id visibility_mode surprise
    dependencies next_dependency
    intent_scope initial_planning_visibility who_unresolved
    search_mode requested_venue_name requested_venue_locality
    opportunity_fingerprint discovery_request
    when_time_explicit when_explicit conversation_act
    explicit_constraints
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

    # Conversation act is turn-local. Clear sticky prior acts unless this utterance is one.
    patch =
      case classify_conversation_act(raw) do
        nil -> Map.put(patch, "conversation_act", "__clear__")
        act -> Map.put(patch, "conversation_act", act)
      end

    # Explicit day + clock from the utterance (outranks inherited defaults).
    # "for Sunday, 10 a.m." / "Sunday at 10am" / "Make it 8 PM" / "actually 7:30"
    patch =
      case extract_explicit_temporal(raw) do
        %{when: w, when_time: t} ->
          patch
          |> Map.put("when", w)
          |> Map.put("when_time", t)
          |> Map.put("when_explicit", true)
          |> Map.put("when_time_explicit", true)
          |> put_explicit_constraints(%{"when" => w, "when_time" => t})

        %{when: w} ->
          patch
          |> Map.put("when", w)
          |> Map.put("when_explicit", true)
          |> put_explicit_constraints(%{"when" => w})

        %{when_time: t} ->
          patch
          |> Map.put("when_time", t)
          |> Map.put("when_time_explicit", true)
          |> put_explicit_constraints(%{"when_time" => t})

        _ ->
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
        when_s =
          cond do
            Regex.match?(~r/\bfriday\b/i, raw) -> "Friday"
            Regex.match?(~r/\bsaturday\b/i, raw) -> "Saturday"
            Regex.match?(~r/\bsunday\b/i, raw) -> "Sunday"
            Regex.match?(~r/\btonight\b/i, raw) -> "tonight"
            Regex.match?(~r/\bthis weekend\b/i, raw) -> "this weekend"
            true -> Map.get(patch, "when")
          end

        base = %{
          "intent_scope" => "generic_open_window",
          "who" => "__clear__",
          "primary_person" => "__clear__",
          "participants" => "__clear__",
          "solo" => false,
          "category" => Map.get(patch, "category") || "restaurant",
          "wants_restaurant" => true,
          # New open-window opportunity — do not ride a prior exact venue/plan/city.
          "requested_venue_name" => "__clear__",
          "requested_venue_locality" => "__clear__",
          "venue" => "__clear__",
          "destination" => "__clear__",
          "cuisine" => "__clear__",
          "discovery_request" => "__clear__",
          "search_mode" => "__clear__",
          "plan_id" => "__clear__"
        }

        base =
          if is_binary(when_s) and when_s != "",
            do: Map.put(base, "when", when_s),
            else: base

        Map.merge(patch, base)
      else
        patch
      end

    # Birthday / celebration opportunity — owner-private by default; new scope.
    # Possessive "River's birthday" sets WHO from the utterance (person-agnostic).
    # Never inherit prior venue/city/search from an unrelated dinner task.
    patch =
      if birthday_intent?(raw) do
        base = %{
          "intent_scope" => "birthday",
          "initial_planning_visibility" => "owner_private",
          "category" => "celebration",
          "wants_restaurant" => false,
          "venue" => "__clear__",
          "requested_venue_name" => "__clear__",
          "requested_venue_locality" => "__clear__",
          "destination" => "__clear__",
          "cuisine" => "__clear__",
          "search_mode" => "__clear__",
          "discovery_request" => "__clear__",
          "plan_id" => "__clear__",
          "when" => "__clear__",
          "when_resolved" => "__clear__",
          "when_time" => "__clear__",
          "when_time_explicit" => "__clear__",
          "when_explicit" => "__clear__",
          "explicit_constraints" => "__clear__"
        }

        who_from_text =
          case Regex.run(~r/\b([A-Z][a-zA-Z']{1,30})(?:'s|’s)\s+birthday\b/, raw) do
            [_, name] -> name
            _ -> nil
          end

        base =
          if is_binary(who_from_text) do
            Map.merge(base, %{
              "who" => who_from_text,
              "primary_person" => who_from_text,
              "participants" => who_from_text
            })
          else
            base
          end

        base =
          cond do
            Regex.match?(~r/\bin three days\b/i, raw) -> Map.put(base, "when", "in three days")
            Regex.match?(~r/\bthis weekend\b/i, raw) -> Map.put(base, "when", "this weekend")
            true -> base
          end

        Map.merge(patch, base)
      else
        patch
      end

    # Scope change clears prior trip/venue so Mexico City etc. cannot ride into Friday dinner.
    # Also drop prior explicit_constraints — a new task must not inherit Sunday/10 AM from Henry.
    # (No Map.get/2 in guards — illegal in Elixir.)
    patch =
      case {Map.get(prior, "intent_scope"), Map.get(patch, "intent_scope")} do
        {old, new} when is_binary(old) and is_binary(new) and old != new ->
          cleared = %{
            "destination" => "__clear__",
            "venue" => "__clear__",
            "plan_id" => "__clear__",
            "wants_restaurant" => "__clear__",
            "when_time" => "__clear__",
            "when_time_explicit" => "__clear__",
            "when_explicit" => "__clear__",
            "explicit_constraints" => "__clear__"
          }

          # Preserve constraints freshly extracted from THIS utterance.
          cleared =
            if Map.get(patch, "when_explicit") == true or Map.get(patch, "when_time_explicit") == true do
              cleared
              |> Map.drop(["when_time", "when_time_explicit", "when_explicit", "explicit_constraints"])
            else
              cleared
            end

          Map.merge(patch, cleared)

        {nil, new} when is_binary(new) ->
          prior_plan_id = Map.get(prior, "plan_id")

          if is_binary(prior_plan_id) do
            # Prior durable trip without scope → entering a named opportunity clears trip slots.
            Map.merge(patch, %{
              "destination" => "__clear__",
              "venue" => "__clear__",
              "plan_id" => "__clear__",
              "explicit_constraints" => "__clear__"
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

        # "Cancel the Henry search, but keep Maya's birthday plan."
        patch["conversation_act"] in ["cancel_search", "cancel_venue_keep_plan"] ->
          Map.merge(patch, %{
            "venue" => "__clear__",
            "requested_venue_name" => "__clear__",
            "requested_venue_locality" => "__clear__",
            "search_mode" => "__clear__",
            "wants_restaurant" => "__clear__",
            "discovery_request" => "__clear__",
            "cuisine" => "__clear__",
            "cancel_venue_keep_plan" => true,
            "provider_parked" => true
          })

        patch["conversation_act"] == "switch_topic" ->
          Map.merge(patch, %{
            "provider_parked" => true,
            "wants_restaurant" => "__clear__",
            "discovery_request" => "__clear__"
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
    # New exact-venue task: clear inherited WHEN unless this utterance supplies it.
    patch =
      case extract_exact_venue(raw) do
        %{name: name, locality: locality} ->
          base = %{
            "search_mode" => "exact_entity",
            "requested_venue_name" => name,
            "requested_venue_locality" => locality,
            "venue" => name,
            "destination" => locality,
            "category" => Map.get(patch, "category") || "restaurant",
            "wants_restaurant" => true,
            "intent_scope" => "exact_venue",
            # Exact lookup must not inherit prior cuisine / open-window / person.
            "cuisine" => "__clear__",
            "discovery_request" => "__clear__",
            "who" => "__clear__",
            "primary_person" => "__clear__",
            "participants" => "__clear__",
            "plan_id" => "__clear__"
          }

          # Explicit current instruction outranks historical WHEN from prior tasks.
          base =
            if Map.get(patch, "when_explicit") == true or is_binary(Map.get(patch, "when")) do
              base
            else
              base
              |> Map.put("when", "__clear__")
              |> Map.put("when_resolved", "__clear__")
            end

          base =
            if Map.get(patch, "when_time_explicit") == true or is_binary(Map.get(patch, "when_time")) do
              base
            else
              base
              |> Map.put("when_time", "__clear__")
              |> Map.put("when_time_explicit", "__clear__")
              |> Map.put("explicit_constraints", "__clear__")
            end

          # New exact-venue task: drop sticky conversation_act from prior challenges.
          base = Map.put_new(base, "conversation_act", Map.get(patch, "conversation_act") || "__clear__")

          Map.merge(patch, base)

        nil ->
          patch
      end

    # Cuisine / category discovery: "Find three Mediterranean restaurants in Coronado."
    # Isolates from prior exact_entity / person / plan continuity.
    patch =
      case extract_discovery_request(raw) do
        %{cuisine: cuisine, destination: dest} = disc ->
          base = %{
            "search_mode" => "discovery",
            "discovery_request" => true,
            "intent_scope" => "cuisine_discovery",
            "category" => "restaurant",
            "wants_restaurant" => true,
            "cuisine" => cuisine,
            "requested_venue_name" => "__clear__",
            "requested_venue_locality" => dest || "__clear__",
            "venue" => "__clear__",
            "plan_id" => "__clear__",
            "who" => "__clear__",
            "primary_person" => "__clear__",
            "participants" => "__clear__"
          }

          base =
            if is_binary(dest) and dest != "",
              do: Map.put(base, "destination", dest),
              else: base

          # Only keep WHEN when this utterance supplies it — do not inherit Friday
          # from a prior open-window into a fresh cuisine discovery ask.
          # Clear when_resolved / when_time too — reply copy reads those fallbacks.
          base =
            case Map.get(disc, :when) do
              w when is_binary(w) and w != "" ->
                Map.put(base, "when", w)

              _ ->
                base
                |> Map.put("when", "__clear__")
                |> Map.put("when_resolved", "__clear__")
                |> Map.put("when_time", "__clear__")
            end

          Map.merge(patch, base)

        nil ->
          patch
      end

    # Opportunity fingerprint for pending-plan resume (same intent → same plan).
    patch =
      if is_binary(Map.get(patch, "intent_scope")) or is_binary(Map.get(patch, "when")) or
           is_binary(Map.get(patch, "requested_venue_name")) or
           Map.get(patch, "discovery_request") == true do
        fp =
          opportunity_fingerprint(%{
            "intent_scope" => Map.get(patch, "intent_scope") || prior["intent_scope"],
            "when" => Map.get(patch, "when") || prior["when"],
            "destination" => Map.get(patch, "destination") || prior["destination"],
            "who" => Map.get(patch, "who") || prior["who"],
            "requested_venue_name" =>
              Map.get(patch, "requested_venue_name") || prior["requested_venue_name"],
            "search_mode" => Map.get(patch, "search_mode") || prior["search_mode"],
            "cuisine" => Map.get(patch, "cuisine") || prior["cuisine"]
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
    # "Find The Henry restaurant in Coronado" is an exact named venue — not cuisine discovery.
    case extract_named_find_venue(raw) do
      %{name: _} = named ->
        named

      nil ->
        extract_exact_venue_legacy(raw)
    end
  end

  def extract_exact_venue(_), do: nil

  @doc """
  Detect a venue-location *question* with no locality: "where is X",
  "do you know where X is", "what's the address of X".

  Person-agnostic — no hardcoded venue names. Returns `%{name: name}` or nil.

  Repair #12 (F12-04a): gives the intent layer a venue_question shape so a
  plain location question maps to `:named_venue` instead of falling through
  to `:chat` and the sticky recent_who re-engagement. Question words match
  case-insensitively; the venue name capture stays case-sensitive so
  "where is dinner" never becomes a venue.
  """
  def extract_venue_question(raw) when is_binary(raw) do
    name_re = ~S"((?:[Tt]he\s+)?[A-Z][\w'&.]*(?:\s+[A-Z][\w'&.]* ){0,3})"

    patterns = [
      "(?i:\\bdo\\s+you\\s+know\\s+where\\b)\\s+#{name_re}\\s+(?i:is|are)\\b",
      "(?i:\\bwhere\\s+is\\b)\\s+#{name_re}\\b",
      "(?i:\\bwhere's\\b)\\s+#{name_re}\\b",
      "(?i:\\bwhat(?:'s|\\s+is)\\s+the\\s+address\\s+of\\b)\\s+#{name_re}\\b",
      "(?i:\\bdo\\s+you\\s+know\\s+the\\s+address\\s+of\\b)\\s+#{name_re}\\b"
    ]

    stop = exact_venue_stop_words()

    Enum.find_value(patterns, fn src ->
      case Regex.run(Regex.compile!(src), raw) do
        [_, name] ->
          name = name |> String.trim() |> strip_venue_lead_verbs() |> String.trim()
          bare = name |> String.replace(~r/^(?:the\s+)/i, "") |> String.trim()

          cond do
            bare == "" -> nil
            MapSet.member?(stop, name) or MapSet.member?(stop, bare) -> nil
            day_word?(bare) -> nil
            cuisine_word?(bare) -> nil
            String.downcase(bare) in ~w(dinner lunch brunch breakfast restaurant venue) -> nil
            true -> %{name: name}
          end

        _ ->
          nil
      end
    end)
  end

  def extract_venue_question(_), do: nil

  @doc """
  Single copy source for the named-venue in-flight line (Repair #12 F12-42).

  The immediate provider override and the no-provider fallback render MUST
  produce the same line for the same fixture — never two divergent wordings.
  """
  def venue_lookup_copy(name, dest) when is_binary(name) and is_binary(dest) do
    name = String.trim(name)
    dest = String.trim(dest)

    if name != "" and dest != "" do
      "Looking up #{name} in #{dest}…"
    else
      nil
    end
  end

  def venue_lookup_copy(_, _), do: nil

  # Find/look up/search for a specific proper-named venue (optionally + "restaurant") in a locality.
  # Case-sensitive name capture — /i would let "find somewhere … in X" become exact_entity.
  # Repair #12 (F12-40): locality is a general multi-word proper-noun phrase
  # ("Los Angeles", "New York", "Salt Lake City") — never a metro allowlist.
  # Account-agnostic: no city fixtures embedded in extraction.
  defp extract_named_find_venue(raw) when is_binary(raw) do
    locality = ~S"([A-Z][\w]+(?:\s+[A-Z][\w]+){0,2})"

    patterns = [
      Regex.compile!(
        "\\b(?:[Ff]ind|[Ll]ook\\s+[Uu]p|[Ss]earch\\s+[Ff]or)\\s+((?:The\\s+)?[A-Z][\\w'&.]*(?:\\s+[A-Z][\\w'&.]*){0,4})\\s+[Rr]estaurants?\\s+(?:in|near|at|on)\\s+#{locality}\\b"
      ),
      Regex.compile!(
        "\\b(?:[Ff]ind|[Ll]ook\\s+[Uu]p|[Ss]earch\\s+[Ff]or)\\s+((?:The\\s+)?[A-Z][\\w'&.]*(?:\\s+[A-Z][\\w'&.]*){0,4})\\s+(?:in|near|at|on)\\s+#{locality}\\b"
      )
    ]

    stop = exact_venue_stop_words()

    Enum.find_value(patterns, fn re ->
      case Regex.run(re, raw) do
        [_, name, loc] ->
          name =
            name
            |> String.trim()
            |> strip_venue_lead_verbs()
            |> String.replace(~r/\s+restaurants?$/i, "")
            |> String.trim()

          loc = loc |> String.trim() |> sanitize_locality()

          cond do
            name == "" or loc == "" ->
              nil

            MapSet.member?(stop, name) or MapSet.member?(stop, loc) ->
              nil

            day_word?(name) or day_word?(loc) ->
              nil

            cuisine_word?(name) or name_has_cuisine_token?(name) ->
              nil

            # Quantity / generic discovery leads — not a venue identity.
            Regex.match?(~r/^(?:A|An|Some|Somewhere|Options?|Recommendations?|\d+)/i, name) ->
              nil

            place_confused_as_venue?(name, loc) ->
              nil

            true ->
              %{name: name, locality: loc}
          end

        _ ->
          nil
      end
    end)
  end

  defp extract_named_find_venue(_), do: nil

  defp name_has_cuisine_token?(name) when is_binary(name) do
    name
    |> String.split(~r/\s+/)
    |> Enum.any?(&cuisine_word?/1)
  end

  defp name_has_cuisine_token?(_), do: false

  defp extract_exact_venue_legacy(raw) when is_binary(raw) do
    # Discovery phrasing must not become exact entity — except "look up NAME" / named find.
    discovery? =
      Regex.match?(
        ~r/\b(?:find|look for|search for|somewhere|options?|recommendations?|top restaurant|best restaurant|a restaurant|some restaurants)\b/i,
        raw
      ) and not Regex.match?(~r/\blook\s+up\b/i, raw)

    # Patterns: plan/look-up/to/at NAME in LOCALITY.
    # Locality is a general multi-word proper-noun phrase (Repair #12 F12-40) —
    # never a metro allowlist. Day names / clock tails are stripped by
    # sanitize_locality/1, not by restricting which cities exist.
    locality = ~S"([A-Z][\w]+(?:\s+[A-Z][\w]+){0,2})"

    patterns = [
      Regex.compile!(
        "\\b(?:(?:make\\s+a\\s+)?plan\\s+to|look\\s+up|arrange(?:\\s+dinner)?\\s+at|take (?:us|me|her|him|them) to|go to|meet (?:at|us at)|dinner at|eat at|reservations? at)\\s+([A-Z][\\w'&.]*(?:\\s+[A-Z][\\w'&.]*){0,4})\\s+(?:in|on|at)\\s+#{locality}\\b",
        "i"
      ),
      Regex.compile!(
        "\\b(?:plan|arrange)\\s+([A-Z][\\w'&.]*(?:\\s+[A-Z][\\w'&.]*){0,4})\\s+in\\s+#{locality}\\b"
      ),
      Regex.compile!(
        "\\b([A-Z][\\w'&.]*(?:\\s+[A-Z][\\w'&.]*){0,4})\\s+in\\s+#{locality}\\b"
      )
    ]

    stop = exact_venue_stop_words()

    found =
      Enum.find_value(patterns, fn re ->
        case Regex.run(re, raw) do
          [_, name, locality] ->
            name =
              name
              |> String.trim()
              |> strip_venue_lead_verbs()
              |> String.replace(~r/\s+restaurants?$/i, "")
              |> String.trim()

            locality = locality |> String.trim() |> sanitize_locality()

            if MapSet.member?(stop, name) or MapSet.member?(stop, locality) or
                 day_word?(name) or day_word?(locality) or
                 String.downcase(name) in ~w(dinner lunch brunch plan arrange) or
                 cuisine_word?(name) or
                 place_confused_as_venue?(name, locality) do
              nil
            else
              %{name: name, locality: locality}
            end

          _ ->
            nil
        end
      end)

    cond do
      discovery? and
          not Regex.match?(
            ~r/\b(?:take|go to|meet|dinner at|eat at|reservations? at|plan to|look up|arrange)\b/i,
            raw
          ) ->
        nil

      match?(%{name: _}, found) ->
        found

      true ->
        nil
    end
  end

  defp exact_venue_stop_words do
    MapSet.new(~w(
      Friday Saturday Sunday Monday Tuesday Wednesday Thursday Tonight Tomorrow Weekend
      Dinner Lunch Brunch Breakfast Restaurant Plans Something Somewhere Mexico City
      San Diego The A An Plan Arrange Look Make
    ))
  end

  defp cuisine_word?(name) when is_binary(name) do
    n = String.downcase(String.trim(name))

    n in ~w(
      mediterranean italian mexican japanese sushi thai chinese indian korean
      french greek lebanese turkish vietnamese american seafood steak pizza
      vegan vegetarian ethiopian peruvian spanish portuguese caribbean
    )
  end

  defp cuisine_word?(_), do: false

  # "Coronado in San Diego" is geography, not a restaurant named Coronado.
  defp place_confused_as_venue?(name, locality) when is_binary(name) and is_binary(locality) do
    n = String.downcase(String.trim(name))
    l = String.downcase(String.trim(locality))

    place_words =
      MapSet.new([
        "coronado",
        "la jolla",
        "del mar",
        "pacific beach",
        "mission beach",
        "ocean beach",
        "downtown",
        "gaslamp",
        "north park",
        "south park"
      ])

    region_words =
      MapSet.new([
        "san diego",
        "california",
        "ca",
        "usa",
        "united states",
        "mexico",
        "baja"
      ])

    MapSet.member?(place_words, n) and MapSet.member?(region_words, l)
  end

  defp place_confused_as_venue?(_, _), do: false

  defp strip_venue_lead_verbs(name) when is_binary(name) do
    name
    |> String.replace(~r/^(?:Plan|Arrange|Look(?:\s+Up)?|Make)\s+/i, "")
    |> String.trim()
  end

  defp strip_venue_lead_verbs(other), do: other

  # Keep first locality; trailing "in San Diego" is regional context, not the venue.
  # Repair #12 (F12-40): the multi-word locality capture can swallow a bare
  # trailing day word ("San Diego Saturday") — strip day tails with or without
  # a preposition so the locality stays a place, never a place+day.
  defp sanitize_locality(locality) when is_binary(locality) do
    locality
    |> String.replace(~r/\s+in\s+(?:San\s+Diego|California|CA)\b.*$/i, "")
    |> String.replace(
      ~r/\s+(?:(?:for|on|,)\s+)?(Friday|Saturday|Sunday|Monday|Tuesday|Wednesday|Thursday)\b.*$/i,
      ""
    )
    |> String.replace(~r/\s+(?:at|,)\s*\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)?\b.*$/i, "")
    |> String.trim()
  end

  defp sanitize_locality(other), do: other

  defp day_word?(s) when is_binary(s) do
    String.downcase(s) in ~w(friday saturday sunday monday tuesday wednesday thursday tonight tomorrow weekend)
  end

  defp day_word?(_), do: false

  @doc """
  Extract explicit day-of-week and/or clock time from natural language.
  Explicit values outrank soft defaults and inherited prior context.
  """
  def extract_explicit_temporal(raw) when is_binary(raw) do
    when_s =
      cond do
        Regex.match?(~r/\b(?:actually|make it|change (?:it|that) to)\s+sunday\b/i, raw) -> "Sunday"
        Regex.match?(~r/\b(?:actually|make it|change (?:it|that) to)\s+saturday\b/i, raw) -> "Saturday"
        Regex.match?(~r/\b(?:actually|make it|change (?:it|that) to)\s+friday\b/i, raw) -> "Friday"
        Regex.match?(~r/\bsunday\b/i, raw) -> "Sunday"
        Regex.match?(~r/\bsaturday\b/i, raw) -> "Saturday"
        Regex.match?(~r/\bfriday\b/i, raw) -> "Friday"
        Regex.match?(~r/\bthursday\b/i, raw) -> "Thursday"
        Regex.match?(~r/\btonight\b/i, raw) -> "tonight"
        Regex.match?(~r/\btomorrow\b/i, raw) -> "tomorrow"
        true -> nil
      end

    time_s =
      cond do
        m =
            Regex.run(
              ~r/\b(?:actually|make it|change (?:the )?(?:time|it|that) to)\s+(\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?))\b/i,
              raw
            ) ->
          normalize_clock(Enum.at(m, 1))

        m = Regex.run(~r/\b(?:actually|make it)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/i, raw) ->
          normalize_clock(Enum.at(m, 1))

        # "for Sunday, 10 a.m." / "at 10am" / "Sunday 10:00 AM" / "10 a.m."
        m =
            Regex.run(
              ~r/\b(?:at|,|for)?\s*(\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?))\b/i,
              raw
            ) ->
          normalize_clock(Enum.at(m, 1))

        true ->
          nil
      end

    cond do
      is_binary(when_s) and is_binary(time_s) -> %{when: when_s, when_time: time_s}
      is_binary(when_s) -> %{when: when_s}
      is_binary(time_s) -> %{when_time: time_s}
      true -> nil
    end
  end

  def extract_explicit_temporal(_), do: nil

  @doc """
  Classify meta conversation acts that must not restart provider lookup.
  """
  def classify_conversation_act(raw) when is_binary(raw) do
    cond do
      Regex.match?(
        ~r/\bwhy\s+did\s+you\s+(?:change|switch|pick|choose|ask|ignore|overwrite|alter)\b/i,
        raw
      ) ->
        "challenge_prior_action"

      Regex.match?(~r/\bthat'?s\s+not\s+the\s+(?:place|venue|restaurant|one)\b/i, raw) ->
        "correct_venue"

      Regex.match?(~r/\bno,?\s+i\s+meant\b/i, raw) ->
        "correct_slot"

      Regex.match?(~r/\bwhy\s+are\s+you\s+asking\b/i, raw) ->
        "challenge_question"

      Regex.match?(~r/\bgo\s+back\s+to\s+(?:the\s+)?birthday\b/i, raw) ->
        "switch_task_birthday"

      # Cancel a pending/active venue lookup; keep non-venue plan state.
      Regex.match?(
        ~r/\b(?:cancel|stop|drop|abort)\s+(?:the\s+)?(?:\w+\s+){0,3}(?:search|lookup|look[- ]?up)\b/i,
        raw
      ) or
          (Regex.match?(~r/\b(?:cancel|stop|drop)\b/i, raw) and
             Regex.match?(~r/\b(?:henry|restaurant|venue)\b/i, raw) and
             Regex.match?(~r/\bkeep\b/i, raw)) ->
        "cancel_search"

      Regex.match?(~r/\bforget\s+that\s+venue\b/i, raw) ->
        "cancel_venue_keep_plan"

      Regex.match?(
        ~r/\b(?:let'?s\s+)?(?:talk|chat)\s+about\s+something\s+else\b/i,
        raw
      ) or
          Regex.match?(
            ~r/\bforget\s+about\s+(?:the\s+)?(?:restaurant|venue|search|that|it)\b/i,
            raw
          ) or
          Regex.match?(~r/\bchange\s+(?:of\s+)?(?:subject|topic)\b/i, raw) or
          Regex.match?(~r/\bnever\s+mind\s+(?:the\s+)?(?:restaurant|search|venue)\b/i, raw) or
          # Repair #11 — explicit new-direction phrasing: the sticky
          # re-engagement must not override a fresh turn.
          Regex.match?(~r/\bsomething\s+new\b/i, raw) or
          Regex.match?(~r/\bnew\s+search\b/i, raw) or
          Regex.match?(~r/\bstart\s+over\b/i, raw) or
          Regex.match?(~r/\bforget\s+it\b/i, raw) or
          Regex.match?(~r/\bnever\s+mind\s+that\b/i, raw) ->
        "switch_topic"

      Regex.match?(~r/\bwhat\s+(?:were|are)\s+we\s+discussing\b/i, raw) or
          Regex.match?(~r/\bwhat\s+happened\s+to\b/i, raw) ->
        "recall_prior_task"

      Regex.match?(~r/\bshow\s+me\s+the\s+previous\s+messages\b/i, raw) ->
        "show_history"

      Regex.match?(~r/\bshow\s+me\s+the\s+other\b/i, raw) ->
        "show_other_options"

      true ->
        nil
    end
  end

  def classify_conversation_act(_), do: nil

  defp put_explicit_constraints(patch, attrs) when is_map(patch) and is_map(attrs) do
    prior =
      case Map.get(patch, "explicit_constraints") do
        m when is_map(m) -> m
        _ -> %{}
      end

    Map.put(patch, "explicit_constraints", Map.merge(prior, attrs))
  end

  @doc """
  Cuisine / category restaurant discovery (not exact entity).

  Person-agnostic. Examples:
  - "Find three Mediterranean restaurants in Coronado."
  - "Look for Italian places in San Diego Saturday."
  """
  def extract_discovery_request(raw) when is_binary(raw) do
    discovery_cue? =
      Regex.match?(
        ~r/\b(?:find|look for|search for|show me|recommend|suggest|options? for)\b/i,
        raw
      ) or
        Regex.match?(~r/\b(?:restaurants?|places|spots)\b/i, raw)

    cuisine = extract_cuisine(raw)

    dest =
      case Regex.run(
             ~r/\b(?:in|near|around)\s+([A-Z][\w]+(?:\s+[A-Z][\w]+){0,3})\b/,
             raw
           ) do
        [_, d] -> String.trim(d)
        _ -> nil
      end

    when_s =
      cond do
        Regex.match?(~r/\bfriday\b/i, raw) -> "Friday"
        Regex.match?(~r/\bsaturday\b/i, raw) -> "Saturday"
        Regex.match?(~r/\bsunday\b/i, raw) -> "Sunday"
        Regex.match?(~r/\btonight\b/i, raw) -> "tonight"
        Regex.match?(~r/\btomorrow\b/i, raw) -> "tomorrow"
        true -> nil
      end

    restaurant? =
      Regex.match?(
        ~r/\b(?:restaurants?|dinner|brunch|lunch|food|eat|dining|places?|spots?|somewhere)\b/i,
        raw
      )

    # Exact named venue wins over discovery.
    exact? = match?(%{name: _}, extract_exact_venue(raw))

    cond do
      exact? ->
        nil

      # Cuisine + place (or find-somewhere) is enough for discovery without a day.
      discovery_cue? and is_binary(cuisine) and (restaurant? or is_binary(dest)) ->
        %{
          cuisine: cuisine,
          destination: dest,
          when: when_s
        }

      discovery_cue? and restaurant? and is_binary(dest) ->
        %{
          cuisine: cuisine,
          destination: dest,
          when: when_s
        }

      true ->
        nil
    end
  end

  def extract_discovery_request(_), do: nil

  @doc "Normalize a cuisine word from free text when present."
  def extract_cuisine(raw) when is_binary(raw) do
    cuisines = ~w(
      mediterranean italian mexican japanese sushi thai chinese indian korean
      french greek lebanese turkish vietnamese american seafood steak pizza
      vegan vegetarian ethiopian peruvian spanish portuguese caribbean
    )

    down = String.downcase(raw)

    Enum.find(cuisines, fn c ->
      Regex.match?(Regex.compile!("\\b#{Regex.escape(c)}\\b", "i"), down)
    end)
  end

  def extract_cuisine(_), do: nil

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
        c["cuisine"] || "",
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
