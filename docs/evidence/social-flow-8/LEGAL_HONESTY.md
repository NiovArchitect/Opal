# Social Flow 8 — Legal and Policy Honesty

This slice establishes **technical and product safety controls** for a bounded guardian-managed youth coordination path using **synthetic fixtures only**.

## This slice does **not** claim

- COPPA certification  
- FERPA compliance  
- GDPR-K compliance  
- State-level age-assurance compliance  
- School authorization  
- Custody-law compliance  
- Comprehensive child-safety validation  
- Production readiness for minors  

## Explicit development status

- Jurisdiction-specific legal review remains required  
- Final age bands remain policy-configurable (`policy_version` / age-policy config separate from core semantics)  
- Guardian authority can vary by jurisdiction and family circumstances  
- Custody and guardianship disputes are **not** solved by product logic  
- Unrestricted youth shipping remains gated  

## Product flags

`FamilyContext.to_contract/1` includes:

- `not_coppa_certified: true`  
- `not_production_youth_shipping: true`  
- `jurisdiction_review_required: true`  
- `legal_disclaimer: "dev_fixture_not_certified"`  
