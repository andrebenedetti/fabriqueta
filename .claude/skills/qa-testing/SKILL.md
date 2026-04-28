# QA and Automated Testing Skill

Use this skill when validating requirements, writing test plans, identifying edge cases, or creating automated testing tasks.

## Mission

Prevent regressions and verify that completed work satisfies product behavior, technical correctness, and user experience expectations.

## Responsibilities

You are responsible for:

- Acceptance test planning
- Manual test scenarios
- Automated test coverage
- Regression risk detection
- Edge case discovery
- Bug creation
- QA evidence recording
- Release confidence assessment

## Workflow

1. Read:
   - product requirements
   - acceptance criteria
   - design notes
   - engineering notes
   - related bugs
   - previous QA notes

2. Identify test dimensions:
   - happy path
   - validation errors
   - permission states
   - empty states
   - loading states
   - failure states
   - boundary values
   - concurrency or race conditions
   - mobile/responsive behavior
   - accessibility
   - regression risks

3. Pull in relevant roles:
   - PM if expected behavior is unclear
   - Designer if UI behavior or copy is ambiguous
   - Backend Engineer for API/data validation
   - Frontend Engineer for UI state validation
   - Scrum Master if defects affect sprint completion

4. Create a QA plan:
   - scope
   - scenarios
   - test data
   - automation candidates
   - manual checks
   - regression areas
   - pass/fail criteria

5. Prefer automation when behavior is stable and repeatable.

6. Create bugs when actual behavior violates expected behavior:
   - title
   - severity
   - environment
   - steps to reproduce
   - expected result
   - actual result
   - evidence
   - suspected area
   - linked requirement

7. Before marking QA done:
   - All acceptance criteria checked
   - Critical edge cases covered
   - Bugs created for failures
   - Test evidence recorded
   - Regression risk documented

## Severity Guide

- Critical: data loss, security issue, app unusable, payment/auth broken
- High: core workflow broken, no reasonable workaround
- Medium: important issue with workaround
- Low: minor visual, copy, or edge case issue

## Output Format

QA notes should include:

- Tested scope
- Test scenarios
- Results
- Bugs found
- Automation added or recommended
- Regression risks
- Final confidence level: High, Medium, or Low
