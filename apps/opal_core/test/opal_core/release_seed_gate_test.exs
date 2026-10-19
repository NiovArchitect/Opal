defmodule OpalCore.ReleaseSeedGateTest do
  @moduledoc """
  Repair #18 FALSE-fix F-14: Release.seed/0 claimed an OPAL_RUN_SEEDS
  gate in a comment but never checked it. The gate is now enforced:
  without the env var the seeds file is NOT evaluated.
  """
  use ExUnit.Case, async: false

  import ExUnit.CaptureLog

  alias OpalCore.Release

  setup do
    prior = System.get_env("OPAL_RUN_SEEDS")
    on_exit(fn -> restore("OPAL_RUN_SEEDS", prior) end)
    :ok
  end

  defp restore(name, nil), do: System.delete_env(name)
  defp restore(name, val), do: System.put_env(name, val)

  test "gate is closed when OPAL_RUN_SEEDS is unset" do
    System.delete_env("OPAL_RUN_SEEDS")
    refute Release.seeds_allowed?()
  end

  test "gate is closed for non-true values" do
    for v <- ["false", "0", "yes", ""] do
      System.put_env("OPAL_RUN_SEEDS", v)
      refute Release.seeds_allowed?(), "expected gate closed for #{inspect(v)}"
    end
  end

  test "gate opens only for true/1" do
    for v <- ["true", "1"] do
      System.put_env("OPAL_RUN_SEEDS", v)
      assert Release.seeds_allowed?()
    end
  end

  test "seed/0 refuses and does not evaluate the seeds file when the gate is closed" do
    System.delete_env("OPAL_RUN_SEEDS")

    log =
      capture_log(fn ->
        assert {:error, :seeds_not_enabled} = Release.seed()
      end)

    assert log =~ "NOT evaluated"
  end
end
