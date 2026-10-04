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
        Enum.each(tokens, fn t ->
          result =
            Sender.send(t.token, payload,
              user_id: user_id,
              platform: t.platform,
              env: t.env
            )

          Logger.info(
            "push.deliver result=#{inspect(result)} user_id=#{user_id} platform=#{t.platform} title=#{inspect(payload.title)}"
          )
        end)

        :ok
      end
    end
  end

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
