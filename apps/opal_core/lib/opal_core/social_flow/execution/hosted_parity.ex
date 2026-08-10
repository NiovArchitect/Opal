defmodule OpalCore.SocialFlow.Execution.HostedParity do
  @moduledoc """
  MERGED → HOSTED gap audit.

  Does not invent intelligence. Classifies deployment reality for #81–#101.
  Evidence-based: last known hosted dress rehearsal + migration frontier.
  """

  @gap_classes ~w(
    merged_only
    server_deploy_needed
    web_deploy_needed
    mobile_build_needed
    migration_needed
    env_needed
    provider_credential_needed
    hosted_synthetic
    hosted_real
    live_proof_complete
  )

  def gap_classes, do: @gap_classes

  # Last proven hosted API image (docs/evidence/real-people/HOSTED_DRESS_REHEARSAL_STATUS.md)
  @last_hosted_api_tag "reality-closure-45ab6df-45ab6df"
  @last_hosted_api_sha_prefix "45ab6df"
  @last_hosted_migration "20260819000001"
  @last_hosted_web_note "VITE_OPAL_API_URL baked recovery 2026-08-08"

  # Applied on hosted boot 2026-08-10 20:20:30 (Render logs)
  @post_hosted_migrations ~w()

  @doc """
  Full parity snapshot for current main (opts may inject measured SHAs).
  """
  def audit(opts \\ []) do
    main_sha = Keyword.get(opts, :main_sha) || "45ab6df"
    api_health = Keyword.get(opts, :api_health) || "ok"
    web_http = Keyword.get(opts, :web_http) || "200"
    commits_ahead = Keyword.get(opts, :commits_ahead_of_hosted_image) || 0

    capabilities = capability_gaps()

    %{
      "main_sha" => main_sha,
      "last_hosted_api" => %{
        "image_tag" => @last_hosted_api_tag,
        "source_sha_prefix" => @last_hosted_api_sha_prefix,
        "service" => "opal-api srv-d9nvji3m8hqs73f60tpg",
        "evidence" => "docs/evidence/adversarial-human-reality/HOSTED_CLOSURE_REPORT.md",
        "date" => "2026-08-10",
        "deploy_id" => "dep-d9t34vbm8hqs73ct55fg",
        "digest" => "sha256:506fbebb2b75567b855f1688055e56d6dc0046da8cab35ef992b99ff9f49c033"
      },
      "last_hosted_web" => %{
        "url" => "https://opal.niovlabs.com",
        "note" => @last_hosted_web_note,
        "api_base" => "https://api.opal.niovlabs.com"
      },
      "measured" => %{
        "api_health" => api_health,
        "web_http" => web_http,
        "commits_ahead_of_hosted_image" => commits_ahead
      },
      "migrations" => migration_audit(),
      "capabilities" => capabilities,
      "priority_order" => ~w(
        database_migrations
        server_domain
        web_client
        mobile_client_capability
        provider_env
        hosted_proof
      ),
      "health_200_insufficient" => true,
      "gap_summary" => summarize_gaps(capabilities),
      "recommendation_hint" =>
        if(commits_ahead > 0 or api_health != "ok",
          do: "server_deploy_needed_before_pilot",
          else: "verify_functional_paths"
        )
    }
  end

  @doc "Migrations after last known hosted boot-migrate set."
  def migration_audit do
    pending = @post_hosted_migrations

    %{
      "last_hosted_migration" => @last_hosted_migration,
      "pending_count" => length(pending),
      "pending" =>
        Enum.map(pending, fn file ->
          %{
            "file" => file,
            "backward_compatible_assumed" => true,
            "locking_risk" => "low_create_tables",
            "deploy_order" => "before_or_with_app_boot_migrate",
            "rollback" => "standard_ecto_down_if_empty"
          }
        end),
      "dry_run_required" => true,
      "do_not_blindly_run_pile" => true
    }
  end

  @doc "Classify major #81–#101 capabilities for hosted gap."
  def capability_gaps do
    [
      gap("real_people_foundation", "hosted_real", "P0 dress rehearsal 2026-08-08"),
      gap("set_authority", "hosted_real", "mutual ready Set proven hosted"),
      gap(
        "availability_alignment",
        "migration_needed",
        "20260817 availability tables not on hosted mig set"
      ),
      gap("native_calendar", "migration_needed", "20260819 commitments not on hosted mig set"),
      gap("provider_connections", "migration_needed", "20260818 not on hosted mig set"),
      gap("alignment_loop_judgment", "server_deploy_needed", "merged #81–#85; image still rp61"),
      gap("world_acquisition", "server_deploy_needed", "merged #86; not on hosted image"),
      gap("real_adapters", "provider_credential_needed", "synthetic default; keys optional"),
      gap("execution_composition", "server_deploy_needed", "merged #88"),
      gap("execution_transport", "server_deploy_needed", "merged #89 handoff contracts"),
      gap("plan_lifecycle_jit", "server_deploy_needed", "merged #90"),
      gap("device_delivery", "server_deploy_needed", "merged #91; client contract remains"),
      gap("proactive_awareness", "server_deploy_needed", "merged #92"),
      gap("readiness", "server_deploy_needed", "merged #94"),
      gap("compound_memory", "server_deploy_needed", "merged #96; in-process store"),
      gap("compound_quality", "merged_only", "harness-proven #98"),
      gap("human_validation_infra", "merged_only", "ledgers #100; dogfood not yet live"),
      gap("web_client", "web_deploy_needed", "must bake VITE_OPAL_API_URL on each deploy"),
      gap("mobile_client", "mobile_build_needed", "device proof separate from API"),
      gap("google_places", "provider_credential_needed", "GOOGLE_PLACES_API_KEY"),
      gap("ticketmaster", "provider_credential_needed", "TICKETMASTER_API_KEY"),
      gap("booking_handoff", "hosted_synthetic", "REAL HANDOFF code path; needs deploy"),
      gap("navigation_handoff", "hosted_synthetic", "REAL HANDOFF code path; needs deploy"),
      gap("reminder_os_delivery", "mobile_build_needed", "CLIENT CONTRACT until device fires")
    ]
  end

  defp gap(name, class, note) do
    %{
      "name" => name,
      "class" => class,
      "note" => note,
      "merged_ne_hosted" => class in ~w(merged_only server_deploy_needed migration_needed)
    }
  end

  defp summarize_gaps(caps) do
    caps
    |> Enum.group_by(& &1["class"])
    |> Map.new(fn {k, v} -> {k, length(v)} end)
  end
end
