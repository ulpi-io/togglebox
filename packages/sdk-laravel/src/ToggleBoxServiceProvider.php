<?php

declare(strict_types=1);

namespace ToggleBox\Laravel;

use Illuminate\Contracts\Cache\Factory as CacheFactory;
use Illuminate\Support\Facades\Blade;
use Illuminate\Support\ServiceProvider;

class ToggleBoxServiceProvider extends ServiceProvider
{
    /**
     * Register services.
     */
    public function register(): void
    {
        $this->mergeConfigFrom(
            __DIR__ . '/../config/togglebox.php',
            'togglebox'
        );

        $this->app->singleton(ToggleBoxManager::class, function ($app) {
            return new ToggleBoxManager(
                $app['config']['togglebox'],
                $app->make(CacheFactory::class),
            );
        });

        $this->app->alias(ToggleBoxManager::class, 'togglebox');
    }

    /**
     * Bootstrap services.
     */
    public function boot(): void
    {
        // Publish configuration
        $this->publishes([
            __DIR__ . '/../config/togglebox.php' => config_path('togglebox.php'),
        ], 'togglebox-config');

        // Register Blade directives
        if (config('togglebox.blade_directives', true)) {
            $this->registerBladeDirectives();
        }

        // Flush stats on terminate
        if (config('togglebox.stats.flush_on_terminate', true)) {
            $this->app->terminating(function () {
                try {
                    app(ToggleBoxManager::class)->flushStats();
                } catch (\Throwable) {
                    // Silently fail - don't break the request
                }
            });
        }
    }

    /**
     * Register Blade directives for feature flags.
     */
    private function registerBladeDirectives(): void
    {
        // @feature('flag-key') ... @endfeature
        Blade::directive('feature', function (string $expression) {
            return "<?php if(app('togglebox')->enabled({$expression})): ?>";
        });

        Blade::directive('endfeature', function () {
            return '<?php endif; ?>';
        });

        // @featureelse - for else branch within @feature
        Blade::directive('featureelse', function () {
            return '<?php else: ?>';
        });

        // @experiment('experiment-key', 'variation-key') ... @endexperiment
        Blade::directive('experiment', function (string $expression) {
            // Parse experiment key and variation key
            return "<?php
                \$_togglebox_args = [{$expression}];
                \$_togglebox_exp = \$_togglebox_args[0] ?? '';
                \$_togglebox_var = \$_togglebox_args[1] ?? null;
                if (\$_togglebox_var !== null) {
                    \$_togglebox_show = app('togglebox')->inVariation(\$_togglebox_exp, \$_togglebox_var);
                } else {
                    \$_togglebox_variant = app('togglebox')->variant(\$_togglebox_exp);
                    \$_togglebox_show = \$_togglebox_variant !== null;
                }
                if (\$_togglebox_show):
            ?>";
        });

        Blade::directive('endexperiment', function () {
            return '<?php endif; ?>';
        });

        // @variant - get the current variant value inside @experiment
        Blade::directive('variant', function (string $expression) {
            return "<?php
                \$_togglebox_v = app('togglebox')->variant({$expression});
                echo e(\$_togglebox_v?->value ?? '');
            ?>";
        });

        // @config('key', 'default') - output a remote config value
        Blade::directive('config', function (string $expression) {
            return "<?php echo e(app('togglebox')->config({$expression})); ?>";
        });
    }

    /**
     * Get the services provided by the provider.
     */
    public function provides(): array
    {
        return [
            ToggleBoxManager::class,
            'togglebox',
        ];
    }
}
