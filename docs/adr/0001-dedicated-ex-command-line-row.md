---
number: 1
title: Dedicated Ex command-line row
date: 2026-05-28
status: accepted
tags:
- ex
- rendering
---

# 1. Dedicated Ex command-line row

Date: 2026-05-28

## Status

Accepted

## Context

Ex commands can be long, and Vim-fluent users expect a distinct command-line surface. The existing status/pending display was the alternative surface for Ex input and messages.

## Decision

pi-vimmode will render Ex command-line input and transient Ex messages in an extra row below the prompt box, shrinking the prompt viewport by one row while that row is visible. We chose this over reusing the existing status/pending display.

## Consequences

The extra renderer complexity is acceptable for clearer command editing and feedback.
