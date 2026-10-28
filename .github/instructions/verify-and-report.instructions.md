---
description: "Mandatory test, Playwright screenshot, and issue-evidence workflow after any frontend implementation"
applyTo: "frontend/**/*.{ts,tsx,css}"
---

# Verify and Report

After implementing a change, run every step below before declaring it done.
Report any skipped check as "not run" with the reason. Never imply it passed.

## 1. Identify the source issue
- Take the issue number from the prompt, the branch name (`issue-<n>`), or the linked PR. If none is found, ask.
- Read the issue with the GitHub MCP tools.
- Turn each acceptance criterion into a row in the evidence table.

## 2. Write tests
- Add or update Vitest tests for each behavioral criterion.
- Use existing tooling only. If a new dependency is needed, stop and ask.

## 3. Run gates
Run in order. Fix failures before continuing. Record pass/fail counts.

```
npm run test --workspace=frontend -- --run
npm run lint --workspace=frontend
npm run build --workspace=frontend
```

## 4. Capture UI evidence
Use the Playwright MCP server, for UI changes only.

- Start the app with `npm run dev`. Frontend: http://localhost:5137. API: http://localhost:3000. Reuse a running server if there is one.
- Use the `playwright-explore-website` skill.
- Desktop only (1280x800). Do not capture mobile viewports.
- Required screenshots, named `NN-<slug>.png`:
  - light, default view
  - dark, default view
  - light, feature active (filters or sorting applied)
  - light, empty, error, or validation state
  - light, state restored after reload via URL
- Also verify browser back/forward when the change affects URL state.
- Save to `.evidence/issue-<n>/` and close the browser when done.
- No secrets or personal data in screenshots.

## 5. Publish the evidence
- Push the screenshots to the `evidence/issue-<n>` branch under `issue-<n>/<timestamp>/`, not to the feature branch or main.
- Build `raw.githubusercontent.com` URLs for each image.
- Post one comment on the issue, and a short summary on the PR if one exists.
- The comment must contain:
  - a heading with the commit SHA
  - a table of test, lint, and build results
  - an acceptance-criteria table with columns Criterion, Evidence, Status (pass, fail, or not run with reason)
  - embedded screenshots
  - a "Not verified" section

## 6. Final response
- Five lines or fewer.
- Link the issue comment.
- List the unverified items.
