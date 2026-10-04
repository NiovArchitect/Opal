defmodule OpalCore.SocialFlow.TemporalHabitMinerWorker do
  @moduledoc """
  Phase 5D — weekly Oban cron for `TemporalHabitMiner.mine/1`.

  Sundays 02:00 (`0 2 * * 0`) on the `:events` queue. Selects users with
  ≥5 agreed/completed SharedPlan participations in SQL, then mines each.
  One bad user must not stop the batch.
  """

  use Oban.Worker, queue: :events, max_attempts: 3

  require Logger

  import Ecto.Query

  alias OpalCore.Repo
  alias OpalCore.SocialFlow.PlanParticipant
  alias OpalCore.SocialFlow.SharedPlan
  alias OpalCore.SocialFlow.TemporalHabitMiner

  @min_plans 5
  @signal_statuses ~w(agreed completed)

  @impl Oban.Worker
  def perform(%Oban.Job{} = _job) do
    eligible_user_ids()
    |> Enum.each(&mine_one/1)

    :ok
  end

  @doc """
  User ids with ≥#{@min_plans} agreed/completed plan participations.

  Single aggregate query — does not load all users into Elixir.
  """
  def eligible_user_ids do
    from(pp in PlanParticipant,
      join: p in SharedPlan,
      on: p.id == pp.plan_id,
      where: p.status in ^@signal_statuses,
      group_by: pp.user_id,
      having: count(p.id) >= ^@min_plans,
      select: pp.user_id
    )
    |> Repo.all()
  end

  defp mine_one(user_id) do
    try do
      case mine_fun().(user_id) do
        :insufficient_data ->
          Logger.info("temporal_habit_miner user=#{user_id} result=insufficient_data")
          :insufficient_data

        result when is_map(result) ->
          Logger.info(
            "temporal_habit_miner user=#{user_id} result=ok submitted=#{result[:submitted]} plan_count=#{result[:plan_count]}"
          )

          {:ok, result}

        other ->
          Logger.info("temporal_habit_miner user=#{user_id} result=#{inspect(other)}")
          other
      end
    rescue
      e ->
        Logger.warning(
          "temporal_habit_miner user=#{user_id} error=#{Exception.message(e)}"
        )

        {:error, e}
    end
  end

  defp mine_fun do
    Application.get_env(:opal_core, :temporal_habit_miner_fun, &TemporalHabitMiner.mine/1)
  end
end
