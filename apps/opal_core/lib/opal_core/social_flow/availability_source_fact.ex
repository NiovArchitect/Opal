defmodule OpalCore.SocialFlow.AvailabilitySourceFact do
  @moduledoc """
  Bounded contract for availability **facts** from heterogeneous sources.

  Phase 1 only materializes `manual` facts from `AvailabilityWindow`.
  Future sources (calendar free/busy, device schedule) attach the same shape
  without changing the frozen UX.

  Not a database schema. Not authority. Sufficiency consumes maps of this form.
  """

  @type source_kind ::
          :manual
          | :conversation_confirmed
          | :explicit_recurring
          | :calendar_free_busy
          | :device_schedule

  @type t :: %{
          required(:source) => String.t(),
          required(:owner_user_id) => String.t(),
          required(:start_at) => DateTime.t(),
          required(:end_at) => DateTime.t(),
          optional(:timezone) => String.t(),
          optional(:observed_at) => DateTime.t(),
          optional(:valid_until) => DateTime.t() | nil,
          optional(:confidence) => float() | nil,
          optional(:permission_scope) => String.t(),
          optional(:window_id) => String.t() | nil,
          optional(:revoked) => boolean()
        }

  @active_sources ~w(manual calendar_free_busy device_schedule conversation_confirmed explicit_recurring)

  def active_source_names, do: @active_sources

  @doc "Phase 1: project an owner window into a fact map."
  def from_window(%OpalCore.SocialFlow.AvailabilityWindow{} = w) do
    %{
      "source" => w.source || "manual",
      "owner_user_id" => w.owner_user_id,
      "start_at" => w.start_at,
      "end_at" => w.end_at,
      "timezone" => w.timezone,
      "observed_at" => w.updated_at || w.inserted_at,
      "valid_until" => w.expires_at,
      "confidence" => source_confidence(w.source),
      "permission_scope" => "owner_private",
      "window_id" => w.id,
      "revoked" => w.status != "active"
    }
  end

  @doc "Freshness for coordination: live | short | medium | expired."
  def freshness_bucket(fact, now \\ DateTime.utc_now())

  def freshness_bucket(%{"valid_until" => %DateTime{} = until}, now) do
    case DateTime.compare(until, now) do
      :gt -> "short"
      _ -> "expired"
    end
  end

  def freshness_bucket(%{"end_at" => %DateTime{} = end_at}, now) do
    case DateTime.compare(end_at, now) do
      :gt -> "live"
      _ -> "expired"
    end
  end

  def freshness_bucket(_, _), do: "unknown"

  defp source_confidence("manual"), do: 1.0
  defp source_confidence("conversation_confirmed"), do: 0.85
  defp source_confidence("explicit_recurring"), do: 0.75
  defp source_confidence("calendar_free_busy"), do: 0.9
  defp source_confidence("device_schedule"), do: 0.7
  defp source_confidence(_), do: 0.5
end
