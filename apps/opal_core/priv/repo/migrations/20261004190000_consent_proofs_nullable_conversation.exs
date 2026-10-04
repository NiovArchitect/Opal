defmodule OpalCore.Repo.Migrations.ConsentProofsNullableConversation do
  use Ecto.Migration

  def change do
    alter table(:consent_proofs) do
      modify :conversation_id, :binary_id, null: true
    end
  end
end
