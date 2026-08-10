defmodule OpalCore.SocialFlow.Execution.HumanReportedOutcome do
  @moduledoc """
  Human-reported execution outcomes after external handoff.

  Natural answers like "Booked it" / "Couldn't get it" — not form heavy.

  Provenance stays honest:
  human_reports_confirmed ≠ provider_confirmed ≠ paid
  """

  @doc """
  Apply a minimal human report to execution evidence.
  """
  def apply(report, plan_ctx \\ %{})

  def apply(report, plan_ctx) when is_map(report) do
    r = stringify(report)
    p = stringify(plan_ctx)
    answer = normalize_answer(r["answer"] || r["report"] || r["text"])

    case answer do
      :yes_booked ->
        {:ok,
         %{
           "human_reports_booked" => true,
           "human_reports_confirmed" => true,
           "human_reports_failed" => false,
           "provider_confirmed" => false,
           "booked" => false,
           "paid" => false,
           "provenance" => "human_report",
           "forges_provider_payment" => false,
           "forges_other_user_auth" => false,
           "awaiting_handoff_return" => false,
           "plan_version" => p["plan_version"],
           "authorizes_set" => false,
           "quiet_after" => true
         }}

      :no_failed ->
        {:ok,
         %{
           "human_reports_booked" => false,
           "human_reports_failed" => true,
           "human_reports_confirmed" => false,
           "provider_confirmed" => false,
           "provenance" => "human_report",
           "awaiting_handoff_return" => false,
           "recovery_suggested" => true,
           "authorizes_set" => false
         }}

      :changed ->
        {:ok,
         %{
           "human_reports_changed" => true,
           "provenance" => "human_report",
           "awaiting_handoff_return" => false,
           "authorizes_set" => false
         }}

      :unclear ->
        {:ok,
         %{
           "kind" => "minimum_question",
           "copy" => "Did that work?",
           "answers" => ["Yes", "No"],
           "topic" => "did_handoff_work",
           "authorizes_set" => false
         }}
    end
  end

  def apply(_, _), do: {:error, :invalid}

  @doc "Parse natural language without harness strings only."
  def normalize_answer(text) when is_binary(text) do
    t = String.downcase(String.trim(text))

    cond do
      t in ~w(yes y yeah yep booked booked_it) ->
        :yes_booked

      String.contains?(t, "booked") or String.contains?(t, "got it") or
          String.contains?(t, "we're set") ->
        :yes_booked

      t in ~w(no n nope) or String.contains?(t, "couldn't") or
        String.contains?(t, "could not") or String.contains?(t, "didn't work") or
          String.contains?(t, "full") ->
        :no_failed

      String.contains?(t, "changed") or String.contains?(t, "different time") ->
        :changed

      true ->
        :unclear
    end
  end

  def normalize_answer(:yes), do: :yes_booked
  def normalize_answer(:no), do: :no_failed
  def normalize_answer(true), do: :yes_booked
  def normalize_answer(false), do: :no_failed
  def normalize_answer(_), do: :unclear

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
