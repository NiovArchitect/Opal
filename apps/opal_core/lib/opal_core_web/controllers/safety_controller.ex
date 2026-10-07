defmodule OpalCoreWeb.SafetyController do
  use OpalCoreWeb, :controller

  alias OpalCore.SocialFlow.TrustSafety
  alias OpalCore.Observability.StructuredLogger

  @doc "Phase 3.3 — submit a user report into the review queue."
  def create_report(conn, params) do
    reporter = conn.assigns.current_user_id
    reported = params["reported_user_id"] || params["user_id"]
    category = params["category"] || "other"

    attrs = %{
      reporter_user_id: reporter,
      reported_user_id: reported,
      category: category,
      note: params["note"],
      source_message_ids: params["source_message_ids"] || [],
      idempotency_key: params["idempotency_key"]
    }

    case TrustSafety.create_report(attrs) do
      {:ok, %OpalCore.SocialFlow.SafetyReport{} = report, origin} ->
        respond_report(conn, report, origin, category)

      {:ok, %{report: report}, origin} ->
        respond_report(conn, report, origin, category)

      {:error, :rate_limited} ->
        conn
        |> put_resp_header("retry-after", "300")
        |> put_status(429)
        |> json(%{
          "error_code" => "rate_limited",
          "message" => "Too many reports. Try again later.",
          "retry_after" => 300
        })

      {:error, reason} ->
        conn
        |> put_status(422)
        |> json(%{"error_code" => "report_failed", "message" => inspect(reason)})
    end
  end

  defp respond_report(conn, report, origin, category) do
    StructuredLogger.log("safety.report.created", %{
      "report_id" => report.id,
      "origin" => to_string(origin),
      "category" => category
    })

    conn
    |> put_status(if(origin == :idempotent, do: 200, else: 201))
    |> json(%{
      "report" => OpalCore.SocialFlow.SafetyReport.to_reporter_contract(report),
      "origin" => to_string(origin)
    })
  end
end
