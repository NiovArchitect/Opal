defmodule OpalCore.Work.ScheduleProvider do
  @moduledoc """
  Provider-neutral work schedule substrate.

  Execution only when a real provider is connected. Never fake shifts.
  """

  @callback id() :: String.t()
  @callback connected?(user_id :: String.t()) :: boolean()
  @callback shift_ending_before(user_id :: String.t(), at :: DateTime.t()) ::
              {:ok, DateTime.t() | nil} | {:error, term()}

  def connected?(user_id) when is_binary(user_id) do
    # No live Workday/ADP/UKG connector yet.
    false
  end

  def shift_ending_before(_user_id, _at), do: {:ok, nil}

  def status do
    %{
      "schedule_known" => false,
      "providers" => [],
      "PTO_PROVIDER_CONNECTED" => false,
      "submission_supported" => false
    }
  end
end
