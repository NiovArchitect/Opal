defmodule OpalCore.SocialFlow.AvailabilitySourceFact do
  @moduledoc """
  Bounded contract for availability **facts** from heterogeneous sources.

  Smallest extensible fact/source contract for:
  - manual
  - conversation_confirmed
  - explicit_recurring
  - future calendar_free_busy
  - future device_schedule
  - future purpose-bound location-derived facts

  Metadata (only as needed):
  source, observed_at, validity, expiry, permission scope,
  conversation/relationship scope, confidence where inference exists, revocation.

  Not a database schema. Not authority. Sufficiency consumes maps of this form.
  """

  @type source_kind ::
          :manual
          | :conversation_confirmed
          | :explicit_recurring
          | :calendar_free_busy
          | :device_schedule
          | :location_derived

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
          optional(:conversation_id) => String.t() | nil,
          optional(:relationship_scope) => String.t() | nil,
          optional(:window_id) => String.t() | nil,
          optional(:revoked) => boolean(),
          optional(:revoked_at) => DateTime.t() | nil,
          optional(:supersedes_fact_id) => String.t() | nil
        }

  @active_sources ~w(
    manual
    calendar_free_busy
    device_schedule
    conversation_confirmed
    explicit_recurring
    location_derived
  )

  def active_source_names, do: @active_sources

  @doc "Phase 1: project an owner window into a fact map."
  def from_window(%OpalCore.SocialFlow.AvailabilityWindow{} = w, opts \\ []) do
    %{
      "source" => normalize_source(w.source),
      "owner_user_id" => w.owner_user_id,
      "start_at" => w.start_at,
      "end_at" => w.end_at,
      "timezone" => w.timezone,
      "observed_at" => w.updated_at || w.inserted_at,
      "valid_until" => w.expires_at,
      "confidence" => source_confidence(w.source),
      "permission_scope" => Keyword.get(opts, :permission_scope, "owner_private"),
      "conversation_id" => Keyword.get(opts, :conversation_id),
      "relationship_scope" => Keyword.get(opts, :relationship_scope),
      "window_id" => w.id,
      "revoked" => w.status != "active",
      "revoked_at" => nil,
      "supersedes_fact_id" => Keyword.get(opts, :supersedes_fact_id)
    }
  end

  @doc "Build a fact map from any admitted source (manual or future)."
  def build(attrs) when is_map(attrs) do
    a = stringify(attrs)
    source = normalize_source(a["source"] || "manual")

    if source in @active_sources do
      {:ok,
       %{
         "source" => source,
         "owner_user_id" => a["owner_user_id"],
         "start_at" => a["start_at"],
         "end_at" => a["end_at"],
         "timezone" => a["timezone"] || "UTC",
         "observed_at" => a["observed_at"] || DateTime.utc_now(),
         "valid_until" => a["valid_until"] || a["expires_at"],
         "confidence" => a["confidence"] || source_confidence(source),
         "permission_scope" => a["permission_scope"] || "owner_private",
         "conversation_id" => a["conversation_id"],
         "relationship_scope" => a["relationship_scope"],
         "window_id" => a["window_id"],
         "revoked" => a["revoked"] == true,
         "revoked_at" => a["revoked_at"],
         "supersedes_fact_id" => a["supersedes_fact_id"]
       }}
    else
      {:error, :unknown_source}
    end
  end

  def build(_), do: {:error, :invalid}

  @doc "Mark a fact revoked (pure)."
  def revoke(fact, at \\ DateTime.utc_now()) when is_map(fact) do
    fact
    |> stringify()
    |> Map.put("revoked", true)
    |> Map.put("revoked_at", at)
  end

  @doc "Freshness for coordination: live | short | medium | expired | revoked."
  def freshness_bucket(fact, now \\ DateTime.utc_now())

  def freshness_bucket(fact, now) when is_map(fact) do
    f = stringify(fact)

    cond do
      f["revoked"] == true ->
        "revoked"

      match?(%DateTime{}, f["valid_until"]) and DateTime.compare(f["valid_until"], now) != :gt ->
        "expired"

      match?(%DateTime{}, f["end_at"]) and DateTime.compare(f["end_at"], now) != :gt ->
        "expired"

      is_binary(f["source"]) and f["source"] in ~w(conversation_confirmed location_derived) ->
        # Inferred sources age faster
        observed = f["observed_at"]

        if match?(%DateTime{}, observed) and
             DateTime.diff(now, observed, :second) > 86_400 do
          "medium"
        else
          "short"
        end

      match?(%DateTime{}, f["valid_until"]) ->
        "short"

      match?(%DateTime{}, f["end_at"]) ->
        "live"

      true ->
        "unknown"
    end
  end

  def freshness_bucket(_, _), do: "unknown"

  @doc "Whether a fact is usable for sufficiency (not revoked/expired)."
  def usable?(fact, now \\ DateTime.utc_now()) do
    freshness_bucket(fact, now) in ~w(live short medium)
  end

  defp normalize_source("device_inference"), do: "device_schedule"
  defp normalize_source(s) when is_binary(s), do: s
  defp normalize_source(_), do: "manual"

  defp source_confidence("manual"), do: 1.0
  defp source_confidence("conversation_confirmed"), do: 0.85
  defp source_confidence("explicit_recurring"), do: 0.75
  defp source_confidence("calendar_free_busy"), do: 0.9
  defp source_confidence("device_schedule"), do: 0.7
  defp source_confidence("location_derived"), do: 0.55
  defp source_confidence(_), do: 0.5

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
