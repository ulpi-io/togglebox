import { ToggleBoxClient } from '@togglebox/sdk'
import type { Config } from '@togglebox/configs'
import type { Flag } from '@togglebox/flags'
import type { Experiment } from '@togglebox/experiments'

interface ServerConfig {
  config: Config
  flags: Flag[]
  experiments: Experiment[]
}

/**
 * Fetch config for server-side rendering (getServerSideProps)
 *
 * Returns all three tiers:
 * - Tier 1: Remote Configs
 * - Tier 2: Feature Flags
 * - Tier 3: Experiments
 */
export async function getServerSideConfig(
  platform: string,
  environment: string,
  apiUrl: string
): Promise<ServerConfig> {
  const client = new ToggleBoxClient({
    platform,
    environment,
    apiUrl,
    cache: { enabled: false, ttl: 0 }, // No caching on server
  })

  try {
    const [config, flags, experiments] = await Promise.all([
      client.getConfig(),
      client.getFlags(),
      client.getExperiments(),
    ])

    return { config, flags, experiments }
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
): Promise<ServerConfig> {
  // Same implementation as getServerSideConfig
  // But typically used with revalidate for ISR
  return getServerSideConfig(platform, environment, apiUrl)
}
