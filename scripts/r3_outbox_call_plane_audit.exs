import Ecto.Query
alias OpalCore.Repo
alias OpalCore.Events.EventOutbox

rows =
  Repo.all(
    from(e in EventOutbox,
      where: like(e.event_type, "call.%"),
      order_by: [desc: e.inserted_at],
      limit: 30
    )
  )

envelopes = Enum.map(rows, fn row -> row.envelope || %{} end)

inner_payloads =
  Enum.map(envelopes, fn env ->
    Map.get(env, "payload") || Map.get(env, :payload) || env
  end)

blob = envelopes |> Enum.map(&Jason.encode!/1) |> Enum.join("\n")

sdp = length(Regex.scan(~r/sdp|sessionDescription|"type"\s*:\s*"offer"/i, blob))
ice = length(Regex.scan(~r/"candidate"|iceCandidate|a=candidate/i, blob))
media = length(Regex.scan(~r/audio\/opus|rtpmap|ssrc/i, blob))

out = %{
  sample_count: length(rows),
  event_types: rows |> Enum.map(& &1.event_type) |> Enum.uniq(),
  topic_families: rows |> Enum.map(& &1.topic_family) |> Enum.uniq(),
  RAW_SDP_KAFKA_COUNT: sdp,
  RAW_ICE_KAFKA_COUNT: ice,
  MEDIA_KAFKA_COUNT: media,
  sample_payload_keys: inner_payloads |> Enum.take(3) |> Enum.map(&Map.keys/1)
}

root =
  [:code.priv_dir(:opal_core), "..", "..", ".."]
  |> Path.join()
  |> Path.expand()

path = Path.join(root, "docs/evidence/r3-early-stretch-recon/outbox_call_payload_sample.json")
File.mkdir_p!(Path.dirname(path))
File.write!(path, Jason.encode!(out, pretty: true))
IO.puts(Jason.encode!(out))
