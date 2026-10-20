defmodule OpalCoreWeb.PeopleController do
  @moduledoc """
  Repair #20 (F-6 / F-8) — the one people projection over HTTP.

  GET /api/v1/product/people/projection

  One row per underlying person identity (see `OpalCore.People` for
  the identity-resolution law), ordered most-talked-to first from
  the viewer's real conversation record. Search, the chat picker,
  and the create-plan Who field all read people from this shape —
  a person can never appear twice because two sources named them.
  """

  use OpalCoreWeb, :controller

  alias OpalCore.People

  def index(conn, _params) do
    user_id = conn.assigns.current_user_id
    people = People.for_viewer(user_id)

    json(conn, %{
      "people" => Enum.map(people, &People.to_contract/1),
      "count" => length(people)
    })
  end
end
