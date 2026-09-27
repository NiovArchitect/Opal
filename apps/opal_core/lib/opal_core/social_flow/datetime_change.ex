defmodule OpalCore.SocialFlow.DateTimeChange do
  @moduledoc """
  One reading of a date or time change.

  The Date & time editor and ordinary chat both call this. A scoped edit
  already carries the intent, so "7" can mean 7:00 PM. Open chat does not
  treat a bare number as a change.
  """

  @timezone "America/Los_Angeles"
  @weekdays ~w(monday tuesday wednesday thursday friday saturday sunday)
  @hour_words %{
    "one" => 1,
    "two" => 2,
    "three" => 3,
    "four" => 4,
    "five" => 5,
    "six" => 6,
    "seven" => 7,
    "eight" => 8,
    "nine" => 9,
    "ten" => 10,
    "eleven" => 11,
    "twelve" => 12
  }

  def timezone, do: @timezone

  def interpret(text, context \\ %{}, opts \\ []) when is_binary(text) do
    normalized = normalize(text)
    scoped = Keyword.get(opts, :scoped, false)
    reference = reference_date(context)

    cond do
      normalized == "" ->
        {:clarify, "Say the day, the time, or both."}

      not scoped and Regex.match?(~r/\A(yes|yeah|yep|sure|ok)\b/, normalized) ->
        :none

      Regex.match?(~r/\A\d{4}-\d{2}-\d{2}\z/, normalized) ->
        {:change, iso_date_change(normalized)}

      Regex.match?(~r/\A\d{2}:\d{2}\z/, normalized) ->
        {:change, clock24_change(normalized)}

      keep?(normalized) ->
        :keep

      vague?(normalized) ->
        {:clarify, "What time should we use?"}

      negative_with_weekday?(normalized) ->
        weekday_change(normalized, context, reference)

      negative_only?(normalized) ->
        {:change, constraint_change(normalized)}

      next_week?(normalized) ->
        {:change, unresolved_date("next week")}

      between?(normalized) ->
        {:change, between_change(normalized)}

      after_hour?(normalized) ->
        {:change, after_change(normalized)}

      ish?(normalized) ->
        {:change, approximate_change(normalized, context, scoped)}

      both?(normalized) ->
        {:change, both_change(normalized, context, reference)}

      weekday?(normalized) ->
        weekday_change(normalized, context, reference)

      not scoped and bare_hour?(normalized) ->
        {:clarify, "Did you mean #{extract_hour(normalized, context)}?"}

      clock?(normalized) or (scoped and bare_hour?(normalized)) ->
        {:change, time_change(normalized, context)}

      scoped ->
        {:clarify, "Say a day, a time, or both. For example, Friday at 7."}

      true ->
        :none
    end
  end

  @doc """
  Calendar controls are absolute. They are not turned back into "tomorrow".
  """
  def from_controls(%{"date" => date, "time" => time} = attrs)
      when is_binary(date) and is_binary(time) and date != "" and time != "" do
    with {:ok, parsed} <- Date.from_iso8601(date),
         {:change, clock} <- interpret(time, %{"exact_time" => "6:00 PM"}, scoped: true) do
      zone = attrs["timezone"] || @timezone
      label = Calendar.strftime(parsed, "%A · %b %-d")
      exact = clock["exact_time"]["value"]

      {:ok,
       %{
         "summary" => "#{label} · #{exact}",
         "resolved_on" => Date.to_iso8601(parsed),
         "local_time" => time,
         "timezone" => zone,
         "date" => %{
           "state" => "candidate",
           "value" => label,
           "resolved_on" => Date.to_iso8601(parsed),
           "timezone" => zone,
           "phrase" => date
         },
         "exact_time" => clock["exact_time"],
         "time_window" => nil,
         "approximate" => false
       }}
    else
      _ -> {:error, :unreadable_calendar}
    end
  end

  def from_controls(_), do: {:error, :unreadable_calendar}

  def confirmation_required?(state) when is_map(state) do
    mode = get_in(state, ["decision_rights", "datetime", "mode"])
    holder = get_in(state, ["decision_rights", "datetime", "holder_user_id"])
    not (mode == "delegated" and is_binary(holder))
  end

  def holder_id(state) when is_map(state) do
    get_in(state, ["decision_rights", "datetime", "holder_user_id"])
  end

  defp normalize(text) do
    text
    |> String.downcase()
    |> String.replace(~r/[.’']/, "")
    |> String.replace(~r/\bp\s*\.?\s*m\b/, "pm")
    |> String.replace(~r/\ba\s*\.?\s*m\b/, "am")
    |> String.replace(~r/[^a-z0-9:\s-]/, " ")
    |> String.replace(~r/\s+/, " ")
    |> String.trim()
  end

  defp iso_date_change(text) do
    {:ok, date} = Date.from_iso8601(text)
    label = Calendar.strftime(date, "%A")

    %{
      "summary" => label,
      "date" => %{
        "state" => "candidate",
        "value" => label,
        "resolved_on" => Date.to_iso8601(date),
        "phrase" => text,
        "timezone" => @timezone
      },
      "exact_time" => nil,
      "time_window" => nil,
      "date_constraint" => nil,
      "approximate" => false
    }
  end

  defp clock24_change(text) do
    [_, h, m] = Regex.run(~r/\A(\d{2}):(\d{2})\z/, text)
    hour = String.to_integer(h)

    {suffix, shown} =
      cond do
        hour == 0 -> {"AM", 12}
        hour < 12 -> {"AM", hour}
        hour == 12 -> {"PM", 12}
        true -> {"PM", hour - 12}
      end

    value = "#{shown}:#{m} #{suffix}"

    %{
      "summary" => value,
      "date" => nil,
      "exact_time" => %{"state" => "candidate", "value" => value, "confidence" => "explicit"},
      "time_window" => nil,
      "date_constraint" => nil,
      "approximate" => false
    }
  end

  defp keep?(text) do
    Regex.match?(~r/\b(nevermind|never mind|keep)\b/, text) and
      Regex.match?(~r/\bkeep\b|\bnevermind\b|\bnever mind\b/, text)
  end

  defp vague?(text) do
    text in ["later", "after church", "sometime", "soon"] or
      Regex.match?(~r/\b(after church|sometime later)\b/, text)
  end

  defp negative_only?(text) do
    Regex.match?(~r/\bnot\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|today)\b/, text) and
      not weekday_positive?(text)
  end

  defp negative_with_weekday?(text) do
    Regex.match?(~r/\bnot\s+/, text) and weekday_positive?(text)
  end

  defp weekday_positive?(text) do
    Enum.any?(@weekdays, fn day ->
      Regex.match?(~r/\b#{day}\b/, text) and not Regex.match?(~r/\bnot\s+#{day}\b/, text)
    end)
  end

  defp next_week?(text), do: Regex.match?(~r/\bnext week\b/, text)

  defp between?(text), do: Regex.match?(~r/\bbetween\s+\d{1,2}\s+and\s+\d{1,2}\b/, text)

  defp after_hour?(text), do: Regex.match?(~r/\bafter\s+\d{1,2}\b/, text) and not Regex.match?(~r/\A(yes|yeah|yep|sure|ok)\b/, text)

  defp ish?(text) do
    Regex.match?(~r/\b(\d{1,2}|seven|eight|nine|six|five)\s*ish\b/, text) or
      Regex.match?(~r/\b(maybe|around|about)\s+(\d{1,2}|seven|eight|nine)\b/, text)
  end

  defp both?(text) do
    weekday?(text) and (clock?(text) or Regex.match?(~r/\bat\s+\d{1,2}\b/, text))
  end

  defp weekday?(text), do: Enum.any?(@weekdays, &String.contains?(text, &1))

  defp clock?(text) do
    Regex.match?(~r/\b\d{1,2}(?::\d{2})?\s*(am|pm)\b/, text) or
      Regex.match?(~r/\b(make it|how about|change(?: time)? to)\s+(\d{1,2}|#{word_alt()})(?::\d{2})?\b/, text) or
      Regex.match?(~r/\b\d{1,2}\s+works\b/, text)
  end

  defp bare_hour?(text), do: Regex.match?(~r/\A\d{1,2}\??\z/, text)

  defp word_alt, do: @hour_words |> Map.keys() |> Enum.join("|")

  defp constraint_change(text) do
    %{
      "summary" => text,
      "date" => nil,
      "exact_time" => nil,
      "time_window" => nil,
      "date_constraint" => %{"state" => "constrained", "value" => text, "polarity" => "negative"},
      "approximate" => false
    }
  end

  defp unresolved_date(label) do
    %{
      "summary" => label,
      "date" => nil,
      "exact_time" => nil,
      "time_window" => nil,
      "date_constraint" => %{"state" => "constrained", "value" => label, "polarity" => "unresolved"},
      "approximate" => false
    }
  end

  defp between_change(text) do
    [_, a, b] = Regex.run(~r/between\s+(\d{1,2})\s+and\s+(\d{1,2})/, text)

    %{
      "summary" => "#{a}:00–#{b}:00",
      "date" => nil,
      "exact_time" => %{"state" => "unknown", "value" => nil},
      "time_window" => %{
        "state" => "constrained",
        "value" => "#{a}:00–#{b}:00",
        "start" => "#{a}:00",
        "end" => "#{b}:00"
      },
      "date_constraint" => nil,
      "approximate" => false
    }
  end

  defp after_change(text) do
    [_, hour] = Regex.run(~r/after\s+(\d{1,2})/, text)
    ampm = if Regex.match?(~r/\b(am|pm)\b/, text), do: if(String.contains?(text, "am"), do: "AM", else: "PM"), else: "PM"

    %{
      "summary" => "after #{hour} #{ampm}",
      "date" => nil,
      "exact_time" => %{"state" => "unknown", "value" => nil},
      "time_window" => %{"state" => "constrained", "value" => "after #{hour} #{ampm}", "start" => "#{hour}:00 #{ampm}"},
      "date_constraint" => nil,
      "approximate" => false
    }
  end

  defp approximate_change(text, context, _scoped) do
    hour = extract_hour(text, context)

    %{
      "summary" => "about #{hour}",
      "date" => nil,
      "exact_time" => %{"state" => "approximate", "value" => hour, "confidence" => "approximate"},
      "time_window" => nil,
      "date_constraint" => nil,
      "approximate" => true
    }
  end

  defp both_change(text, context, reference) do
    date = weekday_field(text, reference)
    hour = extract_hour(text, context)

    %{
      "summary" => "#{date["value"]} at #{hour}",
      "date" => date,
      "exact_time" => %{"state" => "candidate", "value" => hour, "confidence" => "explicit"},
      "time_window" => nil,
      "date_constraint" => nil,
      "approximate" => false
    }
  end

  defp weekday_change(text, _context, reference) do
    {:change, Map.put(both_or_date(text, reference), "exact_time", nil)}
  end

  defp both_or_date(text, reference) do
    date = weekday_field(text, reference)

    %{
      "summary" => date["value"],
      "date" => date,
      "exact_time" => nil,
      "time_window" => nil,
      "date_constraint" => nil,
      "approximate" => false
    }
  end

  defp time_change(text, context) do
    hour = extract_hour(text, context)

    %{
      "summary" => hour,
      "date" => nil,
      "exact_time" => %{"state" => "candidate", "value" => hour, "confidence" => "explicit"},
      "time_window" => nil,
      "date_constraint" => nil,
      "approximate" => false
    }
  end

  defp weekday_field(text, reference) do
    day = Enum.find(@weekdays, &String.contains?(text, &1))
    resolved = resolve_weekday(day, reference)

    %{
      "state" => "candidate",
      "value" => day && String.capitalize(day),
      "resolved_on" => resolved && Date.to_iso8601(resolved),
      "phrase" => day,
      "timezone" => @timezone
    }
  end

  defp resolve_weekday(nil, _), do: nil

  defp resolve_weekday(day, %Date{} = from) do
    target = Enum.find_index(@weekdays, &(&1 == day)) + 1
    current = Date.day_of_week(from)
    delta = rem(target - current + 7, 7)
    delta = if delta == 0, do: 7, else: delta
    Date.add(from, delta)
  end

  defp extract_hour(text, context) do
    cond do
      match = Regex.run(~r/(\d{1,2}):(\d{2})/, text) ->
        [_, h, m] = match
        "#{pad(h)}:#{m} #{meridiem(text, context)}"

      match = Regex.run(~r/(\d{1,2})/, text) ->
        [_, h] = match
        "#{pad(h)}:00 #{meridiem(text, context)}"

      word = Enum.find(Map.keys(@hour_words), &String.contains?(text, &1)) ->
        "#{pad(@hour_words[word])}:00 #{meridiem(text, context)}"

      true ->
        "7:00 PM"
    end
  end

  defp meridiem(text, context) do
    cond do
      String.contains?(text, "am") -> "AM"
      String.contains?(text, "pm") -> "PM"
      String.contains?(to_string(context["exact_time"] || ""), "AM") -> "AM"
      true -> "PM"
    end
  end

  defp pad(hour) when is_integer(hour), do: Integer.to_string(hour)
  defp pad(hour), do: hour |> String.trim() |> String.to_integer() |> Integer.to_string()

  defp reference_date(%{"reference_on" => iso}) when is_binary(iso) do
    case Date.from_iso8601(iso) do
      {:ok, date} -> date
      _ -> default_reference()
    end
  end

  defp reference_date(_), do: default_reference()

  defp default_reference, do: ~D[2026-09-27]
end
