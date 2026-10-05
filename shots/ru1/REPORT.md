# Phase RU-1 report

## Product

`relationship_types` table + `OpalCore.Relationships` (set/get/for_user).
OC-2 adds `relationships` map. OC-4 subtle tone shifts for spouse/partner
and business. API GET/PUT under `/api/v1/product/relationships/`.
You hub People subsection under What Opal remembers.

## Verification

- Relationships + API tests: 15/15
- WhatOpalRemembersSection vitest: 5/5
- Manual: PUT 200, GET confirms, invalid 422, context includes relationships
