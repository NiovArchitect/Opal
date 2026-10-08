defmodule OpalCore.Intelligence.ProvenanceTest do
  use OpalCore.DataCase, async: false

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Intelligence.{AttentionBudget, Provenance, PromptBuilder}
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.AssistancePreference
  alias OpalCore.SocialMemory
  alias OpalCore.SocialMemory.{PersonMemory, SurfacedNudge, TemporalAnchor}
  alias OpalCore.SocialMemory.Workers.MemoryHourlyWorker

  setup do
    account_id = Ecto.UUID.generate()

    {:ok, _} =
      %User{}
      |> User.changeset(%{
        id: account_id,
        handle: "prov_" <> String.slice(account_id, 0, 8),
        display_name: "Prov"
      })
      |> Repo.insert()

    {:ok, _} =
      %AssistancePreference{}
      |> AssistancePreference.changeset(%{
        user_id: account_id,
        timezone: "America/Los_Angeles",
        intelligence_maturity: "established"
      })
      |> Repo.insert()

    {:ok, account_id: account_id}
  end

  test "inferred birthday alone → AttentionBudget denies; no nudge surface", %{account_id: aid} do
    person = Ecto.UUID.generate()
    today = Date.utc_today()
    soon = Date.add(today, 3)

    {:ok, _} =
      %TemporalAnchor{}
      |> TemporalAnchor.changeset(%{
        account_id: aid,
        person_id: person,
        anchor_type: "birthday",
        date: soon,
        confidence: 0.7,
        confirmed: true,
        provenance: "inferred"
      })
      |> Repo.insert()

    {:ok, _} =
      %PersonMemory{}
      |> PersonMemory.changeset(%{
        account_id: aid,
        person_id: person,
        known_facts: %{
          "birthday" => %{
            "value" => Date.to_iso8601(soon),
            "provenance" => "inferred",
            "learned_at" => DateTime.utc_now() |> DateTime.to_iso8601()
          }
        }
      })
      |> Repo.insert()

    assert {:denied, :inferred_only} =
             AttentionBudget.request_slot(aid, "nudge", "reminder", %{
               person_id: person,
               topic: "temporal_anchor",
               provenance: "inferred"
             })

    # Surface path must not create SurfacedNudge when provenance inferred
    assert :ok = MemoryHourlyWorker.surface_for_account(aid)

    scoped_count =
      from(n in SurfacedNudge, where: n.account_id == ^aid)
      |> Repo.aggregate(:count, :id)

    assert scoped_count == 0
  end

  test "prompt tags stated/observed/inferred + system instruction", %{account_id: aid} do
    person = Ecto.UUID.generate()

    {:ok, _} =
      %PersonMemory{}
      |> PersonMemory.changeset(%{
        account_id: aid,
        person_id: person,
        known_facts: %{
          "pet" => %{"value" => "dog", "provenance" => "stated"},
          "city" => %{"value" => "LA", "provenance" => "observed"},
          "allergy" => %{"value" => "maybe nuts", "provenance" => "inferred"}
        }
      })
      |> Repo.insert()

    assert Provenance.format_fact("pet", %{"value" => "dog", "provenance" => "stated"}) ==
             "[stated] pet=dog"

    assert Provenance.system_instruction() =~ "inferred"

    conv = Ecto.UUID.generate()
    scoped = SocialMemory.for_account(aid)
    built = PromptBuilder.build(scoped, conv, "tell me about them", [])
    text = built.what_you_know || built.system_extra || ""
    assert text =~ "[stated]"
    assert text =~ "[observed]" or text =~ Provenance.system_instruction()
  end
end
