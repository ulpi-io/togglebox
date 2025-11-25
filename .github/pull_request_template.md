## Description

<!-- Provide a brief description of the changes in this PR -->

## Type of Change

<!-- Mark the relevant option with an 'x' -->

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Refactoring (no functional changes)
- [ ] Performance improvement
- [ ] Dependency update

## Motivation and Context

<!-- Why is this change required? What problem does it solve? -->
<!-- If it fixes an open issue, please link to the issue here -->

Fixes #(issue)

## Testing

<!-- Describe the tests you ran to verify your changes -->

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing performed
- [ ] All existing tests pass

## Code Quality Checklist

<!-- Mark completed items with an 'x' -->

- [ ] Code follows the project's style guidelines (ESLint and Prettier)
- [ ] Self-review of code completed
- [ ] Code commented where necessary (especially complex logic)
- [ ] Documentation updated (README, API docs, etc.)
- [ ] No new warnings introduced
- [ ] No hardcoded values (configuration moved to env vars)
- [ ] Error handling implemented
- [ ] No commented-out code
- [ ] Environment variables documented in `.env.example`

## Security Checklist

<!-- Mark completed items with an 'x' -->

- [ ] No secrets or API keys in code
- [ ] Input validation implemented
- [ ] No SQL injection vulnerabilities
- [ ] No XSS vulnerabilities
- [ ] Authentication/authorization properly implemented (if applicable)
- [ ] Dependencies scanned for vulnerabilities (`pnpm audit`)

## Performance Checklist

<!-- Mark completed items with an 'x' -->

- [ ] No N+1 query patterns introduced
- [ ] Database queries optimized (indexes, eager loading)
- [ ] No blocking operations in request handlers
- [ ] Caching strategy considered (if applicable)
- [ ] Pagination implemented for large datasets (if applicable)

## Database Changes

<!-- If this PR includes database changes, describe them -->

- [ ] Prisma schema updated
- [ ] Migrations created
- [ ] Migration tested on staging environment
- [ ] Rollback plan documented
- [ ] Indexes added for new queries

## Deployment Notes

<!-- Any special deployment instructions or considerations -->

- [ ] No special deployment steps required
- [ ] Environment variables need to be updated (documented above)
- [ ] Database migrations need to be run
- [ ] Cache invalidation required
- [ ] Third-party service configuration needed

## Screenshots (if applicable)

<!-- Add screenshots or GIFs to demonstrate the changes -->

## Additional Notes

<!-- Any additional information that reviewers should know -->

## Reviewer Checklist

<!-- For reviewers - mark completed items with an 'x' -->

- [ ] Code is easy to understand and maintain
- [ ] Tests are comprehensive and meaningful
- [ ] No security vulnerabilities introduced
- [ ] Performance impact is acceptable
- [ ] Documentation is clear and complete
- [ ] Changes align with project architecture
- [ ] Error messages are user-friendly
- [ ] Logging is appropriate and useful
