# CI/CD Quick Start

## 🚀 Setup in 5 Minutes

### 1. Add GitHub Secrets

Go to: `Settings > Secrets and variables > Actions > New repository secret`

Add these 8 secrets:

| Name | Value |
|------|-------|
| `AWS_ACCESS_KEY_ID_DEV` | Your AWS access key for dev |
| `AWS_SECRET_ACCESS_KEY_DEV` | Your AWS secret key for dev |
| `AWS_ACCESS_KEY_ID_PROD` | Your AWS access key for production |
| `AWS_SECRET_ACCESS_KEY_PROD` | Your AWS secret key for production |
| `AWS_REGION_DEV` | `ap-south-1` |
| `AWS_REGION_PROD` | `ap-south-1` |
| `ACM_CERTIFICATE_ARN_DEV` | Your ACM certificate ARN for dev |
| `ACM_CERTIFICATE_ARN_PROD` | Your ACM certificate ARN for production |

### 2. Ensure SSM Parameters Exist

```bash
# Check if parameters exist
aws ssm get-parameter --name "/togglebox/dev/jwt-secret" --region ap-south-1
aws ssm get-parameter --name "/togglebox/dev/api-key-secret" --region ap-south-1
```

### 3. Push to Deploy

```bash
# Deploy to dev
git checkout dev
git push origin dev

# Deploy to production
git checkout main
git push origin main
```

## 📋 What Happens

### On Push to `dev` branch:
✅ Installs dependencies  
✅ Builds packages  
✅ Builds API  
✅ Deploys to AWS Lambda (dev stage)  
✅ Updates API Gateway  
✅ Shows deployment summary  

### On Push to `main` branch:
✅ Same as above  
✅ Deploys to production stage  

### On Pull Request:
✅ Validates build  
✅ Packages Lambda functions  
❌ Does NOT deploy  
✅ Comments on PR with status  

## 🔍 Monitor Deployments

- **GitHub Actions:** `Actions` tab in repository
- **AWS Console:** CloudFormation > Stacks
- **API Health:** `curl https://togglebox-api.mumzstage.com/health`

## 📚 Full Documentation

See [CICD_SETUP.md](./CICD_SETUP.md) for complete documentation.
