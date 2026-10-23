---
name: prepare-year-end
description: Help a Setttle owner get a fiscal year ready for their accountant by reviewing the year-end checklist and company details. Use when the user asks about year end, closing the year, what their accountant still needs, or the accountant package.
---

# Prepare year end

Help the owner get a fiscal year ready for their accountant. Setttle keeps one year-end checklist per fiscal year: some items it checks from the books, the owner confirms or documents the rest, and the owner signs the year off in the web app.

## Read first

- Confirm the company. Use `list_year_ends` to find the fiscal years, then `get_year_end` for the year the owner means. If the year is ambiguous, ask.
- Use `get_company_profile` to see whether registration details and CRA program accounts are on file.
- Summarize what is still open in plain language, grouped by the checklist's sections (for example bank and cards, income and expenses, sales tax, assets and records, loans and leases, other). For each open item, say what Setttle found and what would close it. State the fiscal period and whether the year is signed off.

## Automatic items

Automatic items close when the books show the work is done. Send the owner to fix them where they live instead of marking them done:

- Unreconciled accounts or unmatched bank activity: reconcile with the `reconcile-bank` skill.
- Draft invoices, bills, or unposted receipts dated in the year: review and post or discard them.
- Foreign-currency balances without year-end rates: revalue foreign currency in Setttle.

## Changes, only after explicit confirmation

Show the exact change and wait for the owner to confirm it before each write. A request to review is not confirmation.

- `set_year_end_item` marks a confirm or document item done or not applicable, or saves a note on it. Never use it to overrule what the books show: an automatic item stays open until the books change.
- `set_year_end_period_start` changes the start of the first, partial fiscal year, for example to the incorporation date.
- If company details are missing, offer `update_company_profile` for registration details and `set_program_account` for a CRA program account.

## The owner's actions in the web app

Do not sign off or reopen a year, create share links, or upload files. These are the owner's actions on the Year end page; say so and point there.

- Signing off a year locks its journal. Changes then go into the next open year.
- The accountant package is downloaded from the Year end page.
- Share links are created from a signed-off year. A year must be signed off before it can be shared; to give the accountant access sooner, invite them to the company as a user.

## Response shape

1. Where the year stands: period, sign-off status, and how many items are open.
2. Open items by section, with what Setttle found.
3. What the owner can fix where, and what needs their confirmation here.
4. One clear next action.
