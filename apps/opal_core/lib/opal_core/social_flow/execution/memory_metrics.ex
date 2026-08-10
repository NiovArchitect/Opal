defmodule OpalCore.SocialFlow.Execution.MemoryMetrics do
  @moduledoc """
  Healthy learning targets:

  - questions eliminated by trusted memory → should rise
  - memory corrections / contradictions → should stay low

  Remember more only when doing so reliably lets Opal ask less.
  """

  use Agent

  def start_link(_ \\ []) do
    Agent.start_link(fn -> empty() end, name: __MODULE__)
  end

  def ensure_started do
    case Process.whereis(__MODULE__) do
      nil ->
        case start_link([]) do
          {:ok, _} -> :ok
          {:error, {:already_started, _}} -> :ok
          _ -> :ok
        end

      pid ->
        if Process.alive?(pid), do: :ok, else: start_link([]) && :ok
    end
  end

  def reset do
    ensure_started()

    try do
      Agent.update(__MODULE__, fn _ -> empty() end)
    catch
      :exit, _ -> ensure_started()
    end

    :ok
  end

  def record_admission(admitted?) do
    bump(if(admitted?, do: "admitted", else: "rejected"))
  end

  def record_questions_eliminated(n) when is_integer(n) and n > 0 do
    ensure_started()
    Agent.update(__MODULE__, fn m -> Map.update(m, "questions_eliminated", n, &(&1 + n)) end)
  end

  def record_questions_eliminated(_), do: :ok

  def record_correction do
    bump("corrections")
  end

  def record_contradiction do
    bump("contradictions")
  end

  def record_plan(plan_index, questions_asked) when is_integer(plan_index) do
    ensure_started()

    Agent.update(__MODULE__, fn m ->
      plans = Map.get(m, "plans", %{})
      plans = Map.put(plans, plan_index, %{"questions_asked" => questions_asked})
      Map.put(m, "plans", plans)
    end)
  end

  def snapshot do
    ensure_started()
    Agent.get(__MODULE__, & &1)
  end

  @doc "Plan1 questions vs Plan5 — learning is working if questions drop."
  def learning_progress do
    s = snapshot()
    plans = s["plans"] || %{}
    p1 = get_in(plans, [1, "questions_asked"]) || get_in(plans, ["1", "questions_asked"])
    p5 = get_in(plans, [5, "questions_asked"]) || get_in(plans, ["5", "questions_asked"])

    %{
      "plan_1_questions" => p1,
      "plan_5_questions" => p5,
      "questions_eliminated_total" => s["questions_eliminated"] || 0,
      "corrections" => s["corrections"] || 0,
      "contradictions" => s["contradictions"] || 0,
      "improved" => is_number(p1) and is_number(p5) and p5 < p1,
      "healthy" =>
        (s["corrections"] || 0) + (s["contradictions"] || 0) <=
          max(div(s["questions_eliminated"] || 0, 2), 1),
      "target" => "remember_more_only_when_ask_less"
    }
  end

  defp bump(key) do
    ensure_started()
    Agent.update(__MODULE__, fn m -> Map.update(m, key, 1, &(&1 + 1)) end)
    :ok
  catch
    :exit, _ -> :ok
  end

  defp empty do
    %{
      "admitted" => 0,
      "rejected" => 0,
      "questions_eliminated" => 0,
      "corrections" => 0,
      "contradictions" => 0,
      "plans" => %{}
    }
  end
end
