defmodule OpalCore.Push.Workers.DeliverPushWorker do
  @moduledoc """
  Delivers an attention push to all active device tokens for a user.

  Looks up active tokens → sends via resolved adapter → logs result per token.
  Synthetic mode returns {:ok, :synthetic} and never claims delivery.
  """

  use Oban.Worker, queue: :push, max_attempts: 3

  require Logger

  alias OpalCore.Push.DeviceTokens
  alias OpalCore.Push.Payload
  alias OpalCore.Push.Sender

  @impl Oban.Worker
  def perform(%Oban.Job{args: args}) do
    user_id = args["user_id"]
    title = args["title"] || "Opal"
    body = args["body"] || ""
    data = args["data"] || %{}

    if not is_binary(user_id) or user_id == "" do
      {:error, :user_id_required}
    else
      payload = Payload.build(%{title: title, body: body, data: data})
      tokens = DeviceTokens.list_active(user_id)

      if tokens == [] do
        Logger.info("push.deliver no_active_tokens user_id=#{user_id}")
        :ok
      else
        results =
          Enum.map(tokens, fn t ->
            result =
              Sender.send(t.token, payload,
                user_id: user_id,
                platform: t.platform,
                env: t.env
              )

            Logger.info(
              "push.deliver result=#{inspect(result)} user_id=#{user_id} platform=#{t.platform} title=#{inspect(payload.title)}"
            )

            result
          end)

        # DeviceNotRegistered / adapter errors on every token → caller sees unreachable.
        if incoming_call?(data) and Enum.all?(results, &unregistered_or_hard_fail?/1) do
          Logger.warning(
            "push.deliver all_failed incoming_call user_id=#{user_id} results=#{inspect(results)}"
          )

          maybe_call_unreachable(data, :device_not_registered)
        end

        :ok
      end
    end
  end

  defp incoming_call?(data) when is_map(data), do: data["type"] == "incoming_call"
  defp incoming_call?(_), do: false

  defp unregistered_or_hard_fail?({:error, {:expo_ticket_error, t}}) when is_map(t) do
    details = t["details"] || %{}
    details["error"] == "DeviceNotRegistered" or
      (is_binary(t["message"]) and String.contains?(t["message"], "DeviceNotRegistered"))
  end

  defp unregistered_or_hard_fail?({:error, :invalid_expo_token}), do: true
  defp unregistered_or_hard_fail?({:ok, _}), do: false
  defp unregistered_or_hard_fail?(:ok), do: false
  defp unregistered_or_hard_fail?(_), do: false

  defp maybe_call_unreachable(data, reason) when is_map(data) do
    call_id = data["call_id"]

    if is_binary(call_id) and call_id != "" and incoming_call?(data) do
      case OpalCore.Repo.get(OpalCore.Calls.CallSession, call_id) do
        %OpalCore.Calls.CallSession{status: status} = session
        when status in ["ringing", "initiated"] ->
          OpalCore.Calls.CallPush.notify_unreachable(session, reason)

        _ ->
          :ok
      end
    else
      :ok
    end
  rescue
    e ->
      Logger.warning("push.unreachable_hook_failed reason=#{Exception.message(e)}")
      :ok
  end

  defp maybe_call_unreachable(_, _), do: :ok

  @doc "Enqueue a push delivery job. Returns {:ok, job} | {:error, reason}."
  def enqueue(user_id, title, body, data \\ %{}) when is_binary(user_id) do
    %{
      user_id: user_id,
      title: title,
      body: body,
      data: data
    }
    |> __MODULE__.new()
    |> Oban.insert()
  rescue
    e -> {:error, Exception.message(e)}
  end
end
