defmodule OpalCore.SocialFlow.Physical.DeviceMoment do
  @moduledoc """
  Device execution moments after alignment — leave-by reminder, navigation, ETA share.

  User should not re-enter time/place after Set.
  No silent interpersonal actions. OS permission ≠ social share.
  Composes Feasibility.LeaveBy + Device.Executor + Ambient.ExecutionReadiness.
  """

  alias OpalCore.SocialFlow.Ambient.{ExecutionContext, ExecutionReadiness}
  alias OpalCore.SocialFlow.Feasibility.LeaveBy
  alias OpalCore.SocialFlow.OpalCalendar.ReminderDelivery
  alias OpalCore.SocialFlow.RealWorld.Device.Executor, as: DeviceExecutor

  @doc """
  After Set: prepare leave-by reminder from commitment without re-entry.
  """
  def schedule_leave_by(commitment, opts \\ []) when is_map(commitment) do
    c = stringify(commitment)
    travel = Keyword.get(opts, :travel_minutes) || c["travel_minutes"] || 20
    mode = Keyword.get(opts, :mode, :driving)

    with {:ok, leave} <- LeaveBy.for_commitment(c, travel_minutes: travel, mode: mode),
         intent <-
           leave
           |> LeaveBy.as_reminder_intent()
           |> Map.put("owner_user_id", c["owner_user_id"]) do
      queued =
        if Keyword.get(opts, :queue, true) do
          ReminderDelivery.queue([intent], opts)
        else
          [intent]
        end

      {:ok,
       %{
         "leave_by" => leave["leave_by"],
         "private_copy" => leave["private_copy"],
         "queued" => queued,
         "origin_exposed" => false,
         "reentry_required" => false,
         "authorizes_set" => false
       }}
    end
  end

  @doc """
  Prepare navigation to plan destination — destination from commitment, not retyped.
  Requires user authorization to start.
  """
  def prepare_navigation(commitment, opts \\ []) when is_map(commitment) do
    c = stringify(commitment)
    place = c["place_label"] || c["place"] || Keyword.get(opts, :place)

    if is_binary(place) do
      DeviceExecutor.prepare("navigation.start", %{
        "actor_user_id" => c["owner_user_id"] || Keyword.get(opts, :actor_user_id),
        "conversation_id" => c["conversation_id"],
        "place" => place,
        "set_authorized" => Keyword.get(opts, :set_authorized, true),
        "shared_safe_summary" => place
      })
    else
      {:error, :destination_required}
    end
  end

  @doc "Start navigation only with user authorization."
  def start_navigation(prepared, opts \\ []) when is_map(prepared) do
    if Keyword.get(opts, :user_authorized) == true do
      DeviceExecutor.run(prepared, user_authorized: true)
    else
      {:error, :user_authorization_required}
    end
  end

  @doc """
  Share ETA only with explicit user authority — never from OS location permission alone.
  """
  def share_eta(leave_result, opts \\ []) when is_map(leave_result) do
    LeaveBy.share_eta(leave_result, opts)
  end

  @doc """
  Full post-Set device package: leave-by + optional nav prep + execution readiness.
  """
  def after_set(commitment, opts \\ []) when is_map(commitment) do
    c = stringify(commitment)

    with {:ok, leave} <- schedule_leave_by(c, opts),
         {:ok, exec} <-
           ExecutionReadiness.assess(%{
             "set" => true,
             "provider_checked" => Keyword.get(opts, :provider_checked, false),
             "provider_available" => Keyword.get(opts, :provider_available, false),
             "slot_label" => c["slot_label"]
           }) do
      nav =
        case prepare_navigation(c, opts) do
          {:ok, n} -> n
          _ -> nil
        end

      {:ok,
       %{
         "leave_by" => leave,
         "navigation_prepared" => nav,
         "execution" => exec,
         "reentry_required" => false,
         "origin_exposed" => false,
         "auto_started_nav" => false,
         "auto_shared_eta" => false,
         "authorizes_set" => false
       }}
    end
  end

  @doc """
  Build device package from ExecutionContext — destination/time already known.
  Leave-by → optional “Start directions?” without retyping address.
  """
  def from_execution_context(ctx, opts \\ []) when is_map(ctx) do
    with {:ok, c} <- ExecutionContext.from_resolved(ctx),
         true <- ExecutionContext.ready_for?(c, "leave_by") || {:error, :incomplete_context} do
      commitment = %{
        "owner_user_id" => c["actor_user_id"],
        "conversation_id" => c["conversation_id"],
        "place" => c["destination"] || c["place"],
        "place_label" => c["place_label"] || c["destination"],
        "when" => c["when"],
        "start_at" => c["when"],
        "travel_minutes" => c["travel_minutes"] || 20,
        "slot_label" => c["slot_label"]
      }

      after_set(commitment, opts)
    end
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
