defmodule OpalCore.Invites.DeliverInviteSmsWorker do
  @moduledoc """
  Phase NE-1 — queue outbound invite SMS via Twilio adapter.
  """

  use Oban.Worker, queue: :events, max_attempts: 3

  require Logger

  alias OpalCore.SocialFlow.Sms.TwilioSmsAdapter

  @impl Oban.Worker
  def perform(%Oban.Job{args: args}) do
    to = args["to"]
    body = args["body"]

    cond do
      not is_binary(to) or to == "" ->
        {:error, :to_required}

      not is_binary(body) or body == "" ->
        {:error, :body_required}

      true ->
        case TwilioSmsAdapter.send(to, body) do
          {:ok, _sid} ->
            :ok

          {:error, :provider_not_configured} ->
            Logger.warning("invite.sms_skipped reason=provider_not_configured")
            :ok

          {:error, reason} ->
            Logger.warning("invite.sms_failed reason=#{inspect(reason)}")
            {:error, reason}
        end
    end
  end

  @doc "Enqueue invite SMS. Returns {:ok, job} | {:error, reason}."
  def enqueue(to_e164, body) when is_binary(to_e164) and is_binary(body) do
    %{"to" => to_e164, "body" => body}
    |> __MODULE__.new()
    |> Oban.insert()
  rescue
    e -> {:error, Exception.message(e)}
  end

  def enqueue(_, _), do: {:error, :invalid}
end
