defmodule OpalCore.SocialMemory.Workers.WeeklyBriefingWorker do
  @moduledoc """
  Sunday weekly briefing → Opal Center (Paste C4).

  Cron: Sunday 16:00 UTC (~9am PT). Generates a short week-ahead brief from
  account-scoped social memory and posts to Opal Center.
  """

  use Oban.Worker, queue: :events, max_attempts: 3

  require Logger
  import Ecto.Query

  alias OpalCore.OpalConversations
  alias OpalCore.OpalConversations.OpalMessage
  alias OpalCore.Repo
  alias OpalCore.SocialMemory
  alias OpalCore.SocialMemory.{PlanMemory, SurfacedNudge, WeeklyBriefing}

  @impl Oban.Worker
  def perform(%Oban.Job{args: args}) do
    account_id = args["account_id"]

    if is_binary(account_id) do
      generate_for(account_id)
    else
      account_ids =
        from(p in PlanMemory, distinct: true, select: p.account_id)
        |> Repo.all()

      Enum.each(account_ids, &generate_for/1)
      :ok
    end
  end

  def generate_for(account_id) when is_binary(account_id) do
    week_start = Date.beginning_of_week(Date.utc_today(), :monday)
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    case Repo.get_by(WeeklyBriefing, account_id: account_id, week_start: week_start) do
      %WeeklyBriefing{} ->
        {:ok, :already}

      nil ->
        content = build_content(account_id)

        {:ok, briefing} =
          %WeeklyBriefing{}
          |> WeeklyBriefing.changeset(%{
            account_id: account_id,
            week_start: week_start,
            content: content,
            generated_at: now
          })
          |> Repo.insert()

        _ = deliver_center(account_id, content)
        Logger.info("weekly_briefing.generated account=#{account_id} week=#{week_start}")
        {:ok, briefing}
    end
  end

  defp build_content(account_id) do
    scoped = SocialMemory.for_account(account_id)
    conflicts = SocialMemory.detect_conflicts(scoped)

    plans =
      from(p in PlanMemory,
        where: p.account_id == ^account_id and p.status == "active",
        limit: 5
      )
      |> Repo.all()

    nudges =
      from(n in SurfacedNudge,
        where: n.account_id == ^account_id and n.status == "active",
        limit: 3
      )
      |> Repo.all()

    plan_lines =
      Enum.map_join(plans, "\n", fn p ->
        "- #{p.plan_label || "plan"} #{p.time_label}"
      end)

    conflict_n = length(conflicts)
    nudge_n = length(nudges)

    """
    Week ahead:
    #{if plan_lines == "", do: "- No active plans on file.", else: plan_lines}
    Open conflicts: #{conflict_n}. Active nudges: #{nudge_n}.
    """
    |> String.trim()
  end

  defp deliver_center(user_id, content) do
    with {:ok, conversation} <- OpalConversations.get_or_create_conversation(user_id) do
      %OpalMessage{}
      |> OpalMessage.changeset(%{
        "conversation_id" => conversation.id,
        "role" => "opal",
        "body" => String.slice("Weekly briefing:\n\n" <> content, 0, OpalMessage.max_body()),
        "metadata" => %{"source" => "weekly_briefing"}
      })
      |> Repo.insert()
    end
  rescue
    _ -> :ok
  end
end
