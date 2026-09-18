---
name: spreadsheet-quality-check
description: Use when the user supplies a table or spreadsheet sample and wants a data quality checklist before analysis.
license: MIT
---
# Spreadsheet Quality Checklist

1. Ask for the table or a redacted sample, the meaning of one row, expected columns, and any known unique key.
2. Check the supplied sample for blanks, inconsistent dates, mixed units, duplicate keys, and values outside user-provided expectations.
3. State the sample size and distinguish observed problems from checks that require the full dataset.
4. For each issue, identify the affected column or row, explain the likely impact, and suggest a reversible correction for review.
5. Never invent missing values or delete rows silently. Do not infer sensitive personal attributes.
6. Return findings with examples and a checklist for validating the complete dataset. Do not claim comprehensive coverage from a sample.

## Expected result

A clear list of observed quality issues, unresolved questions, and practical validation steps.

## Example

If the supplied table repeats an invoice identifier, report both row references and ask whether the key is expected to be unique before recommending any removal.
