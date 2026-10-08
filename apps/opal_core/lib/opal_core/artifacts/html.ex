defmodule OpalCore.Artifacts.Html do
  @moduledoc """
  Branded HTML renderer for shareable artifacts.

  Invent-nothing law: every fact must come from `facts` map. Missing fields are
  omitted or labeled "TBD" — never fabricate flights, hotels, or costs.
  """

  @cyan "#00E5FF"
  @gold "#FFC86B"
  @midnight "#050816"
  @ink "#0B1226"
  @white "#F8FAFF"
  @soft "#E2E8F0"

  @doc "Render HTML document from a facts map produced by Artifacts.collect_facts/2."
  def render(%{kind: kind} = facts) when kind in ["trip_itinerary", "event_plan"] do
    title = Map.get(facts, :title) || "Opal plan"
    body = body_sections(facts)
    invite = Map.get(facts, :invite_path) || "/invite"
    newer? = Map.get(facts, :newer_version_available) == true
    banner = if newer?, do: newer_banner(), else: ""

    """
    <!doctype html>
    <html lang="en"><head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width,initial-scale=1"/>
    <meta name="robots" content="noindex,nofollow"/>
    <title>#{esc(title)} · Opal</title>
    <style>
      body{font-family:system-ui,-apple-system,sans-serif;background:#{@midnight};color:#{@white};
        margin:0;padding:24px;line-height:1.45}
      .wrap{max-width:640px;margin:0 auto}
      .card{background:#{@ink};border-radius:20px;padding:28px;box-shadow:0 20px 60px rgba(0,0,0,.45);
        border:1px solid rgba(0,229,255,.18)}
      h1{font-size:1.4rem;margin:0 0 6px;font-weight:650;color:#{@cyan}}
      h2{font-size:1.05rem;margin:22px 0 8px;color:#{@gold};font-weight:600}
      .meta{opacity:.85;color:#{@soft};margin:0 0 4px}
      .tbd{opacity:.65;font-style:italic}
      .day{margin:14px 0;padding:12px 14px;border-radius:12px;background:rgba(255,255,255,.03);
        border-left:3px solid #{@cyan}}
      .act{margin:6px 0 6px 8px}
      .banner{background:rgba(255,200,107,.12);border:1px solid rgba(255,200,107,.35);
        color:#{@gold};padding:10px 12px;border-radius:10px;margin-bottom:16px;font-size:.92rem}
      footer{margin-top:28px;padding-top:16px;border-top:1px solid rgba(248,250,255,.12);
        font-size:.9rem;color:#{@soft}}
      footer a{color:#{@cyan};text-decoration:none}
    </style></head><body><div class="wrap"><div class="card">
    #{banner}
    <h1>#{esc(title)}</h1>
    #{body}
    <footer>
      Made with Opal · <a href="#{esc(invite)}">Join Opal</a>
    </footer>
    </div></div></body></html>
    """
  end

  def render(_), do: {:error, :invalid_facts}

  defp newer_banner do
    ~s(<div class="banner" role="status">A newer version of this plan is available. This link still shows the version that was shared.</div>)
  end

  defp body_sections(%{kind: "trip_itinerary"} = facts) do
    [
      meta_line("Destination", facts[:destination]),
      meta_line("Dates", date_range(facts[:starts_on], facts[:ends_on])),
      people_section(facts[:people]),
      days_section(facts[:days]),
      bookings_section(facts[:bookings])
    ]
    |> Enum.reject(&(&1 == ""))
    |> Enum.join("\n")
  end

  defp body_sections(%{kind: "event_plan"} = facts) do
    [
      meta_line("When", when_label(facts)),
      meta_line("Where", facts[:location]),
      meta_line("Status", facts[:status]),
      people_section(facts[:people]),
      bookings_section(facts[:bookings])
    ]
    |> Enum.reject(&(&1 == ""))
    |> Enum.join("\n")
  end

  defp meta_line(_label, nil), do: ""
  defp meta_line(_label, ""), do: ""

  defp meta_line(label, :tbd),
    do: ~s(<p class="meta"><strong>#{esc(label)}:</strong> <span class="tbd">TBD</span></p>)

  defp meta_line(label, value),
    do: ~s(<p class="meta"><strong>#{esc(label)}:</strong> #{esc(to_string(value))}</p>)

  defp date_range(nil, nil), do: :tbd
  defp date_range(a, nil) when is_binary(a), do: a
  defp date_range(nil, b) when is_binary(b), do: b
  defp date_range(a, b) when is_binary(a) and is_binary(b), do: "#{a} → #{b}"
  defp date_range(_, _), do: :tbd

  defp when_label(facts) do
    cond do
      is_binary(facts[:time_label]) and facts[:time_label] != "" -> facts[:time_label]
      is_binary(facts[:start_at]) and facts[:start_at] != "" -> facts[:start_at]
      true -> :tbd
    end
  end

  defp people_section(nil), do: ""
  defp people_section([]), do: ""

  defp people_section(people) when is_list(people) do
    items =
      people
      |> Enum.map(fn p -> "<li>#{esc(to_string(p))}</li>" end)
      |> Enum.join()

    "<h2>People</h2><ul>#{items}</ul>"
  end

  defp days_section(nil), do: ""
  defp days_section([]), do: ~s(<h2>Itinerary</h2><p class="tbd">TBD</p>)

  defp days_section(days) when is_list(days) do
    blocks =
      Enum.map(days, fn day ->
        label = day[:label] || day["label"] || "Day"
        on_date = day[:on_date] || day["on_date"]
        date_bit = if on_date, do: " · #{esc(to_string(on_date))}", else: ""
        activities = day[:activities] || day["activities"] || []

        acts =
          if activities == [] do
            ~s(<div class="act tbd">TBD</div>)
          else
            Enum.map_join(activities, "\n", fn a ->
              name = a[:venue_name] || a["venue_name"] || a[:title] || a["title"]
              area = a[:venue_area] || a["venue_area"]
              kind = a[:activity_kind] || a["activity_kind"]
              time = a[:time_label] || a["time_label"]

              bits =
                [name, area, kind, time]
                |> Enum.reject(&(is_nil(&1) or &1 == ""))
                |> Enum.map(&esc(to_string(&1)))
                |> Enum.join(" · ")

              if bits == "", do: ~s(<div class="act tbd">TBD</div>), else: ~s(<div class="act">#{bits}</div>)
            end)
          end

        ~s(<div class="day"><strong>#{esc(to_string(label))}</strong>#{date_bit}#{acts}</div>)
      end)

    "<h2>Itinerary</h2>" <> Enum.join(blocks, "\n")
  end

  defp bookings_section(nil), do: ""
  defp bookings_section([]), do: ""

  defp bookings_section(bookings) when is_list(bookings) do
    rows =
      Enum.map_join(bookings, "\n", fn b ->
        type = b[:booking_type] || b["booking_type"] || "booking"
        status = b[:status] || b["status"]
        conf = b[:confirmation_number] || b["confirmation_number"]
        amount = format_amount(b)

        bits =
          [type, status, conf && "conf #{conf}", amount]
          |> Enum.reject(&is_nil/1)
          |> Enum.reject(&(&1 == ""))
          |> Enum.map(&esc(to_string(&1)))
          |> Enum.join(" · ")

        ~s(<div class="act">#{bits}</div>)
      end)

    "<h2>Bookings</h2>" <> rows
  end

  defp format_amount(b) do
    cents = b[:amount_cents] || b["amount_cents"]
    currency = b[:currency] || b["currency"] || "USD"

    cond do
      is_integer(cents) ->
        "#{currency} #{:erlang.float_to_binary(cents / 100, decimals: 2)}"

      true ->
        nil
    end
  end

  defp esc(nil), do: ""

  defp esc(s) when is_binary(s) do
    s
    |> String.replace("&", "&amp;")
    |> String.replace("<", "&lt;")
    |> String.replace(">", "&gt;")
    |> String.replace("\"", "&quot;")
  end

  defp esc(other), do: esc(to_string(other))
end
