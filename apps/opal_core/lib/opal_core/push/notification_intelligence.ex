defmodule OpalCore.Push.NotificationIntelligence do
  @moduledoc """
  Push without spam — priority tiers, quiet hours, digest, absolute mute.

  Tiers:
  - `:urgent` — plan confirm ≤2h, missed call, @mention → push immediately (even quiet hours)
  - `:normal` — new message, RSVP, Opal suggestion → push unless user active in-app
  - `:low` — vibe moment, memory, trip teaser → daily digest only

  Quiet hours: the user's stored Soul window, judged by the ONE
  resolver (`OpalCore.SocialFlow.QuietHours`) — Repair #19 FIX-A
  (BS-04). The old vibe sleep-bias window was a divergent second
  truth and is retired.

  Mute is absolute: muted thread → zero pushes all tiers.
  """

  require Logger

  import Ecto.Query

  alias OpalCore.Messaging.ConversationMember
  alias OpalCore.Push.Workers.DeliverPushWorker
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.Clock

  @tiers ~w(urgent normal low)a

  @doc "Enqueue with intelligence. Returns {:ok, :pushed | :held | :digested | :suppressed | job}."
  def enqueue(user_id, title, body, data \\ %{}, opts \\ []) when is_binary(user_id) do
    tier = normalize_tier(Keyword.get(opts, :tier) || Map.get(data, "tier") || Map.get(data, :tier) || :normal)
    conversation_id = Map.get(data, "conversation_id") || Map.get(data, :conversation_id)

    cond do
      muted?(conversation_id, user_id) ->
        Logger.info("push.suppressed_mute user=#{user_id} tier=#{tier} conv=#{conversation_id}")
        {:ok, :suppressed_mute}

      tier == :low ->
        hold_for_digest(user_id, title, body, data, tier)

      tier == :normal and active_in_app?(user_id) ->
        Logger.info("push.suppressed_active user=#{user_id}")
        mark_in_app_only(user_id, title, body, data)
        {:ok, :in_app_only}

      quiet_hours?(user_id) and tier != :urgent ->
        hold_for_morning(user_id, title, body, data, tier)

      true ->
        data = Map.put(stringify(data), "tier", Atom.to_string(tier))
        DeliverPushWorker.enqueue(user_id, title, body, data)
    end
  end

  def normalize_tier(t) when t in @tiers, do: t
  def normalize_tier("urgent"), do: :urgent
  def normalize_tier("low"), do: :low
  def normalize_tier(_), do: :normal

  @doc """
  Quiet hours window for the user as {start_hour, end_hour} —
  read from the ONE quiet-hours truth
  (`OpalCore.SocialFlow.QuietHours`, the user's stored Soul
  window). Kept for the digest worker's flush timing; the window
  itself no longer comes from a vibe sleep bias (BS-04: that was a
  second, divergent truth).
  """
  def quiet_window(user_id) when is_binary(user_id) do
    window = OpalCore.SocialFlow.QuietHours.window_for(user_id)
    {div(window.start_minutes, 60), div(window.end_minutes, 60)}
  end

  def quiet_window(_) do
    window = OpalCore.SocialFlow.QuietHours.default_window()
    {div(window.start_minutes, 60), div(window.end_minutes, 60)}
  end

  @doc "Quiet now for this user — the one resolver (BS-04)."
  def quiet_hours?(user_id) do
    OpalCore.SocialFlow.QuietHours.quiet_now?(user_id)
  end

  @doc """
  Hour-granularity range check, delegated to the one resolver's
  core so the edge rule (start == end = disabled) is shared.
  """
  def in_quiet_range?(hour, start_h, end_h) do
    OpalCore.SocialFlow.QuietHours.in_window?(hour * 60, start_h * 60, end_h * 60)
  end

  @doc "Mark user as active in-app (FE heartbeat). TTL ~90s via ETS."
  def touch_active(user_id) when is_binary(user_id) do
    ensure_table()
    :ets.insert(:opal_push_active, {user_id, System.system_time(:second)})
    :ok
  end

  def active_in_app?(user_id) when is_binary(user_id) do
    ensure_table()

    case :ets.lookup(:opal_push_active, user_id) do
      [{^user_id, ts}] -> System.system_time(:second) - ts < 90
      _ -> false
    end
  end

  def active_in_app?(_), do: false

  def muted?(nil, _), do: false

  def muted?(conversation_id, user_id) when is_binary(conversation_id) and is_binary(user_id) do
    case Repo.get_by(ConversationMember, conversation_id: conversation_id, user_id: user_id) do
      %ConversationMember{notifications_muted: true} -> true
      _ -> false
    end
  end

  def muted?(_, _), do: false

  @doc "Flush held morning/digest items for a user (called by DigestWorker)."
  def flush_held(user_id) when is_binary(user_id) do
    ensure_held_table()
    now_bucket = held_key(user_id)

    items =
      case :ets.lookup(:opal_push_held, now_bucket) do
        [{^now_bucket, list}] -> list
        _ -> []
      end

    :ets.delete(:opal_push_held, now_bucket)

    case items do
      [] ->
        {:ok, :empty}

      list ->
        count = length(list)
        low_only? = Enum.all?(list, fn i -> i.tier == :low end)

        {title, body, deep} =
          if low_only? do
            {"Your Opal digest", "#{count} quiet updates while you were away", "opal://attention/digest"}
          else
            {"While you were away", "#{count} updates", "opal://attention"}
          end

        data = %{
          "tier" => "normal",
          "kind" => if(low_only?, do: "digest", else: "morning_summary"),
          "deep_link" => deep,
          "held_count" => count
        }

        DeliverPushWorker.enqueue(user_id, title, body, data)
    end
  end

  def flush_held(_), do: {:ok, :empty}

  defp hold_for_digest(user_id, title, body, data, tier) do
    hold(user_id, title, body, data, tier)
    {:ok, :digested}
  end

  defp hold_for_morning(user_id, title, body, data, tier) do
    hold(user_id, title, body, data, tier)
    {:ok, :held_quiet_hours}
  end

  defp hold(user_id, title, body, data, tier) do
    ensure_held_table()
    key = held_key(user_id)
    entry = %{title: title, body: body, data: data, tier: tier, at: Clock.utc_now()}

    list =
      case :ets.lookup(:opal_push_held, key) do
        [{^key, existing}] -> [entry | existing]
        _ -> [entry]
      end

    :ets.insert(:opal_push_held, {key, Enum.take(list, 50)})
    :ok
  end

  defp mark_in_app_only(user_id, title, body, data) do
    Logger.info("push.in_app_only user=#{user_id} title=#{inspect(title)} body=#{inspect(body)} data=#{inspect(data)}")
    :ok
  end

  defp held_key(user_id), do: user_id

  defp ensure_table do
    case :ets.whereis(:opal_push_active) do
      :undefined ->
        try do
          :ets.new(:opal_push_active, [:named_table, :public, :set])
        rescue
          ArgumentError -> :ok
        end

      _ ->
        :ok
    end
  end

  defp ensure_held_table do
    case :ets.whereis(:opal_push_held) do
      :undefined ->
        try do
          :ets.new(:opal_push_held, [:named_table, :public, :set])
        rescue
          ArgumentError -> :ok
        end

      _ ->
        :ok
    end
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {k, v}
    end)
  end

  defp stringify(other), do: %{"value" => other}
end
