<?php

declare(strict_types=1);

use ToggleBox\Laravel\ToggleBoxManager;
use ToggleBox\Types\FlagResult;
use ToggleBox\Types\VariantAssignment;

if (!function_exists('togglebox')) {
    /**
     * Get the ToggleBox manager instance.
     */
    function togglebox(): ToggleBoxManager
    {
        return app(ToggleBoxManager::class);
    }
}

if (!function_exists('feature')) {
    /**
     * Check if a feature flag is enabled.
     */
    function feature(
        string $flagKey,
        ?string $userId = null,
        ?string $country = null,
        ?string $language = null,
        bool $default = false,
    ): bool {
        return togglebox()->enabled($flagKey, $userId, $country, $language, $default);
    }
}

if (!function_exists('feature_flag')) {
    /**
     * Get a feature flag result with full details.
     */
    function feature_flag(
        string $flagKey,
        ?string $userId = null,
        ?string $country = null,
        ?string $language = null,
    ): FlagResult {
        return togglebox()->flag($flagKey, $userId, $country, $language);
    }
}

if (!function_exists('experiment')) {
    /**
     * Get the assigned variation for an experiment.
     */
    function experiment(
        string $experimentKey,
        ?string $userId = null,
        ?string $country = null,
        ?string $language = null,
    ): ?VariantAssignment {
        return togglebox()->variant($experimentKey, $userId, $country, $language);
    }
}

if (!function_exists('remote_config')) {
    /**
     * Get a remote config value.
     *
     * @template T
     * @param string $key Config key
     * @param T $default Default value if not found
     * @return T
     */
    function remote_config(string $key, mixed $default = null): mixed
    {
        return togglebox()->config($key, $default);
    }
}

if (!function_exists('track_event')) {
    /**
     * Track a custom event.
     *
     * @param string $eventName Name of the event
     * @param string|null $userId User ID (auto-resolved if null)
     * @param string|null $country Country code for targeting
     * @param string|null $language Language code for targeting
     * @param array|null $data Optional event data with 'experimentKey', 'variationKey', 'properties'
     */
    function track_event(
        string $eventName,
        ?string $userId = null,
        ?string $country = null,
        ?string $language = null,
        ?array $data = null,
    ): void {
        togglebox()->trackEvent($eventName, $userId, $country, $language, $data);
    }
}

if (!function_exists('check_togglebox')) {
    /**
     * Check ToggleBox API connectivity and service health.
     *
     * @return array{status: string, uptime?: int}
     * @throws \ToggleBox\Exceptions\ToggleBoxException If API is unreachable
     */
    function check_togglebox(): array
    {
        return togglebox()->checkConnection();
    }
}
