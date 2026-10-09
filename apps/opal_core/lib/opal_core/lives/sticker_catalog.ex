defmodule OpalCore.Lives.StickerCatalog do
  @moduledoc """
  Fixed v1 sticker catalog — 6 stickers, no user uploads (asset control).
  Prices in test-credit cents: 1 / 5 / 25 dollar tiers → 100 / 500 / 2500.
  """

  @catalog [
    %{key: "fire", emoji: "🔥", label: "Fire", tier: 5, amount_cents: 500},
    %{key: "heart", emoji: "💜", label: "Heart", tier: 1, amount_cents: 100},
    %{key: "cheers", emoji: "🥂", label: "Cheers", tier: 5, amount_cents: 500},
    %{key: "star", emoji: "⭐", label: "Star", tier: 1, amount_cents: 100},
    %{key: "bolt", emoji: "⚡", label: "Bolt", tier: 25, amount_cents: 2500},
    %{key: "opal", emoji: "💠", label: "Opal", tier: 25, amount_cents: 2500}
  ]

  @host_share_bps 7000
  @venue_share_bps 3000

  def all, do: @catalog

  def get(key) when is_binary(key) do
    Enum.find(@catalog, &(&1.key == key))
  end

  def get(_), do: nil

  def keys, do: Enum.map(@catalog, & &1.key)

  def split(amount_cents) when is_integer(amount_cents) and amount_cents > 0 do
    host = div(amount_cents * @host_share_bps, 10_000)
    venue = amount_cents - host
    %{host_share_cents: host, venue_share_cents: venue, host_bps: @host_share_bps, venue_bps: @venue_share_bps}
  end

  def host_share_bps, do: @host_share_bps
  def venue_share_bps, do: @venue_share_bps

  def to_contract do
    honesty = "Stickers use test credits for now."

    %{
      "stickers" =>
        Enum.map(@catalog, fn s ->
          %{
            "key" => s.key,
            "emoji" => s.emoji,
            "label" => s.label,
            "tier" => s.tier,
            "amount_cents" => s.amount_cents,
            "test_mode" => true,
            "honesty" => honesty
          }
        end),
      "honesty" => honesty,
      "split" => %{"host_bps" => @host_share_bps, "venue_bps" => @venue_share_bps, "opal_bps" => 0},
      "anti_mercenary" =>
        "Stickers are celebratory, never required. A live with zero stickers is complete.",
      "test_mode_default" => true,
      "live_money_flag" => "OPAL_STICKER_LIVE_MONEY"
    }
  end
end

