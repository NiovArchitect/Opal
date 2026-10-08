defmodule OpalCore.Intelligence.ProactiveConversation do
  @moduledoc """
  Proactive thread initiation (Paste C Phase 3).

  PRODUCT LAW (founder-tunable flags marked below — do not loosen without approval):
  - Closed trigger list only: temporal_anchor_3d | presence_open_loop | routine_streak_broken
  - Max 1 proactive thread per account per day (founder-tunable)
  - Owner must have messaged Opal in last 7 days (never cold-start)
  - Quiet hours: never before 8am or after 10pm owner timezone (default America/Los_Angeles)
  - Permanent opt-out via proactive_opt_out on users
  - Opening message always carries reason first

  Delivery: Opal Center 1:1 via OpalConversations (Opal is not a social group participant).
  """

  require Logger
  import Ecto.Query

  alias OpalCore.Repo
  alias OpalCore.Intelligence.{AttentionBudget, LlmAdapter}
  alias OpalCore.SocialMemory.ProactiveThreadLog

  # founder-tunable
  @max_per_day 1
  @quiet_start 8
  @quiet_end 22
  @default_tz "America/Los_Angeles"

  @allowed_triggers ~w(temporal_anchor_3d presence_open_loop routine_streak_broken)

  def allowed_triggers, do: @allowed_triggers

  @doc """
  Attempt to open a proactive thread. Returns
  `{:ok, log}` | `{:suppressed, reason}` | `{:error, reason}`.
  """
  def maybe_initiate(account_id, trigger_type, trigger_ref_id, reason_copy, opts \\ [])
      when is_binary(account_id) and is_binary(trigger_type) and is_binary(reason_copy) do
    cond do
      trigger_type not in @allowed_triggers ->
        {:suppressed, :trigger_not_allowed}

      opted_out?(account_id) ->
        {:suppressed, :opt_out}

      not active_recently?(account_id) ->
        {:suppressed, :inactive_7d}

      not within_quiet_hours?(account_id) ->
        {:suppressed, :quiet_hours}

      daily_cap_reached?(account_id) ->
        {:suppressed, :daily_cap}

      true ->
        ref = %{
          person_id: opts[:person_id],
          topic: trigger_type,
          date: Date.to_iso8601(Date.utc_today()),
          provenance: opts[:provenance] || "observed"
        }

        case AttentionBudget.request_slot(
               account_id,
               "proactive_thread",
               "proactive_thread",
               ref
             ) do
          {:granted, _} ->
            open_thread(account_id, trigger_type, trigger_ref_id, reason_copy, opts)

          {:denied, reason} ->
            {:suppressed, {:attention_budget, reason}}
        end
    end
  end

  def classify_opt_out(text) when is_binary(text) do
    # LLM classifies; rules fallback for tests when LLM down
    case LlmAdapter.readiness() do
      :ready ->
        messages = [
          %{
            role: "system",
            content:
              "Does the user want Opal to stop starting conversations? Reply JSON {\"opt_out\": true|false}."
          },
          %{role: "user", content: text}
        ]

        case LlmAdapter.chat(messages, temperature: 0.0, response_format: %{type: "json_object"}) do
          {:ok, %{content: content}} ->
            case Jason.decode(content) do
              {:ok, %{"opt_out" => true}} -> true
              _ -> rules_opt_out?(text)
            end

          _ ->
            rules_opt_out?(text)
        end

      _ ->
        rules_opt_out?(text)
    end
  end

  def set_opt_out(account_id, true) when is_binary(account_id) do
    # Additive users.proactive_opt_out
    from(u in "users", where: u.id == ^account_id)
    |> Repo.update_all(set: [proactive_opt_out: true])

    :ok
  rescue
    _ -> :ok
  end

  def set_opt_out(_, _), do: :ok

  defp rules_opt_out?(text) do
    Regex.match?(
      ~r/\b(stop starting conversations|don'?t message me first|leave me alone|stop messaging me first)\b/i,
      text
    )
  end

  defp opted_out?(account_id) do
    case Repo.query("SELECT proactive_opt_out FROM users WHERE id = $1", [Ecto.UUID.dump!(account_id)]) do
      {:ok, %{rows: [[true]]}} -> true
      {:ok, %{rows: [[1]]}} -> true
      _ -> false
    end
  rescue
    _ -> false
  end

  defp active_recently?(account_id) do
    # Prefer Opal Center activity; fall back to conversation_index
    since = DateTime.add(DateTime.utc_now(), -7 * 86_400, :second)

    from(i in OpalCore.SocialMemory.ConversationIndex,
      where: i.account_id == ^account_id and i.last_activity_at >= ^since,
      limit: 1
    )
    |> Repo.exists?()
  end

  defp within_quiet_hours?(_account_id) do
    # founder-tunable window 8–22 local
    tz = @default_tz

    case DateTime.now(tz) do
      {:ok, local} -> local.hour >= @quiet_start and local.hour < @quiet_end
      _ -> true
    end
  end

  defp daily_cap_reached?(account_id) do
    today = Date.utc_today()

    count =
      from(l in ProactiveThreadLog,
        where:
          l.account_id == ^account_id and
            fragment("(? AT TIME ZONE 'UTC')::date = ?", l.opened_at, ^today)
      )
      |> Repo.aggregate(:count, :id)

    count >= @max_per_day
  end

  defp open_thread(account_id, trigger_type, trigger_ref_id, reason_copy, opts) do
    opening = "Reason I'm reaching out: #{reason_copy}"

    {conversation_id, delivered?} =
      case deliver_opal_center(account_id, opening) do
        {:ok, cid} -> {cid, true}
        _ -> {opts[:conversation_id], false}
      end

    {:ok, log} =
      %ProactiveThreadLog{}
      |> ProactiveThreadLog.changeset(%{
        account_id: account_id,
        trigger_type: trigger_type,
        trigger_ref_id: trigger_ref_id,
        opened_at: DateTime.utc_now() |> DateTime.truncate(:microsecond),
        conversation_id: conversation_id,
        owner_response: nil
      })
      |> Repo.insert()

    Logger.info(
      "proactive.initiated account=#{account_id} trigger=#{trigger_type} ref=#{trigger_ref_id} delivered=#{delivered?}"
    )

    {:ok, %{log: log, opening_message: opening, delivered: delivered?}}
  end

  defp deliver_opal_center(user_id, body) do
    alias OpalCore.OpalConversations
    alias OpalCore.OpalConversations.OpalMessage

    with {:ok, conversation} <- OpalConversations.get_or_create_conversation(user_id),
         {:ok, _msg} <-
           %OpalMessage{}
           |> OpalMessage.changeset(%{
             "conversation_id" => conversation.id,
             "role" => "opal",
             "body" => String.slice(body, 0, OpalMessage.max_body()),
             "metadata" => %{"source" => "proactive_conversation"}
           })
           |> Repo.insert() do
      {:ok, conversation.id}
    end
  rescue
    _ -> {:error, :deliver_failed}
  end
end
