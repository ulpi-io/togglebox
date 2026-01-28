import { CacheProvider, CacheConfig } from "./types/CacheProvider";
import {
  CloudFrontCacheProvider,
  CloudflareCacheProvider,
  NoOpCacheProvider,
} from "./providers";
import { logger } from "@togglebox/shared";

/**
 * Creates a cache provider based on the provided configuration.
 *
 * @param config - Cache configuration
 * @returns Appropriate CacheProvider implementation
 *
 * @example
 * ```typescript
 * // CloudFront provider
 * const cache = createCacheProvider({
 *   enabled: true,
 *   provider: 'cloudfront',
 *   cloudfront: {
 *     distributionId: process.env.CLOUDFRONT_DISTRIBUTION_ID,
 *     region: process.env.AWS_REGION
 *   }
 * });
 *
 * // Cloudflare provider
 * const cache = createCacheProvider({
 *   enabled: true,
 *   provider: 'cloudflare',
 *   cloudflare: {
 *     zoneId: process.env.CLOUDFLARE_ZONE_ID,
 *     apiToken: process.env.CLOUDFLARE_API_TOKEN
 *   }
 * });
 *
 * // Disabled (no-op)
 * const cache = createCacheProvider({
 *   enabled: false
 * });
 * ```
 */
export function createCacheProvider(config: CacheConfig): CacheProvider {
  // If caching is explicitly disabled or provider is 'none'
  if (!config.enabled || config.provider === "none") {
    logger.info("Cache provider initialized", {
      provider: "noop",
      reason: "caching disabled",
    });
    return new NoOpCacheProvider();
  }

  // Cloudflare provider
  if (config.provider === "cloudflare") {
    const { zoneId, apiToken } = config.cloudflare || {};

    if (!zoneId || !apiToken) {
      logger.warn(
        "Cloudflare provider selected but credentials not provided. Falling back to NoOp.",
        {
          provider: "cloudflare",
          hasZoneId: !!zoneId,
          hasApiToken: !!apiToken,
        },
      );
      return new NoOpCacheProvider();
    }

    logger.info("Cache provider initialized", { provider: "cloudflare" });
    return new CloudflareCacheProvider(zoneId, apiToken);
  }

  // CloudFront provider (default)
  const { distributionId, region } = config.cloudfront || {};

  if (!distributionId) {
    logger.warn(
      "CloudFront provider selected but distributionId not provided. Falling back to NoOp.",
      {
        provider: "cloudfront",
      },
    );
    return new NoOpCacheProvider();
  }

  logger.info("Cache provider initialized", {
    provider: "cloudfront",
    region: region || "us-east-1",
  });
  return new CloudFrontCacheProvider(distributionId, region);
}
