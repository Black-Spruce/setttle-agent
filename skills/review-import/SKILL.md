---
name: review-import
description: Help a Setttle owner review a Wave import before they post it, explaining what's left to decide and applying suggestions or account mappings they confirm. Use when the user asks about a Wave import, moving from Wave, or what an import still needs.
---

# Review an import

Help the owner finish reviewing a Wave import. The owner posts it from the import's page in the web app; this skill only reads the review and, after confirmation, changes its choices.

## Read first

- Confirm the company. Use `list_import_reviews` to find the import, then `get_import_plan` for the one the owner means. If several are in review, ask which.
- Summarize what is left in plain language: accounts that need a choice (`accountReviews`), transactions that can't post as exported (`sourceProblems`), foreign-currency amounts still missing, and how the plan compares to the attached Wave balance sheet. Say what each one blocks, and what doesn't block posting.
- List suggestions by their `state`: `applied` ones are already in the plan and can be undone; `open` ones wait for a decision. Give the item, the suggestion and its reason, and never invent a reason the plan doesn't give.

## Changes, only after explicit confirmation

Show the exact change and wait for the owner to confirm it before each write. A request to review is not confirmation.

- `apply_import_suggestions` accepts or dismisses suggestions by key. Dismissing an `applied` suggestion takes its choice back out. Repeating a call is safe.
- `map_import_account` maps one Wave account to one of the company's accounts, or back to matching by name with a null account. Map each existing account to at most one Wave account; don't merge two Wave accounts into one.
- Don't propose amounts, rates or categories the plan doesn't suggest. Missing foreign amounts come from statements or the owner, not from an estimate.

## The owner's actions in the web app

Uploading the export, adding statements or a balance sheet, and posting are done on the import's page. Posting writes the journals and brings over unpaid bills and invoices; say so and point there instead of attempting it.

## Response shape

1. Where the import stands: the file, its dates, and whether it can post yet.
2. What's left, by step, with what each blocks.
3. Suggestions to accept or dismiss, with their reasons.
4. One clear next action.
