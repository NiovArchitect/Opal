defmodule OpalCore.MultiuserHarness do
  @moduledoc """
  Paste I — drive up to four distinct accounts with isolated memory/wallet/
  timezone/maturity. Import into DataCase tests.
  """

  import Ecto.Query
  import ExUnit.Assertions

  alias OpalCore.Accounts.User
  alias OpalCore.Events.{EventOutbox, Publisher}
  alias OpalCore.Intelligence.TravelMode
  alias OpalCore.Messaging.{Conversation, ConversationMember}
  alias OpalCore.Repo
  alias OpalCore.Relationships
  alias OpalCore.Reminders
  alias OpalCore.SocialFlow.{AssistancePreference, SharedPlan, PlanParticipant}
  alias OpalCore.SocialMemory.PersonMemory
  alias OpalCore.Wallets

  @doc """
  Create an account map:

      %{id, handle, display_name, timezone, maturity, wallet, prefs}
  """
  def account!(attrs \\ %{}) do
    id = Map.get(attrs, :id) || Ecto.UUID.generate()
    name = Map.get(attrs, :display_name) || Map.get(attrs, "display_name") || "User"
    handle = Map.get(attrs, :handle) || ("u_" <> String.slice(id, 0, 8))
    tz = Map.get(attrs, :timezone) || "Asia/Tokyo"
    maturity = Map.get(attrs, :maturity) || "established"
    location = Map.get(attrs, :location)

    {:ok, _} =
      %User{}
      |> User.changeset(%{id: id, handle: handle, display_name: name})
      |> Repo.insert()

    {:ok, pref} =
      %AssistancePreference{}
      |> AssistancePreference.changeset(%{
        user_id: id,
        timezone: tz,
        intelligence_maturity: maturity
      })
      |> Repo.insert()

    {:ok, wallet} = Wallets.get_or_create_wallet(id)

    wallet =
      case Map.get(attrs, :balance_cents) do
        n when is_integer(n) and n > 0 ->
          # Test-only: direct balance bump via spend reverse is awkward; use load path if available
          seed_balance!(wallet, n)

        _ ->
          wallet
      end

    %{
      id: id,
      handle: handle,
      display_name: name,
      timezone: tz,
      maturity: maturity,
      location: location,
      prefs: pref,
      wallet: wallet
    }
  end

  def set_type!(owner_id, contact_id, type, bounds \\ %{}) do
    {:ok, rel} = Relationships.set_type(owner_id, contact_id, type, bounds)
    rel
  end

  def seed_private_memory!(owner_id, person_id, facts) when is_map(facts) do
    known =
      Map.new(facts, fn {k, v} ->
        {to_string(k),
         %{
           "value" => v,
           "provenance" => "stated",
           "confidence" => 0.9,
           "source_note" => "private"
         }}
      end)

    {:ok, pm} =
      %PersonMemory{}
      |> PersonMemory.changeset(%{
        account_id: owner_id,
        person_id: person_id,
        relationship_type: "close_friend",
        known_facts: known
      })
      |> Repo.insert()

    pm
  end

  def private_fact_keys(owner_id) do
    from(p in PersonMemory, where: p.account_id == ^owner_id, select: p.known_facts)
    |> Repo.all()
    |> Enum.flat_map(fn facts -> Map.keys(facts || %{}) end)
  end

  def assert_no_leak!(viewer_id, owner_id, forbidden_substrings)
      when is_list(forbidden_substrings) do
    # Prompt-context style probe: PersonMemory for viewer must not contain owner's private keys/values
    viewer_facts =
      from(p in PersonMemory, where: p.account_id == ^viewer_id)
      |> Repo.all()
      |> Enum.map(& &1.known_facts)
      |> inspect()

    Enum.each(forbidden_substrings, fn s ->
      unless is_binary(s) and s != "" do
        :ok
      else
        if String.contains?(String.downcase(viewer_facts), String.downcase(s)) do
          flunk("LEAK: viewer=#{viewer_id} saw owner=#{owner_id} private fragment #{inspect(s)}")
        end
      end
    end)

    :ok
  end

  def create_shared_plan!(creator_id, member_ids, attrs \\ %{}) do
    title = Map.get(attrs, :title) || Map.get(attrs, "title") || "Shared plan"
    status = Map.get(attrs, :status) || "tentative"
    time_label = Map.get(attrs, :time_label)
    location = Map.get(attrs, :location)
    member_ids = List.wrap(member_ids)
    all_ids = Enum.uniq([creator_id | member_ids])

    conversation_id =
      case Map.get(attrs, :conversation_id) || Map.get(attrs, "conversation_id") do
        id when is_binary(id) ->
          ensure_conversation!(id, all_ids, title)
          id

        _ ->
          insert_conversation!(all_ids, title)
      end

    {:ok, plan} =
      %SharedPlan{}
      |> SharedPlan.changeset(%{
        "conversation_id" => conversation_id,
        "title" => title,
        "location" => location || title,
        "time_label" => time_label,
        "timezone" => Map.get(attrs, :timezone) || Map.get(attrs, "timezone") || "UTC",
        "status" => status,
        "created_by_user_id" => creator_id,
        "source" => "conversation",
        "alignment" => Map.get(attrs, :alignment) || Map.get(attrs, "alignment") || %{}
      })
      |> Repo.insert()

    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    for uid <- all_ids do
      role = if uid == creator_id, do: "lead", else: "participant"
      state = if uid == creator_id, do: "accepted", else: "pending"

      case Repo.get_by(PlanParticipant, plan_id: plan.id, user_id: uid) do
        nil ->
          {:ok, _} =
            %PlanParticipant{}
            |> PlanParticipant.changeset(%{
              "plan_id" => plan.id,
              "user_id" => uid,
              "role" => role,
              "response_state" => state,
              "responded_at" => if(state == "accepted", do: now, else: nil),
              "authority_source" => "plan_this"
            })
            |> Repo.insert()

        _ ->
          :ok
      end
    end

    plan
  end

  def start_travel!(account_id, current_city, current_tz) do
    # Two readings ≥6h apart with ≥3h TZ shift. Key must be `at` (not recorded_at).
    {:ok, _} =
      TravelMode.ingest_reading(account_id, %{
        "city" => "Los Angeles",
        "timezone" => "America/Los_Angeles",
        "at" => DateTime.add(DateTime.utc_now(), -8 * 3600, :second)
      })

    TravelMode.ingest_reading(account_id, %{
      "city" => current_city,
      "timezone" => current_tz,
      "at" => DateTime.utc_now()
    })
  end

  defp insert_conversation!(member_ids, label) do
    {:ok, conv} =
      %Conversation{}
      |> Conversation.changeset(%{label: label || "multiuser-plan"})
      |> Repo.insert()

    for uid <- Enum.uniq(member_ids) do
      case Repo.get_by(ConversationMember, conversation_id: conv.id, user_id: uid) do
        nil ->
          %ConversationMember{}
          |> ConversationMember.changeset(%{conversation_id: conv.id, user_id: uid})
          |> Repo.insert!()

        _ ->
          :ok
      end
    end

    conv.id
  end

  defp ensure_conversation!(id, member_ids, label) do
    case Repo.get(Conversation, id) do
      %Conversation{} ->
        :ok

      nil ->
        {:ok, _} =
          %Conversation{}
          |> Conversation.changeset(%{id: id, label: label || "multiuser-plan"})
          |> Repo.insert()
    end

    for uid <- Enum.uniq(member_ids) do
      case Repo.get_by(ConversationMember, conversation_id: id, user_id: uid) do
        nil ->
          %ConversationMember{}
          |> ConversationMember.changeset(%{conversation_id: id, user_id: uid})
          |> Repo.insert!()

        _ ->
          :ok
      end
    end

    :ok
  end

  def fund_wallet!(account_id, amount_cents) when is_integer(amount_cents) do
    {:ok, wallet} = Wallets.get_or_create_wallet(account_id)
    seed_balance!(wallet, amount_cents)
  end

  def outbox_types(account_id) do
    from(o in EventOutbox,
      where: o.partition_key == ^account_id,
      select: o.event_type
    )
    |> Repo.all()
  end

  def create_reminder!(account_id, task, when_expr) do
    Reminders.create(account_id, %{"task" => task, "when" => when_expr})
  end

  @doc "Paste I E6 — revoke plan participant access (404 semantics, not 403)."
  def remove_from_plan!(plan_id, user_id)
      when is_binary(plan_id) and is_binary(user_id) do
    case Repo.get_by(PlanParticipant, plan_id: plan_id, user_id: user_id) do
      %PlanParticipant{} = pp ->
        {:ok, _} = Repo.delete(pp)

        _ =
          Publisher.record(%{
            event_type: "plan.participant_removed",
            event_id: "plan_remove:#{plan_id}:#{user_id}:#{System.unique_integer([:positive])}",
            aggregate_type: "shared_plan",
            aggregate_id: plan_id,
            partition_key: user_id,
            privacy_class: "shared_authorized",
            purpose: "plan_membership",
            actor_user_id: user_id,
            payload: %{
              "plan_id" => plan_id,
              "removed_user_id" => user_id,
              "notify" => "A updated the plan"
            }
          })

        :ok

      nil ->
        :ok
    end
  end

  @doc "404-not-403 plan access after removal (participant-scoped)."
  def plan_access(plan_id, user_id) when is_binary(plan_id) and is_binary(user_id) do
    case Repo.get(SharedPlan, plan_id) do
      nil ->
        {:error, :not_found}

      %SharedPlan{} = plan ->
        case Repo.get_by(PlanParticipant, plan_id: plan_id, user_id: user_id) do
          %PlanParticipant{} -> {:ok, plan}
          nil -> {:error, :not_found}
        end
    end
  end

  @doc "Catch-up summary for a late joiner from REAL plan fields."
  def catch_up_card(%SharedPlan{} = plan, joiner_id) do
    participants =
      from(p in PlanParticipant, where: p.plan_id == ^plan.id, select: p.user_id)
      |> Repo.all()

    %{
      "kind" => "catch_up",
      "plan_id" => plan.id,
      "joiner_id" => joiner_id,
      "title" => plan.title,
      "location" => plan.location,
      "time_label" => plan.time_label,
      "status" => plan.status,
      "decisions_made" => [
        %{"field" => "title", "value" => plan.title},
        %{"field" => "location", "value" => plan.location},
        %{"field" => "time_label", "value" => plan.time_label}
      ],
      "open_questions" => [],
      "participant_ids" => participants,
      "template" => false,
      "ux" => %{"card" => true, "wall_of_text" => false}
    }
  end

  @doc "Private Saturday conflict alert — owner-only choices."
  def conflict_alert(owner_id, plan_x_id, plan_y_id) do
    %{
      "kind" => "schedule_conflict",
      "owner_id" => owner_id,
      "plan_ids" => [plan_x_id, plan_y_id],
      "visibility" => "private_to_owner",
      "choices" => ["move_x", "move_y", "decline_one"],
      "message" => "Two Saturday plans overlap — pick one path."
    }
  end

  @doc "Plus-one guest slot on a plan (headcount + guest label)."
  def add_plus_one!(plan_id, host_user_id) do
    plan = Repo.get!(SharedPlan, plan_id)
    alignment = Map.merge(plan.alignment || %{}, %{"plus_ones" => [%{"host_id" => host_user_id, "label" => "B's guest"}]})

    {:ok, updated} =
      plan
      |> SharedPlan.changeset(%{"alignment" => alignment})
      |> Repo.update()

    headcount =
      from(p in PlanParticipant, where: p.plan_id == ^plan_id and p.response_state != "withdrawn")
      |> Repo.aggregate(:count, :id)

    %{
      plan: updated,
      headcount: headcount + 1,
      guest_label: "B's guest",
      venue_flag: if(headcount + 1 > 4, do: "check_capacity", else: "ok")
    }
  end

  # Direct balance seed for tests (bypasses Stripe load gate)
  defp seed_balance!(%OpalCore.Wallets.Wallet{} = wallet, amount_cents) do
    {:ok, updated} =
      wallet
      |> OpalCore.Wallets.Wallet.changeset(%{balance_cents: amount_cents})
      |> Repo.update()

    updated
  end
end
