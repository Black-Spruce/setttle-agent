---
name: record-transaction
description: Draft and, after explicit confirmation, record a transaction in the correct Setttle company books, or add a receipt and attach it to the charge it paid. Use when the user wants to record an expense, payment, deposit, transfer, or other bookkeeping entry, or add a receipt or bill to Setttle.
---

# Record a transaction

Help the user record a transaction in Setttle.

Gather the company, date, amount, currency, payee or description, source evidence, and intended accounts. Check for an existing journal, bank transaction, receipt, invoice, or other likely duplicate. Resolve accounts by code or name.

Show the proposed entry in plain language, including the debit, credit, native amount, base-currency amount, and FX assumption if relevant. Stop and ask for explicit confirmation immediately before posting. If facts or accounts are missing, explain exactly what is needed instead of guessing.

Recording a payment writes a ledger entry only; Setttle never moves money.

## Add a receipt

When the user asks you to add a receipt ("add my Vercel receipt to Setttle"), that is the go-ahead to add it and attach it to the charge it clearly paid. A receipt never posts by itself; Setttle keeps it for review until its charge is posted.

1. Read the receipt: vendor, date, total, sales tax, and currency.
2. Find the charge with `list_bank_transactions`: the same amount and currency, dated on or shortly after the receipt. For a purchase with no bank charge, look for its entry with `list_journal_entries`. If more than one charge fits, or none does, show what you found and ask before attaching.
3. Get the file to Setttle the best way you can:
   - If you can run commands or HTTP requests, call `start_upload` with the file name (and size, if you know it), PUT the raw bytes to `uploadUrl` with the returned headers, for example `curl -X PUT --upload-file ./receipt.pdf -H 'content-type: application/pdf' '<uploadUrl>'`, then pass `{ uploadId, filename }` as the file.
   - If the receipt is at a public https link, pass `{ url }`. In ChatGPT, pass a file the user shared as `{ download_url, file_id }`.
   - Send `{ contentBase64, filename }` only for a file under 3 MB, when neither of the above is possible.
   - If you can't send the file at all, say so and ask the user to drop it in Setttle. Once it is there, offer to attach it with `attach_receipt`.
4. Call `add_receipt` with the file, the `facts` you read (vendor, date, total and tax in cents, currency), and the charge's `bankTransactionId`, or the `journalEntryId` of a posted entry. Facts let Setttle attach the receipt in the same call. Leave them out if the receipt isn't in CAD or USD, or you couldn't read it; Setttle then reads it in the background.
5. Tell the user what happened, from the result:
   - Attached to a charge that isn't posted yet: the receipt moves to the entry when the charge is posted.
   - Attached to a posted entry: say so, and say if recoverable tax moved to the tax account.
   - Already in Setttle (`deduped`): say which receipt it matched.
   - `attachError`: the receipt was added and is waiting for review. Say why it didn't attach. `attach_receipt` can retry, once `get_receipt` shows it has been read.

Files can be PDFs or images, up to 10 MB. For a supporting document that isn't a receipt, such as a contract or an asset's invoice, use `attach_document` on its record instead.
