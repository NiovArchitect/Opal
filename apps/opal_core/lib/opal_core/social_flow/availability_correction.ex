defmodule OpalCore.SocialFlow.AvailabilityCorrection do
  @moduledoc """
  User correction loop for availability facts.

  Examples:
  - "Actually Friday is better."
  - "Not Thursday anymore."
  - "I get off earlier this week."

  Authority rules:
  - Correction supersedes stale fact for the same owner/scope
  - Provenance is preserved on the new fact (prior_window_id / reason)
  - Journey does not restart; sufficiency is recomputed
  - Surfaces only the smallest new intervention
  - Never auto-shares; never authorizes Set
  """

  alias OpalCore.SocialFlow.Availability
  alias OpalCore.SocialFlow.AvailabilityWindow

  @type correction_attrs :: %{
          required(:owner_user_id) => String.t(),
          required(:start_at) => DateTime.t(),
          required(:end_at) => DateTime.t(),
          optional(:timezone) => String.t(),
          optional(:supersedes_window_id) => String.t(),
          optional(:conversation_id) => String.t(),
          optional(:reason) => String.t(),
          optional(:expires_at) => DateTime.t()
        }

  @doc """
  Apply a correction: create the new private window, soft-delete superseded
  windows (explicit id or overlapping same-owner active windows in scope),
  revoke shares of deleted windows, return recomputed intervention when a
  conversation_id is provided.
  """
  def apply(attrs) when is_map(attrs) do
    owner = Map.fetch!(attrs, :owner_user_id)
    conversation_id = Map.get(attrs, :conversation_id)
    supersedes = Map.get(attrs, :supersedes_window_id)

    with {:ok, new_window} <- create_corrected_window(attrs),
         {:ok, revoked} <- supersede_prior(owner, new_window, supersedes) do
      intervention =
        if is_binary(conversation_id) do
          case Availability.resolve_intervention(conversation_id, owner) do
            {:ok, i} -> i
            _ -> nil
          end
        else
          nil
        end

      {:ok,
       %{
         "schema_version" => "0.1.0",
         "window" => AvailabilityWindow.to_owner_contract(new_window),
         "superseded_window_ids" => revoked,
         "intervention" => intervention,
         "authorizes_set" => false,
         "auto_shared" => false,
         "provenance" => %{
           "source" => "manual",
           "reason" => Map.get(attrs, :reason) || "user_correction",
           "prior_window_id" => supersedes
         }
       }}
    end
  end

  def apply(_), do: {:error, :invalid_correction}

  @doc """
  Pure classifier for correction-shaped natural language (bounded, not NLP authority).

  Returns a coarse intent for later proposal/admission — never writes state.
  """
  def classify_text(text) when is_binary(text) do
    t = text |> String.downcase() |> String.trim()

    cond do
      t == "" ->
        :none

      String.contains?(t, "not ") and
          (String.contains?(t, "anymore") or String.contains?(t, "not thursday") or
             String.contains?(t, "not tonight")) ->
        :revoke_or_replace

      String.contains?(t, "actually") or String.contains?(t, "better") or
          String.contains?(t, "instead") ->
        :replace_preferred

      String.contains?(t, "earlier") or String.contains?(t, "later") or
          String.contains?(t, "get off") ->
        :adjust_window

      String.contains?(t, "still free") or String.contains?(t, "still good") ->
        :confirm_stale

      true ->
        :none
    end
  end

  def classify_text(_), do: :none

  defp create_corrected_window(attrs) do
    Availability.create_window(%{
      owner_user_id: Map.fetch!(attrs, :owner_user_id),
      start_at: Map.fetch!(attrs, :start_at),
      end_at: Map.fetch!(attrs, :end_at),
      timezone: Map.get(attrs, :timezone) || "UTC",
      source: "manual",
      expires_at: Map.get(attrs, :expires_at)
    })
  end

  defp supersede_prior(owner, %AvailabilityWindow{} = new_window, supersedes_id)
       when is_binary(supersedes_id) do
    case Availability.get_my_window(owner, supersedes_id) do
      {:ok, old} ->
        # Soft-delete old (also revokes its shares)
        _ = Availability.delete_window(owner, old.id)
        {:ok, [old.id]}

      {:error, :not_found} ->
        # Already gone — still ok; corrector wins by creating new window
        {:ok, []}

      {:error, reason} ->
        # Do not leave orphan new window without reporting; keep new, report empty
        _ = new_window
        {:ok, []}

        # silence unused warning path
        _ = reason
        {:ok, []}
    end
  end

  defp supersede_prior(owner, %AvailabilityWindow{} = new_window, nil) do
    # Supersede overlapping active windows for the same owner (bounded replace).
    overlapping =
      owner
      |> Availability.list_my_windows()
      |> Enum.reject(&(&1.id == new_window.id))
      |> Enum.filter(fn w -> overlaps?(w, new_window) end)

    ids =
      Enum.map(overlapping, fn w ->
        _ = Availability.delete_window(owner, w.id)
        w.id
      end)

    {:ok, ids}
  end

  defp overlaps?(a, b) do
    DateTime.compare(a.end_at, b.start_at) == :gt and
      DateTime.compare(b.end_at, a.start_at) == :gt
  end
end
