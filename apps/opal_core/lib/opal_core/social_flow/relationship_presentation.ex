defmodule OpalCore.SocialFlow.RelationshipPresentation do
  @moduledoc """
  Viewer-facing relationship label.

  This is not the relationship_contexts pause record. Private wording and a
  shared relationship type stay separate. A directional edge stores each
  side's label. Inference never becomes a confirmed label, and romantic
  status is never inferred from time spent together.
  """

  @romantic ~w(girlfriend boyfriend wife husband partner fiancé fiance fiancée spouse)

  @doc """
  Label for this viewer, or nil when nothing is authoritative.

  `edge` includes optional `status`, `explicit`, `canonical_type`, `source`,
  `privacy`, and `labels` as `%{user_id => label}`.
  """
  def label_for(edge, viewer_id) when is_map(edge) and is_binary(viewer_id) do
    with true <- edge["status"] == "confirmed",
         true <- edge["explicit"] == true,
         true <- romantic_allowed?(edge) do
      labels = edge["labels"] || %{}
      own = labels[viewer_id]

      cond do
        edge["privacy"] == "private" and is_binary(own) and own != "" ->
          own

        edge["privacy"] == "private" ->
          nil

        is_binary(own) and own != "" ->
          own

        is_binary(edge["shared_label"]) and edge["shared_label"] != "" ->
          edge["shared_label"]

        true ->
          nil
      end
    else
      _ -> nil
    end
  end

  def label_for(_, _), do: nil

  defp romantic_allowed?(edge) do
    type = edge["canonical_type"] |> to_string() |> String.downcase()

    if type in @romantic do
      edge["source"] in ["explicit", "mutual"]
    else
      true
    end
  end
end
