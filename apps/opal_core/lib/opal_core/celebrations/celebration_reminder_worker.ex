defmodule OpalCore.Celebrations.CelebrationReminderWorker do
  @moduledoc """
  Phase 10A — daily Oban cron (09:00) for celebration reminders.

  Milestones: 14 days → attention; 7 and 1 days → urgent.
  Idempotent per (celebration, occurrence_year, milestone).
  Past dates this year are skipped until next year's window.
  """

  use Oban.Worker, queue: :events, max_attempts: 3

  require Logger

  alias OpalCore.Celebrations
  alias OpalCore.Celebrations.Celebration
  alias OpalCore.SocialFlow.AttentionCenter
  alias OpalCore.SocialFlow.Clock

  @milestones [14, 7, 1]

  @impl Oban.Worker
  def perform(%Oban.Job{} = job) do
    today = today_from_job(job)

    summary =
      Celebrations.all_celebrations()
      |> Enum.reduce(%{checked: 0, sent: 0, skipped: 0}, fn c, acc ->
        case remind_one(c, today) do
          {:ok, n} when is_integer(n) and n > 0 ->
            %{acc | checked: acc.checked + 1, sent: acc.sent + n}

          {:ok, 0} ->
            %{acc | checked: acc.checked + 1, skipped: acc.skipped + 1}

          {:error, _} ->
            %{acc | checked: acc.checked + 1, skipped: acc.skipped + 1}
        end
      end)

    Logger.info(
      "celebration_reminder checked=#{summary.checked} sent=#{summary.sent} skipped=#{summary.skipped} today=#{Date.to_iso8601(today)}"
    )

    :ok
  end

  @doc "Process one celebration for a given today. Returns {:ok, sent_count}."
  def remind_one(%Celebration{} = c, %Date{} = today) do
    days = Celebrations.days_until(c, today)
    occ_year = Celebrations.occurrence_year(c, today)

    milestones =
      @milestones
      |> Enum.filter(&(&1 == days))
      |> Enum.reject(&Celebrations.already_reminded?(c, occ_year, &1))

    Enum.reduce_while(milestones, {:ok, 0}, fn milestone, {:ok, n} ->
      case send_reminder(c, today, occ_year, milestone) do
        :ok -> {:cont, {:ok, n + 1}}
        {:error, reason} -> {:halt, {:error, reason}}
      end
    end)
  end

  def remind_one(_, _), do: {:error, :invalid}

  defp send_reminder(%Celebration{} = c, %Date{} = _today, occ_year, milestone) do
    {level, title, body} = copy_for(c, milestone)

    dedupe =
      "celebration:#{c.id}:#{occ_year}:#{milestone}"

    event = %{
      "items" => [
        %{
          "recipient_user_id" => c.user_id,
          "level" => level,
          "action_required" => true,
          "dedupe_key" => dedupe,
          "title" => title,
          "copy" => body,
          "detail" => body,
          "source_type" => "celebration",
          "source_id" => c.id,
          "reason" => "celebration_reminder",
          "privacy_safe" => true
        }
      ]
    }

    case AttentionCenter.ingest(event) do
      {:ok, _items} ->
        case Celebrations.mark_reminded(c, occ_year, milestone) do
          {:ok, _} -> :ok
          {:error, reason} -> {:error, reason}
        end

      {:error, reason} ->
        {:error, reason}
    end
  end

  defp copy_for(%Celebration{} = c, 14) do
    {
      "attention",
      "#{c.person_name}'s #{c.kind} is in 2 weeks",
      "Want to plan something? Opal can suggest based on what #{c.person_name} likes."
    }
  end

  defp copy_for(%Celebration{} = c, 7) do
    {
      "urgent",
      "#{c.person_name}'s #{c.kind} is in a week",
      "Want to plan something good?"
    }
  end

  defp copy_for(%Celebration{} = c, 1) do
    {
      "urgent",
      "#{c.person_name}'s #{c.kind} is tomorrow",
      "Last day to plan something good."
    }
  end

  defp today_from_job(%Oban.Job{args: args}) when is_map(args) do
    case args["today"] || args[:today] do
      %Date{} = d ->
        d

      iso when is_binary(iso) ->
        case Date.from_iso8601(iso) do
          {:ok, d} -> d
          _ -> clock_today()
        end

      _ ->
        clock_today()
    end
  end

  defp today_from_job(_), do: clock_today()

  defp clock_today do
    case Clock.utc_now() do
      %DateTime{} = dt -> DateTime.to_date(dt)
      _ -> Date.utc_today()
    end
  end
end
