# Automation Mapping Renumbering Design

## Goal

Renumber every row in the Google Sheet `Automation Mapping`, normalize its domain value to the actual source-sheet name, group rows by that source domain, and update all corresponding AUT tags in the Yapp Playwright project.

## Scope

- Include all 314 mapping rows: 14 E2E Journey rows and 300 Functional Validation rows.
- Preserve the `E2E` and `FV` prefixes.
- Renumber independently and sequentially within each layer: `AUT-E2E-001`–`AUT-E2E-014` and `AUT-FV-001`–`AUT-FV-300`.
- Preserve `Covered TC IDs`, status, role, scenario, test flow, expected outcome, run scope, notes, and source-row meaning.
- Update existing project AUT tags and related local references using an old-ID-to-new-ID mapping.

## Canonical source-sheet domains

The `Domain / Source Sheet` value will use the source-sheet name rather than the E2E journey label:

| Current value | Canonical value |
|---|---|
| Consultation setup | Consultation |
| Discord product | Discord Membership |
| Telegram setup | Telegram Membership |
| Tier creation | Membership |
| Exclusive post | Feeds and Exclusive |
| Tip configuration | Tipping |
| Promotion publish | Promotion |
| Completed order | Orders |
| DM access | Messages & Broadcast |
| Creator widget configuration | Livestream |
| Share referral | Referral |

The existing `Membership; Feeds and Exclusive` value remains a multi-source exception because its covered cases intentionally span both source sheets.

## Ordering and synchronization

1. Normalize the domain value for every mapping row.
2. Group rows by canonical source-sheet domain.
3. Within each domain, place E2E rows before Functional Validation rows and preserve the current order for rows with the same domain and layer.
4. Assign sequential IDs independently per layer.
5. Reorder the sheet rows by canonical domain while retaining the header and all row data.
6. Replace exact AUT tags in `tests/**/*.ts`, `src/test-data/buyer/profile.data.ts`, and any local automation references with the generated new IDs.

## Safety and validation

- Generate and retain an explicit old-ID-to-new-ID mapping before edits.
- Do not change test behavior or source TC coverage.
- Confirm every project AUT tag exists exactly once in the mapping dataset.
- Confirm no duplicate Automation IDs exist in the sheet.
- Run the mapping validation tests and `npx tsc --noEmit` after project edits.
- Re-read the sheet after editing and compare its AUT IDs with the project tags.
