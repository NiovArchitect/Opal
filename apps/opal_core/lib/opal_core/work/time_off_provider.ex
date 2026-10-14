defmodule OpalCore.Work.TimeOffProvider do
  @moduledoc """
  Provider-neutral time-off substrate.

  Ladder: Suggest → Prepare → Submit → Submitted → Approved/Denied/Cancelled
  Submitted ≠ Approved. Never claim approval without provider confirmation.
  """

  @callback id() :: String.t()
  @callback connected?(user_id :: String.t()) :: boolean()
  @callback submission_supported?(user_id :: String.t()) :: boolean()
  @callback prepare(user_id :: String.t(), attrs :: map()) :: {:ok, map()} | {:error, term()}
  @callback submit(user_id :: String.t(), prepared_id :: String.t()) ::
              {:ok, map()} | {:error, term()}

  def connected?(_user_id), do: false
  def submission_supported?(_user_id), do: false

  def prepare(_user_id, attrs) when is_map(attrs) do
    {:error, :provider_not_connected}
  end

  def submit(_user_id, _prepared_id), do: {:error, :provider_not_connected}

  def status do
    %{
      "PTO_PROVIDER_CONNECTED" => false,
      "submission_supported" => false,
      "ladder" => ["suggest", "prepare", "submit", "submitted", "approved", "denied", "cancelled"]
    }
  end
end
