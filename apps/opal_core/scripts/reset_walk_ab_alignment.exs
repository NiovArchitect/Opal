# Development-only reset for the Walk A / Walk B physical thread.
# Refuses to run outside Mix env :dev. Logout never does this.
#
# Clear the derived plan, keep the messages:
#   cd apps/opal_core && mix run scripts/reset_walk_ab_alignment.exs
#
# Clear messages, chronology, and the plan for a fresh walk:
#   cd apps/opal_core && WALK_RESET=full mix run scripts/reset_walk_ab_alignment.exs

if Mix.env() != :dev do
  IO.puts("REFUSED: this reset is development-only. Logout does not erase plans.")
  System.halt(1)
end

alias OpalCore.Repo
alias OpalCore.SocialFlow.SharedPlan

conversation_id = "ace99adc-db67-4258-9d95-f612246c6c84"

full? = System.get_env("WALK_RESET") == "full"
uuid = Ecto.UUID.dump!(conversation_id)

if full? do
  Repo.transaction(fn ->
    {:ok, %{num_rows: moments}} =
      Repo.query("DELETE FROM opal_chronology_moments WHERE conversation_id = $1", [uuid])

    {:ok, %{num_rows: messages}} =
      Repo.query("DELETE FROM messages WHERE conversation_id = $1", [uuid])

    IO.puts("CLEARED_MESSAGES=#{messages} CLEARED_CHRONOLOGY=#{moments}")
  end)
end

case Repo.get_by(SharedPlan, conversation_id: conversation_id) do
  nil ->
    IO.puts("NO_PLAN")

  %SharedPlan{} = plan ->
    alignment =
      if full? do
        %{"lineage_id" => plan.id, "plan_version" => 0, "plan_timezone" => "America/Los_Angeles"}
      else
        time = get_in(plan.alignment || %{}, ["exact_time", "value"]) || "6:00 PM"

        %{
          "lineage_id" => plan.id,
          "plan_version" => 0,
          "plan_timezone" => "America/Los_Angeles",
          "explicit_actions" => [
            %{
              "kind" => "exact_time_lock",
              "actor_user_id" => plan.created_by_user_id,
              "value" => time,
              "truth" => "locked",
              "explicit" => true,
              "schema_version" => 1,
              "at" => DateTime.utc_now() |> DateTime.truncate(:microsecond) |> DateTime.to_iso8601()
            }
          ]
        }
      end

    {:ok, _} =
      plan
      |> SharedPlan.changeset(%{
        alignment: alignment,
        status: if(full?, do: "tentative", else: "agreed"),
        time_label: if(full?, do: nil, else: plan.time_label)
      })
      |> Repo.update()

    IO.puts("RESET_ALIGNMENT conversation=#{conversation_id} full=#{full?}")
end
