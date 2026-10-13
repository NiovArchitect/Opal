defmodule OpalCoreWeb.RelationshipAccessController do
  @moduledoc """
  Relationship Access Model product API.

  Person-agnostic: no hardcoded people. Pass 2 candidates remain inactive.
  """

  use OpalCoreWeb, :controller

  alias OpalCore.RelationshipAccess
  alias OpalCore.RelationshipAccess.{Grant, GraphingPolicy, Templates}

  def graphing_show(conn, _params) do
    user_id = conn.assigns.current_user_id

    case RelationshipAccess.get_or_create_graphing_policy(user_id) do
      {:ok, policy} -> json(conn, %{"graphing" => GraphingPolicy.to_contract(policy)})
      {:error, reason} -> unprocessable(conn, "graphing_unavailable", inspect(reason))
    end
  end

  def graphing_update(conn, params) do
    user_id = conn.assigns.current_user_id

    case RelationshipAccess.update_graphing_policy(user_id, params) do
      {:ok, policy} ->
        json(conn, %{"graphing" => GraphingPolicy.to_contract(policy)})

      {:error, %Ecto.Changeset{} = cs} ->
        unprocessable(conn, "invalid_graphing", inspect(cs.errors))

      {:error, reason} ->
        unprocessable(conn, "could_not_update_graphing", inspect(reason))
    end
  end

  def graphing_decide(conn, params) do
    user_id = conn.assigns.current_user_id
    channel = params["channel"] || "call"
    contact = params["contact_user_id"]

    case RelationshipAccess.graphing_decision(user_id, channel, contact) do
      {:ok, mode, meta} ->
        json(conn, %{
          "allowed" => true,
          "mode" => Atom.to_string(mode),
          "indicator" => meta[:indicator] || meta["indicator"],
          "other_party_disclosure_required" =>
            meta[:other_party_disclosure_required] || meta["other_party_disclosure_required"],
          "understanding_candidates_active" => false
        })

      {:error, reason} ->
        # Honest denial — never paint success
        json(conn, %{
          "allowed" => false,
          "reason" => Atom.to_string(reason),
          "understanding_candidates_active" => false
        })
    end
  end

  def grants_index(conn, params) do
    user_id = conn.assigns.current_user_id
    contact = params["contact_user_id"]

    opts =
      []
      |> then(fn o -> if is_binary(contact), do: Keyword.put(o, :contact_user_id, contact), else: o end)

    grants =
      user_id
      |> RelationshipAccess.list_grants(opts)
      |> Enum.map(&Grant.to_contract/1)

    json(conn, %{
      "grants" => grants,
      "templates" => Templates.template_keys(),
      "understanding_candidates_active" => false
    })
  end

  def grants_upsert(conn, params) do
    user_id = conn.assigns.current_user_id

    case RelationshipAccess.upsert_grant(user_id, params) do
      {:ok, grant} ->
        conn
        |> put_status(201)
        |> json(%{"grant" => Grant.to_contract(grant)})

      {:error, %Ecto.Changeset{} = cs} ->
        unprocessable(conn, "invalid_grant", inspect(cs.errors))

      {:error, reason} ->
        unprocessable(conn, "could_not_upsert_grant", inspect(reason))
    end
  end

  def grants_revoke(conn, %{"id" => id}) do
    user_id = conn.assigns.current_user_id

    case RelationshipAccess.revoke_grant(user_id, id) do
      {:ok, grant} ->
        json(conn, %{"grant" => Grant.to_contract(grant)})

      {:error, :not_found} ->
        not_found(conn)

      {:error, :forbidden} ->
        not_found(conn)

      {:error, reason} ->
        unprocessable(conn, "could_not_revoke", inspect(reason))
    end
  end

  def apply_template(conn, params) do
    user_id = conn.assigns.current_user_id
    contact = params["contact_user_id"]
    template = params["template_key"]
    allow_upgrade = params["allow_upgrade"] in [true, "true", "1"]

    cond do
      not is_binary(contact) or not is_binary(template) ->
        unprocessable(conn, "contact_and_template_required", "contact_user_id and template_key required")

      template not in Templates.template_keys() ->
        unprocessable(conn, "invalid_template", "Unknown template")

      true ->
        case RelationshipAccess.apply_template(user_id, contact, template, allow_upgrade: allow_upgrade) do
          {:ok, grants} ->
            json(conn, %{
              "grants" => Enum.map(grants, &Grant.to_contract/1),
              "auto_escalated" => false,
              "allow_upgrade" => allow_upgrade
            })

          {:error, reason} ->
            unprocessable(conn, "could_not_apply_template", inspect(reason))
        end
    end
  end

  def type_change_diff(conn, params) do
    user_id = conn.assigns.current_user_id
    contact = params["contact_user_id"]
    new_type = params["relationship_type"]

    cond do
      not is_binary(contact) or not is_binary(new_type) ->
        unprocessable(conn, "params_required", "contact_user_id and relationship_type required")

      true ->
        diff = RelationshipAccess.template_diff_on_type_change(user_id, contact, new_type)
        json(conn, diff)
    end
  end

  def authorize(conn, params) do
    user_id = conn.assigns.current_user_id
    category = params["data_category"]
    ceiling = params["action_ceiling"] || "suggest"
    contact = params["contact_user_id"]
    want_disclose = params["disclose"] in [true, "true", "1"]

    cond do
      not is_binary(category) ->
        unprocessable(conn, "data_category_required", "data_category required")

      true ->
        action = RelationshipAccess.authorize_action(user_id, category, ceiling, contact)

        use_ok =
          if is_binary(contact),
            do: RelationshipAccess.may_access?(user_id, contact, category, "use"),
            else: false

        disclose_ok =
          if is_binary(contact),
            do: RelationshipAccess.may_disclose?(user_id, contact, category),
            else: false

        allowed =
          case action do
            :ok -> if want_disclose, do: disclose_ok, else: true
            {:error, _} -> false
          end

        json(conn, %{
          "allowed" => allowed,
          "action" =>
            case action do
              :ok -> "ok"
              {:error, r} -> Atom.to_string(r)
            end,
          "may_use" => use_ok,
          "may_disclose" => disclose_ok,
          "effective_ceiling" => RelationshipAccess.action_ceiling(user_id, category, contact),
          "understanding_candidates_active" => false
        })
    end
  end

  defp unprocessable(conn, code, message) do
    conn
    |> put_status(422)
    |> json(%{"error_code" => code, "error" => message})
  end

  defp not_found(conn) do
    conn
    |> put_status(404)
    |> json(%{"error_code" => "not_found", "error" => "Not found"})
  end
end
