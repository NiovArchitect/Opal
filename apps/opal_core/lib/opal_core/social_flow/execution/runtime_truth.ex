defmodule OpalCore.SocialFlow.Execution.RuntimeTruth do
  @moduledoc """
  Honest runtime class for each major capability.

  HOSTED | REAL LIVE | REAL HANDOFF | CLIENT CONTRACT | SYNTHETIC |
  DISABLED | CREDENTIAL BLOCKED | NOT DEPLOYED | MERGED_ONLY

  Merged code alone ≠ product reality.
  """

  alias OpalCore.SocialFlow.Physical.Providers.Mode

  @classes ~w(
    hosted
    real_live
    real_handoff
    client_contract
    synthetic
    disabled
    credential_blocked
    not_deployed
    merged_only
  )

  def classes, do: @classes

  @doc """
  Audit truth for known capability surfaces.
  Pure/local where possible; no fake connected claims.
  """
  def audit(opts \\ []) do
    hosted? = Keyword.get(opts, :hosted, false)
    places = Mode.resolve(:places)
    events = Mode.resolve(:events)

    caps = [
      capability("world_google_places", places_truth(places, hosted?)),
      capability("world_ticketmaster", events_truth(events, hosted?)),
      capability("booking_handoff", %{
        "class" => "real_handoff",
        "claim" => "partner_handoff_not_direct_book",
        "booked_claim_forbidden" => true
      }),
      capability("navigation_deep_link", %{
        "class" => "real_handoff",
        "claim" => "maps_uri_no_address_reentry",
        "platform_proof" => "uri_constructed"
      }),
      capability("reminder_transport", %{
        "class" => "client_contract",
        "claim" => "scheduled_not_os_receipt_unless_client_acks",
        "overclaim_forbidden" => true
      }),
      capability("compound_alignment", %{
        "class" => if(hosted?, do: "hosted", else: "merged_only"),
        "claim" => "harness_proven_quality_at_scale"
      }),
      capability("memory_compose", %{
        "class" => if(hosted?, do: "hosted", else: "merged_only"),
        "claim" => "in_process_store_not_persistent_db_default"
      }),
      capability("device_delivery", %{
        "class" => "client_contract",
        "claim" => "capability_permission_delivery_separated"
      }),
      capability("push_notification", %{
        "class" =>
          if(Keyword.get(opts, :push_configured, false),
            do: "client_contract",
            else: "disabled"
          ),
        "claim" => "os_delivery_requires_client"
      })
    ]

    %{
      "capabilities" => caps,
      "by_class" => group_by_class(caps),
      "credential_blockers" => credential_blockers(places, events),
      "merged_ne_live" => true,
      "silent_synthetic_as_real_forbidden" => true,
      "audited_at" => DateTime.utc_now()
    }
  end

  @doc "Single capability class lookup."
  def class_for(name, opts \\ []) when is_binary(name) do
    audit(opts)["capabilities"]
    |> Enum.find(fn c -> c["name"] == name end)
    |> case do
      nil -> "unknown"
      c -> c["class"]
    end
  end

  defp places_truth(mode, hosted?) do
    cond do
      mode["mode"] == "connected" and mode["credential_present"] ->
        %{
          "class" => if(hosted?, do: "real_live", else: "real_live"),
          "credential_present" => true
        }

      mode["credential_present"] != true and mode["mode"] == "synthetic" ->
        %{"class" => "synthetic", "credential_present" => false}

      mode["mode"] == "disabled" ->
        %{"class" => "disabled", "credential_present" => mode["credential_present"]}

      true ->
        %{"class" => "credential_blocked", "credential_present" => mode["credential_present"]}
    end
  end

  defp events_truth(mode, hosted?), do: places_truth(mode, hosted?)

  defp capability(name, extra) do
    Map.merge(
      %{
        "name" => name,
        "class" => extra["class"] || "merged_only"
      },
      extra
    )
  end

  defp group_by_class(caps) do
    caps
    |> Enum.group_by(& &1["class"])
    |> Map.new(fn {k, v} -> {k, Enum.map(v, & &1["name"])} end)
  end

  defp credential_blockers(places, events) do
    []
    |> then(fn acc ->
      if places["credential_present"] != true,
        do: [%{"provider" => "google_places", "env" => "GOOGLE_PLACES_API_KEY"} | acc],
        else: acc
    end)
    |> then(fn acc ->
      if events["credential_present"] != true,
        do: [%{"provider" => "ticketmaster", "env" => "TICKETMASTER_API_KEY"} | acc],
        else: acc
    end)
  end
end
