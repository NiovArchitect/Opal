defmodule OpalCore.Repo do
  use Ecto.Repo,
    otp_app: :opal_core,
    adapter: Ecto.Adapters.Postgres
end
