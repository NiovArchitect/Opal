defmodule OpalCore.SocialFlow.Ambient.RoleDependency do
  @moduledoc """
  Required ROLE may block plan even when numerical majority is in.

  Roles: host, driver, birthday, ticket_holder, payer (when policy says so).
  Not bureaucracy — only material viability dependencies.
  """

  @material_roles ~w(host driver birthday ticket_holder payer)

  def material_roles, do: @material_roles

  @doc """
  participants: list of %{user_id, response, roles: [...]}
  required_roles: list of role strings that must have an in participant
  """
  def evaluate(participants, required_roles \\ [])

  def evaluate(participants, required_roles) when is_list(participants) do
    people = Enum.map(participants, &normalize/1)
    needed = Enum.map(List.wrap(required_roles), &to_string/1) |> Enum.uniq()

    missing =
      Enum.filter(needed, fn role ->
        not Enum.any?(people, fn p ->
          role in p["roles"] and p["in?"]
        end)
      end)

    {:ok,
     %{
       "required_roles" => needed,
       "missing_roles" => missing,
       "roles_ok" => missing == [],
       "majority_cannot_override_role" => true,
       "viable" => missing == [],
       "authorizes_set" => false
     }}
  end

  def evaluate(_, _), do: {:ok, %{"roles_ok" => true, "missing_roles" => [], "viable" => true}}

  defp normalize(p) when is_map(p) do
    a =
      Map.new(p, fn
        {k, v} when is_atom(k) -> {Atom.to_string(k), v}
        {k, v} -> {to_string(k), v}
      end)

    roles =
      List.wrap(a["roles"] || a["role_list"] || [])
      |> Enum.map(&to_string/1)
      |> then(fn rs ->
        if a["role"] && a["role"] not in ~w(required optional),
          do: [to_string(a["role"]) | rs],
          else: rs
      end)
      |> Enum.uniq()

    resp = to_string(a["response"] || a["status"] || "undecided")
    in? = resp in ~w(im_in in yes affirmative confirmed)

    %{
      "user_id" => a["user_id"] || a["id"],
      "roles" => roles,
      "in?" => in?,
      "response" => resp
    }
  end
end
