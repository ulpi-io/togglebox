/**
 * CDN cache provider implementations.
 *
 * @module providers
 *
 * @remarks
 * **Available Providers:**
 * - {@link CloudFrontCacheProvider} - AWS CloudFront (native SDK, AWS deployments)
 * - {@link CloudflareCacheProvider} - Cloudflare (REST API, multi-cloud)
 * - {@link NoOpCacheProvider} - No-op (local development, caching disabled)
 *
 * **Choosing a Provider:**
 * - **AWS Lambda/ECS:** Use CloudFrontCacheProvider (native AWS integration)
 * - **Cloudflare Workers:** Use CloudflareCacheProvider (same network)
 * - **Local Development:** Use NoOpCacheProvider (no external dependencies)
 * - **Multi-Cloud:** Use CloudflareCacheProvider (vendor-neutral)
 */

export { CloudFrontCacheProvider } from "./CloudFrontCacheProvider";
export { CloudflareCacheProvider } from "./CloudflareCacheProvider";
export { NoOpCacheProvider } from "./NoOpCacheProvider";
