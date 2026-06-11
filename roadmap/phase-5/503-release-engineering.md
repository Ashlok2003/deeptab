# Release engineering

| Priority | Estimate | Labels | Depends on |
|---|---|---|---|
| P0 | M | phase-5 | 008 |

## Problem

No path from merged code to users' editors. Need versioning discipline, automated publishing, and a pre-release channel so risky features (304, 307) can bake.

## Tasks

- [ ] Semantic versioning policy: even/odd or VS Code pre-release flag convention; document in CONTRIBUTING.
- [ ] Conventional commits already in use → automate CHANGELOG generation (changesets or conventional-changelog) per release.
- [ ] GitHub Actions release workflow: tag push → build bundle (502) → run full test suite → `vsce package` → publish to VS Code Marketplace (`VSCE_PAT` secret) + Open VSX (`ovsx`) → attach VSIX to GitHub Release.
- [ ] Pre-release channel: `vsce publish --pre-release` from `main`; stable from release tags. Feature flags (nextEdit, shadowValidation, racing) default-on in pre-release, default-off in stable until proven.
- [ ] Marketplace listing assets: icon, gallery banner, categories (`Programming Languages`, `Machine Learning`), keywords, screenshots/GIF of completion flow; `galleryBanner` + `icon` in package.json.
- [ ] Publisher account setup + 2FA; document the manual steps in `docs/releasing.md` (to create).
- [ ] Rollback procedure documented: unpublish vs hotfix-forward decision tree.

## Acceptance criteria

- Pushing tag `v0.1.0` publishes to both marketplaces with generated changelog, no manual steps beyond the tag.
- Pre-release installs update to stable correctly.
- A user can install from Marketplace and reach working completions following README alone.

## Out of scope

- Auto-update server / private distribution.
