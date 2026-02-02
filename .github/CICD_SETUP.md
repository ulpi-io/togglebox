# CI/CD Setup for ToggleBox API

This document explains how to set up GitHub Actions for automated deployment of the ToggleBox API to AWS Lambda.

## GitHub Secrets Required

Add these secrets in your GitHub repository settings (`Settings > Secrets and variables > Actions`):

### Required Secrets

| Secret Name | Description | Example |
|------------|-------------|---------|
| `AWS_ACCESS_KEY_ID_DEV` | AWS Access Key ID for dev | `AKIAIOSFODNN7EXAMPLE` |
| `AWS_SECRET_ACCESS_KEY_DEV` | AWS Secret Access Key for dev | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |
| `AWS_ACCESS_KEY_ID_PROD` | AWS Access Key ID for production | `AKIAIOSFODNN7EXAMPLE` |
| `AWS_SECRET_ACCESS_KEY_PROD` | AWS Secret Access Key for production | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |
| `AWS_REGION_DEV` | AWS Region for dev stage | `ap-south-1` |
| `AWS_REGION_PROD` | AWS Region for production stage | `ap-south-1` |
| `ACM_CERTIFICATE_ARN_DEV` | ACM Certificate ARN for dev domain | `arn:aws:acm:ap-south-1:123456789012:certificate/xxx` |
| `ACM_CERTIFICATE_ARN_PROD` | ACM Certificate ARN for production domain | `arn:aws:acm:ap-south-1:123456789012:certificate/xxx` |

### Optional Secrets (if using different AWS accounts)

If you want to use different AWS accounts for dev and production, the workflow already supports separate credentials per environment using the `_DEV` and `_PROD` suffixes.

## Workflow Behavior

### On Push
- **Branch: `dev`** → Deploys to `dev` stage
- **Branch: `main`** → Deploys to `production` stage

### On Pull Request
- Validates the build by packaging the Lambda functions
- Does NOT deploy
- Comments on PR with build status

## Deployment Stages

### Dev Stage
- **Branch:** `dev`
- **Stage:** `dev`
- **Region:** Value from `AWS_REGION_DEV` secret
- **Domain:** `togglebox-api.mumzstage.com` (if configured)

### Production Stage
- **Branch:** `main`
- **Stage:** `production`
- **Region:** Value from `AWS_REGION_PROD` secret
- **Domain:** Configure in `serverless.yml` custom domain settings

## Setup Instructions

### 1. Add GitHub Secrets

```bash
# Go to your GitHub repository
# Settings > Secrets and variables > Actions > New repository secret

# Add each secret listed above
```

### 2. Configure SSM Parameters (per stage)

For **dev** stage:
```bash
aws ssm put-parameter \
  --name "/togglebox/dev/jwt-secret" \
  --value "your-jwt-secret-here" \
  --type "SecureString" \
  --region ap-south-1

aws ssm put-parameter \
  --name "/togglebox/dev/api-key-secret" \
  --value "your-api-key-secret-here" \
  --type "SecureString" \
  --region ap-south-1
```

For **production** stage:
```bash
aws ssm put-parameter \
  --name "/togglebox/production/jwt-secret" \
  --value "your-jwt-secret-here" \
  --type "SecureString" \
  --region ap-south-1

aws ssm put-parameter \
  --name "/togglebox/production/api-key-secret" \
  --value "your-api-key-secret-here" \
  --type "SecureString" \
  --region ap-south-1
```

### 3. Update serverless.yml for Production

Update `apps/api/serverless.yml` to support production stage:

```yaml
custom:
  customDomain:
    domainName: ${self:custom.domains.${self:provider.stage}}
    certificateArn: ${env:ACM_CERTIFICATE_ARN}
    basePath: ''
    stage: ${self:provider.stage}
    createRoute53Record: true
    endpointType: 'regional'
    securityPolicy: tls_1_2
    apiType: rest
  
  domains:
    dev: togglebox-api.mumzstage.com
    production: togglebox-api.yourdomain.com
```

### 4. Create Custom Domain (Production)

```bash
cd apps/api
npx serverless@3 create_domain --stage production --region ap-south-1
```

### 5. Push to Trigger Deployment

```bash
# Deploy to dev
git checkout dev
git add .
git commit -m "Deploy to dev"
git push origin dev

# Deploy to production
git checkout main
git merge dev
git push origin main
```

## Workflow Triggers

The workflow runs when:
1. Code is pushed to `dev` or `main` branches
2. Pull request is opened/updated targeting `dev` or `main`
3. Changes are made to:
   - `apps/api/**`
   - `packages/**` (shared dependencies)
   - `.github/workflows/deploy-api.yml`

## Monitoring Deployments

### GitHub Actions UI
- Go to `Actions` tab in your repository
- Click on the workflow run to see logs

### AWS CloudWatch
- Check Lambda function logs: `/aws/lambda/togglebox-config-service-{stage}-{function}`

### Test Deployment
```bash
# Dev
curl https://togglebox-api.mumzstage.com/health

# Production
curl https://togglebox-api.yourdomain.com/health
```

## Rollback

To rollback a deployment:

```bash
# Revert the commit
git revert <commit-hash>
git push origin main

# Or deploy a specific version
cd apps/api
npx serverless@3 deploy --stage production --region ap-south-1
```

## Troubleshooting

### Build Fails
- Check Node.js version (should be 20)
- Verify all dependencies are in `pnpm-lock.yaml`
- Check build logs in GitHub Actions

### Deployment Fails
- Verify AWS credentials are correct
- Check IAM permissions for deployment
- Verify SSM parameters exist
- Check CloudFormation stack status in AWS Console

### Custom Domain Issues
- Verify ACM certificate is valid
- Check Route53 hosted zone exists
- Ensure domain is created: `npx serverless@3 create_domain`

## Security Best Practices

1. **Use IAM roles with minimal permissions**
2. **Rotate AWS credentials regularly**
3. **Use different AWS accounts for dev/prod**
4. **Enable MFA for AWS accounts**
5. **Store secrets in SSM Parameter Store (encrypted)**
6. **Review CloudFormation stack changes before deployment**

## Cost Optimization

- Lambda functions use pay-per-request pricing
- DynamoDB tables use on-demand billing
- API Gateway charges per request
- Monitor costs in AWS Cost Explorer

## Support

For issues or questions:
- Check GitHub Actions logs
- Review AWS CloudWatch logs
- Check serverless.yml configuration
