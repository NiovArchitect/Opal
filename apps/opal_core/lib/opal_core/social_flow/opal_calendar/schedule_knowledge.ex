defmodule OpalCore.SocialFlow.OpalCalendar.ScheduleKnowledge do
  @moduledoc """
  Distinguish schedule knowledge kinds — do not collapse into one boolean.

  COMMITMENT — authoritative Opal busy plan
  AVAILABILITY — user-said may work
  FREE_BUSY — external provider fact
  WILLINGNESS — social readiness
  PREFERENCE — soft desirability
  CONSTRAINT — private limitation
  """

  @kinds ~w(commitment availability free_busy willingness preference constraint)

  def kinds, do: @kinds

  @doc """
  Source priority for private schedule reasoning (high → low).

  Explicit correction >
  active Opal commitment >
  fresh external free/busy >
  conversation availability >
  manual windows >
  recurring >
  inference
  """
  def source_priority do
    [
      :explicit_correction,
      :opal_calendar_commitment,
      :external_free_busy,
      :conversation_availability,
      :manual_availability,
      :explicit_recurring,
      :ai_inference
    ]
  end

  def rank(:explicit_correction), do: 100
  def rank(:opal_calendar_commitment), do: 90
  def rank(:external_free_busy), do: 70
  def rank(:conversation_availability), do: 60
  def rank(:manual_availability), do: 50
  def rank(:explicit_recurring), do: 40
  def rank(:ai_inference), do: 20
  def rank(_), do: 0

  @doc "Merge busy intervals preferring higher-priority sources; simple union of busy."
  def merge_busy(blocks) when is_list(blocks) do
    blocks
    |> Enum.map(&normalize/1)
    |> Enum.reject(&is_nil/1)
    |> Enum.sort_by(fn b -> {-rank(b.source), DateTime.to_unix(b.start_at, :microsecond)} end)
    |> Enum.map(fn b ->
      %{
        "start_at" => b.start_at,
        "end_at" => b.end_at,
        "source" => to_string(b.source),
        "busy" => true,
        "owner_user_id" => b.owner_user_id,
        "no_peer_details" => true
      }
    end)
  end

  def merge_busy(_), do: []

  defp normalize(%{"start_at" => s, "end_at" => e} = b) do
    %{
      start_at: s,
      end_at: e,
      source: source_atom(b["source"]),
      owner_user_id: b["owner_user_id"]
    }
  end

  defp normalize(%{start_at: s, end_at: e} = b) do
    %{
      start_at: s,
      end_at: e,
      source: source_atom(Map.get(b, :source)),
      owner_user_id: Map.get(b, :owner_user_id)
    }
  end

  defp normalize(_), do: nil

  defp source_atom("opal_calendar"), do: :opal_calendar_commitment
  defp source_atom(:opal_calendar), do: :opal_calendar_commitment
  defp source_atom("opal_calendar_commitment"), do: :opal_calendar_commitment
  defp source_atom(:opal_calendar_commitment), do: :opal_calendar_commitment
  defp source_atom("calendar_free_busy"), do: :external_free_busy
  defp source_atom(:external_free_busy), do: :external_free_busy
  defp source_atom("manual"), do: :manual_availability
  defp source_atom(s) when is_atom(s), do: s
  defp source_atom(_), do: :ai_inference
end
