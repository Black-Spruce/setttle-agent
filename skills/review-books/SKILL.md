---
name: review-books
description: Review a Setttle company's books for a period and summarize what is healthy, unusual, or needs attention. Use when the user asks how their books look, what needs attention, or for a bookkeeping health check.
metadata:
  setttle-access: read-only
---

# Review books

Review the user's Setttle books for the company and period they name.

If the company or period is ambiguous, ask before querying. Start with the result: what is happening in the books and what deserves attention. Include the reporting currency, date range, key balances or totals, unmatched or unresolved items, and one clear next action.

If the period falls in a signed-off fiscal year, say so: its journal is locked, so corrections are dated in the next open year. Unmatched bank activity in a locked year is resolved from the Year end page. When the review is about getting a year ready for the accountant, use the `prepare-year-end` skill.

Use read-only tools for this review. Do not post, edit, void, match, archive, or otherwise change records unless the user explicitly asks for that action afterward.
