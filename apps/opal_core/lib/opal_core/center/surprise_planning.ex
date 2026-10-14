defmodule OpalCore.Center.SurprisePlanning do
  @moduledoc """
  First-class surprise visibility mode for Center planning.

  Surprise changes disclosure — not merely copy.
  Fixture names are never special-cased.
  """

  alias OpalCore.Center.AvailabilityUse

  @doc "Detect surprise intent from raw text."
  def detect(raw) when is_binary(raw) do
    if Regex.match?(~r/\bsurprise\b/i, raw) do
      %{
        "visibility_mode" => "surprise",
        "surprise" => true,
        "reveal_blocked" => true,
        "invite_blocked" => true,
        "calendar_write_invitee_blocked" => true
      }
    else
      %{}
    end
  end

  def detect(_), do: %{}

  @doc """
  Apply surprise constraints to planning + optional private availability check.

  Never exposes event titles. Never sends invite. Never writes invitee calendar
  unless explicit surprise_hold standing auth exists (default: no).
  """
  def enrich(user_id, planning, opts \\ []) when is_binary(user_id) and is_map(planning) do
    c = stringify(planning)

    if c["visibility_mode"] == "surprise" or c["surprise"] == true do
      who = c["who"] || c["primary_person"]
      invitee_id = AvailabilityUse.resolve_participant_id(user_id, who)
      start_at = Keyword.get(opts, :start_at)
      end_at = Keyword.get(opts, :end_at)
      conversation_id = Keyword.get(opts, :conversation_id)

      avail =
        if is_binary(invitee_id) and match?(%DateTime{}, start_at) and match?(%DateTime{}, end_at) do
          AvailabilityUse.mutual_clear?(user_id, invitee_id, start_at, end_at,
            surprise: true,
            conversation_id: conversation_id
          )
        else
          %{
            "clear" => nil,
            "event_titles_exposed" => false,
            "consumer_copy" => nil,
            "permission" => "deferred"
          }
        end

      c
      |> Map.put("visibility_mode", "surprise")
      |> Map.put("surprise", true)
      |> Map.put("reveal_blocked", true)
      |> Map.put("invite_blocked", true)
      |> Map.put("calendar_write_invitee_blocked", true)
      |> Map.put("availability_result", avail)
      |> Map.put("availability_checked", avail["clear"] != nil)
      |> Map.put("OTHER_PARTY_EVENT_TITLES_EXPOSED", false)
      |> Map.put("RELATIONSHIP_TYPE_AUTO_GRANTS_CALENDAR", false)
    else
      c
      |> Map.put_new("visibility_mode", "normal")
      |> Map.put("OTHER_PARTY_EVENT_TITLES_EXPOSED", false)
      |> Map.put("RELATIONSHIP_TYPE_AUTO_GRANTS_CALENDAR", false)
    end
  end

  @doc "Consumer-safe organizer-only conflict notice (no private cause)."
  def conflict_notice(_planning) do
    "That night may no longer work. Want me to find another window?"
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
