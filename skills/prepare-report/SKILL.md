---
name: prepare-report
description: Prepare a clear Setttle financial report for a specified company and period, including what CRA filings and payments are due. Use when the user asks for a profit and loss, balance sheet, trial balance, account balances, a related financial summary, or what tax deadlines are coming up or overdue.
metadata:
  setttle-access: read-only
---

# Prepare a report

Prepare the report the user requests for the company and period they name: profit and loss, balance sheet, trial balance, account balances, tax deadlines, or a related financial summary.

State the company, date range, reporting currency, and whether the report is balanced. Lead with the totals and meaningful changes. Call out missing, unresolved, imported, or unusual facts separately. Preserve the date range if the user asks to drill into an account or transaction.

Say whether the period is in a signed-off fiscal year; a signed-off year's journal is locked, so its figures change only if the owner reopens it. If the user wants the year-end set of reports and records for their accountant, the accountant package is downloaded from the Year end page.

## Deadlines

When the user asks what's due, what to file, or wants deadlines in a report, call `list_deadlines`. Filter with `status` (for example overdue and due_soon) or `dueBy` when the user names a window.

- Lead with overdue deadlines, then those due within 7 days, then upcoming ones. For each, give the label and period, the due date (and `dueDateReason` if it moved past a weekend or CRA holiday), and what it still needs: filing, payment, or both.
- GST/HST returns carry their lines from the books: 101 sales, 105 tax collected, 108 input tax credits, 109 net tax, and 110 instalments for annual filers. Format the minor units in the company's currency. If `linesUnavailable` is set, say why there are no lines.
- If `booksReadyForPeriod` is false, the books are only caught up through `booksCaughtUpThrough`. Say so plainly: the return's lines may still change, and the period's bank activity should be reconciled before the owner files.
- Also cover the T2 (corporations) or the T1 with T2125 (sole proprietors and partners) and their balance-due dates, tax instalments, and T4 and T5 slips, as the result lists them. Say what the owner has already recorded as filed or paid.
- `questions` are facts Setttle still needs, such as whether salary or dividends were paid. Mention any still unanswered and which deadlines they hold back. The owner answers them on the Deadlines page in the web app; don't answer them for the owner.
- The dates are general CRA rules, not advice; each deadline links its rule's CRA source. Setttle never files or pays anything. The owner files and pays with the CRA, directly or through their accountant.

To record that a deadline was filed or paid, or to link a bank payment to it, use the `track-deadlines` skill.

This is a read-only request unless the user explicitly asks for a bookkeeping change.
