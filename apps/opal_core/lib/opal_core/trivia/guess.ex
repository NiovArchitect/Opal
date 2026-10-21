defmodule OpalCore.Trivia.Guess do
  @moduledoc """
  Repair #21 (W-9 expanded) - one Opal Trivia guess.

  A guess is labeled a guess by construction: it lives in this
  table, in the game's own store, and carries its provenance
  (who guessed, about whom, the question asked, the fact the
  guess asserts). It is NOT memory. Only the subject's validation
  (status -> "validated") may turn its fact into a capsule in the
  SUBJECT's wallet, through CapsuleRead.remember - see
  OpalCore.Trivia.validate_guess/3.
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @statuses ~w(pending validated rejected)

  schema "trivia_guesses" do
    field :guesser_user_id, :binary_id
    field :subject_user_id, :binary_id
    field :question, :string
    field :guess, :string
    field :fact_summary, :string
    field :anonymous, :boolean, default: false
    field :multiplier, :integer, default: 1
    field :status, :string, default: "pending"
    field :capsule_id, :binary_id
    field :validated_at, :utc_datetime_usec

    timestamps(type: :utc_datetime_usec)
  end

  def statuses, do: @statuses

  @doc """
  The guesser/subject ids are set programmatically by the context
  (never cast from params - AGENTS.md rule for programmatic
  fields); only the game's own words are cast here.
  """
  def changeset(guess, attrs) do
    guess
    |> cast(attrs, [:question, :guess, :fact_summary, :anonymous, :multiplier])
    |> validate_inclusion(:multiplier, [1, 2])
    |> validate_required([:question, :guess, :fact_summary])
    |> validate_length(:question, min: 1, max: 300)
    |> validate_length(:guess, min: 1, max: 300)
    |> validate_length(:fact_summary, min: 1, max: 300)
  end

  def validate_changeset(guess, status, capsule_id) do
    guess
    |> change(%{
      status: status,
      capsule_id: capsule_id,
      validated_at: DateTime.utc_now()
    })
    |> validate_inclusion(:status, @statuses)
  end

  @doc """
  The wire contract. An anonymous guess NEVER carries its
  guesser's identity to the subject - the id is withheld at this
  one gate, so no client can leak it.
  """
  def to_contract(%__MODULE__{} = g) do
    %{
      "id" => g.id,
      "guesser_user_id" => if(g.anonymous, do: nil, else: g.guesser_user_id),
      "subject_user_id" => g.subject_user_id,
      "question" => g.question,
      "guess" => g.guess,
      "fact_summary" => g.fact_summary,
      "anonymous" => g.anonymous,
      "multiplier" => g.multiplier,
      "status" => g.status,
      "capsule_id" => g.capsule_id,
      "validated_at" => iso(g.validated_at),
      "created_at" => iso(g.inserted_at)
    }
  end

  defp iso(nil), do: nil
  defp iso(%DateTime{} = dt), do: DateTime.to_iso8601(dt)
end
