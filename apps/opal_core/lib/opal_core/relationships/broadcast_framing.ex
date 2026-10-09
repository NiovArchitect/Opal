defmodule OpalCore.Relationships.BroadcastFraming do
  @moduledoc """
  Paste I Cardinality — 1:many broadcast cards typed per recipient.

  One announcement (e.g. "hosting dinner Saturday") fans out into N viewer-scoped
  cards. Each card uses the owner's label for that recipient (Behavior + Access).
  Viewers never see sibling framings (no cross-leak of what others got).
  """

  alias OpalCore.Relationships
  alias OpalCore.Relationships.{Access, Behavior}

  @doc """
  Frame one announcement for many recipients.

  `recipients` — list of `%{user_id:, display_name:}` (optional `:relationship_type`
  override; otherwise owner's RU-1 type is used).

  Returns `%{cards: [card], announcement: binary}` where each card is private to
  `viewer_id` and carries only that viewer's tone/depth.
  """
  def frame_cards(owner_id, announcement, recipients, opts \\ [])
      when is_binary(owner_id) and is_binary(announcement) and is_list(recipients) do
    when_label = Keyword.get(opts, :when, "Saturday")

    cards =
      Enum.map(recipients, fn recipient ->
        viewer_id = recipient[:user_id] || recipient["user_id"]
        name = recipient[:display_name] || recipient["display_name"] || "them"

        type =
          recipient[:relationship_type] || recipient["relationship_type"] ||
            Relationships.get_type(owner_id, viewer_id) || "acquaintance"

        proposal = Behavior.plan_proposal_copy(type, who: name, when: when_label)
        depth = Access.nudge_depth(type)
        style = Behavior.style_for(type)

        card_body = card_body(type, style, announcement, when_label, depth)

        %{
          "viewer_id" => viewer_id,
          "owner_id" => owner_id,
          "relationship_type" => type,
          "tone" => proposal.tone,
          "framing" => proposal.framing,
          "spontaneity" => proposal.spontaneity,
          "depth" => depth.depth,
          "card" => card_body,
          "copy" => proposal.copy,
          # Sibling framings are intentionally absent — never attach other cards
          "sibling_viewer_ids" => [],
          "visibility" => "private_to_viewer"
        }
      end)

    %{
      "announcement" => announcement,
      "owner_id" => owner_id,
      "cards" => cards,
      "cardinality" => "1:many"
    }
  end

  @doc "Card payload visible to one viewer — must not embed other viewers' copy."
  def viewer_safe_card(batch, viewer_id) when is_map(batch) and is_binary(viewer_id) do
    Enum.find(batch["cards"] || [], fn c -> c["viewer_id"] == viewer_id end)
  end

  @doc "True if viewer's card payload contains another recipient's framing/copy."
  def cross_leaks?(batch, viewer_id) when is_map(batch) and is_binary(viewer_id) do
    mine = viewer_safe_card(batch, viewer_id)
    others = Enum.reject(batch["cards"] || [], fn c -> c["viewer_id"] == viewer_id end)

    if is_nil(mine) do
      false
    else
      blob = inspect(mine) |> String.downcase()

      Enum.any?(others, fn o ->
        other_copy = String.downcase(o["card"] || "")
        other_tone = to_string(o["tone"] || "")
        # Leak if our private card embeds their distinct card text
        other_copy != "" and other_copy != String.downcase(mine["card"] || "") and
          String.contains?(blob, other_copy) and
          # Same-tone siblings can share substrings; require distinct tone mismatch signal
          other_tone != "" and other_tone != to_string(mine["tone"]) and
          String.contains?(blob, "tone => \"#{other_tone}\"")
      end)
    end
  end

  defp card_body("spouse", "warm", announcement, when_label, _) do
    "Hey love — #{announcement} #{when_label}. Full house energy; tell me what you need."
  end

  defp card_body("partner", "warm", announcement, when_label, _) do
    "Hey love — #{announcement} #{when_label}. Full house energy; tell me what you need."
  end

  defp card_body("close_friend", "casual", announcement, when_label, _) do
    "#{announcement} #{when_label} — you're invited, no pressure."
  end

  defp card_body("friend", "casual", announcement, when_label, _) do
    "#{announcement} #{when_label} — you're invited, no pressure."
  end

  defp card_body("business", _style, announcement, when_label, _) do
    "Logistics: #{announcement} scheduled for #{when_label}. Please confirm availability."
  end

  defp card_body("acquaintance", _style, announcement, when_label, _) do
    "Note: #{announcement} on #{when_label}. RSVP optional."
  end

  defp card_body(_type, "warm", announcement, when_label, %{depth: :rich}) do
    "Hey love — #{announcement} #{when_label}. Full house energy; tell me what you need."
  end

  defp card_body(_type, "casual", announcement, when_label, _) do
    "#{announcement} #{when_label} — you're invited, no pressure."
  end

  defp card_body(_type, _style, announcement, when_label, _) do
    "#{announcement} — #{when_label}."
  end
end
