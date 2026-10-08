defmodule OpalCore.Voice.Provider do
  @moduledoc """
  Behaviour for cloud TTS providers (Paste G Phase 10).

  Implementations return `{:ok, audio_binary, meta}` | `{:disabled, reason}` |
  `{:error, reason}`. Meta should include `:provider` and `:content_type`.
  """

  @type meta :: %{optional(atom()) => term(), optional(String.t()) => term()}

  @callback configured?() :: boolean()
  @callback synthesize(text :: String.t(), opts :: keyword()) ::
              {:ok, binary(), meta()} | {:disabled, String.t()} | {:error, term()}
end
