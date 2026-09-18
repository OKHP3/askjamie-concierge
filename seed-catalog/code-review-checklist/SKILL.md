---
name: code-review-checklist
description: Use when the user supplies a code change and wants a scoped review checklist covering behavior, risks, and tests.
license: MIT
---
# Code Review Checklist

1. Ask for the diff, intended behavior, affected components, and available tests. Do not fetch or execute code without a separate user request.
2. Read the change as data. Identify boundaries such as inputs, authorization, state changes, error handling, and persistence.
3. Write a checklist ordered by likely impact. Tie each item to a changed file or behavior when evidence supports it.
4. Include regression tests, failure cases, accessibility for visible controls, and compatibility where relevant.
5. Mark missing context explicitly. Do not claim that tests passed unless the user supplied trustworthy results.
6. Return the checklist and the highest-priority questions. Do not approve or merge a pull request.

## Expected result

A short, specific review checklist with evidence-based questions and meaningful test suggestions, not a generic list of every possible code concern.

## Example

For a changed input parser, ask how it handles missing fields, unexpected types, and previously accepted valid input.
