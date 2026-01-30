# ToggleBox Laravel SDK

Official Laravel SDK for [ToggleBox](https://github.com/ulpi-io/togglebox) - Remote Config, Feature Flags, and A/B Experiments.

## Installation

```bash
composer require togglebox/laravel
```

The service provider will be auto-discovered. Publish the configuration:

```bash
php artisan vendor:publish --tag=togglebox-config
```

## Configuration

Add to your `.env` file:

```env
# Required
TOGGLEBOX_PLATFORM=web
TOGGLEBOX_ENVIRONMENT=production

# For self-hosted
TOGGLEBOX_API_URL=https://api.yourdomain.com

# For cloud
TOGGLEBOX_TENANT_SUBDOMAIN=your-tenant

# Optional
TOGGLEBOX_API_KEY=your-api-key
TOGGLEBOX_CONFIG_VERSION=stable
TOGGLEBOX_CACHE_TTL=300
```

## Usage

### Using the Facade

```php
use ToggleBox\Laravel\Facades\ToggleBox;

// Tier 1: Remote Configs
$apiUrl = ToggleBox::config('api_url', 'https://default.api.com');
$allConfigs = ToggleBox::allConfigs();

// Tier 2: Feature Flags
if (ToggleBox::enabled('dark-mode')) {
    // Show dark mode UI
}

// With targeting context
if (ToggleBox::enabled('premium-feature', userId: 'user-123', country: 'US')) {
    // Show premium feature
}

// Get full flag details
$flag = ToggleBox::flag('ui-version');
echo $flag->value; // The actual value

// Get flag metadata without evaluation
$flagInfo = ToggleBox::flagInfo('dark-mode');
if ($flagInfo) {
    echo $flagInfo->name;    // 'Dark Mode'
    echo $flagInfo->enabled; // true/false
}

// Tier 3: Experiments
$variant = ToggleBox::variant('checkout-redesign');
if ($variant) {
    echo $variant->variationKey; // 'control', 'variant_1', etc.
    echo $variant->value;        // The variant's value
}

// Check specific variation
if (ToggleBox::inVariation('checkout-redesign', 'variant_1')) {
    // Show new checkout
}

// Track conversions
ToggleBox::trackConversion('checkout-redesign', 'purchase', value: 99.99);

// Get experiment metadata without assignment
$expInfo = ToggleBox::experimentInfo('checkout-redesign');
if ($expInfo) {
    echo $expInfo->status; // 'running', 'draft', 'completed'
}

// Check API health
$health = ToggleBox::checkConnection();
echo $health['status']; // 'ok'
```

### Using Helper Functions

```php
// Feature flags
if (feature('dark-mode')) {
    // ...
}

// Remote config
$maxRetries = remote_config('max_retries', 3);

// Experiments
$variant = experiment('checkout-redesign');

// Check API health
$health = check_togglebox();
```

### Using Dependency Injection

```php
use ToggleBox\Laravel\ToggleBoxManager;

class CheckoutController extends Controller
{
    public function __construct(
        private readonly ToggleBoxManager $togglebox,
    ) {}

    public function show()
    {
        $variant = $this->togglebox->variant('checkout-redesign');

        return view('checkout', [
            'variant' => $variant,
        ]);
    }
}
```

### Blade Directives

```blade
{{-- Remote config values --}}
<p>Theme: @config('theme', 'default')</p>
<p>Max items: @config('max_items', 10)</p>

{{-- Feature flags --}}
@feature('dark-mode')
    <div class="dark-theme">Dark mode enabled!</div>
@featureelse
    <div class="light-theme">Light mode</div>
@endfeature

{{-- Experiments --}}
@experiment('checkout-redesign', 'variant_1')
    <x-new-checkout />
@endexperiment

@experiment('checkout-redesign', 'control')
    <x-old-checkout />
@endexperiment

{{-- Get variant value --}}
<div data-variant="@variant('checkout-redesign')"></div>
```

## Automatic User Resolution

By default, the SDK uses the authenticated user's ID. Configure in `config/togglebox.php`:

```php
// Use Auth::id()
'user_resolver' => 'auth',

// Use session ID
'user_resolver' => 'session',

// Custom resolver
'user_resolver' => fn() => request()->header('X-User-ID') ?? 'anonymous',
```

## Caching

The SDK uses Laravel's cache system by default. Configure in `config/togglebox.php`:

```php
'cache' => [
    'enabled' => true,
    'ttl' => 300, // 5 minutes
    'store' => 'redis', // null for default store
    'prefix' => 'togglebox',
],
```

### Manual Cache Control

```php
// Refresh all cached data
ToggleBox::refresh();

// Clear all caches
ToggleBox::clearCache();
```

## Stats & Analytics

Stats are automatically flushed on request termination. You can also flush manually:

```php
ToggleBox::flushStats();
```

Disable auto-flush in `config/togglebox.php`:

```php
'stats' => [
    'flush_on_terminate' => false,
],
```

## Accessing the Underlying Client

```php
$client = ToggleBox::client();

// Use the PHP SDK directly
$allConfigs = $client->getAllConfigs();
$apiUrl = $client->getConfigValue('api_url', 'https://default.api.com');
```

## Testing

In tests, you can mock the ToggleBox facade:

```php
use ToggleBox\Laravel\Facades\ToggleBox;

public function test_premium_feature()
{
    ToggleBox::shouldReceive('enabled')
        ->with('premium-feature', null, null, null, false)
        ->andReturn(true);

    $response = $this->get('/premium');

    $response->assertSee('Premium Content');
}
```

Or bind a mock client:

```php
use ToggleBox\Laravel\ToggleBoxManager;

$this->mock(ToggleBoxManager::class, function ($mock) {
    $mock->shouldReceive('enabled')
        ->with('dark-mode')
        ->andReturn(true);
});
```

## Configuration Reference

| Key                        | Environment Variable                 | Default   | Description             |
| -------------------------- | ------------------------------------ | --------- | ----------------------- |
| `platform`                 | `TOGGLEBOX_PLATFORM`                 | `web`     | Platform identifier     |
| `environment`              | `TOGGLEBOX_ENVIRONMENT`              | `APP_ENV` | Environment name        |
| `api_url`                  | `TOGGLEBOX_API_URL`                  | `null`    | Self-hosted API URL     |
| `tenant_subdomain`         | `TOGGLEBOX_TENANT_SUBDOMAIN`         | `null`    | Cloud tenant subdomain  |
| `api_key`                  | `TOGGLEBOX_API_KEY`                  | `null`    | API key                 |
| `config_version`           | `TOGGLEBOX_CONFIG_VERSION`           | `stable`  | Default config version  |
| `cache.enabled`            | `TOGGLEBOX_CACHE_ENABLED`            | `true`    | Enable caching          |
| `cache.ttl`                | `TOGGLEBOX_CACHE_TTL`                | `300`     | Cache TTL (seconds)     |
| `cache.store`              | `TOGGLEBOX_CACHE_STORE`              | `null`    | Laravel cache store     |
| `stats.enabled`            | `TOGGLEBOX_STATS_ENABLED`            | `true`    | Enable stats            |
| `stats.flush_on_terminate` | `TOGGLEBOX_STATS_FLUSH_ON_TERMINATE` | `true`    | Auto-flush stats        |
| `blade_directives`         | `TOGGLEBOX_BLADE_DIRECTIVES`         | `true`    | Enable Blade directives |

## Requirements

- PHP 8.1 or higher
- Laravel 10.x or 11.x

## License

MIT
