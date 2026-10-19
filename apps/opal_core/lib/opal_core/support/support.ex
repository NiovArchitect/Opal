defmodule OpalCore.Support do
  @moduledoc """
  The support intake (audit spec 4.A5). Submissions land here and are
  retrievable by the reference the submitter is shown. Owner-scoped:
  a reference only ever resolves for the account that submitted it.

  Repair #18 hardening - idempotent intake (the W4-01 pattern from
  `OpalCore.Messages`): a submit may carry a client
  `idempotency_key`. The server dedupes on (reporter, key) BEFORE
  insert and returns the EXISTING report on a repeat, with the
  (user_id, idempotency_key) unique index as the backstop for a
  concurrent race - a client retry or double-submit files ONE
  report. Keyless submits keep the historical semantics exactly:
  one report per submit, never silently merged.
  """

  import Ecto.Query

  alias OpalCore.Repo
  alias OpalCore.Support.SupportReport

  @max_attempts 5

  @doc """
  Records one submission. `attrs` keys: :kind, :category, :body and
  optionally :build_ref (the served build identity, spec 4.A9) and
  :idempotency_key (the client's retry key - a repeat submit under
  the same (reporter, key) returns the original report unchanged).
  Returns {:ok, report} with a human-quotable reference, or
  {:error, changeset}.
  """
  def submit(user_id, attrs) when is_binary(user_id) and is_map(attrs) do
    case idempotency_key(attrs) do
      nil ->
        attempt(user_id, attrs, nil, @max_attempts)

      key ->
        # Dedupe BEFORE insert (W4-01): a retry under a key this
        # reporter already filed returns that report, not a copy.
        # The lookup is reporter-scoped, so one account's key can
        # never resolve to another account's report.
        case Repo.get_by(SupportReport, user_id: user_id, idempotency_key: key) do
          %SupportReport{} = existing -> {:ok, existing}
          nil -> attempt(user_id, attrs, key, @max_attempts)
        end
    end
  end

  defp attempt(user_id, attrs, key, attempts_left) do
    changeset =
      SupportReport.changeset(%SupportReport{}, %{
        reference: new_reference(),
        user_id: user_id,
        kind: attrs[:kind] || attrs["kind"],
        category: attrs[:category] || attrs["category"],
        body: normalize_body(attrs[:body] || attrs["body"]),
        build_ref: attrs[:build_ref] || attrs["build_ref"],
        entry_point: attrs[:entry_point] || attrs["entry_point"] || "you_help",
        idempotency_key: key
      })

    case Repo.insert(changeset) do
      {:ok, report} ->
        {:ok, report}

      {:error, changeset} ->
        cond do
          # The unique backstop fired: a concurrent submit under the
          # same (reporter, key) won the race. Its row IS this
          # submit's report - return it, never a duplicate.
          not is_nil(key) and idempotency_conflict?(changeset) ->
            case Repo.get_by(SupportReport, user_id: user_id, idempotency_key: key) do
              %SupportReport{} = existing -> {:ok, existing}
              nil -> {:error, changeset}
            end

          attempts_left > 1 and reference_conflict?(changeset) ->
            attempt(user_id, attrs, key, attempts_left - 1)

          true ->
            {:error, changeset}
        end
    end
  end

  @doc "Read-back by reference, owner-scoped (spec 4.A5 read-back)."
  def fetch_for_user(user_id, reference)
      when is_binary(user_id) and is_binary(reference) do
    case Repo.get_by(SupportReport, reference: reference, user_id: user_id) do
      %SupportReport{} = report -> {:ok, report}
      nil -> {:error, :not_found}
    end
  end

  @doc "The account's own submissions, newest first."
  def list_for_user(user_id) when is_binary(user_id) do
    SupportReport
    |> where([r], r.user_id == ^user_id)
    |> order_by([r], desc: r.inserted_at)
    |> limit(50)
    |> Repo.all()
  end

  defp new_reference do
    suffix =
      :crypto.strong_rand_bytes(5)
      |> Base.encode32(padding: false)

    "OPAL-" <> suffix
  end

  defp normalize_body(body) when is_binary(body), do: String.trim(body)
  defp normalize_body(_), do: nil

  # A blank or absent key is NO key: the submit is keyless and keeps
  # one-report-per-submit semantics.
  defp idempotency_key(attrs) do
    case attrs[:idempotency_key] || attrs["idempotency_key"] do
      key when is_binary(key) ->
        case String.trim(key) do
          "" -> nil
          trimmed -> trimmed
        end

      _ ->
        nil
    end
  end

  defp reference_conflict?(changeset) do
    Enum.any?(changeset.errors, fn
      {:reference, _} -> true
      _ -> false
    end)
  end

  defp idempotency_conflict?(changeset) do
    Enum.any?(changeset.errors, fn
      {_field, {_message, opts}} ->
        opts[:constraint] == :unique and
          to_string(opts[:constraint_name] || "") ==
            "support_reports_user_id_idempotency_key_index"

      _ ->
        false
    end)
  end
end
