# Publishing to GitHub and npm

**English** | [简体中文](i18n/zh-CN/publishing.md) | [繁體中文](i18n/zh-TW/publishing.md) | [日本語](i18n/ja/publishing.md) | [한국어](i18n/ko/publishing.md) | [Español](i18n/es/publishing.md) | [Français](i18n/fr/publishing.md) | [Deutsch](i18n/de/publishing.md) | [Português (Brasil)](i18n/pt-BR/publishing.md) | [Русский](i18n/ru/publishing.md)

## Accounts and package name

The GitHub repository is `Zeroman/react-auto-components`. npm accounts require a separate registration. The intended package name is `@zeroman/react-auto-components`; confirm ownership of the `@zeroman` scope before publishing. The package has not been published to npm yet.

1. Open the [npm signup page](https://www.npmjs.com/signup), enter a username, email, and password, and personally review and accept the terms.
2. Verify the registration email. npm requires a verified email before publishing; publisher email addresses appear in package metadata, so choose an address suitable for public maintenance.
3. Enable two-factor authentication in account settings and save recovery information. Never place passwords, verification codes, recovery codes, or tokens in the repository or chat.
4. Run `npm login --registry=https://registry.npmjs.org/` and follow the browser prompts. Confirm the account with `npm whoami --registry=https://registry.npmjs.org/`.
5. A personal scope such as `@<npm-username>/react-auto-components` is recommended. For an organization scope, verify membership and publishing permissions first.

Once the name is final, update the root package.json name, imports in every README translation, consumer dependencies, and source/test imports. Then run `pnpm prepare:test-project` to refresh the consumer lockfile. The packaging script derives tarball names from the root package.json.

Official documentation: [account registration](https://docs.npmjs.com/creating-a-new-npm-user-account/), [public scoped packages](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/), and [two-factor authentication](https://docs.npmjs.com/about-two-factor-authentication/).

## Pre-release verification

Run from the repository root:

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm prepare:test-project
pnpm --dir test-project build
pnpm exec playwright install chromium
pnpm test:e2e
npm pack --dry-run
```

`prepack` builds JavaScript, CSS, and declarations automatically; `prepublishOnly` runs type checks and unit tests. The npm package contains only dist, the README and migration-guide translations, LICENSE, and package.json. Check that credentials, local logs, and test output are excluded. Other repository documentation is linked on GitHub.

`test-project` validates real public entry points through a content-hashed tarball. On a fresh clone, run `pnpm prepare:test-project` from the root before installing in that directory. The preparation command updates the consumer's local dependency and lockfile.

## First release

After account setup, the final package name, the license, and the checks above are complete:

```sh
npm whoami --registry=https://registry.npmjs.org/
npm publish --access public --registry=https://registry.npmjs.org/
```

Complete any verification requested by npm. After publishing, run `npm view <package-name> version` using the final name, then install and verify it in a fresh consumer project. Remove the first-release preparation notice from every README translation and add installation instructions after the first release succeeds.

Update version and every CHANGELOG translation before each release. Do not try to overwrite a published version. The repository's current CI only verifies changes; it does not automatically publish to npm.

## Future automated releases

After the first release, configure [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/) to bind the package to the GitHub repository and a specific workflow file. Use a GitHub-hosted runner and OIDC `id-token: write`, without a long-lived npm token. The documented requirements are Node >=22.14.0 and npm CLI >=11.5.1. Before enabling it, implement and verify the publishing workflow and ensure the tag, package.json version, and tested commit match.

GitHub Actions CI installs from the lockfile, checks types, runs unit tests, builds the real tarball consumer, and runs Chromium tests. Branch protection can require CI before merging; configure it as maintenance needs evolve with external contributions.
