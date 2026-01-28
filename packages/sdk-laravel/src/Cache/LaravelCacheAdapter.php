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
        // Use tags if the cache store supports them (Redis, Memcached)
        // This avoids wiping the entire cache store
        if ($this->cache instanceof \Illuminate\Cache\TaggableStore || method_exists($this->cache->getStore(), 'tags')) {
            try {
                $this->cache->getStore()->tags([$this->prefix])->flush();
                return;
            } catch (\Throwable) {
                // Fall through to warning
            }
        }

        // For stores without tag support (file, database), we cannot safely clear only ToggleBox keys
        // Log a warning instead of wiping the entire cache
        if (function_exists('logger')) {
            logger()->warning('ToggleBox cache clear() called but cache store does not support tags. Cache not cleared to avoid wiping unrelated data.');
        }
    }

    private function prefixKey(string $key): string
    {
        return "{$this->prefix}:{$key}";
    }
}
