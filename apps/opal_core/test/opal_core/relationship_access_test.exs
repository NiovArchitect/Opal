defmodule OpalCore.RelationshipAccessTest do
  use OpalCore.DataCase, async: false

  alias OpalCore.Fixtures
  alias OpalCore.FixturesHelper
  alias OpalCore.RelationshipAccess
  alias OpalCore.RelationshipAccess.Grant

  setup do
    FixturesHelper.seed!()
    :ok
  end

  defp alex, do: Fixtures.user_alex_id()
  defp jordan, do: Fixtures.user_jordan_id()

  test "1. standing graphing grant persists across get_or_create" do
    assert {:ok, p1} =
             RelationshipAccess.update_graphing_policy(alex(), %{
               "call_mode" => "auto_eligible",
               "global_paused" => false
             })

    assert p1.call_mode == "auto_eligible"
    assert {:ok, p2} = RelationshipAccess.get_or_create_graphing_policy(alex())
    assert p2.id == p1.id
    assert p2.call_mode == "auto_eligible"
  end

  test "2. revocation immediately removes capability" do
    assert {:ok, grant} =
             RelationshipAccess.upsert_grant(alex(), %{
               "scope_kind" => "contact",
               "contact_user_id" => jordan(),
               "data_category" => "call_signals",
               "access_level" => "observe",
               "action_ceiling" => "suggest",
               "visibility" => "self_only"
             })

    assert RelationshipAccess.may_access?(alex(), jordan(), "call_signals", "observe")
    assert {:ok, revoked} = RelationshipAccess.revoke_grant(alex(), grant.id)
    assert revoked.revoked_at
    refute RelationshipAccess.may_access?(alex(), jordan(), "call_signals", "observe")
  end

  test "3. one relationship may have Graphing while another does not" do
    # Person-agnostic fixtures: alex↔jordan vs a second contact if present;
    # use jordan only + global denial for missing contact.
    other = Ecto.UUID.generate()

    assert {:ok, _} =
             RelationshipAccess.upsert_grant(alex(), %{
               "scope_kind" => "contact",
               "contact_user_id" => jordan(),
               "data_category" => "call_signals",
               "access_level" => "observe",
               "action_ceiling" => "suggest"
             })

    assert RelationshipAccess.may_access?(alex(), jordan(), "call_signals", "observe")
    refute RelationshipAccess.may_access?(alex(), other, "call_signals", "observe")
  end

  test "4. group scope does not inherit member private context" do
    group_id = Ecto.UUID.generate()

    assert {:ok, _} =
             RelationshipAccess.upsert_grant(alex(), %{
               "scope_kind" => "group",
               "group_id" => group_id,
               "data_category" => "plans_commitments",
               "access_level" => "use",
               "action_ceiling" => "prepare",
               "visibility" => "group"
             })

    # Private financial grant on jordan does not appear as group access
    assert {:ok, _} =
             RelationshipAccess.upsert_grant(alex(), %{
               "scope_kind" => "contact",
               "contact_user_id" => jordan(),
               "data_category" => "financial_context",
               "access_level" => "use",
               "action_ceiling" => "suggest",
               "visibility" => "self_only"
             })

    assert RelationshipAccess.group_may_access?(alex(), group_id, "plans_commitments", "use")
    refute RelationshipAccess.group_may_access?(alex(), group_id, "financial_context", "use")
  end

  test "5. financial use without disclose" do
    assert {:ok, _} =
             RelationshipAccess.upsert_grant(alex(), %{
               "scope_kind" => "contact",
               "contact_user_id" => jordan(),
               "data_category" => "financial_context",
               "access_level" => "use",
               "action_ceiling" => "suggest",
               "visibility" => "self_only"
             })

    assert RelationshipAccess.may_use_privately?(alex(), jordan(), "financial_context")
    refute RelationshipAccess.may_disclose?(alex(), jordan(), "financial_context")
  end

  test "6. relationship type change does not silently escalate" do
    assert {:ok, _} =
             RelationshipAccess.upsert_grant(alex(), %{
               "scope_kind" => "contact",
               "contact_user_id" => jordan(),
               "data_category" => "plans_commitments",
               "access_level" => "observe",
               "action_ceiling" => "suggest",
               "visibility" => "self_only",
               "source" => "explicit"
             })

    diff = RelationshipAccess.template_diff_on_type_change(alex(), jordan(), "partner")
    assert diff["auto_applied"] == false
    assert diff["requires_user_accept"] == true
    assert is_list(diff["proposed_additions"])

    # apply without allow_upgrade keeps observe
    assert {:ok, grants} =
             RelationshipAccess.apply_template(alex(), jordan(), "romantic_partner",
               allow_upgrade: false
             )

    plan = Enum.find(grants, &(&1.data_category == "plans_commitments"))
    assert plan.access_level == "observe"
  end

  test "7. global pause overrides relationship grant" do
    assert {:ok, _} =
             RelationshipAccess.update_graphing_policy(alex(), %{
               "call_mode" => "auto_eligible",
               "global_paused" => false
             })

    assert {:ok, _} =
             RelationshipAccess.upsert_grant(alex(), %{
               "scope_kind" => "contact",
               "contact_user_id" => jordan(),
               "data_category" => "call_signals",
               "access_level" => "observe",
               "action_ceiling" => "suggest"
             })

    assert {:ok, :auto, _} = RelationshipAccess.graphing_decision(alex(), :call, jordan())

    assert {:ok, _} =
             RelationshipAccess.update_graphing_policy(alex(), %{"global_paused" => true})

    assert {:error, :global_paused} = RelationshipAccess.graphing_decision(alex(), :call, jordan())
  end

  test "8. permission failure never paints success (authorize_action)" do
    assert RelationshipAccess.authorize_action(alex(), "plans_commitments", "execute", jordan()) ==
             {:error, :above_ceiling}

    assert {:ok, _} =
             RelationshipAccess.upsert_grant(alex(), %{
               "scope_kind" => "contact",
               "contact_user_id" => jordan(),
               "data_category" => "plans_commitments",
               "access_level" => "use",
               "action_ceiling" => "prepare"
             })

    assert :ok =
             RelationshipAccess.authorize_action(alex(), "plans_commitments", "prepare", jordan())

    assert {:error, :above_ceiling} =
             RelationshipAccess.authorize_action(alex(), "plans_commitments", "execute", jordan())
  end

  test "9. action ceiling is readable for Center" do
    # Owner-solo default allows prepare; relationship edge defaults to none.
    assert RelationshipAccess.action_ceiling(alex(), "plans_commitments", nil) == "prepare"
    assert RelationshipAccess.action_ceiling(alex(), "plans_commitments", jordan()) == "none"

    assert {:ok, _} =
             RelationshipAccess.upsert_grant(alex(), %{
               "scope_kind" => "contact",
               "contact_user_id" => jordan(),
               "data_category" => "plans_commitments",
               "access_level" => "use",
               "action_ceiling" => "suggest"
             })

    assert RelationshipAccess.action_ceiling(alex(), "plans_commitments", jordan()) == "suggest"
  end

  test "10. Grant.active?/1 respects revoke and expiry" do
    now = DateTime.utc_now()

    g = %Grant{
      revoked_at: nil,
      expires_at: DateTime.add(now, 3600, :second)
    }

    assert Grant.active?(g)

    refute Grant.active?(%Grant{revoked_at: now, expires_at: nil})
    refute Grant.active?(%Grant{revoked_at: nil, expires_at: DateTime.add(now, -10, :second)})
  end

  test "templates never hardcode founder person names" do
    src = File.read!("lib/opal_core/relationship_access/templates.ex")
    refute src =~ ~r/Sadeil|Chanelle|Maya/i
  end
end
