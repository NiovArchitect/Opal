# P4.5 Realtime World Truth prove
alias OpalCore.Accounts.User
alias OpalCore.DecisionIntelligence
alias OpalCore.DecisionIntelligence.Recomposer
alias OpalCore.Events.EventOutbox
alias OpalCore.Repo
alias OpalCore.SocialFlow.Physical.Providers.OpenStreetMapOverpass
import Ecto.Query

live_osm? = System.get_env("OPAL_LIVE_OSM") == "1" or System.get_env("OPAL_P45_LIVE") == "1"

previous = %{
  mode: Application.get_env(:opal_core, :place_provider_mode),
  backend: Application.get_env(:opal_core, :place_provider_backend),
  allow: Application.get_env(:opal_core, :allow_osm_public),
  http: Application.get_env(:opal_core, :openstreetmap_overpass_http_client),
  key: Application.get_env(:opal_core, :google_places_api_key)
}

restore = fn ->
  for {k, v} <- [
        {:place_provider_mode, previous.mode},
        {:place_provider_backend, previous.backend},
        {:allow_osm_public, previous.allow},
        {:openstreetmap_overpass_http_client, previous.http},
        {:google_places_api_key, previous.key}
      ] do
    if is_nil(v), do: Application.delete_env(:opal_core, k), else: Application.put_env(:opal_core, k, v)
  end
end

Application.put_env(:opal_core, :place_provider_mode, "connected")
Application.put_env(:opal_core, :place_provider_backend, "openstreetmap")
Application.put_env(:opal_core, :allow_osm_public, true)
Application.put_env(:opal_core, :google_places_api_key, nil)

{live_ok?, live_error, live_names} =
  if live_osm? do
    Application.delete_env(:opal_core, :openstreetmap_overpass_http_client)

    case OpenStreetMapOverpass.fetch_candidates(%{
           "lat" => 32.723,
           "lng" => -117.168,
           "radius_m" => 500,
           "max_result_count" => 8
         }) do
      {:ok, %{"candidates" => cands}} when cands != [] ->
        {true, nil, Enum.map(cands, & &1["name"])}

      {:ok, _} ->
        {false, "empty_candidates", []}

      {:error, reason} ->
        {false, inspect(reason), []}
    end
  else
    # Deterministic mock for offline prove
    defmodule OpalCore.P45Prove.FakeOSM do
      def post_form(_url, _ql, _opts) do
        {:ok,
         %{
           "elements" => [
             %{
               "type" => "node",
               "id" => 5_551,
               "lat" => 32.723,
               "lon" => -117.168,
               "tags" => %{
                 "name" => "Barbusa",
                 "amenity" => "restaurant",
                 "opening_hours" => "Mo-Su 11:00-23:00"
               }
             },
             %{
               "type" => "node",
               "id" => 5_552,
               "lat" => 32.7225,
               "lon" => -117.167,
               "tags" => %{"name" => "Filippi's Pizza Grotto", "amenity" => "restaurant"}
             }
           ]
         }}
      end
    end

    Application.put_env(:opal_core, :openstreetmap_overpass_http_client, OpalCore.P45Prove.FakeOSM)
    {false, "OPAL_LIVE_OSM not set — used mock Overpass", []}
  end

user =
  %User{}
  |> User.changeset(%{handle: "p45-#{System.unique_integer([:positive])}", display_name: "P45"})
  |> Repo.insert!()

{:ok, %{context: ctx}} =
  DecisionIntelligence.create_context(user.id, %{
    "intent" => "date_ideas",
    "scope_type" => "solo",
    "budget_context" => %{"max" => 95},
    "preference_context" => %{"vibe" => "quiet"},
    "time_context" => %{"preference" => "evening"},
    "participant_ids" => [user.id],
    "location_context" => %{
      "lat" => 32.723,
      "lng" => -117.168,
      "area_label" => "Little Italy"
    },
    "invalidation_conditions" => [%{"type" => "provider_availability", "version" => 1}],
    "correlation_id" => "p45-prove"
  })

resolve =
  case DecisionIntelligence.resolve_high(ctx.id, user.id, %{"expected_context_revision" => 1}) do
    {:ok, %{outcome: "HIGH", result: result, assessment: assessment}} ->
      {:high, result, assessment}

    other ->
      # Soft context may block High without vibe+budget+time — we set all three
      {:not_high, other}
  end

{outcome_label, result, assessment, candidate_source, dependency} =
  case resolve do
    {:high, result, assessment} ->
      src = result.candidate_source
      dep = if src == "fixture_catalog", do: "UNEXPECTED_FIXTURE", else: nil
      {"HIGH", result, assessment, src, dep}

    {:not_high, other} ->
      {"NOT_HIGH", nil, other, nil, "RESOLVE_DID_NOT_HIGH"}
  end

silence =
  if result do
    {:ok, s} =
      Recomposer.apply_world_event(%{
        "event_id" => "p45_silence_#{System.unique_integer([:positive])}",
        "event_type" => "evidence.refreshed",
        "entity_id" => result.answer_entity_id,
        "decision_id" => ctx.id
      })

    s
  else
    %{"action" => "skipped"}
  end

recompute =
  if result do
    {:ok, r} =
      Recomposer.apply_world_event(%{
        "event_id" => "p45_recompute_#{System.unique_integer([:positive])}",
        "event_type" => "provider.unavailable",
        "entity_id" => result.answer_entity_id,
        "provider_place_id" => result.answer_entity_id,
        "decision_id" => ctx.id,
        "entity_type" => "provider_place"
      })

    r
  else
    %{"action" => "skipped"}
  end

recomputed_outbox =
  result != nil and
    Repo.exists?(
      from o in EventOutbox,
        where: o.aggregate_id == ^ctx.id and o.event_type == "decision.recomputed"
    )

proof = %{
  "square" => "POST_B7_P4_5_REALTIME_WORLD_TRUTH",
  "decision_id" => ctx.id,
  "result_id" => result && result.id,
  "outcome" => outcome_label,
  "answer_entity_id" => result && result.answer_entity_id,
  "candidate_source" => candidate_source,
  "live_osm_attempted" => live_osm?,
  "live_osm_ok" => live_ok?,
  "live_osm_error" => live_error,
  "live_osm_sample_names" => Enum.take(live_names, 5),
  "location" => %{"lat" => 32.723, "lng" => -117.168, "area_label" => "Little Italy"},
  "silence_action" => silence["action"],
  "recompute_action" => recompute["action"],
  "recompute_outcome" => get_in(recompute, ["results", Access.at(0), "outcome"]),
  "recompute_materiality" => get_in(recompute, ["results", Access.at(0), "materiality"]),
  "outbox_decision_recomputed" => recomputed_outbox,
  "DEPENDENCY" => dependency,
  "REAL_EXTERNAL_ADAPTER" => "openstreetmap_overpass",
  "CANDIDATE_SOURCE_LEFT_FIXTURE" => candidate_source not in [nil, "fixture_catalog"],
  "STORE_READY" => false,
  "P4_5_COMPLETE" => outcome_label == "HIGH" and silence["action"] == "silence" and recompute["action"] == "recomputed",
  "P4_6_AUTHORIZED" => false,
  "assessment_source" => assessment && (assessment["candidate_source"] || assessment[:assessment])
}

out =
  Path.expand(
    "../../docs/evidence/v2-coded-experience/post-b7-p0-authority-sync/p4/P4_5_REALTIME_WORLD_TRUTH_PROOF.json"
  )

File.mkdir_p!(Path.dirname(out))
File.write!(out, Jason.encode!(proof, pretty: true))
restore.()
IO.inspect(proof, label: "P4.5 PROOF")
IO.puts("Wrote #{out}")
