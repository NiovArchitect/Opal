defmodule OpalCore.RelationshipAccess.Grant do
  @moduledoc """
  Multi-dimensional relationship permission grant.

  Access levels distinguish **use** from **disclose**.
  Action ceilings bind Suggest → Prepare → Execute.
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @scope_kinds ~w(contact group global)
  @data_categories ~w(
    plans_commitments
    calendar_availability
    location_live
    shared_experiences
    preferences_interests
    conversation_signals
    call_signals
    financial_context
    health_fitness
    family_private
    gifts_favorites
    understanding_candidates
  )
  @access_levels ~w(none observe use disclose)
  @action_ceilings ~w(none suggest prepare execute)
  @visibilities ~w(private relationship group self_only)
  @sources ~w(explicit template provisional)

  schema "relationship_access_grants" do
    field :scope_kind, :string
    field :group_id, :binary_id
    field :data_category, :string
    field :access_level, :string, default: "none"
    field :action_ceiling, :string, default: "none"
    field :visibility, :string, default: "self_only"
    field :source, :string, default: "explicit"
    field :template_key, :string
    field :season_key, :string
    field :granted_at, :utc_datetime_usec
    field :expires_at, :utc_datetime_usec
    field :revoked_at, :utc_datetime_usec
    field :audit, :map, default: %{}

    belongs_to :owner, OpalCore.Accounts.User, foreign_key: :owner_user_id
    belongs_to :contact, OpalCore.Accounts.User, foreign_key: :contact_user_id

    timestamps(type: :utc_datetime_usec)
  end

  def scope_kinds, do: @scope_kinds
  def data_categories, do: @data_categories
  def access_levels, do: @access_levels
  def action_ceilings, do: @action_ceilings
  def visibilities, do: @visibilities
  def sources, do: @sources

  def changeset(grant, attrs) do
    grant
    |> cast(attrs, [
      :owner_user_id,
      :scope_kind,
      :contact_user_id,
      :group_id,
      :data_category,
      :access_level,
      :action_ceiling,
      :visibility,
      :source,
      :template_key,
      :season_key,
      :granted_at,
      :expires_at,
      :revoked_at,
      :audit
    ])
    |> validate_required([
      :owner_user_id,
      :scope_kind,
      :data_category,
      :access_level,
      :action_ceiling,
      :visibility,
      :source,
      :granted_at
    ])
    |> validate_inclusion(:scope_kind, @scope_kinds)
    |> validate_inclusion(:data_category, @data_categories)
    |> validate_inclusion(:access_level, @access_levels)
    |> validate_inclusion(:action_ceiling, @action_ceilings)
    |> validate_inclusion(:visibility, @visibilities)
    |> validate_inclusion(:source, @sources)
    |> validate_scope_shape()
    |> validate_access_disclose_ceiling()
    |> foreign_key_constraint(:owner_user_id)
    |> foreign_key_constraint(:contact_user_id)
  end

  defp validate_scope_shape(cs) do
    kind = get_field(cs, :scope_kind)
    contact = get_field(cs, :contact_user_id)
    group = get_field(cs, :group_id)

    case kind do
      "contact" when is_binary(contact) ->
        cs

      "contact" ->
        add_error(cs, :contact_user_id, "required for contact scope")

      "group" when not is_nil(group) ->
        cs

      "group" ->
        add_error(cs, :group_id, "required for group scope")

      "global" ->
        cs
        |> put_change(:contact_user_id, nil)
        |> put_change(:group_id, nil)

      _ ->
        cs
    end
  end

  # disclose implies at least use; execute implies prepare capability shape is separate.
  defp validate_access_disclose_ceiling(cs) do
    level = get_field(cs, :access_level)

    case level do
      "disclose" ->
        # disclose is a disclosure right; use is implied for owner alignment.
        cs

      _ ->
        cs
    end
  end

  def active?(%__MODULE__{revoked_at: nil, expires_at: nil}), do: true

  def active?(%__MODULE__{revoked_at: revoked}) when not is_nil(revoked), do: false

  def active?(%__MODULE__{expires_at: expires}) when not is_nil(expires) do
    DateTime.compare(expires, DateTime.utc_now()) == :gt
  end

  def active?(_), do: false

  def to_contract(%__MODULE__{} = g) do
    %{
      "id" => g.id,
      "owner_user_id" => g.owner_user_id,
      "scope_kind" => g.scope_kind,
      "contact_user_id" => g.contact_user_id,
      "group_id" => g.group_id,
      "data_category" => g.data_category,
      "access_level" => g.access_level,
      "action_ceiling" => g.action_ceiling,
      "visibility" => g.visibility,
      "source" => g.source,
      "template_key" => g.template_key,
      "season_key" => g.season_key,
      "granted_at" => g.granted_at,
      "expires_at" => g.expires_at,
      "revoked_at" => g.revoked_at,
      "active" => active?(g),
      "audit" => g.audit || %{}
    }
  end
end
