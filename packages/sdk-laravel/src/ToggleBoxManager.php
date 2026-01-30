<?php

declare(strict_types=1);

namespace ToggleBox\Laravel;

use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Contracts\Cache\Factory as CacheFactory;
use Illuminate\Support\Facades\Auth;
use ToggleBox\Laravel\Cache\LaravelCacheAdapter;
use ToggleBox\ToggleBoxClient;
use ToggleBox\Types\CacheOptions;
use ToggleBox\Types\ClientOptions;
use ToggleBox\Types\ConversionData;
use ToggleBox\Types\Experiment;
use ToggleBox\Types\ExperimentContext;
use ToggleBox\Types\Flag;
use ToggleBox\Types\FlagContext;
use ToggleBox\Types\FlagResult;
use ToggleBox\Types\VariantAssignment;

/**
 * Laravel-specific ToggleBox manager with enhanced features.
 */
class ToggleBoxManager
{
    private ?ToggleBoxClient $client = null;
    private array $config;
    private CacheFactory $cacheFactory;

    public function __construct(array $config, CacheFactory $cacheFactory)
    {
        $this->config = $config;
        $this->cacheFactory = $cacheFactory;
    }

    /**
     * Get the underlying client instance.
     */
    public function client(): ToggleBoxClient
    {
        if ($this->client === null) {
            $this->client = $this->createClient();
        }

        return $this->client;
    }

    /**
     * Create a new client instance.
     */
    private function createClient(): ToggleBoxClient
    {
        $cacheConfig = $this->config['cache'] ?? [];
        $cacheStore = $cacheConfig['store'] ?? null;
        $cachePrefix = $cacheConfig['prefix'] ?? 'togglebox';

        $cache = new LaravelCacheAdapter(
            $cacheStore ? $this->cacheFactory->store($cacheStore) : $this->cacheFactory->store(),
            $cachePrefix,
        );

        return new ToggleBoxClient(
            new ClientOptions(
                platform: $this->config['platform'],
                environment: $this->config['environment'],
                apiUrl: $this->config['api_url'] ?? null,
                tenantSubdomain: $this->config['tenant_subdomain'] ?? null,
                apiKey: $this->config['api_key'] ?? null,
                cache: new CacheOptions(
                    enabled: $cacheConfig['enabled'] ?? true,
                    ttl: $cacheConfig['ttl'] ?? 300,
                ),
            ),
            $cache,
        );
    }

    // ==================== TIER 1: REMOTE CONFIGS ====================

    /**
     * Get a remote config value.
     *
     * @template T
     * @param string $key Config key
     * @param T $default Default value if not found
     * @return T
     */
    public function config(string $key, mixed $default = null): mixed
    {
        return $this->client()->getConfigValue($key, $default);
    }

    /**
     * Get all config values.
     */
    public function allConfigs(): array
    {
        return $this->client()->getAllConfigs();
    }

    // ==================== TIER 2: FEATURE FLAGS ====================

    /**
     * Check if a feature flag is enabled.
     */
    public function enabled(
        string $flagKey,
        ?string $userId = null,
        ?string $country = null,
        ?string $language = null,
        bool $default = false,
    ): bool {
        $context = $this->buildFlagContext($userId, $country, $language);
        return $this->client()->isFlagEnabled($flagKey, $context, $default);
    }

    /**
     * Get a feature flag result with full details.
     */
    public function flag(
        string $flagKey,
        ?string $userId = null,
        ?string $country = null,
        ?string $language = null,
    ): FlagResult {
        $context = $this->buildFlagContext($userId, $country, $language);
        return $this->client()->getFlag($flagKey, $context);
    }

    /**
     * Get all feature flags.
     */
    public function allFlags(): array
    {
        return $this->client()->getFlags();
    }

    // ==================== TIER 3: EXPERIMENTS ====================

    /**
     * Get the assigned variation for an experiment.
     */
    public function variant(
        string $experimentKey,
        ?string $userId = null,
        ?string $country = null,
        ?string $language = null,
    ): ?VariantAssignment {
        $context = $this->buildExperimentContext($userId, $country, $language);
        return $this->client()->getVariant($experimentKey, $context);
    }

    /**
     * Check if the user is in a specific variation.
     */
    public function inVariation(
        string $experimentKey,
        string $variationKey,
        ?string $userId = null,
        ?string $country = null,
        ?string $language = null,
    ): bool {
        $variant = $this->variant($experimentKey, $userId, $country, $language);
        return $variant !== null && $variant->variationKey === $variationKey;
    }

    /**
     * Track a conversion for an experiment.
     */
    public function trackConversion(
        string $experimentKey,
        string $metricName,
        ?float $value = null,
        ?string $userId = null,
        ?string $country = null,
        ?string $language = null,
    ): void {
        $context = $this->buildExperimentContext($userId, $country, $language);
        $this->client()->trackConversion($experimentKey, $context, new ConversionData($metricName, $value));
    }

    /**
     * Get all experiments.
     */
    public function allExperiments(): array
    {
        return $this->client()->getExperiments();
    }

    /**
     * Get a specific experiment's metadata without assignment.
     */
    public function experimentInfo(string $experimentKey): ?Experiment
    {
        return $this->client()->getExperimentInfo($experimentKey);
    }

    /**
    // ==================== TIER 2 EXTENDED METHODS ====================

    /**
     * Get flag metadata without evaluation.
     */
    public function flagInfo(string $flagKey): ?Flag
    {
        return $this->client()->getFlagInfo($flagKey);
    }

    // ==================== UTILITY METHODS ====================

    /**
     * Refresh all cached data.
     */
    public function refresh(): void
    {
        $this->client()->refresh();
    }

    /**
     * Flush pending stats to the server.
     */
    public function flushStats(): void
    {
        $this->client()->flushStats();
    }

    /**
     * Clear all caches.
     */
    public function clearCache(): void
    {
        $this->client()->clearCache();
    }

    /**
     * Check API connectivity and service health.
     *
     * @return array{status: string, uptime?: int}
     * @throws \ToggleBox\Exceptions\ToggleBoxException If API is unreachable
     */
    public function checkConnection(): array
    {
        return $this->client()->checkConnection();
    }

    // ==================== CONTEXT BUILDERS ====================

    private function buildFlagContext(
        ?string $userId,
        ?string $country,
        ?string $language,
    ): FlagContext {
        return new FlagContext(
            userId: $userId ?? $this->resolveUserId(),
            country: $country,
            language: $this->normalizeLanguage($language),
        );
    }

    private function buildExperimentContext(
        ?string $userId,
        ?string $country,
        ?string $language,
    ): ExperimentContext {
        return new ExperimentContext(
            userId: $userId ?? $this->resolveUserId(),
            country: $country,
            language: $this->normalizeLanguage($language),
        );
    }

    /**
     * Normalize language to 2-letter ISO code.
     * SECURITY: Extract language code from locales like "en_US" or "en-US".
     */
    private function normalizeLanguage(?string $language): ?string
    {
        $locale = $language ?? app()->getLocale();
        if ($locale === null) {
            return null;
        }

        // Extract 2-letter language code from locale like "en_US" or "en-US"
        if (strlen($locale) > 2) {
            return substr($locale, 0, 2);
        }

        return $locale;
    }

    private function resolveUserId(): string
    {
        $resolver = $this->config['user_resolver'] ?? 'auth';

        if (is_callable($resolver)) {
            return (string) $resolver();
        }

        if ($resolver === 'auth') {
            $user = Auth::user();
            if ($user instanceof Authenticatable) {
                return (string) $user->getAuthIdentifier();
            }
        }

        if ($resolver === 'session') {
            return session()->getId() ?? 'anonymous';
        }

        return 'anonymous';
    }
}
