defmodule OpalCoreWeb.MemoryController do
  @moduledoc """
  Phase 7A — memory transparency HTTP API ("What Opal remembers").

  GET    /api/v1/product/memory/facts
  DELETE /api/v1/product/memory/facts/:id

  Repair #26 (B-17) — the list also serves the extraction fold's
  output. The fold writes `PersonMemory.known_facts`
  (allergy/birthday/morning facts), while
  `DurablePreferenceMemory`'s write law forbids auto-learning from
  episode statements (explicit durable place preferences only, no
  duplicate active rows) and its read filters place purposes — so
  the fold must NOT write there. The alignment is on the READ path:
  `index_facts` appends projections of the requesting account's
  `PersonMemory.known_facts` into the same transparency contract
  (ids namespaced `pm:<row_id>:<key>`, `source: "person_memory"`),
  and `delete_fact` removes those keys under the same step-up
  elevation gate as the durable path.
  """

  use OpalCoreWeb, :controller

  import Ecto.Query

  alias OpalCore.Auth.StepUpElevation
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.DurablePreferenceMemory
  alias OpalCore.SocialMemory.PersonMemory

  def index_facts(conn, _params) do
    user_id = conn.assigns.current_user_id

    durable_facts =
      [user_id]
      |> DurablePreferenceMemory.list_for_owners()
      |> Enum.map(&DurablePreferenceMemory.to_transparency_fact/1)
      |> Enum.reject(&is_nil/1)

    json(conn, %{"facts" => durable_facts ++ person_memory_facts(user_id)})
  end

  def delete_fact(conn, %{"id" => id}) do
    user_id = conn.assigns.current_user_id

    # Repair #24 (WS-5): forgetting a memory fact is a manual memory
    # mutation - it requires a live step-up elevation for this
    # account + session, exactly like the capsule mutations.
    with {:ok, elevation} <- require_elevation(conn) do
      if String.starts_with?(id, "pm:") do
        delete_person_memory_fact(conn, elevation, id, user_id)
      else
        case DurablePreferenceMemory.forget_with_candidates(id, user_id) do
          {:ok, memory, cleanup} ->
            _ = StepUpElevation.record_mutation_audit(elevation, "fact_forgotten", id)

            json(conn, %{
              "fact" => DurablePreferenceMemory.to_transparency_fact(memory),
              "forgotten" => true,
              "candidates_removed" => cleanup["candidates_removed"],
              "candidate_cleanup" => cleanup["candidate_cleanup"]
            })

          {:error, :not_found} ->
            not_found(conn)

          {:error, :forbidden} ->
            # Foreign facts — no leak.
            not_found(conn)

          {:error, reason} ->
            conn
            |> put_status(422)
            |> json(%{"error_code" => "could_not_forget", "message" => inspect(reason)})
        end
      end
    else
      {:error, :step_up_required} ->
        conn
        |> put_status(403)
        |> json(%{
          "error_code" => "step_up_required",
          "message" =>
            "Confirm it is you first: Opal will send a fresh code to the phone number on your account. Your account has no password, so the phone code is the check.",
          "credential" => "phone_code",
          "password_credential_exists" => false
        })
    end
  end

  # Repair #26 (B-17) — projections of the extraction fold's
  # PersonMemory.known_facts for exactly this account. Each stored
  # fact becomes one transparency fact; entries whose stored shape
  # carries no string value cannot be projected honestly and are
  # skipped.
  defp person_memory_facts(user_id) do
    rows =
      Repo.all(
        from(p in PersonMemory,
          where: p.account_id == ^user_id,
          order_by: [asc: p.inserted_at, asc: p.id]
        )
      )

    Enum.flat_map(rows, fn row ->
      (row.known_facts || %{})
      |> Enum.sort_by(fn {key, _fact} -> key end)
      |> Enum.map(fn {key, fact} -> person_memory_fact(row, key, fact) end)
      |> Enum.reject(&is_nil/1)
    end)
  end

  defp person_memory_fact(%PersonMemory{} = row, key, fact) do
    case fact_value(fact) do
      value when is_binary(value) ->
        %{
          "id" => "pm:#{row.id}:#{key}",
          "label" => truncate_label(value),
          "value" => value,
          "mapped" => false,
          "source" => "person_memory",
          "person_id" => row.person_id
        }

      _ ->
        nil
    end
  end

  defp fact_value(%{} = fact), do: fact["value"]
  defp fact_value(value) when is_binary(value), do: value
  defp fact_value(_), do: nil

  # The label is the fact value itself, honestly truncated — no
  # invented plain-language mapping for fold facts.
  defp truncate_label(value) do
    if String.length(value) > 80 do
      String.slice(value, 0, 77) <> "..."
    else
      value
    end
  end

  # Repair #26 (B-17) — forget one fold fact: `pm:<row_id>:<key>`.
  # Owner-checked (a foreign or missing row, a malformed id, and a
  # missing key all read as :not_found — no leak), the key is
  # removed from known_facts, and the mutation is audited under the
  # same step-up elevation as the durable path.
  defp delete_person_memory_fact(conn, elevation, id, user_id) do
    with ["pm", row_id, key] <- String.split(id, ":", parts: 3),
         true <- key != "",
         {:ok, row_uuid} <- Ecto.UUID.cast(row_id),
         %PersonMemory{account_id: ^user_id} = row <- Repo.get(PersonMemory, row_uuid),
         facts = row.known_facts || %{},
         true <- Map.has_key?(facts, key) do
      projection = person_memory_fact(row, key, Map.fetch!(facts, key))

      case row
           |> PersonMemory.changeset(%{known_facts: Map.delete(facts, key)})
           |> Repo.update() do
        {:ok, _updated} ->
          _ = StepUpElevation.record_mutation_audit(elevation, "fact_forgotten", id)
          json(conn, %{"fact" => projection, "forgotten" => true})

        {:error, reason} ->
          conn
          |> put_status(422)
          |> json(%{"error_code" => "could_not_forget", "message" => inspect(reason)})
      end
    else
      _ -> not_found(conn)
    end
  end

  defp require_elevation(conn) do
    token =
      Plug.Conn.get_req_header(conn, "x-opal-step-up-elevation") |> List.first() ||
        conn.params["step_up_token"]

    StepUpElevation.authorize(
      conn.assigns.current_user_id,
      conn.assigns.current_session.id,
      token
    )
  end

  defp not_found(conn) do
    conn |> put_status(404) |> json(%{"error_code" => "not_found"})
  end
end
