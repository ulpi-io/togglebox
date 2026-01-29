# Publishing SDKs

This guide covers publishing the ToggleBox SDKs to npm (JavaScript) and Packagist (PHP).

## Table of Contents

- [JavaScript SDKs (npm)](#javascript-sdks-npm)
  - [Prerequisites](#prerequisites)
  - [Manual Publishing](#manual-publishing)
  - [Automated Publishing](#automated-publishing-with-github-actions)
- [PHP SDKs (Packagist)](#php-sdks-packagist)
  - [Prerequisites](#prerequisites-1)
  - [Manual Publishing](#manual-publishing-1)
  - [Automated Publishing](#automated-publishing-via-github)

---

# JavaScript SDKs (npm)

## Prerequisites

1. **npm Account**: Create an account at [npmjs.com](https://www.npmjs.com/)
2. **npm Organization**: Create the `@togglebox` organization at https://www.npmjs.com/org/create
3. **npm Authentication**: Login locally with `npm login`
4. **Repository Access**: Write access to the togglebox repository

## SDKs to Publish

| Package                 | Description                                |
| ----------------------- | ------------------------------------------ |
| `@togglebox/sdk`        | Core JavaScript SDK                        |
| `@togglebox/sdk-nextjs` | Next.js SDK with React hooks               |
| `@togglebox/sdk-expo`   | React Native/Expo SDK with offline support |

## Manual Publishing

### 1. Update Version

Update the version in the package.json file(s):

```bash
# For a single SDK
cd packages/sdk-js
npm version patch  # or minor, major

# For all SDKs (recommended to keep in sync)
pnpm version patch --filter @togglebox/sdk --filter @togglebox/sdk-nextjs --filter @togglebox/sdk-expo
```

### 2. Build

```bash
# Build all packages
pnpm build:packages

# Or build individual SDKs
cd packages/sdk-js && pnpm build
cd packages/sdk-nextjs && pnpm build
cd packages/sdk-expo && pnpm build
```

### 3. Test Locally (Optional)

Test the package locally before publishing:

```bash
# Pack the package
cd packages/sdk-js
npm pack

# This creates a .tgz file you can install in a test project
cd /path/to/test-project
npm install /path/to/togglebox-sdk-0.1.0.tgz
```

### 4. Publish

```bash
# Publish a single SDK
cd packages/sdk-js
npm publish

# Publish all SDKs
cd packages/sdk-js && npm publish
cd packages/sdk-nextjs && npm publish
cd packages/sdk-expo && npm publish
```

## Automated Publishing with GitHub Actions

The repository includes a GitHub Actions workflow for automated publishing.

### Trigger a Release

1. **Create and push a version tag:**

```bash
# Update versions first
pnpm version patch --filter @togglebox/sdk --filter @togglebox/sdk-nextjs --filter @togglebox/sdk-expo

# Commit version changes
git add packages/*/package.json
git commit -m "chore: bump SDK versions to 0.1.1"

# Create and push tag
git tag sdk-v0.1.1
git push origin main --tags
```

2. **Workflow runs automatically** when a tag matching `sdk-v*` is pushed

3. **Monitor the release** at https://github.com/ulpi-io/togglebox/actions

### Setup Required Secrets

Add these secrets to your GitHub repository at `Settings > Secrets and variables > Actions`:

| Secret      | Description                                                                       |
| ----------- | --------------------------------------------------------------------------------- |
| `NPM_TOKEN` | npm authentication token from https://www.npmjs.com/settings/YOUR_USERNAME/tokens |

#### Creating an npm Token

1. Go to https://www.npmjs.com/settings/YOUR_USERNAME/tokens
2. Click "Generate New Token"
3. Choose "Automation" type
4. Copy the token and add it to GitHub Secrets as `NPM_TOKEN`

## Version Guidelines

Follow [Semantic Versioning](https://semver.org/):

- **MAJOR** (1.0.0): Breaking changes
- **MINOR** (0.1.0): New features, backward compatible
- **PATCH** (0.0.1): Bug fixes, backward compatible

### Pre-1.0.0 Versions

During initial development (0.x.x):

- Breaking changes: bump MINOR version (0.1.0 → 0.2.0)
- New features: bump MINOR version
- Bug fixes: bump PATCH version (0.1.0 → 0.1.1)

## Package Content

Each published SDK includes:

```
@togglebox/sdk/
├── dist/
│   ├── index.js          # CommonJS bundle
│   ├── index.mjs         # ESM bundle
│   ├── index.d.ts        # TypeScript definitions (CJS)
│   ├── index.d.mts       # TypeScript definitions (ESM)
│   ├── index.js.map      # Source map (CJS)
│   └── index.mjs.map     # Source map (ESM)
├── package.json
└── README.md
```

### What's Bundled

All workspace dependencies are bundled into the SDKs:

- `@togglebox/core`
- `@togglebox/configs`
- `@togglebox/flags`
- `@togglebox/experiments`
- `@togglebox/stats`

### Peer Dependencies

Not bundled (users must install):

- **sdk-nextjs**: `react`, `next`
- **sdk-expo**: `react`, `react-native`, `react-native-mmkv` (optional)

## Verification

After publishing, verify the package:

```bash
# Check on npm
npm view @togglebox/sdk

# Install and test
npm create vite@latest my-test-app -- --template react-ts
cd my-test-app
npm install @togglebox/sdk
```

## Troubleshooting

### "You must be logged in to publish packages"

```bash
npm login
```

### "403 Forbidden - you cannot publish over the previously published versions"

The version already exists. Bump the version:

```bash
npm version patch
npm publish
```

### "402 Payment Required - you must sign up for private packages"

The `@togglebox` organization doesn't exist or you don't have access. Ensure:

1. The organization exists: https://www.npmjs.com/org/togglebox
2. You're a member with publish permissions

### Build Errors

```bash
# Clean and rebuild
pnpm clean
pnpm build:packages
```

## Best Practices

1. **Keep SDKs in sync**: Publish all three SDKs together with the same version
2. **Test before publishing**: Always test the build locally first
3. **Write changelogs**: Update CHANGELOG.md with changes
4. **Tag releases**: Always tag releases in git
5. **Monitor downloads**: Check npm stats periodically

## Resources

- [npm Documentation](https://docs.npmjs.com/)
- [Semantic Versioning](https://semver.org/)
- [npm Organizations](https://docs.npmjs.com/organizations)
- [GitHub Actions for npm](https://docs.github.com/en/actions/publishing-packages/publishing-nodejs-packages)

---

# PHP SDKs (Packagist)

This section covers publishing the ToggleBox PHP SDKs to Packagist.

## Prerequisites

1. **Packagist Account**: Create an account at [packagist.org](https://packagist.org/)
2. **GitHub Repository**: The code must be on GitHub (already satisfied)
3. **Composer Installed**: Install Composer locally from [getcomposer.org](https://getcomposer.org/)
4. **Repository Access**: Write access to the togglebox repository

## SDKs to Publish

| Package             | Description                                  |
| ------------------- | -------------------------------------------- |
| `togglebox/sdk`     | Core PHP SDK (PHP 8.1+)                      |
| `togglebox/laravel` | Laravel SDK with service provider and facade |

## Manual Publishing

### 1. Create Packagist Account

1. Go to [packagist.org](https://packagist.org/) and sign up
2. Connect your GitHub account in Packagist settings
3. You'll need this to submit packages

### 2. Submit Package to Packagist

#### Publishing togglebox/sdk (Base SDK)

1. **Push the code to GitHub** (main branch)

2. **Submit to Packagist:**
   - Go to https://packagist.org/packages/submit
   - Enter repository URL: `https://github.com/ulpi-io/togglebox`
   - Click "Check"
   - Packagist will detect `packages/sdk-php/composer.json`
   - Click "Submit"

3. **Configure package path** (if needed):
   - In package settings on Packagist, set the package path to `packages/sdk-php`
   - This tells Packagist where to find the composer.json

#### Publishing togglebox/laravel (Laravel SDK)

1. **Ensure base SDK is published first** (`togglebox/sdk` must exist on Packagist)

2. **Submit to Packagist:**
   - Go to https://packagist.org/packages/submit
   - Enter repository URL: `https://github.com/ulpi-io/togglebox`
   - For the Laravel package, you may need to submit it separately or use monorepo tools
   - Set package path to `packages/sdk-laravel`

**Note**: For monorepo packages, you may want to use split repositories or configure Packagist monorepo support.

### 3. Enable Auto-Update Hook

After submitting to Packagist:

1. Go to your package page on Packagist
2. Click "Settings" or "Edit"
3. Enable the GitHub service hook
4. This automatically updates Packagist when you push tags to GitHub

### 4. Version Tagging

Create and push version tags to trigger Packagist updates:

```bash
# Create a version tag
git tag php-v0.1.0
git push origin php-v0.1.0

# Or for specific versions
git tag togglebox-sdk-0.1.0
git tag togglebox-laravel-0.1.0
git push --tags
```

### 5. Test Installation

After publishing, test the installation:

```bash
# Test base SDK
composer require togglebox/sdk

# Test Laravel SDK
composer require togglebox/laravel
```

## Automated Publishing via GitHub

Packagist automatically detects new tags when you have the GitHub hook enabled.

### Workflow

1. **Update version in composer.json:**

```bash
# Update version manually in packages/sdk-php/composer.json
# and packages/sdk-laravel/composer.json
```

2. **Commit and tag:**

```bash
git add packages/sdk-php/composer.json packages/sdk-laravel/composer.json
git commit -m "chore: bump PHP SDK versions to 0.1.1"

# Create tags
git tag php-v0.1.1
git push origin main --tags
```

3. **Packagist auto-updates** when it detects the new tag via GitHub webhook

## Version Guidelines

Follow [Semantic Versioning](https://semver.org/):

- **MAJOR** (1.0.0): Breaking changes
- **MINOR** (0.1.0): New features, backward compatible
- **PATCH** (0.0.1): Bug fixes, backward compatible

### Pre-1.0.0 Versions

During initial development (0.x.x):

- Breaking changes: bump MINOR version (0.1.0 → 0.2.0)
- New features: bump MINOR version
- Bug fixes: bump PATCH version (0.1.0 → 0.1.1)

## Monorepo Considerations

Since ToggleBox uses a monorepo structure, you have two options:

### Option 1: Subtree Splits (Recommended)

Create separate repositories for each package:

```bash
# Split sdk-php to its own repo
git subtree split --prefix=packages/sdk-php -b sdk-php-split
git push https://github.com/togglebox/sdk.git sdk-php-split:main

# Split sdk-laravel to its own repo
git subtree split --prefix=packages/sdk-laravel -b sdk-laravel-split
git push https://github.com/togglebox/laravel.git sdk-laravel-split:main
```

Then submit each split repository to Packagist normally.

### Option 2: Monorepo Package Path

Configure Packagist to read from specific paths in the monorepo:

1. Submit the main repository to Packagist
2. In package settings, specify the subdirectory path
3. This requires Packagist Business or manual configuration

For simplicity, **Option 1 (subtree splits)** is recommended for PHP packages.

## Package Content

Each published PHP SDK includes:

```
togglebox/sdk/
├── src/
│   ├── ToggleBoxClient.php
│   ├── Exceptions/
│   ├── Types/
│   ├── Cache/
│   └── Http/
├── composer.json
└── README.md

togglebox/laravel/
├── src/
│   ├── ToggleBoxServiceProvider.php
│   ├── Facades/
│   └── Cache/
├── config/
│   └── togglebox.php
├── composer.json
└── README.md
```

## Verification

After publishing, verify the package:

```bash
# Check on Packagist
# Visit: https://packagist.org/packages/togglebox/sdk
# Visit: https://packagist.org/packages/togglebox/laravel

# Install and test
composer create-project laravel/laravel test-app
cd test-app
composer require togglebox/laravel
```

## Troubleshooting

### "Could not find package"

The package hasn't been submitted to Packagist yet:

1. Go to https://packagist.org/packages/submit
2. Submit your repository URL
3. Wait for Packagist to index it

### "Your GitHub account is not linked"

Link your GitHub account in Packagist settings:

1. Go to https://packagist.org/profile/edit
2. Click "Connect to GitHub"
3. Authorize the application

### "Version constraint issue"

The laravel package depends on `togglebox/sdk`:

- Ensure `togglebox/sdk` is published to Packagist first
- Update version constraints in composer.json if needed

### Monorepo Detection Issues

If Packagist doesn't detect your package in the monorepo:

1. Use subtree splits (Option 1 above)
2. Or manually specify the package path in Packagist settings

## Best Practices

1. **Keep SDKs in sync**: Publish both PHP SDKs together with compatible versions
2. **Test before publishing**: Run `composer install` locally to test dependencies
3. **Write changelogs**: Update CHANGELOG.md with changes
4. **Tag releases**: Always tag releases in git
5. **Monitor downloads**: Check Packagist stats periodically
6. **Use subtree splits**: For monorepos, split packages into separate repos for easier management

## Resources

- [Packagist Documentation](https://packagist.org/about)
- [Composer Documentation](https://getcomposer.org/doc/)
- [Semantic Versioning](https://semver.org/)
- [Monorepo Tools](https://github.com/splitsh/lite) (for subtree splits)
- [Laravel Package Development](https://laravel.com/docs/packages)
