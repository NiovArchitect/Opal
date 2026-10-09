defmodule OpalCore.Relationships.Inference do
  @moduledoc """
  Paste I 0.4 — noiseless type inference.

  New contacts get NO label at add time. After behavioral evidence accumulates,
  Opal may assign a *provisional* type and surface a one-time memory-transparency
  prompt: "I think of Maya as a close friend — right?" Confirm, correct, or
  dismiss — never re-asked.
  """

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Repo
  alias OpalCore.Relationships
  alias OpalCore.Relationships.RelationshipType

  @doc """
  Infer a provisional type from behavioral signals.

  Signals map (all optional):
  - `:message_count` / `"message_count"` — total messages with contact
  - `:weekend_plans` — count of weekend SharedPlans together
  - `:span_days` — observed relationship span
  - `:avg_hour` — average message hour (local)
  - `:formal_ratio` — 0.0–1.0 fraction of formal/worky messages

  Returns `{:ok, %RelationshipType{}}` when provisional written,
  `{:ok, :unchanged}` when explicit type already set,
  `{:ok, :insufficient}` when signals too weak.
  """
  def maybe_infer(user_id, contact_user_id, signals \\ %{})

  def maybe_infer(user_id, contact_user_id, signals)
      when is_binary(user_id) and is_binary(contact_user_id) and is_map(signals) do
    case Repo.get_by(RelationshipType, user_id: user_id, contact_user_id: contact_user_id) do
      %RelationshipType{source: src} = existing when src in ["explicit", "confirmed"] ->
        {:ok, :unchanged, existing}

      %RelationshipType{inference_status: "dismissed"} = existing ->
        # Never re-ask after dismiss
        {:ok, :dismissed, existing}

      existing ->
        sig = stringify(signals)

        case classify(sig) do
          nil ->
            {:ok, :insufficient}

          type when is_binary(type) ->
            write_provisional(user_id, contact_user_id, type, sig, existing)
        end
    end
  end

  def maybe_infer(_, _, _), do: {:error, :invalid}

  @doc """
  One-time transparency prompt for memory view.

  Returns `nil` when nothing to show (no provisional, already shown+resolved,
  or dismissed). When present, marks `inference_shown_at` so it never reappears
  after this session's delivery (caller must still call confirm/dismiss/correct).
  """
  def pending_prompt(user_id) when is_binary(user_id) do
    row =
      from(r in RelationshipType,
        where:
          r.user_id == ^user_id and r.source == "provisional" and
            r.inference_status == "pending_confirm" and is_nil(r.inference_resolved_at),
        order_by: [asc: r.inserted_at],
        limit: 1
      )
      |> Repo.one()

    case row do
      nil ->
        nil

      %RelationshipType{} = r ->
        # Already shown once → do not re-surface (nag ban)
        if match?(%DateTime{}, r.inference_shown_at) do
          nil
        else
          now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

          {:ok, updated} =
            r
            |> RelationshipType.changeset(%{inference_shown_at: now})
            |> Repo.update()

          name = display_name(updated.contact_user_id)
          type_label = human_type(updated.type)

          %{
            "kind" => "relationship_type_inference",
            "relationship_id" => updated.id,
            "contact_user_id" => updated.contact_user_id,
            "display_name" => name,
            "provisional_type" => updated.type,
            "prompt" => "I think of #{name} as a #{type_label} — right?",
            "choices" => ["confirm", "correct", "dismiss"],
            "shame_free" => true,
            "one_time" => true
          }
        end
    end
  end

  def pending_prompt(_), do: nil

  @doc "Peek without marking shown (tests / dry-run)."
  def peek_prompt(user_id) when is_binary(user_id) do
    row =
      from(r in RelationshipType,
        where:
          r.user_id == ^user_id and r.source == "provisional" and
            r.inference_status == "pending_confirm" and is_nil(r.inference_resolved_at) and
            is_nil(r.inference_shown_at),
        limit: 1
      )
      |> Repo.one()

    case row do
      nil ->
        nil

      %RelationshipType{} = r ->
        name = display_name(r.contact_user_id)

        %{
          "kind" => "relationship_type_inference",
          "relationship_id" => r.id,
          "contact_user_id" => r.contact_user_id,
          "display_name" => name,
          "provisional_type" => r.type,
          "prompt" => "I think of #{name} as a #{human_type(r.type)} — right?",
          "choices" => ["confirm", "correct", "dismiss"],
          "one_time" => true
        }
    end
  end

  def peek_prompt(_), do: nil

  @doc "Confirm provisional → confirmed source; propagates bounds via set_type."
  def confirm(user_id, contact_user_id) when is_binary(user_id) and is_binary(contact_user_id) do
    case Repo.get_by(RelationshipType, user_id: user_id, contact_user_id: contact_user_id) do
      %RelationshipType{type: type} = row ->
        now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

        {:ok, updated} =
          row
          |> RelationshipType.changeset(%{
            source: "confirmed",
            inference_status: "confirmed",
            inference_resolved_at: now
          })
          |> Repo.update()

        # Re-apply type so PersonMemory + defaults propagate in-session
        _ = Relationships.set_type(user_id, contact_user_id, type, updated.communication_bounds || %{})
        {:ok, updated}

      nil ->
        {:error, :not_found}
    end
  end

  def confirm(_, _), do: {:error, :invalid}

  @doc "Correct provisional to a different type — propagates immediately."
  def correct(user_id, contact_user_id, new_type)
      when is_binary(user_id) and is_binary(contact_user_id) and is_binary(new_type) do
    if new_type not in RelationshipType.allowed_types() do
      {:error, :invalid_type}
    else
      now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

      case Relationships.set_type(user_id, contact_user_id, new_type, %{}) do
        {:ok, rel} ->
          {:ok, updated} =
            rel
            |> RelationshipType.changeset(%{
              source: "confirmed",
              inference_status: "confirmed",
              inference_resolved_at: now
            })
            |> Repo.update()

          {:ok, updated}

        other ->
          other
      end
    end
  end

  def correct(_, _, _), do: {:error, :invalid}

  @doc "Dismiss — never re-ask. Keeps provisional type for soft behavior or clears to acquaintance floor."
  def dismiss(user_id, contact_user_id) when is_binary(user_id) and is_binary(contact_user_id) do
    case Repo.get_by(RelationshipType, user_id: user_id, contact_user_id: contact_user_id) do
      %RelationshipType{} = row ->
        now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

        row
        |> RelationshipType.changeset(%{
          inference_status: "dismissed",
          inference_resolved_at: now,
          inference_shown_at: row.inference_shown_at || now
        })
        |> Repo.update()

      nil ->
        {:error, :not_found}
    end
  end

  def dismiss(_, _), do: {:error, :invalid}

  @doc """
  Simulate N days of contact for tests (A8). Builds signals from counts.
  """
  def simulate_weeks_signals(opts) do
    days = Keyword.get(opts, :days, 21)
    msgs_per_day = Keyword.get(opts, :msgs_per_day, 3)
    weekend_plans = Keyword.get(opts, :weekend_plans, 3)
    formal_ratio = Keyword.get(opts, :formal_ratio, 0.05)

    %{
      "message_count" => days * msgs_per_day,
      "span_days" => days,
      "weekend_plans" => weekend_plans,
      "avg_hour" => Keyword.get(opts, :avg_hour, 19),
      "formal_ratio" => formal_ratio
    }
  end

  # ── classify ────────────────────────────────────────────────────────────

  defp classify(sig) do
    msgs = int(sig["message_count"])
    span = int(sig["span_days"])
    weekends = int(sig["weekend_plans"])
    formal = float(sig["formal_ratio"])
    hour = int(sig["avg_hour"] || 12)

    cond do
      # Strong work signal
      formal >= 0.6 and msgs >= 5 ->
        "business"

      # Sparse / new
      msgs < 5 or span < 3 ->
        nil

      # Daily + weekend plans → close friend
      msgs >= 40 and weekends >= 2 and formal < 0.25 ->
        "close_friend"

      # Regular social
      msgs >= 15 and weekends >= 1 and formal < 0.4 ->
        "friend"

      # Evening personal cadence, low formal
      msgs >= 20 and hour >= 17 and formal < 0.2 ->
        "close_friend"

      msgs >= 8 ->
        "acquaintance"

      true ->
        nil
    end
  end

  defp write_provisional(user_id, contact_user_id, type, sig, existing) do
    bounds = OpalCore.Relationships.Behavior.defaults_for(type)

    attrs = %{
      user_id: user_id,
      contact_user_id: contact_user_id,
      type: type,
      communication_bounds: bounds,
      source: "provisional",
      inference_status: "pending_confirm",
      inference_signals: sig,
      inference_shown_at: nil,
      inference_resolved_at: nil
    }

    result =
      case existing do
        nil ->
          %RelationshipType{} |> RelationshipType.changeset(attrs) |> Repo.insert()

        %RelationshipType{} = row ->
          # Don't overwrite if already shown/dismissed
          if row.inference_status in ["dismissed", "confirmed"] do
            {:ok, row}
          else
            row |> RelationshipType.changeset(attrs) |> Repo.update()
          end
      end

    case result do
      {:ok, rel} ->
        _ = sync_memory(user_id, contact_user_id, type)
        {:ok, rel}

      err ->
        err
    end
  end

  defp sync_memory(user_id, contact_user_id, type) do
    alias OpalCore.SocialMemory.PersonMemory

    case Repo.get_by(PersonMemory, account_id: user_id, person_id: contact_user_id) do
      %PersonMemory{} = pm ->
        pm |> PersonMemory.changeset(%{relationship_type: type}) |> Repo.update()

      nil ->
        :ok
    end
  rescue
    _ -> :ok
  end

  defp display_name(id) do
    case Repo.get(User, id) do
      %User{display_name: n} when is_binary(n) and n != "" -> n
      _ -> "them"
    end
  end

  defp human_type("close_friend"), do: "close friend"
  defp human_type(t) when is_binary(t), do: String.replace(t, "_", " ")
  defp human_type(_), do: "friend"

  defp stringify(map) when is_map(map) do
    Map.new(map, fn {k, v} -> {to_string(k), v} end)
  end

  defp int(n) when is_integer(n), do: n
  defp int(n) when is_binary(n), do: String.to_integer(n)
  defp int(_), do: 0

  defp float(n) when is_float(n), do: n
  defp float(n) when is_integer(n), do: n * 1.0
  defp float(_), do: 0.0
end
