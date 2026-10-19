defmodule OpalCore.Calls.Graphing do
  @moduledoc """
  Call graphing — a call being grafted into the graph (Repair #19 W12,
  scope item 16).

  "Graphing" is the ingestion of call content into scoped graph records.
  It rides the machinery that already truly gates that ingestion: the
  per-call Assist consents (`OpalCore.Calls.Assist`). A transcript segment
  becomes a graph record only through `Assist.accept_transcript/3`, which
  refuses unless the Assist state is `:active` — both participants
  allowing. Graphing is therefore not a second consent system; it is the
  ambient, participant-visible name for that one gate, with its own
  state model, broadcast, and consent lineage:

    * `:graphing` — both participants allow; content is being ingested.
    * `:paused` — graphing was on (or an allow stands) and a participant
      has since paused it. Ingestion is actually stopped:
      `accept_transcript/3` returns `:assist_inactive` and persists
      nothing while any participant is paused. Visibly distinct from
      `:off` on every surface.
    * `:waiting_for_other` — one participant allows, the other has not
      decided. Nothing is ingested.
    * `:off` — nobody allows and nobody has paused. Nothing is ingested.

  Gyroscope law: this module is the ONE derivation. The REST projection
  (`Assist.state/2` via the call controller) and the call-channel
  broadcast both carry `graphing_state/2` verbatim; surfaces render it
  and never re-derive it.

  Every transition is written to the consent lineage
  (`OpalCore.Calls.GraphingEvent`) and published to the domain-event
  outbox (the wallet architecture's audit ledger) before the broadcast
  goes out, so the light every participant sees is backed by a record.
  """

  import Ecto.Query

  alias OpalCore.Calls.AssistConsent
  alias OpalCore.Calls.CallSession
  alias OpalCore.Calls.GraphingEvent
  alias OpalCore.Events.Publisher
  alias OpalCore.Repo
  alias OpalCoreWeb.Endpoint

  @type state :: :graphing | :paused | :waiting_for_other | :off

  @doc """
  The call's graphing state, derived from its real Assist consents.
  Identical for every viewer — one state, every surface.
  """
  @spec graphing_state(%CallSession{} | binary()) :: state
  def graphing_state(%CallSession{id: call_id}), do: graphing_state(call_id)

  def graphing_state(call_id) when is_binary(call_id) do
    rows = Repo.all(from c in AssistConsent, where: c.call_id == ^call_id)

    cond do
      paused?(rows) -> :paused
      declined?(rows) -> :off
      length(rows) == 2 and Enum.all?(rows, &allowed?/1) -> :graphing
      Enum.any?(rows, &allowed?/1) -> :waiting_for_other
      true -> :off
    end
  end

  @doc """
  Record a graphing transition in the consent lineage, publish it to the
  audit outbox, and broadcast it on the call channel topic (`call:<id>`,
  event `"graphing"`) so every participant's surface agrees in real time.

  `action` is one of `GraphingEvent.actions/0`. Called by
  `Assist.set_allowed/4` after the consent write lands; the resulting
  state is re-derived here, never trusted from the caller.
  """
  @spec record_transition(%CallSession{}, binary(), String.t(), String.t()) ::
          {:ok, GraphingEvent.t()} | {:error, term()}
  def record_transition(%CallSession{} = call, actor_user_id, action, scope \\ "call") do
    state = graphing_state(call.id)

    with {:ok, event} <-
           %GraphingEvent{}
           |> GraphingEvent.changeset(%{
             call_id: call.id,
             actor_user_id: actor_user_id,
             action: action,
             resulting_state: Atom.to_string(state),
             scope: scope
           })
           |> Repo.insert() do
      _ = publish(call, event, state)
      _ = broadcast(call, event, state, actor_user_id)
      {:ok, event}
    end
  end

  @doc "The call's graphing lineage, oldest first — who changed what, when."
  @spec lineage(binary()) :: [GraphingEvent.t()]
  def lineage(call_id) when is_binary(call_id) do
    Repo.all(
      from e in GraphingEvent,
        where: e.call_id == ^call_id,
        order_by: [asc: e.inserted_at, asc: e.id]
    )
  end

  @doc """
  The broadcast payload for a graphing state. One shape everywhere:
  REST projection and channel push carry these exact fields.
  """
  @spec payload(%CallSession{}, state, binary() | nil, DateTime.t() | nil) :: map()
  def payload(%CallSession{} = call, state, actor_user_id \\ nil, at \\ nil) do
    %{
      "call_id" => call.id,
      "conversation_id" => call.conversation_id,
      "graphing" => Atom.to_string(state),
      "by_user_id" => actor_user_id,
      "at" => at || DateTime.utc_now()
    }
  end

  # Paused means graphing was genuinely in reach and a participant
  # held it: someone revoked after having allowed (the Assist
  # "call_pause" write keeps allowed_at standing) AND the other
  # participant allows now or allowed before. A lone allow-then-revoke
  # before the other person ever allowed never graphed — that is :off,
  # not a pause. A first-run "Not now" (never allowed) is a decline.
  defp paused?(rows) do
    Enum.any?(rows, fn row ->
      revoked_after_allow?(row) and
        Enum.any?(rows, fn other ->
          other.user_id != row.user_id and (allowed?(other) or not is_nil(other.allowed_at))
        end)
    end)
  end

  defp declined?(rows) do
    Enum.any?(rows, fn row ->
      row.allowed != true and not is_nil(row.revoked_at) and is_nil(row.allowed_at)
    end)
  end

  defp revoked_after_allow?(row) do
    row.allowed != true and not is_nil(row.revoked_at) and not is_nil(row.allowed_at)
  end

  defp allowed?(%AssistConsent{allowed: true, revoked_at: nil}), do: true
  defp allowed?(_), do: false

  defp publish(%CallSession{} = call, %GraphingEvent{} = event, state) do
    Publisher.record(%{
      event_type: "call.graphing_changed",
      aggregate_type: "call_session",
      aggregate_id: call.id,
      partition_key: call.id,
      actor_user_id: event.actor_user_id,
      conversation_id: call.conversation_id,
      privacy_class: "shared_authorized",
      privacy_scope: "call_participants",
      consent_scope: "per_call_graphing",
      purpose: "consent_lineage",
      payload: %{
        "call_id" => call.id,
        "action" => event.action,
        "graphing" => Atom.to_string(state),
        "actor_user_id" => event.actor_user_id,
        "scope" => event.scope,
        "lineage_id" => event.id
      }
    })
  rescue
    _ -> :error
  end

  defp broadcast(%CallSession{} = call, _event, state, actor_user_id) do
    Endpoint.broadcast("call:" <> call.id, "graphing", payload(call, state, actor_user_id))
    :ok
  rescue
    _ -> :ok
  end
end
