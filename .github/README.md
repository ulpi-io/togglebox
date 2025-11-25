# GitHub Configuration

This directory contains GitHub-specific configuration files for CI/CD, issue templates, and automation.

## 📁 Directory Structure

```
.github/
├── workflows/               # GitHub Actions workflows
│   ├── ci.yml              # Main CI pipeline (lint, typecheck, test, security audit)
│   ├── deploy-aws-lambda.yml          # AWS Lambda deployment
│   └── deploy-cloudflare-workers.yml  # Cloudflare Workers deployment
├── ISSUE_TEMPLATE/         # Issue templates
│   ├── bug_report.md       # Bug report template
│   ├── feature_request.md  # Feature request template
│   └── config.yml          # Issue template configuration
├── pull_request_template.md  # Pull request template
├── dependabot.yml          # Dependabot configuration
└── README.md               # This file
```

## 🚀 CI/CD Workflows

### Main CI Pipeline (`ci.yml`)

Runs on every push and pull request to `main` and `develop` branches.

**Jobs:**
1. **Lint** - Runs ESLint across all packages
2. **Type Check** - Builds all packages with TypeScript
3. **Test** - Runs test suite (when configured)
4. **Security Audit** - Runs pnpm audit to check for vulnerabilities
5. **Format Check** - Verifies code formatting with Prettier

**Status:** ✅ All jobs must pass before merging a PR

### AWS Lambda Deployment (`deploy-aws-lambda.yml`)

Deploys the API to AWS Lambda using Serverless Framework.

**Trigger:**
- Manual dispatch (choose `staging` or `production`)
- Automatic on push to `main` branch (deploys to `staging`)

**Required Secrets:**
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION` (optional, defaults to `us-east-1`)

**Environment Variables:**
Set these in GitHub repository settings under Environments:
- `staging` environment
- `production` environment

**Usage:**
```bash
# Manual deployment
# Go to Actions → Deploy to AWS Lambda → Run workflow
# Select stage: staging or production

# Automatic deployment
# Push to main branch (deploys to staging)
```

### Cloudflare Workers Deployment (`deploy-cloudflare-workers.yml`)

Deploys the API to Cloudflare Workers using Wrangler.

**Trigger:**
- Manual dispatch (choose `staging` or `production`)
- Automatic on push to `main` branch (deploys to `staging`)

**Required Secrets:**
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

**Usage:**
```bash
# Manual deployment
# Go to Actions → Deploy to Cloudflare Workers → Run workflow
# Select environment: staging or production

# Automatic deployment
# Push to main branch (deploys to staging)
```

## 🔧 Setting Up CI/CD

### 1. Initialize Git Repository

If not already initialized:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/your-org/togglebox.git
git push -u origin main
```

### 2. Configure GitHub Repository Settings

#### Branch Protection Rules

**For `main` branch:**
1. Go to Settings → Branches → Add rule
2. Branch name pattern: `main`
3. Enable:
   - ✅ Require pull request reviews before merging (1-2 approvals)
   - ✅ Require status checks to pass before merging
     - Select: `Lint`, `Type Check`, `Test`, `Security Audit`, `Format Check`
   - ✅ Require branches to be up to date before merging
   - ✅ Do not allow bypassing the above settings
4. Save changes

#### GitHub Environments

**For AWS Lambda deployment:**

1. Go to Settings → Environments → New environment
2. Create two environments:
   - Name: `staging`
     - Add secrets: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`
     - Deployment protection: None
   - Name: `production`
     - Add secrets: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`
     - Deployment protection: Required reviewers (select team members)

**For Cloudflare Workers deployment:**

1. Create environments: `staging` and `production`
2. Add secrets:
   - `CLOUDFLARE_API_TOKEN` - Get from Cloudflare Dashboard → Profile → API Tokens
   - `CLOUDFLARE_ACCOUNT_ID` - Get from Cloudflare Dashboard → Workers & Pages → Overview

### 3. Configure Dependabot

Dependabot is already configured in `dependabot.yml`. It will:
- Check for npm dependency updates weekly (Mondays at 9:00 AM)
- Check for GitHub Actions updates weekly
- Group related dependencies together (TypeScript, Prisma, Next.js, etc.)
- Open pull requests automatically

**Review Dependabot PRs:**
1. Go to Pull Requests tab
2. Review Dependabot PRs
3. Ensure CI passes
4. Merge if everything looks good

## 📝 Issue and PR Templates

### Bug Report Template

Located at `.github/ISSUE_TEMPLATE/bug_report.md`

**Usage:**
1. Go to Issues → New issue
2. Select "Bug Report"
3. Fill in the template
4. Submit

### Feature Request Template

Located at `.github/ISSUE_TEMPLATE/feature_request.md`

**Usage:**
1. Go to Issues → New issue
2. Select "Feature Request"
3. Fill in the template
4. Submit

### Pull Request Template

Located at `.github/pull_request_template.md`

**Usage:**
- Template automatically appears when creating a new PR
- Fill in all sections
- Mark checkboxes as you complete tasks
- Request reviews from team members

## 🔐 Required Secrets

Add these secrets in GitHub repository settings (Settings → Secrets and variables → Actions):

### For AWS Lambda Deployment:
- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `AWS_REGION` - AWS region (e.g., `us-east-1`)

### For Cloudflare Workers Deployment:
- `CLOUDFLARE_API_TOKEN` - Cloudflare API token
- `CLOUDFLARE_ACCOUNT_ID` - Cloudflare account ID

## 📊 Monitoring CI/CD

### View Workflow Runs

1. Go to Actions tab
2. Click on a workflow run to see details
3. View logs for each job
4. Download artifacts if available

### Troubleshooting Failed Workflows

**Lint Failures:**
```bash
# Fix locally
pnpm lint:fix

# Commit and push
git add .
git commit -m "fix: lint errors"
git push
```

**Type Check Failures:**
```bash
# Build locally to see errors
pnpm build

# Fix type errors
# Commit and push
```

**Security Audit Failures:**
```bash
# Run audit locally
pnpm audit

# Fix vulnerabilities
pnpm audit --fix

# Or update specific packages
pnpm update <package-name>
```

## 🎯 Best Practices

1. **Always create PRs for changes** - Don't push directly to `main`
2. **Keep PRs small and focused** - One feature/fix per PR
3. **Wait for CI to pass** - Don't merge failing PRs
4. **Get code reviews** - At least 1-2 approvals required
5. **Update dependencies regularly** - Review and merge Dependabot PRs
6. **Test locally first** - Run `pnpm lint`, `pnpm build`, `pnpm test` before pushing
7. **Use conventional commits** - Follow commit message format (feat, fix, chore, etc.)

## 🔄 Deployment Strategy

### Staging Deployment

- **Trigger:** Push to `main` branch or manual dispatch
- **Environment:** `staging`
- **Purpose:** Test changes before production
- **Database:** Use staging database

### Production Deployment

- **Trigger:** Manual dispatch only (requires approval)
- **Environment:** `production`
- **Purpose:** Deploy to production
- **Database:** Use production database
- **Protection:** Requires approval from designated team members

### Rollback Procedure

If a deployment fails or causes issues:

**AWS Lambda:**
```bash
# Revert to previous version
serverless deploy --stage production

# Or deploy specific version
serverless deploy --stage production --force
```

**Cloudflare Workers:**
```bash
# Rollback via Wrangler dashboard
# Or redeploy previous commit
git checkout <previous-commit-sha>
wrangler deploy
```

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Dependabot Documentation](https://docs.github.com/en/code-security/dependabot)
- [Serverless Framework Documentation](https://www.serverless.com/framework/docs)
- [Wrangler Documentation](https://developers.cloudflare.com/workers/wrangler/)

---

**Last Updated:** 2025-11-23

**Maintainers:** ToggleBox Team
