defmodule OpalCore.Center.AvailabilityUse do
  @moduledoc """
  Relationship-scoped free/busy **use** without event-title disclosure.

  Person B grants Opal permission to USE availability within a relationship
  scope. Person A receives only minimum safe alignment output.

  `USE_AVAILABILITY ≠ DISCLOSE_EVENT_DETAILS`
  `RELATIONSHIP_TYPE_AUTO_GRANTS_CALENDAR = NO`
  """

  import Ecto.Query
  alias OpalCore.Repo
  alias OpalCore.Calendar
  alias OpalCore.SocialFlow.AvailabilityGrant
  alias OpalCore.RelationshipAccess
  alias OpalCore.Relationships

  @doc """
  Check whether organizer + invitee look mutually clear for a window.

  Returns a consumer-safe result map — never event titles or private causes.
  """
  def mutual_clear?(organizer_id, invitee_id, start_at, end_at, opts \\ [])
      when is_binary(organizer_id) and is_binary(invitee_id) do
    surprise? = Keyword.get(opts, :surprise, false)
    conversation_id = Keyword.get(opts, :conversation_id)

    with true <- organizer_id != invitee_id,
         :ok <- ensure_use_permission(invitee_id, organizer_id, conversation_id),
         {:ok, org_busy} <- busy_blocks(organizer_id, start_at, end_at),
         {:ok, inv_busy} <- busy_blocks(invitee_id, start_at, end_at) do
      clear? = org_busy == [] and inv_busy == []

      %{
        "clear" => clear?,
        "consumer_copy" =>
          if clear? do
            if surprise?,
              do: "That window looks clear for both of you.",
              else: "That time looks clear for both of you."
          else
            if surprise?,
              do: "That window may not work. Want me to find another?",
              else: "That time looks busy for at least one of you. Want another window?"
          end,
        "event_titles_exposed" => false,
        "disclosure" => "none",
        "permission" => "calendar.availability.use",
        "surprise" => surprise?
      }
    else
      {:error, :no_permission} ->
        %{
          "clear" => nil,
          "consumer_copy" =>
            "I can keep planning without checking their calendar until they allow Opal to use availability with you.",
          "event_titles_exposed" => false,
          "permission" => "missing",
          "error" => "no_availability_use_permission"
        }

      {:error, reason} ->
        %{
          "clear" => nil,
          "consumer_copy" => "I couldn't check availability just now.",
          "event_titles_exposed" => false,
          "error" => format_err(reason)
        }
    end
  end

  @doc """
  True when invitee has granted Opal free/busy **use** for coordinating with organizer.

  Relationship type alone never grants this.
  """
  def ensure_use_permission(owner_id, organizer_id, conversation_id) do
    # 1) Conversation-scoped SF4 AvailabilityGrant (free_busy / exact).
    grant =
      if is_binary(conversation_id) do
        Repo.get_by(AvailabilityGrant,
          owner_user_id: owner_id,
          conversation_id: conversation_id,
          status: "active"
        )
      end

    # 2) Relationship Access: calendar_availability at "use" (not disclose).
    # Relationship type alone never grants — only explicit grant rows.
    rel_use? =
      try do
        RelationshipAccess.may_use_privately?(owner_id, organizer_id, "calendar_availability") or
          RelationshipAccess.may_access?(owner_id, organizer_id, "calendar_availability", "use")
      rescue
        _ -> false
      catch
        _, _ -> false
      end

    cond do
      match?(%AvailabilityGrant{grant_mode: mode} when mode in ["free_busy", "exact"], grant) ->
        :ok

      rel_use? == true ->
        :ok

      true ->
        {:error, :no_permission}
    end
  end

  defp busy_blocks(user_id, start_at, end_at) do
    case Calendar.free_busy(user_id, start_at, end_at) do
      {:ok, busy} when is_list(busy) ->
        # Strip any title-like fields — only intervals leave this boundary.
        cleaned =
          Enum.map(busy, fn b ->
            %{
              "start" => b[:start] || b["start"],
              "end" => b[:end] || b["end"]
            }
          end)

        {:ok, cleaned}

      {:error, _} = err ->
        err

      other ->
        {:error, other}
    end
  end

  @doc """
  Resolve a participant display name to user id (person-agnostic).

  F12-56 (per-account isolation): resolution is scoped to the organizer's own
  relationships/contacts ONLY. Returns nil when no contact matches — callers
  treat that as "unknown person", never as license to search the global user
  table (a cross-account name collision must never resolve to a stranger, and
  the lookup must not leak user existence).
  """
  def resolve_participant_id(organizer_id, who) when is_binary(organizer_id) do
    name =
      cond do
        is_binary(who) -> who
        is_list(who) and who != [] -> hd(who)
        true -> nil
      end

    if is_binary(name) do
      Relationships.contacts_with_types(organizer_id)
      |> Enum.find_value(fn c ->
        display = to_string(c[:display_name] || "")
        uid = c[:contact_user_id]

        if is_binary(uid) and String.contains?(String.downcase(display), String.downcase(name)) do
          uid
        end
      end)
    end
  end

  # F12-56 — lookup_user_by_name/1 (global ilike over ALL users, limit 1) is
  # deleted. See resolve_participant_id/2.

  defp format_err(atom) when is_atom(atom), do: Atom.to_string(atom)
  defp format_err(other), do: inspect(other)
end
