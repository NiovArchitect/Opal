defmodule OpalCore.Memory do
  @moduledoc """
  Phase OC-4 — thin Opal Center memory facade.

  Persists explicit facts from `:remember` and recalls them for `:recall`.
  Backed by `personal_relationship_memories`. Never invents facts.
  """

  import Ecto.Query

  alias OpalCore.Repo
  alias OpalCore.SocialFlow.RelationshipMemory

  @opal_purpose "opal_center|personal|prefer"

  @doc """
  Store an explicit fact for `user_id`.

  Options: `source:` (default `"opal_center"`).
  Returns `{:ok, memory}` | `{:error, reason}`.
  """
  def store(user_id, fact, opts \\ [])

  def store(user_id, fact, opts) when is_binary(user_id) and is_binary(fact) do
    trimmed = String.trim(fact)
    source = Keyword.get(opts, :source, "opal_center") |> to_string()

    if trimmed == "" do
      {:error, :empty_fact}
    else
      case find_active_fact(user_id, trimmed) do
        %RelationshipMemory{} = existing ->
          {:ok, existing}

        nil ->
          review =
            DateTime.utc_now()
            |> DateTime.add(90 * 24 * 3600, :second)
            |> DateTime.truncate(:microsecond)

          %RelationshipMemory{}
          |> RelationshipMemory.changeset(%{
            owner_user_id: user_id,
            summary: trimmed,
            purpose: purpose_for(source),
            visibility: "private",
            review_at: review,
            deletion_state: "active"
          })
          |> Repo.insert()
      end
    end
  end

  def store(_, _, _), do: {:error, :invalid}

  @doc """
  Recall up to 3 active memories matching `topic` (case-insensitive substring).

  Returns a list of `%{summary: string, id: id}` — empty when nothing matches.
  """
  def recall(user_id, topic) when is_binary(user_id) and is_binary(topic) do
    needle = topic |> String.trim() |> String.downcase()

    if needle == "" do
      []
    else
      from(m in RelationshipMemory,
        where:
          m.owner_user_id == ^user_id and m.deletion_state == "active" and
            m.visibility == "private",
        order_by: [desc: m.inserted_at],
        limit: 20
      )
      |> Repo.all()
      |> Enum.filter(fn m ->
        summary = String.downcase(m.summary || "")
        String.contains?(summary, needle) or opal_center_purpose?(m.purpose)
      end)
      |> Enum.filter(fn m ->
        summary = String.downcase(m.summary || "")
        String.contains?(summary, needle)
      end)
      |> Enum.take(3)
      |> Enum.map(fn m -> %{id: m.id, summary: m.summary} end)
    end
  end

  def recall(_, _), do: []

  defp purpose_for(source) when is_binary(source) do
    if source == "opal_center", do: @opal_purpose, else: "opal_center|#{source}|prefer"
  end

  defp purpose_for(_), do: @opal_purpose

  defp opal_center_purpose?(purpose) when is_binary(purpose),
    do: String.starts_with?(purpose, "opal_center")

  defp opal_center_purpose?(_), do: false

  defp find_active_fact(user_id, fact) do
    norm = String.downcase(String.trim(fact))

    from(m in RelationshipMemory,
      where: m.owner_user_id == ^user_id and m.deletion_state == "active",
      order_by: [desc: m.inserted_at]
    )
    |> Repo.all()
    |> Enum.find(fn m ->
      opal_center_purpose?(m.purpose) and String.downcase(m.summary || "") == norm
    end)
  end
end
