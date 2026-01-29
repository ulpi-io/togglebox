# Publishing SDKs to npm

This guide covers publishing the ToggleBox JavaScript SDKs to npm.

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
