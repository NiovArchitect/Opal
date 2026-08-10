defmodule OpalCore.SocialFlow.Execution.NotificationContent do
  @moduledoc """
  Notification content privacy modes.

  Internal levels: minimal | standard
  Default: minimal — never high-detail lock-screen disclosure.

  OS notifications have higher interruption debt than in-conversation moments.
  """

  alias OpalCore.SocialFlow.OpalCalendar.ReminderDelivery
  alias OpalCore.SocialFlow.Ambient.InterruptionDebt

  @modes ~w(minimal standard)

  def modes, do: @modes

  @doc """
  Build notification body for a delivery intent.

  Default mode: minimal.
  Never exposes relationship names, private place dumps, or party details
  on lock screen in minimal mode.
  """
  def build(intent, opts \\ [])

  def build(intent, opts) when is_map(intent) do
    i = stringify(intent)
    mode = normalize_mode(Keyword.get(opts, :mode) || i["content_mode"] || "minimal")
    surface = Keyword.get(opts, :surface) || i["surface"] || "push"

    body =
      case mode do
        "minimal" -> minimal_body(i)
        "standard" -> standard_body(i)
      end

    debt =
      InterruptionDebt.evaluate(%{
        "effort_removed" => i["effort_removed"] || 0.7,
        "uncertainty_removed" => 0.5,
        "this_got_easy" => true,
        "actionable" => true,
        "confidence" => 0.9,
        "surface" => surface,
        "quality_band" => "strong",
        "option_count" => 1,
        "time_sensitive" => i["time_sensitive"] == true or i["kind"] in ~w(leave_by)
      })

    %{
      "mode" => mode,
      "title" => body["title"],
      "body" => body["body"],
      "lock_screen" => body["lock_screen"],
      "relationship_exposed" => false,
      "private_place_exposed" => mode != "minimal" and body["place_in_body"] == true,
      "party_exposed" => false,
      "high_detail_lock_screen" => false,
      "surface" => InterruptionDebt.surface_class(%{"surface" => surface}),
      "interruption_debt" => debt,
      "surface_ok" => debt["surface_ok"],
      "engagement_spam" => false
    }
  end

  def build(_, _), do: %{"mode" => "minimal", "body" => "Your plan needs you."}

  defp minimal_body(i) do
    # Reuse calendar lock-screen discipline
    ls = ReminderDelivery.lock_screen_copy(i)

    %{
      "title" => "Opal",
      "body" => ls["lock_screen"],
      "lock_screen" => ls["lock_screen"],
      "place_in_body" => false
    }
  end

  defp standard_body(i) do
    place = i["place"] || i["destination"] || i["place_label"]
    minutes = i["minutes_until_leave"] || i["leave_in_minutes"]

    body =
      cond do
        is_number(minutes) and is_binary(place) and place != "" ->
          "Leave in #{trunc(minutes)} min for #{place}."

        is_number(minutes) ->
          "Leave in #{trunc(minutes)} minutes."

        is_binary(place) and place != "" ->
          "Time for #{place}."

        true ->
          "Your plan needs you."
      end

    %{
      "title" => "Opal",
      "body" => body,
      "lock_screen" => body,
      "place_in_body" => is_binary(place) and place != ""
    }
  end

  defp normalize_mode(m) when m in @modes, do: m
  defp normalize_mode("full"), do: "standard"
  defp normalize_mode("detailed"), do: "standard"
  defp normalize_mode(_), do: "minimal"

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
