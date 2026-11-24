# Releasing

Publishing is automatic. When a push to `main` changes `version` in `packages/editor/package.json` to one that npm does not have yet, `.github/workflows/release.yml`:

1. installs, then runs `pnpm run ready` (format and type check, tests, build);
2. packs the package and publishes it to npm;
3. creates the tag `vX.Y.Z` and a GitHub release with generated notes.

A push that touches `package.json` without a new version (a dependency change, for example) does nothing: the workflow sees that the version is on npm and stops.

## Release a version

```sh
# 1. Change `version` in packages/editor/package.json (0.1.0 -> 0.1.1, 0.2.0, 1.0.0...)
# 2. Run the checks
pnpm run ready
# 3. Commit and push to main
git commit -am "0.1.1: what changed"
git push
```

Watch the run in the Actions tab. While `0.x`, a breaking change is a new minor version (0.2.0).

## One-time setup

The workflow signs in to npm with trusted publishing, so no token is stored in this repository. On npmjs.com, open `cheese-editor` > Settings > Trusted Publisher > GitHub Actions and enter:

| Field       | Value           |
| ----------- | --------------- |
| Owner       | `mtri-git`      |
| Repository  | `cheese-editor` |
| Workflow    | `release.yml`   |
| Environment | (leave empty)   |

Until this is set, the "Publish to npm" step fails with an authentication error. Nothing is published and no tag is created, so you can fix the setting and run the workflow again (Actions > Release > Run workflow).

## When something fails

- **Publish worked, the GitHub release did not.** The version is on npm, so a re-run skips everything. Create the release by hand: `gh release create vX.Y.Z --generate-notes`.
- **The same version cannot be published twice**, even after it is removed from npm. If a release is wrong, publish the next patch version.
