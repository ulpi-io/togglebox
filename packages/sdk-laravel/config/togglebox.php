<?php

return [
    /*
    |--------------------------------------------------------------------------
    | ToggleBox Platform
    |--------------------------------------------------------------------------
    |
    | The platform identifier for your application. This is typically 'web',
    | 'mobile', 'api', etc. and is used to fetch the correct configuration.
    |
    */
    'platform' => env('TOGGLEBOX_PLATFORM', 'web'),

    /*
    |--------------------------------------------------------------------------
    | ToggleBox Environment
    |--------------------------------------------------------------------------
    |
    | The environment to fetch configurations for. This usually maps to your
    | Laravel environment (production, staging, local, etc.).
    |
    */
    'environment' => env('TOGGLEBOX_ENVIRONMENT', env('APP_ENV', 'production')),

    /*
    |--------------------------------------------------------------------------
    | API URL (Self-Hosted)
    |--------------------------------------------------------------------------
    |
    | The base URL for your self-hosted ToggleBox API. Leave null if using
    | the cloud version with a tenant subdomain.
    |
    */
    'api_url' => env('TOGGLEBOX_API_URL'),

    /*
    |--------------------------------------------------------------------------
    | Tenant Subdomain (Cloud)
    |--------------------------------------------------------------------------
    |
    | Your tenant subdomain for ToggleBox Cloud. This will construct the
    | API URL as https://{subdomain}.togglebox.io
    |
    */
    'tenant_subdomain' => env('TOGGLEBOX_TENANT_SUBDOMAIN'),

    /*
    |--------------------------------------------------------------------------
    | API Key
    |--------------------------------------------------------------------------
    |
    | Your ToggleBox API key for authentication. Optional for self-hosted
    | deployments, required for cloud.
    |
    */
    'api_key' => env('TOGGLEBOX_API_KEY'),

    /*
    |--------------------------------------------------------------------------
    | Config Version
    |--------------------------------------------------------------------------
    |
    | The default config version to fetch. Options:
    | - 'stable': Latest stable version (recommended for production)
    | - 'latest': Latest version (may be unstable)
    | - '1.2.3': A specific version label
    |
    */
    'config_version' => env('TOGGLEBOX_CONFIG_VERSION', 'stable'),

    /*
    |--------------------------------------------------------------------------
    | Cache Configuration
    |--------------------------------------------------------------------------
    |
    | Configure caching for ToggleBox data. By default, it uses Laravel's
    | cache system with the configured driver.
    |
    */
    'cache' => [
        // Enable or disable caching
        'enabled' => env('TOGGLEBOX_CACHE_ENABLED', true),

        // Cache TTL in seconds (default: 5 minutes)
        'ttl' => env('TOGGLEBOX_CACHE_TTL', 300),

        // Cache store to use (null = default Laravel cache store)
        'store' => env('TOGGLEBOX_CACHE_STORE'),

        // Cache key prefix
        'prefix' => env('TOGGLEBOX_CACHE_PREFIX', 'togglebox'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Stats Configuration
    |--------------------------------------------------------------------------
    |
    | Configure stats/analytics tracking for experiments and flags.
    |
    */
    'stats' => [
        // Enable or disable stats collection
        'enabled' => env('TOGGLEBOX_STATS_ENABLED', true),

        // Number of events to batch before sending
        'batch_size' => env('TOGGLEBOX_STATS_BATCH_SIZE', 20),

        // Whether to flush stats on request termination
        'flush_on_terminate' => env('TOGGLEBOX_STATS_FLUSH_ON_TERMINATE', true),
    ],

    /*
    |--------------------------------------------------------------------------
    | Default User ID Resolver
    |--------------------------------------------------------------------------
    |
    | The method to resolve the current user ID for flag/experiment evaluation.
    | Options: 'auth' (uses Auth::id()), 'session', or a custom callable.
    |
    */
    'user_resolver' => 'auth',

    /*
    |--------------------------------------------------------------------------
    | Blade Directives
    |--------------------------------------------------------------------------
    |
    | Enable or disable Blade directives for feature flags.
    |
    */
    'blade_directives' => env('TOGGLEBOX_BLADE_DIRECTIVES', true),
];
