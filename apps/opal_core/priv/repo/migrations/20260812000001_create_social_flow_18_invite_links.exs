defmodule OpalCore.Repo.Migrations.CreateSocialFlow18InviteLinks do
  use Ecto.Migration

  def change do
    alter table(:relationship_invitations) do
      add :share_token_digest, :string
      add :share_token_expires_at, :utc_datetime_usec
      add :local_display_label, :string
      add :invite_source, :string, default: "manual"
    end

    create unique_index(:relationship_invitations, [:share_token_digest],
             where: "share_token_digest IS NOT NULL"
           )
  end
end
