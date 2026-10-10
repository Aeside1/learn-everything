# Issue tracker: GitHub (fork-based)

Issues, specs and task tracking live in GitHub Issues on **our fork**: `Aeside1/learn-everything`.

Upstream (`redmaplewww/learn-everything`) is a read-only reference for us. Do not create,
edit, triage or close issues there unless we deliberately contribute work back.

## Remotes

| Remote | Repository | Use |
| --- | --- | --- |
| `origin` | `Aeside1/learn-everything` (our fork) | every branch, every push, all issues and PRs |
| `upstream` | `redmaplewww/learn-everything` (parent) | fetch only; its push URL is set to `DISABLED` so an accidental push fails immediately instead of landing upstream |

`main` tracks `origin/main`. To undo the push guard on purpose:
`git remote set-url --push upstream https://github.com/redmaplewww/learn-everything.git`.

## Issue operations

`gh repo set-default Aeside1/learn-everything` is already configured for this checkout, so
`gh issue ...` resolves to the fork without `--repo`. Automation, scripts and agents should
still pass `--repo Aeside1/learn-everything` explicitly: it stays correct if the default
changes or another agent runs `gh repo set-default`.

```bash
gh issue create --repo Aeside1/learn-everything --label needs-triage --title "..." --body "..."
gh issue view <number> --repo Aeside1/learn-everything --comments
gh issue list --repo Aeside1/learn-everything --state open --label ready-for-agent
gh issue comment <number> --repo Aeside1/learn-everything --body "..."
gh issue edit <number> --repo Aeside1/learn-everything --add-label ready-for-agent
gh issue close <number> --repo Aeside1/learn-everything --comment "..."
```

Issues were disabled on the fork until they were enabled in repository settings; if `gh`
reports `repository has disabled issues`, that setting was turned off again — fix it with
`gh repo edit Aeside1/learn-everything --enable-issues`.

## Lifecycle

1. Something needs doing → open an issue (or reuse the existing one). New issues start as
   `needs-triage`; the `agent-task` template asks for outcome, scope, acceptance criteria
   and evidence requirements up front.
2. Triage sets exactly one state label: `ready-for-agent`, `ready-for-human`, `needs-info`
   or `wontfix` (see `docs/agents/triage-labels.md`).
3. The implementer works on a branch that references the issue number, commits evidence with
   the code, and only then closes the issue with a comment linking the verification results.
4. Anything not actually executed stays unchecked in the issue body and is listed as a
   remaining limit in the delivery summary. Never mark an unrun check as passing.

## Branches and pull requests

- One branch per issue: `feat/<issue>-<slug>` or `fix/<issue>-<slug>`, branched from an
  up-to-date `main`.
- Default PR target is the fork itself (`Aeside1/learn-everything` `main`), so review,
  evidence and discussion stay in our workspace.
- Contributing back upstream is an explicit, separate step: push the branch to `origin`,
  open a PR against `redmaplewww/learn-everything`, and expect the fork-only workflow files
  (`.github/ISSUE_TEMPLATE`, `.github/pull_request_template.md`, `AGENTS.md` additions,
  `docs/agents/*`) to need trimming from that PR.

## Keeping in sync with upstream

```bash
git fetch upstream
git log --oneline HEAD..upstream/main     # what upstream has that we do not
git merge upstream/main                   # or: git rebase upstream/main on a feature branch
```

Merge (not force) on `main`; keep `main` fast-forwardable and never rewrite pushed history
on the fork.

## Specs, task files and evidence during agent work

GitHub issues are the durable tracker; the working artifacts for a task live in
`.scratch/<task-name>/` and are committed alongside the code:

| Path | Contents |
| --- | --- |
| `.scratch/<task>/specs/` | the approved spec document (also mirrored to `docs/specs/` when it is repo-worthy) |
| `.scratch/<task>/issues/` | per-task acceptance checklists that mirror the GitHub issue body and record what was actually verified |
| `.scratch/<task>/records/` | control inventory, decisions, per-module records and honest limits |
| `.scratch/<task>/evidence/` | browser screenshots, `report.json`, logs — the artifacts a reviewer can open |
| `.scratch/<task>/tools/` | one-off scripts used to produce or audit the evidence |

When a GitHub issue and a local task file disagree, the GitHub issue is the source of truth
for scope and the local record is the source of truth for what was verified.
