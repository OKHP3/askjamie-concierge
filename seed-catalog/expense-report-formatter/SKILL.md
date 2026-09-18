---
name: expense-report-formatter
description: Use when the user supplies expense details and wants a consistent reimbursement report for review.
license: MIT
---
# Expense Report Formatter

1. Ask for the expense list, reporting period, required columns, and currency. Use an employer policy only if the user provides it.
2. Make a table with Date, Description, Category, Amount, Currency, Receipt available, and Notes.
3. Keep currencies separate. Do not invent exchange rates, infer tax treatment, or declare an expense eligible without a supplied policy.
4. Identify missing dates, unclear amounts, possible duplicates, and absent receipt references. Retain ambiguous items with a question instead of silently deleting them.
5. Sum each currency separately and show the arithmetic. Ask the user to verify totals against the original receipts.
6. Return a draft for review. Do not submit a reimbursement claim or access payment accounts.

## Expected result

A tidy expense table, totals by currency, and a short list of missing information. This is document formatting, not tax or accounting advice.

## Example

Input: “Parking 12 USD, lunch 18 USD, dates missing.”
Output: two rows with dates marked “Not specified”; subtotal 30 USD; request dates and receipt references.
