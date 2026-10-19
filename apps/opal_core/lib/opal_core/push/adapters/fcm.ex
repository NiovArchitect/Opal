defmodule OpalCore.Push.Adapters.FCM do
  @moduledoc """
  FCM push adapter — RETIRED to an honest unavailable state
  (Repair #18 FALSE-fix F-03).

  The previous implementation posted to Google's legacy FCM endpoint
  (`https://fcm.googleapis.com/fcm/send`), which Google shut down, using
  a legacy server-key header — and `credentials_present?/0` returned
  true for a service-account credential the send path never used. That
  was a false-ready signal aimed at a dead endpoint.

  There is no FCM HTTP v1 sender in this codebase (no service-account
  OAuth2 flow), so — following the APNs honesty pattern (BS-6:
  `{:error, :jwt_not_configured}`) — this adapter now reports
  `{:error, :fcm_not_configured}` for every send and
  `credentials_present?/0` is always `false`, regardless of any
  `FCM_*` env vars. `OpalCore.Push.Sender` therefore falls back to the
  honest Synthetic adapter for Android tokens. Rebuilding this as a
  real HTTP v1 sender is a separate, separately-proven change; until
  then FCM is not listed as a capability anywhere.
  """

  @behaviour OpalCore.Push.Sender

  require Logger

  @impl OpalCore.Push.Sender
  def send(token, payload, opts \\ [])

  def send(_token, _payload, _opts) do
    Logger.warning(
      "push.fcm fcm_not_configured — legacy endpoint retired, no HTTP v1 sender wired; refusing fake success"
    )

    {:error, :fcm_not_configured}
  end

  @doc """
  Always `false`: no FCM credential shape this codebase can actually
  send with exists today (the legacy server key targets a shut-down
  endpoint; service-account JSON has no OAuth2/HTTP v1 path here).
  Returning true for either was the F-03 false-ready signal.
  """
  def credentials_present?, do: false
end
