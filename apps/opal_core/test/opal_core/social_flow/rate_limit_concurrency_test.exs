defmodule OpalCore.SocialFlow.RateLimitConcurrencyTest do
  @moduledoc """
  P1: concurrent hits on the same bucket must not all pass the max.
  """

  use OpalCore.DataCase

  alias OpalCore.SocialFlow.RateLimitBucket
  alias OpalCore.Repo

  test "concurrent hits enforce max under race" do
    key = "conc:#{System.unique_integer([:positive])}"
    action = "alignment_response"
    max = 5
    parallel = 40

    results =
      1..parallel
      |> Task.async_stream(
        fn _ ->
          RateLimitBucket.hit(key, action, max: max, window_sec: 300)
        end,
        max_concurrency: parallel,
        timeout: 15_000
      )
      |> Enum.map(fn
        {:ok, res} -> res
        other -> other
      end)

    oks = Enum.count(results, &(&1 == :ok))
    limited = Enum.count(results, &(&1 == {:error, :rate_limited}))

    assert oks == max, "expected exactly #{max} :ok, got #{oks}"
    assert limited == parallel - max
    assert oks + limited == parallel

    bucket =
      Repo.get_by(RateLimitBucket, bucket_key: key, action: action)

    assert bucket
    # count may equal max or max+1 if last denied attempt still recorded before block
    assert bucket.count >= max
  end

  test "Onboarding.check_rate_limit is concurrent-safe" do
    actor = Ecto.UUID.generate()
    target = "proposal-#{System.unique_integer([:positive])}"
    max = 5

    results =
      1..30
      |> Task.async_stream(
        fn _ ->
          OpalCore.SocialFlow.Onboarding.check_rate_limit("alignment_response", actor, target)
        end,
        max_concurrency: 30,
        timeout: 15_000
      )
      |> Enum.map(fn {:ok, res} -> res end)

    assert Enum.count(results, &(&1 == :ok)) == max
    assert Enum.any?(results, &match?({:error, :rate_limited}, &1))
  end
end
