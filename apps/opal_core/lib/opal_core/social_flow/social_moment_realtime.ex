defmodule OpalCore.SocialFlow.SocialMomentRealtime do
  @moduledoc """
  Realtime fanout for Social Moments (Pass 23).

  PubSub consumes SocialMomentAudience (RelationshipGraph authority).
  Never duplicates friend rules in channel code.

  Topics:
  - social_moments:user:<user_id> — only authorized viewers receive
  """

  @pubsub OpalCore.PubSub

  alias OpalCore.SocialFlow.{SocialMomentAudience, SocialMomentRecord}

  def user_topic(user_id) when is_binary(user_id), do: "social_moments:user:#{user_id}"
  def user_topic(_), do: nil

  @doc """
  Fan out publish/update event only to currently authorized viewers.
  Returns delivery matrix for proof.
  """
  def publish_moment_event(%SocialMomentRecord{} = m, event_type \\ "social_moment:published") do
    viewers = SocialMomentAudience.authorized_viewer_ids(m)

    payload = %{
      "event" => event_type,
      "moment_id" => m.id,
      "author_user_id" => m.author_user_id,
      "visibility" => m.visibility,
      # No technical ACL internals in product payload
      "caption_preview" => String.slice(m.caption || "", 0, 80),
      "is_payout" => false,
      "live_economic" => false
    }

    delivered =
      Enum.map(viewers, fn uid ->
        topic = user_topic(uid)
        :ok = Phoenix.PubSub.broadcast(@pubsub, topic, {:social_moment, payload})
        uid
      end)

    %{
      "moment_id" => m.id,
      "event" => event_type,
      "delivered_user_ids" => delivered,
      "delivery_count" => length(delivered),
      "authority" => "SocialMomentAudience"
    }
  end

  @doc "Would viewer receive realtime for this moment under current authority?"
  def would_deliver?(%SocialMomentRecord{} = m, viewer_user_id) do
    viewer_user_id in SocialMomentAudience.authorized_viewer_ids(m)
  end

  def would_deliver?(_, _), do: false
end
