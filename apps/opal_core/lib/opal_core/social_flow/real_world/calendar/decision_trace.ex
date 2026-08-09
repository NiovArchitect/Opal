defmodule OpalCore.SocialFlow.RealWorld.Calendar.DecisionTrace do
  @moduledoc """
  Privacy-safe internal decision trace for calendar/time interventions.

  Never includes event titles, raw message bodies, or tokens.
  """

  @doc "Build a redacted trace map for logs/telemetry."
  def build(attrs) when is_map(attrs) do
    a = stringify(attrs)

    %{
      "gap" => a["gap"] || "time",
      "calendar_fact" => a["calendar_fact"] || a["calendar_status"] || "absent",
      "calendar_fresh" => a["calendar_fresh"] == true,
      "technically_free" => a["technically_free"] == true,
      "willingness" => a["willingness"] || "unknown",
      "peer_signal" => a["peer_signal"],
      "decision" => a["decision"],
      "should_ask_time" => a["should_ask_time"],
      "step_eliminated" => a["step_eliminated"],
      "provider" => a["provider"],
      "authorizes_set" => false,
      "raw_calendar_title" => nil,
      "raw_message_body" => nil,
      "access_token" => nil
    }
  end

  def build(_), do: %{"decision" => "unknown", "authorizes_set" => false}

  def assert_safe!(trace) when is_map(trace) do
    forbidden = ~w(raw_calendar_title event_title access_token refresh_token raw_message_body)

    for k <- forbidden do
      v = trace[k]

      if is_binary(v) and v != "" do
        raise "decision trace leak: #{k}"
      end
    end

    :ok
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
