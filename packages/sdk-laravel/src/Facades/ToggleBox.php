<?php

declare(strict_types=1);

namespace ToggleBox\Laravel\Facades;

use Illuminate\Support\Facades\Facade;
use ToggleBox\Laravel\ToggleBoxManager;
use ToggleBox\ToggleBoxClient;
use ToggleBox\Types\Experiment;
use ToggleBox\Types\Flag;
use ToggleBox\Types\FlagResult;
use ToggleBox\Types\VariantAssignment;

/**
 * @method static mixed config(string $key, mixed $default = null)
 * @method static array allConfigs()
 * @method static array configVersions()
 * @method static bool enabled(string $flagKey, ?string $userId = null, ?string $country = null, ?string $language = null, bool $default = false)
 * @method static FlagResult flag(string $flagKey, ?string $userId = null, ?string $country = null, ?string $language = null)
 * @method static Flag|null flagInfo(string $flagKey)
 * @method static array allFlags()
 * @method static VariantAssignment|null variant(string $experimentKey, ?string $userId = null, ?string $country = null, ?string $language = null)
 * @method static bool inVariation(string $experimentKey, string $variationKey, ?string $userId = null, ?string $country = null, ?string $language = null)
 * @method static void trackConversion(string $experimentKey, string $metricName, ?float $value = null, ?string $userId = null, ?string $country = null, ?string $language = null)
 * @method static void trackEvent(string $eventName, ?string $userId = null, ?string $country = null, ?string $language = null, ?array $data = null)
 * @method static array allExperiments()
 * @method static Experiment|null experimentInfo(string $experimentKey)
 * @method static void refresh()
 * @method static void flushStats()
 * @method static void clearCache()
 * @method static array checkConnection()
 * @method static ToggleBoxClient client()
 *
 * @see \ToggleBox\Laravel\ToggleBoxManager
 */
class ToggleBox extends Facade
{
    protected static function getFacadeAccessor(): string
    {
        return ToggleBoxManager::class;
    }
}
