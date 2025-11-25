import { ToggleBoxClient } from '@togglebox/sdk'
import type { Config, FeatureFlag } from '@togglebox/core'

/**
 * Fetch config for server-side rendering (getServerSideProps)
 */
export async function getServerSideConfig(
  platform: string,
  environment: string,
  apiUrl: string
): Promise<{ config: Config; flags: FeatureFlag[] }> {
  const client = new ToggleBoxClient({
    platform,
    environment,
    apiUrl,
    cache: { enabled: false, ttl: 0 }, // No caching on server
  })

  try {
    const [config, flags] = await Promise.all([
      client.getConfig(),
      client.getFeatureFlags(),
    ])

    return { config, flags }
  } finally {
    client.destroy()
  }
}

/**
 * Fetch config for static generation (getStaticProps)
 * Note: This will be cached at build time
 */
export async function getStaticConfig(
  platform: string,
  environment: string,
  apiUrl: string
): Promise<{ config: Config; flags: FeatureFlag[] }> {
  // Same implementation as getServerSideConfig
  // But typically used with revalidate for ISR
  return getServerSideConfig(platform, environment, apiUrl)
}
