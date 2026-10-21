defmodule OpalCoreWeb.TriviaController do
  @moduledoc """
  Repair #21 (W-9 expanded) - Opal Trivia HTTP API.

  GET  /api/v1/product/trivia/guesses
  POST /api/v1/product/trivia/guesses
  POST /api/v1/product/trivia/guesses/:id/validate

  Every leg is session-scoped: the guesser is the session user,
  the validator is the session user acting as subject. Identity
  never arrives as a param.
  """

  use OpalCoreWeb, :controller

  alias OpalCore.Trivia
  alias OpalCore.Trivia.Guess

  def index(conn, _params) do
    user_id = conn.assigns.current_user_id

    case Trivia.list_for_user(user_id) do
      {:ok, %{about_me: about_me, mine: mine, score: score}} ->
        json(conn, %{
          "about_me" => Enum.map(about_me, &Guess.to_contract/1),
          "mine" => Enum.map(mine, &Guess.to_contract/1),
          "score" => score
        })

      {:error, _} ->
        conn |> put_status(422) |> json(%{"error_code" => "invalid"})
    end
  end

  def create_guess(conn, params) do
    user_id = conn.assigns.current_user_id
    subject_user_id = params["subject_user_id"]

    case Trivia.record_guess(user_id, subject_user_id, params) do
      {:ok, guess} ->
        conn
        |> put_status(201)
        |> json(%{"guess" => Guess.to_contract(guess)})

      {:error, :not_in_circle} ->
        conn
        |> put_status(403)
        |> json(%{
          "error_code" => "not_in_circle",
          "message" => "Trivia questions only travel inside your circle."
        })

      {:error, :minor_gate} ->
        conn
        |> put_status(403)
        |> json(%{
          "error_code" => "minor_gate",
          "message" => "Questions about a minor stay inside family."
        })

      {:error, :self_guess} ->
        conn
        |> put_status(422)
        |> json(%{
          "error_code" => "self_guess",
          "message" => "You cannot guess about yourself."
        })

      {:error, %Ecto.Changeset{} = cs} ->
        conn
        |> put_status(422)
        |> json(%{
          "error_code" => "invalid",
          "errors" =>
            Ecto.Changeset.traverse_errors(cs, fn {msg, opts} ->
              Regex.replace(~r"%{(\w+)}", msg, fn _, key ->
                opts |> Keyword.get(String.to_existing_atom(key), key) |> to_string()
              end)
            end)
        })

      {:error, _} ->
        conn |> put_status(422) |> json(%{"error_code" => "invalid"})
    end
  end

  def validate(conn, %{"id" => id} = params) do
    user_id = conn.assigns.current_user_id

    case Trivia.validate_guess(user_id, id, params["verdict"]) do
      {:ok, guess, capsule_written} ->
        contract =
          guess
          |> Guess.to_contract()
          |> Map.put("capsule_written", capsule_written)

        json(conn, %{"guess" => contract})

      {:error, :not_found} ->
        conn |> put_status(404) |> json(%{"error_code" => "not_found"})

      {:error, :already_validated} ->
        conn
        |> put_status(422)
        |> json(%{
          "error_code" => "already_validated",
          "message" => "That guess was already answered."
        })

      {:error, _} ->
        conn |> put_status(422) |> json(%{"error_code" => "invalid"})
    end
  end
end
