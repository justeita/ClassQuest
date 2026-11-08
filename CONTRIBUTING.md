# Contributing to ClassQuest

## Development setup

1. Install Bun 1.4.0.
2. Run `bun install`.
3. Copy `.env.example` to `.env.local` and add local values as needed.
4. Start the development server with `bun dev`.

## Before opening a pull request

Run the complete local validation suite:

```bash
bun run check
bun run build
```

Keep changes focused, add or update tests for behavior changes, and update
documentation when configuration or developer workflows change.

## Pull requests

- Use the pull request template.
- Explain the problem, the solution, and how the change was verified.
- Keep the Bun lockfile in sync with dependency changes.
- Do not commit `.env` files, generated output, or lockfiles from another package manager.
- At least one code owner must approve the pull request.

## Commit and review expectations

Prefer small, focused commits with clear messages. Reviewers should check
correctness, accessibility, error handling, test coverage, and unintended
behavior changes.

Commit subjects follow the convention in
[docs/08-workflow/git-and-pr.md](docs/08-workflow/git-and-pr.md):
`feat`, `fix`, `docs`, `style`, `refactor`, or `chore`, optionally with a scope.

Rewriting pushed history (force push, rebase, amend, squash merge) is not
allowed. Merges use merge commits.

All work must follow [docs/11-logicodix/README.md](docs/11-logicodix/README.md).
Two rules worth repeating here:

- Commits must come from team members. Do not enable tools that commit on their own.
- Never commit credentials. Keep local values in `.env.local`.
