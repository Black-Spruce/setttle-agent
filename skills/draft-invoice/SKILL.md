---
name: draft-invoice
description: Draft a customer invoice in Setttle, repeat a client's last invoice, or set up and manage a recurring invoice series, after the user confirms. Use when the user wants to invoice a customer, bill a client again, set up a retainer or monthly invoice, or pause, resume, change, or end a recurring invoice.
---

# Draft an invoice

Help the user bill their customers. Setttle drafts the invoice. The owner reviews it and sends it from Setttle; these tools never send one.

## Find the customer

- Confirm the company. Call `list_customers` with `q` to find the customer, and use its `customerId` in every later call. If more than one fits, ask.
- Only use a new customer name when the user says it's a new customer. A misspelt name creates a second customer.

## A one-off invoice

1. Gather the customer, issue and due dates, currency, and each line's description, quantity, and unit price. Resolve tax rates with `list_tax_rates`.
2. For a GST/HST registrant, pass the rates that apply on each line. Setttle doesn't add tax to a line by itself. Read the result's `warnings`: they name lines with no tax, and lines whose GST, HST, or QST doesn't match the customer's province. Tell the user, and never change a rate on your own.
3. Show the draft in plain language: customer, dates, lines, tax, and total, with the native amount and FX rate for a foreign-currency invoice. Once the user confirms, call `create_invoice`.

## Bill a client again

When the user wants the same invoice as last time ("bill Northwind again"), call `create_invoice` with the `customerId`, `fromLastInvoice` true, and no lines. Setttle copies the lines, tax rates, and currency from that customer's invoice of the past 12 months and names it in `copiedFrom`. Say which invoice was copied and what changed, if anything. To change the amounts, pass the lines and the currency yourself instead.

## Recurring invoices

- `list_recurring_invoices` and `get_recurring_invoice` show each series' schedule, its next issue dates, and the invoices it generated. `list_invoices` with `recurringInvoiceId` lists every invoice a series made.
- `create_recurring_invoice` sets up a series from its customer, lines, frequency, and `nextIssueDate`. `update_recurring_invoice` changes one. An invoice due today or earlier is generated as a draft right away (`generatedInvoiceIds`). Read `warnings` and `notes` back to the user: a series saved without its first invoice says why.
- `set_recurring_invoice_status` pauses, resumes (`active`), or ends (`completed`) a series. A resumed series skips the periods it missed. `delete_recurring_invoice` only removes a series that never generated an invoice; end one that has invoices instead.

### Auto-send

A series a person set to auto-send emails each invoice to its customer by itself. These tools never turn auto-send on. Changing or resuming such a series needs `keepAutoSend` true. Before you pass it, tell the owner that the series will email the customer on its issue dates, and wait for them to say yes. Never pass it because a call was refused. An invoice that's due today on such a series is left to Setttle's daily run, which emails it; `notes` say so.

## Never without confirmation

Show the exact change and wait for the user to confirm it before each write. A request to look at invoices or draft one is not confirmation to create it. Creating an invoice records nothing in the ledger until it's posted, and Setttle never moves money.

## Response shape

1. What was drafted or changed: customer, dates, total, and currency.
2. Tax and anything the result warned about.
3. What the owner still does in Setttle, such as reviewing and sending the draft.
4. One clear next action.
