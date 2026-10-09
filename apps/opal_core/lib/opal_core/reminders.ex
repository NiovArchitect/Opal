defmodule OpalCore.Reminders do
  @moduledoc """
  Paste G Phase 8 — user-command reminders.

  CRITICAL PRODUCT LAW: reminders NEVER subject to AttentionBudget
  (user command ≠ Opal nudge). Delivery must fire even when daily budget
  is exhausted.
  """

  import Ecto.Query

  alias OpalCore.Events.Publisher
  alias OpalCore.Intelligence.TemporalResolver
  alias OpalCore.Repo
  alias OpalCore.Reminders.{Reminder, ReminderDeliveryWorker}

  @doc "Create a reminder and schedule Oban delivery at remind_at."
  def create(account_id, attrs) when is_binary(account_id) and is_map(attrs) do
    params = stringify(attrs)
    task = blank_to_nil(params["task"] || params["text"] || params["body"])

    with {:ok, remind_at} <- resolve_remind_at(params),
         true <- is_binary(task) do
      recurrence = normalize_recurrence(params["recurrence"] || params["recurring"])

      cs =
        Reminder.changeset(%Reminder{}, %{
          account_id: account_id,
          task: task,
          remind_at: remind_at,
          status: "pending",
          recurrence: recurrence,
          conversation_id: blank_to_nil(params["conversation_id"]),
          metadata: params["metadata"] || %{}
        })

      case Repo.insert(cs) do
        {:ok, reminder} ->
          _ = schedule_delivery(reminder)

          _ =
            Publisher.record(%{
              event_type: "reminder.created",
              event_id: "reminder_created:#{reminder.id}",
              aggregate_type: "reminder",
              aggregate_id: reminder.id,
              partition_key: account_id,
              privacy_class: "private_authorized",
              purpose: "reminder_set",
              actor_user_id: account_id,
              conversation_id: reminder.conversation_id,
              payload: %{
                "reminder_id" => reminder.id,
                "status" => reminder.status,
                "has_recurrence" => not is_nil(reminder.recurrence)
              }
            })

          {:ok, reminder}

        {:error, _} = err ->
          err
      end
    else
      false -> {:error, :task_required}
      {:error, _} = err -> err
      _ -> {:error, :invalid}
    end
  end

  def create(_, _), do: {:error, :invalid}

  @doc "List reminders for account (pending first, then recent delivered)."
  def list(account_id, opts \\ [])

  def list(account_id, opts) when is_binary(account_id) do
    status = Keyword.get(opts, :status)
    limit = Keyword.get(opts, :limit, 50) |> min(100)

    q =
      from(r in Reminder,
        where: r.account_id == ^account_id,
        order_by: [asc: r.status, asc: r.remind_at],
        limit: ^limit
      )

    q =
      if is_binary(status) do
        from(r in q, where: r.status == ^status)
      else
        from(r in q, where: r.status in ["pending", "delivered"])
      end

    {:ok, Repo.all(q)}
  end

  def list(_, _), do: {:error, :invalid}

  @doc "Cancel a pending reminder owned by account."
  def cancel(account_id, id) when is_binary(account_id) and is_binary(id) do
    case Repo.get(Reminder, id) do
      %Reminder{account_id: ^account_id, status: "pending"} = r ->
        r
        |> Reminder.changeset(%{status: "cancelled"})
        |> Repo.update()

      %Reminder{account_id: ^account_id} = r ->
        {:ok, r}

      %Reminder{} ->
        {:error, :not_found}

      nil ->
        {:error, :not_found}
    end
  end

  def cancel(_, _), do: {:error, :not_found}

  @doc "Fetch one reminder (owner only)."
  def get(account_id, id) when is_binary(account_id) and is_binary(id) do
    case Repo.get(Reminder, id) do
      %Reminder{account_id: ^account_id} = r -> {:ok, r}
      %Reminder{} -> {:error, :not_found}
      nil -> {:error, :not_found}
    end
  end

  def get(_, _), do: {:error, :not_found}

  @doc """
  Deliver a reminder now. Past-due sets overdue flag.

  Does NOT call AttentionBudget — product law.
  """
  def deliver(reminder, opts \\ [])

  def deliver(%Reminder{status: "pending"} = reminder, opts) do
    now = Keyword.get(opts, :now) || DateTime.utc_now() |> DateTime.truncate(:microsecond)
    overdue? = DateTime.compare(reminder.remind_at, now) == :lt

    {:ok, updated} =
      reminder
      |> Reminder.changeset(%{
        status: "delivered",
        delivered_at: now,
        overdue: overdue?
      })
      |> Repo.update()

    # Best-effort notify (push / Center); never fail the durable deliver.
    try do
      ReminderDeliveryWorker.notify(updated)
    rescue
      _ -> :ok
    catch
      _, _ -> :ok
    end

    case updated.recurrence do
      %{"frequency" => "weekly"} = rec ->
        _ = schedule_next_weekly(updated, rec)

      _ ->
        :ok
    end

    {:ok, updated}
  end

  def deliver(%Reminder{} = r, _), do: {:ok, r}
  def deliver(_, _), do: {:error, :invalid}

  @doc "Deliver all pending past-due for account (fetch path)."
  def deliver_past_due(account_id, opts \\ []) when is_binary(account_id) do
    now = Keyword.get(opts, :now) || DateTime.utc_now() |> DateTime.truncate(:microsecond)

    from(r in Reminder,
      where: r.account_id == ^account_id and r.status == "pending" and r.remind_at <= ^now
    )
    |> Repo.all()
    |> Enum.map(fn r -> deliver(r, now: now) end)
  end

  def to_contract(%Reminder{} = r), do: Reminder.to_contract(r)

  @doc "Schedule Oban job at remind_at (scheduled_at)."
  def schedule_delivery(%Reminder{} = reminder) do
    # Oban test config uses `testing: :inline`, which executes immediately and
    # breaks SQL sandbox ownership. Tests call `deliver/2` directly instead.
    if Mix.env() == :test do
      {:ok, :test_skip_schedule}
    else
      %{reminder_id: reminder.id, account_id: reminder.account_id}
      |> ReminderDeliveryWorker.new(scheduled_at: reminder.remind_at)
      |> Oban.insert()
    end
  rescue
    e -> {:error, Exception.message(e)}
  end

  defp schedule_next_weekly(%Reminder{} = prior, rec) do
    dow = rec["day_of_week"] || rec[:day_of_week]
    base = prior.remind_at || DateTime.utc_now()
    next_at = next_weekday(base, dow)

    create(prior.account_id, %{
      "task" => prior.task,
      "remind_at" => DateTime.to_iso8601(next_at),
      "recurrence" => rec,
      "conversation_id" => prior.conversation_id,
      "metadata" => Map.merge(prior.metadata || %{}, %{"recurring_from" => prior.id})
    })
  end

  defp next_weekday(%DateTime{} = from, dow) when is_integer(dow) and dow in 0..6 do
    # Elixir Date.day_of_week: 1=Mon .. 7=Sun. Map 0=Sun → 7.
    target = if dow == 0, do: 7, else: dow
    date = DateTime.to_date(from)
    today_dow = Date.day_of_week(date)
    add_days = rem(target - today_dow + 7, 7)
    add_days = if add_days == 0, do: 7, else: add_days

    date
    |> Date.add(add_days)
    |> DateTime.new!(DateTime.to_time(from), from.time_zone || "Etc/UTC")
    |> DateTime.truncate(:microsecond)
  end

  defp next_weekday(%DateTime{} = from, _) do
    DateTime.add(from, 7 * 86_400, :second) |> DateTime.truncate(:microsecond)
  end

  defp resolve_remind_at(params) do
    cond do
      is_binary(params["remind_at"]) and params["remind_at"] != "" ->
        parse_dt(params["remind_at"])

      match?(%DateTime{}, params["remind_at"]) ->
        {:ok, DateTime.truncate(params["remind_at"], :microsecond)}

      is_binary(params["when"]) and params["when"] != "" ->
        resolve_natural(params["when"], params)

      is_binary(params["time_expression"]) ->
        resolve_natural(params["time_expression"], params)

      true ->
        {:error, :remind_at_required}
    end
  end

  defp resolve_natural(expr, params) do
    # Relative minutes/hours/whenever/Christmas must win over date-only TemporalResolver
    # (which would otherwise collapse "in 5 minutes" to a calendar day @ 09:00).
    case rules_relative(expr) do
      {:ok, _} = ok ->
        ok

      {:error, :needs_clarification} = err ->
        err

      {:error, _} ->
        account_id = params["account_id"]
        ref = Date.utc_today()

        case TemporalResolver.resolve(expr, [expr], ref, account_id || Ecto.UUID.generate(), nil) do
          {:ok, [attrs | _]} ->
            date = attrs[:date] || attrs["date"]

            if match?(%Date{}, date) do
              # Default 09:00 UTC if only a date resolved.
              {:ok, DateTime.new!(date, ~T[09:00:00], "Etc/UTC") |> DateTime.truncate(:microsecond)}
            else
              {:error, :unresolved_time}
            end

          _ ->
            {:error, :unresolved_time}
        end
    end
  end

  defp rules_relative(expr) when is_binary(expr) do
    lower = String.downcase(expr)
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    cond do
      # Dependency on another person's availability — ask, don't invent a time
      Regex.match?(~r/\bwhenever\b|\bwhen\s+\w+\s+(is\s+)?free\b|\bwhenever\s+\w+.?s\s+free\b/i, lower) ->
        {:error, :needs_clarification}

      Regex.match?(~r/in\s+(\d+)\s+hours?/, lower) ->
        [_, n] = Regex.run(~r/in\s+(\d+)\s+hours?/, lower)
        {:ok, DateTime.add(now, String.to_integer(n) * 3600, :second)}

      Regex.match?(~r/in\s+(\d+)\s+minutes?/, lower) ->
        [_, n] = Regex.run(~r/in\s+(\d+)\s+minutes?/, lower)
        {:ok, DateTime.add(now, String.to_integer(n) * 60, :second)}

      Regex.match?(~r/\btomorrow\b/, lower) ->
        {:ok, DateTime.add(now, 86_400, :second)}

      # Next Christmas → Dec 25 of current year if still ahead, else next year
      Regex.match?(~r/\b(next\s+)?christmas\b/, lower) ->
        today = Date.utc_today()
        this_xmas = Date.new!(today.year, 12, 25)

        xmas =
          if Date.compare(this_xmas, today) == :gt do
            this_xmas
          else
            Date.new!(today.year + 1, 12, 25)
          end

        {:ok, DateTime.new!(xmas, ~T[09:00:00], "Etc/UTC") |> DateTime.truncate(:microsecond)}

      true ->
        case weekday_offset(lower) do
          {:ok, days} -> {:ok, DateTime.add(now, days * 86_400, :second)}
          :error -> {:error, :unresolved_time}
        end
    end
  end

  defp weekday_offset(lower) do
    map = %{
      "monday" => 1,
      "tuesday" => 2,
      "wednesday" => 3,
      "thursday" => 4,
      "friday" => 5,
      "saturday" => 6,
      "sunday" => 7
    }

    Enum.find_value(map, :error, fn {name, target} ->
      if String.contains?(lower, name) do
        today = Date.day_of_week(Date.utc_today())
        add = rem(target - today + 7, 7)
        add = if add == 0, do: 7, else: add
        {:ok, add}
      else
        nil
      end
    end)
    |> case do
      {:ok, _} = ok -> ok
      _ -> :error
    end
  end

  defp normalize_recurrence(nil), do: nil
  defp normalize_recurrence("tuesday"), do: %{"frequency" => "weekly", "day_of_week" => 2}
  defp normalize_recurrence("Tuesday"), do: %{"frequency" => "weekly", "day_of_week" => 2}

  defp normalize_recurrence(%{} = m) do
    freq = m["frequency"] || m[:frequency]

    cond do
      freq in ["weekly", :weekly] ->
        dow = m["day_of_week"] || m[:day_of_week] || 2
        %{"frequency" => "weekly", "day_of_week" => dow}

      true ->
        stringify(m)
    end
  end

  defp normalize_recurrence(_), do: nil

  defp parse_dt(iso) when is_binary(iso) do
    case DateTime.from_iso8601(iso) do
      {:ok, dt, _} -> {:ok, DateTime.truncate(dt, :microsecond)}
      _ ->
        case Date.from_iso8601(iso) do
          {:ok, d} ->
            {:ok, DateTime.new!(d, ~T[09:00:00], "Etc/UTC") |> DateTime.truncate(:microsecond)}

          _ ->
            {:error, :invalid_remind_at}
        end
    end
  end

  defp blank_to_nil(nil), do: nil

  defp blank_to_nil(s) when is_binary(s) do
    case String.trim(s) do
      "" -> nil
      t -> t
    end
  end

  defp blank_to_nil(other), do: other

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
