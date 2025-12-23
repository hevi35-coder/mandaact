# PR Merge Verification Checklist

Use this checklist to avoid assuming a merged PR includes newer commits.

## Before saying "it's merged"

- Fetch latest refs: `git fetch origin`
- Verify the exact commit is on main:
  - `git branch -r --contains <commit>`
  - or `git log --oneline origin/main | rg <shortsha>`
- If the PR was already merged, confirm whether new commits were added after merge:
  - `gh pr view <num> --json commits,mergedAt`

## If commits are only on the branch

- Create a new PR from the branch with those commits.
- Enable auto-merge immediately.

## Notes

- A merged PR does not auto-include new commits pushed later.
- Always verify `origin/main` contains the target commit before confirming.
