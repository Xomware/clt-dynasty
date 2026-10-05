# CLT Dynasty

> This file is loaded into every Claude session. Keep it lean and accurate.

## What This Is
The CLT Dynasty League site at `https://clt.dynasty.xomware.com`: a Next.js static export with Smirnoff's classic XP desktop shell, behind Google sign-in. The revamp plan is `~/Code/docs/features/clt-dynasty-revamp/PLAN.md`.

There is no backend here. CLT calls Xomper's API (`https://api.xomper.xomware.com`); CLT-only routes live in `Xomware/xomper-back-end` under `/clt/*`, with their infrastructure in `Xomware/xomper-infrastructure`.

The repo is `Xomware/clt-dynasty`, public.

## Stack
- `frontend/`: Next.js static export, XP look copied from `smirnoff-league`
- `infrastructure/terraform/`: site hosting (`web-hosting` module), deploy role, Supabase archive bucket
- Auth: `clt-client` (Google only) on the shared `xomware-users` Cognito pool, id in SSM `/xomware/shared/cognito/clients/clt-id`
- CI: reusable workflows from `Xomware/github-actions@v1`; secrets and role ARNs in Infisical project `code`, folder `/clt-dynasty`

## Key Commands
- Terraform runs only in GitHub Actions. Never run it locally; read plans from the PR comment.

## Project Config
```yaml
pm_tool: none
base_branch: main
```

## Constraints
- Public repo: no manager names or emails in git, and no Supabase dump in git. Fixtures key by `roster_id`.
- No emoji glyphs in the UI. Use SVG/pixel icons.
- This stack adopted the old site's bucket, distribution and A record by `import`. Never revert the hostname-takeover PR or remove the `web_hosting` block: the next apply would destroy all three. Fix forward.
- The Supabase archive bucket and its key are `prevent_destroy`. No role in this stack gets access to them.
