import { ToggleBoxClient } from '@togglebox/sdk'
import type { Config } from '@togglebox/configs'
import type { Flag } from '@togglebox/flags'
import type { Experiment } from '@togglebox/experiments'

interface ConfigWithMetadata {
  config: Config
  version: string
  isStable: boolean
}

interface ServerConfig {
  config: ConfigWithMetadata | null
  flags: Flag[]
  experiments: Experiment[]
}

/**
 * Create a server-side ToggleBoxClient instance.
 * Disables caching and polling for fresh server-side data.
 */
function createServerClient(
  platform: string,
  environment: string,
  apiUrl: string
): ToggleBoxClient {
  return new ToggleBoxClient({
    platform,
    environment,
    apiUrl,
    cache: { enabled: false, ttl: 0 },
    pollingInterval: 0,
  })
}

/**
 * Fetch config for server-side rendering (getServerSideProps)
 *
 * Uses the SDK client with caching disabled for fresh data on every request.
 *
 * Returns all three tiers:
 * - Tier 1: Remote Configs (with version and stability info)
 * - Tier 2: Feature Flags
 * - Tier 3: Experiments
 */
export async function getServerSideConfig(
  platform: string,
  environment: string,
  apiUrl: string
): Promise<ServerConfig> {
  const client = createServerClient(platform, environment, apiUrl)

  try {
    const [configData, flags, experiments] = await Promise.all([
      client.getConfig(),
      client.getFlags(),
      client.getExperiments(),
    ])

    // Wrap config with metadata (version info not available from client.getConfig())
    const config: ConfigWithMetadata | null = configData
      ? { config: configData, version: 'stable', isStable: true }
      : null

    return { config, flags, experiments }
  } catch (error) {
    console.error('Failed to fetch server-side config:', error)
    return { config: null, flags: [], experiments: [] }
  } finally {
    client.destroy()
  }
}

/**
 * Fetch config for static generation (getStaticProps)
 *
 * Uses the SDK client. For ISR, set `revalidate` in your page's getStaticProps.
 */
export async function getStaticConfig(
  platform: string,
  environment: string,
  apiUrl: string
): Promise<ServerConfig> {
  // Same implementation as getServerSideConfig - Next.js handles caching
  // at the page level via getStaticProps revalidate option
  return getServerSideConfig(platform, environment, apiUrl)
}
