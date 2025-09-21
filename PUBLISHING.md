# Publishing @i18nguard packages to npm

This repo is a pnpm workspace with multiple packages under the `@i18nguard` scope.

## Prerequisites

- npm organization `i18nguard` created and you are an Owner/Admin.
- Your npm account enabled with 2FA (at least for auth).
- Node 18+ and pnpm 8+ installed.
- You are logged in: `npm login`.

## One-time setup

1. Ensure your npm user is added to the `i18nguard` org with Publish permissions.
2. Confirm each package has:
   - a scoped name (e.g., `@i18nguard/cli`)
   - `publishConfig.access: public`
   - `files` field including built artifacts
3. Optional: Create an npm automation token for CI (type: Automation) with 2FA on publish disabled.

## Building

From the repo root:

```sh
pnpm install
pnpm build
```

This builds all packages in `packages/*`.

## Versioning

We recommend using Changesets:

```sh
pnpm changeset
pnpm version-packages
```

This bumps versions and writes changelogs. Commit and push.

## Publishing (manual)

Publish a single package (example: cli):

By défaut en local, la provenance est désactivée (.npmrc `provenance=false`).
Active-la en CI (GitHub Actions) avec `--provenance`.

```sh
cd packages/cli
npm publish --access public
```

Or publish all workspaces that changed:

```sh
pnpm -r --filter "./packages/*" publish --access public
```

If using Changesets:

```sh
pnpm release
```

Where `release` can run `pnpm build && changeset publish`.

## Troubleshooting

- 403 Forbidden: Ensure you are a maintainer in the `i18nguard` org and using the correct scope in `name`.
- Private by default for scoped packages: Add `"publishConfig": { "access": "public" }`.
- Missing files: Check the `files` field and that `dist` exists.
- Provenance errors: Requires GitHub-linked repo and npm account with provenance enabled.
