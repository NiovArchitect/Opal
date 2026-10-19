defmodule OpalCore.Accounts.AccountActivity do
  @moduledoc """
  The account activity trail writer/reader (adoption wave 2). Every
  recorded action writes its entry here at execution time; an action
  with no entry is a defect. Entries never carry secret values.
  """

  import Ecto.Query

  alias OpalCore.Accounts.ActivityEntry
  alias OpalCore.Repo

  def record(user_id, kind, subject \\ nil, detail \\ %{})

  def record(user_id, kind, subject, detail)
      when is_binary(user_id) and is_binary(kind) do
    %ActivityEntry{user_id: user_id}
    |> ActivityEntry.changeset(%{kind: kind, subject: subject, detail: detail || %{}})
    |> Repo.insert()
  end

  def record(_, _, _, _), do: {:error, :invalid}

  def list_for_user(user_id, limit \\ 50) when is_binary(user_id) do
    ActivityEntry
    |> where([e], e.user_id == ^user_id)
    |> order_by([e], desc: e.inserted_at)
    |> limit(^limit)
    |> Repo.all()
  end

  def list_for_user(_, _), do: []

  def count_for_user(user_id, kind) when is_binary(user_id) and is_binary(kind) do
    ActivityEntry
    |> where([e], e.user_id == ^user_id and e.kind == ^kind)
    |> Repo.aggregate(:count, :id)
  end

  def count_for_user(_, _), do: 0
end
