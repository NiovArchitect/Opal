defmodule OpalCore.OpalPlaceholderGuardTest do
  use ExUnit.Case, async: true

  alias OpalCore.OpalConversations.OpalMessage
  alias OpalCore.OpalResponse

  @legacy OpalMessage.oc1_placeholder_body()
  @short_listening "I'm listening. I can help you plan, remember, or figure things out."

  test "response.ex source never contains OC-1 placeholder bodies" do
    src =
      File.read!(
        Path.expand("../../lib/opal_core/opal_response.ex", __DIR__)
      )

    refute src =~ @legacy
    refute src =~ @short_listening
  end

  test "fallback_text is trouble copy, not listening placeholder" do
    assert OpalResponse.fallback_text() =~ "having trouble"
    refute OpalResponse.fallback_text() =~ "I'm listening"
  end
end
