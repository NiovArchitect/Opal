defmodule OpalCore.SocialMemory.Scoped do
  @moduledoc """
  Account-scoped handle. All SocialMemory reads take this struct so unscoped
  calls are a shape error, not a runtime hope.
  """

  @enforce_keys [:account_id]
  defstruct [:account_id]

  @type t :: %__MODULE__{account_id: Ecto.UUID.t()}
end
