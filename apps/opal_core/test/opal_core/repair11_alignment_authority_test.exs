defmodule OpalCore.SocialFlow.Repair11AlignmentAuthorityTest do
  @moduledoc """
  Repair #11 — the @cancel_patterns message-body regex no longer blocks Set
  elevation or influences any plan decision in AlignmentAuthority. Cancel and
  withdrawal now flow through SocialFlow revision authorities and
  JourneyAuthority.cant_make_it, not regex.

  NOT RUN — no Elixir toolchain on this VM (mix test not available).
  Would run: `mix test apps/opal_core/test/opal_core/repair11_alignment_authority_test.exs`
  """

  use OpalCore.DataCase, async: false

  alias OpalCore.Fixtures
  alias OpalCore.FixturesHelper
  alias OpalCore.SocialFlow.AlignmentAuthority

  setup do
    FixturesHelper.seed!()
    :ok
  end

  defp msg(id, sender, body, seq) do
    %{id: id, sender_user_id: sender, body: body, server_seq: seq}
  end

  test "cancel phrasing no longer blocks Set elevation" do
    alex = Fixtures.user_alex_id()
    jordan = Fixtures.user_jordan_id()
    conv = Fixtures.conv_alex_jordan_id()

    messages = [
      msg("m1", alex, "dinner Friday?", 1),
      msg("m2", alex, "I'm in", 2),
      msg("m3", jordan, "works for me", 3),
      # Previously the \\bcancel\\b regex set canceled? and blocked Set.
      msg("m4", jordan, "actually cancel that idea", 4)
    ]

    assert AlignmentAuthority.authorize_set?(conv, messages) == true
  end

  test "not this time / not happening phrasing no longer blocks Set elevation" do
    alex = Fixtures.user_alex_id()
    jordan = Fixtures.user_jordan_id()
    conv = Fixtures.conv_alex_jordan_id()

    messages = [
      msg("m1", alex, "dinner Friday?", 1),
      msg("m2", alex, "I'm in", 2),
      msg("m3", jordan, "works for me", 3),
      msg("m4", jordan, "not this time", 4)
    ]

    assert AlignmentAuthority.authorize_set?(conv, messages) == true
  end

  test "Set still requires plan evidence and both affirmatives (gate intact)" do
    alex = Fixtures.user_alex_id()
    jordan = Fixtures.user_jordan_id()
    conv = Fixtures.conv_alex_jordan_id()

    # No plan evidence -> no Set, even with affirmatives.
    messages = [
      msg("m1", alex, "I'm in", 1),
      msg("m2", jordan, "works for me", 2)
    ]

    assert AlignmentAuthority.authorize_set?(conv, messages) == false
  end
end
