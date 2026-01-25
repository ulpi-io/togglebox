<?php

declare(strict_types=1);

namespace ToggleBox\Laravel\Cache;

use Illuminate\Contracts\Cache\Repository;
use ToggleBox\Cache\CacheInterface;

/**
 * Adapter for Laravel's Cache system.
 */
class LaravelCacheAdapter implements CacheInterface
{
    public function __construct(
        private readonly Repository $cache,
        private readonly string $prefix = 'togglebox',
    ) {
    }

    public function get(string $key): mixed
    {
        return $this->cache->get($this->prefixKey($key));
    }

    public function set(string $key, mixed $value, int $ttl): void
    {
        $this->cache->put($this->prefixKey($key), $value, $ttl);
    }

    public function delete(string $key): void
    {
        $this->cache->forget($this->prefixKey($key));
    }

    public function clear(): void
    {
        // Note: This only works with cache stores that support tags
        // For stores without tags, this will clear the entire cache
        $this->cache->flush();
    }

    private function prefixKey(string $key): string
    {
        return "{$this->prefix}:{$key}";
    }
}
