---
name: track-deadlines
description: Help a Setttle owner see which CRA filing and payment deadlines are open and, after they confirm it, record a deadline as filed or link the bank payment that paid it. Use when the user says they filed or paid a GST/HST return, T2, T1, instalment, or T4 or T5 slips, or asks which payment covered a deadline.
---

# Track deadlines

Help the owner keep the deadlines Setttle calculates from their company profile up to date. Setttle never files or pays anything. The owner files and pays with the CRA, directly or through their accountant, and this skill only records what they say they did.

## Read first

- Confirm the company. Call `list_deadlines` and find the deadline the owner means by its label and period. If more than one fits, ask. Use its `key` in every later call.
- Say where it stands: due date, status, what it needs (filing, payment), and anything already recorded (`filedOn`, `paidOn`, `paidAmountMinor`). For a GST/HST return, give line 109; if `booksReadyForPeriod` is false, say the books are only caught up through `booksCaughtUpThrough`, so the lines may change.
- Unanswered `questions` are answered by the owner on the Deadlines page in the web app. Don't answer them here.

## Record a filing

Ask the date they filed, if they haven't said. Once they confirm, call `set_deadline_status` with the key and `filedOn`.

## Link a payment

A deadline that needs paying is linked to a posted bank payment in the books.

1. Call `list_deadline_payments` with the deadline's key, or with `direction` in for a GST/HST refund. Payments that look like CRA payments come first. Show each likely one with its date, description, `amountMinor` (the whole payment), `unassignedMinor` (what other deadlines haven't taken), and `alsoCovers` (other open deadlines it could pay). The deadline's `paymentSuggestion` from `list_deadlines` is a lead, not an answer.
2. Ask the owner which payment paid which deadline, and how much of it each one takes. One payment can pay several deadlines, such as a GST/HST balance and a corporate instalment sent together. Base each share on what the owner tells you or the deadline shows (line 109 for a GST/HST return); never invent a split. The shares can't add up to more than the payment's `unassignedMinor`.
3. Show the exact links: the payment, each deadline, and its share. Once the owner confirms, call `link_deadline_payment` with the payment's `journalEntryId` and one allocation per deadline. Each deadline is marked paid on the payment's date. Linking a deadline again replaces its share.
4. Report the updated deadlines from the result. If the tool says the shares exceed the payment, show the owner `unassignedMinor` and ask again.

If no posted payment fits, the payment may not be in the books yet. Reconcile the bank activity first with the `reconcile-bank` skill, or the owner can record a GST/HST payment from the Deadlines page in the web app. If the owner paid another way and wants the deadline marked paid without a link, `set_deadline_status` takes `paidOn` and an optional `paidAmountMinor`.

## Undo

`set_deadline_status` with `filedOn` or `paidOn` null clears that date; clearing `paidOn` also removes the payment link. Confirm before clearing.

## Never without confirmation

Show the exact change and wait for the owner to confirm it before each write. A question about a deadline is not confirmation, and never record a filing or payment the owner hasn't said happened. Recording a payment writes nothing to the ledger and moves no money.

## Response shape

1. The deadline: period, due date, and status.
2. What was recorded, or the payments that could match and what each would cover.
3. What needs the owner's decision or confirmation.
4. One clear next action.
