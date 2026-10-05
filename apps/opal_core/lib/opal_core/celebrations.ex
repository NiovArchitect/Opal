defmodule OpalCore.Celebrations do
  @moduledoc """
  Phase 10A — birthday / anniversary storage and upcoming ordering.

  Owner-only. Year optional. Never invent dates.
  """

  import Ecto.Query

  alias OpalCore.Celebrations.Celebration
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.Clock

  @doc "List owner's celebrations ordered by next upcoming occurrence."
  def list_for_user(user_id) when is_binary(user_id) do
    today = today()

    celebrations =
      from(c in Celebration,
        where: c.user_id == ^user_id,
        order_by: [asc: c.month, asc: c.day, asc: c.person_name]
      )
      |> Repo.all()
      |> Enum.sort_by(fn c ->
        next = next_occurrence(today, c.month, c.day)
        {Date.to_erl(next), c.person_name}
      end)

    {:ok, celebrations}
  end

  def list_for_user(_), do: {:error, :invalid}

  @doc "Create a celebration for the owner."
  def create(user_id, attrs) when is_binary(user_id) and is_map(attrs) do
    params =
      attrs
      |> stringify_keys()
      |> Map.put("user_id", user_id)
      |> Map.put_new("reminders_sent", %{})

    %Celebration{}
    |> Celebration.changeset(params)
    |> Repo.insert()
  end

  def create(_, _), do: {:error, :invalid}

  @doc "Delete by id — owner only. Foreign → :not_found."
  def delete(user_id, id) when is_binary(user_id) and is_binary(id) do
    case Repo.get(Celebration, id) do
      %Celebration{user_id: ^user_id} = c ->
        Repo.delete(c)

      %Celebration{} ->
        {:error, :not_found}

      nil ->
        {:error, :not_found}
    end
  end

  def delete(_, _), do: {:error, :not_found}

  def get_for_user(user_id, id) when is_binary(user_id) and is_binary(id) do
    case Repo.get(Celebration, id) do
      %Celebration{user_id: ^user_id} = c -> {:ok, c}
      %Celebration{} -> {:error, :not_found}
      nil -> {:error, :not_found}
    end
  end

  def get_for_user(_, _), do: {:error, :not_found}

  def to_contract(%Celebration{} = c), do: Celebration.to_contract(c)

  # --- date math (year-boundary safe) ---

  @doc """
  Next calendar occurrence of month/day on or after today.

  December celebration checked in January → same calendar year (≈11 months out).
  Past date this year → rolls to next year.
  """
  def next_occurrence(%Date{} = today, month, day)
      when is_integer(month) and is_integer(day) do
    case date_in_year(today.year, month, day) do
      {:ok, d} ->
        if Date.compare(d, today) == :lt do
          {:ok, next} = date_in_year(today.year + 1, month, day)
          next
        else
          d
        end

      {:error, _} ->
        # Invalid combo should not reach here (validated on write). Fallback: clamp day.
        {:ok, d} = Date.new(today.year, month, min(day, 28))
        if Date.compare(d, today) == :lt, do: Date.new!(today.year + 1, month, min(day, 28)), else: d
    end
  end

  @doc "Days until next occurrence (0 = today)."
  def days_until(%Date{} = today, month, day) do
    Date.diff(next_occurrence(today, month, day), today)
  end

  def days_until(%Celebration{} = c, %Date{} = today) do
    days_until(today, c.month, c.day)
  end

  @doc "Occurrence year for the next upcoming date from today."
  def occurrence_year(%Date{} = today, month, day) do
    next_occurrence(today, month, day).year
  end

  def occurrence_year(%Celebration{} = c, %Date{} = today) do
    occurrence_year(today, c.month, c.day)
  end

  @doc "Whether milestone already reminded for occurrence year."
  def already_reminded?(%Celebration{} = c, occurrence_year, milestone)
      when is_integer(occurrence_year) and milestone in [14, 7, 1] do
    key = Integer.to_string(occurrence_year)
    sent = Map.get(c.reminders_sent || %{}, key, [])

    cond do
      is_list(sent) -> milestone in sent or Integer.to_string(milestone) in Enum.map(sent, &to_string/1)
      true -> false
    end
  end

  @doc "Record that a milestone was sent for an occurrence year."
  def mark_reminded(%Celebration{} = c, occurrence_year, milestone)
      when is_integer(occurrence_year) and milestone in [14, 7, 1] do
    key = Integer.to_string(occurrence_year)
    existing = Map.get(c.reminders_sent || %{}, key, [])

    existing_list =
      cond do
        is_list(existing) -> Enum.map(existing, &normalize_milestone/1)
        true -> []
      end

    next_list =
      (existing_list ++ [milestone])
      |> Enum.uniq()
      |> Enum.sort(:desc)

    reminders = Map.put(c.reminders_sent || %{}, key, next_list)

    c
    |> Celebration.reminders_changeset(reminders)
    |> Repo.update()
  end

  def all_celebrations do
    Repo.all(from(c in Celebration))
  end

  defp date_in_year(year, month, day) do
    case Date.new(year, month, day) do
      {:ok, _} = ok ->
        ok

      {:error, _} when month == 2 and day == 29 ->
        # Non-leap: observe on Feb 28 (never invent a fake Mar 1 celebration).
        Date.new(year, 2, 28)

      error ->
        error
    end
  end

  defp today do
    case Clock.utc_now() do
      %DateTime{} = dt -> DateTime.to_date(dt)
      _ -> Date.utc_today()
    end
  end

  defp normalize_milestone(m) when is_integer(m), do: m

  defp normalize_milestone(m) when is_binary(m) do
    case Integer.parse(m) do
      {n, _} -> n
      :error -> nil
    end
  end

  defp normalize_milestone(_), do: nil

  defp stringify_keys(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
