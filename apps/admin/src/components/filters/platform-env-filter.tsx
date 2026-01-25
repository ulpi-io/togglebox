'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Select } from '@togglebox/ui';
import { getPlatformsApi, getEnvironmentsApi } from '@/lib/api/platforms';
import type { Platform, Environment } from '@/lib/api/types';

const STORAGE_KEY = 'togglebox-platform-env-filter';

interface StoredFilter {
  platform: string | null;
  environment: string | null;
}

interface PlatformEnvFilterProps {
  onFilterChange?: (platform: string | null, environment: string | null) => void;
  requireSelection?: boolean;
}

export function PlatformEnvFilter({
  onFilterChange,
  requireSelection = true,
}: PlatformEnvFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [selectedEnvironment, setSelectedEnvironment] = useState<string | null>(null);
  const [isLoadingPlatforms, setIsLoadingPlatforms] = useState(true);
  const [isLoadingEnvironments, setIsLoadingEnvironments] = useState(false);

  // Load platforms on mount
  useEffect(() => {
    const loadPlatforms = async () => {
      try {
        setIsLoadingPlatforms(true);
        const data = await getPlatformsApi();
        setPlatforms(data);
      } catch (err) {
        console.error('Failed to load platforms:', err);
      } finally {
        setIsLoadingPlatforms(false);
      }
    };
    loadPlatforms();
  }, []);

  // Initialize from URL or localStorage
  useEffect(() => {
    const urlPlatform = searchParams.get('platform');
    const urlEnvironment = searchParams.get('environment');

    if (urlPlatform) {
      setSelectedPlatform(urlPlatform);
      if (urlEnvironment) {
        setSelectedEnvironment(urlEnvironment);
      }
    } else {
      // Try localStorage
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const parsed: StoredFilter = JSON.parse(stored);
          if (parsed.platform) {
            setSelectedPlatform(parsed.platform);
            if (parsed.environment) {
              setSelectedEnvironment(parsed.environment);
            }
          }
        } catch {
          // Ignore invalid stored data
        }
      }
    }
  }, [searchParams]);

  // Load environments when platform changes
  useEffect(() => {
    if (!selectedPlatform) {
      setEnvironments([]);
      setSelectedEnvironment(null);
      return;
    }

    const loadEnvironments = async () => {
      try {
        setIsLoadingEnvironments(true);
        const data = await getEnvironmentsApi(selectedPlatform);
        setEnvironments(data);

        // If current environment not in new list, reset
        if (selectedEnvironment && !data.some((e) => e.environment === selectedEnvironment)) {
          setSelectedEnvironment(null);
        }
      } catch (err) {
        console.error('Failed to load environments:', err);
        setEnvironments([]);
      } finally {
        setIsLoadingEnvironments(false);
      }
    };
    loadEnvironments();
  }, [selectedPlatform]);

  // Update URL and localStorage when selection changes
  const updateUrlAndStorage = useCallback(
    (platform: string | null, environment: string | null) => {
      // Update localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ platform, environment }));

      // Update URL
      const params = new URLSearchParams(searchParams.toString());
      if (platform) {
        params.set('platform', platform);
      } else {
        params.delete('platform');
      }
      if (environment) {
        params.set('environment', environment);
      } else {
        params.delete('environment');
      }

      const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
      router.replace(newUrl, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  // Handle platform change
  const handlePlatformChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value || null;
    setSelectedPlatform(value);
    setSelectedEnvironment(null);
    updateUrlAndStorage(value, null);
    onFilterChange?.(value, null);
  };

  // Handle environment change
  const handleEnvironmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value || null;
    setSelectedEnvironment(value);
    updateUrlAndStorage(selectedPlatform, value);
    onFilterChange?.(selectedPlatform, value);
  };

  // Notify parent of initial selection
  useEffect(() => {
    if (selectedPlatform && selectedEnvironment) {
      onFilterChange?.(selectedPlatform, selectedEnvironment);
    }
  }, [selectedPlatform, selectedEnvironment, onFilterChange]);

  const showMissingSelection = requireSelection && (!selectedPlatform || !selectedEnvironment);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-bold mb-2">Platform</label>
          <Select
            value={selectedPlatform || ''}
            onChange={handlePlatformChange}
            disabled={isLoadingPlatforms}
          >
            <option value="">Select Platform...</option>
            {platforms.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-bold mb-2">Environment</label>
          <Select
            value={selectedEnvironment || ''}
            onChange={handleEnvironmentChange}
            disabled={!selectedPlatform || isLoadingEnvironments}
          >
            <option value="">Select Environment...</option>
            {environments.map((e) => (
              <option key={e.environment} value={e.environment}>
                {e.environment}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {showMissingSelection && (
        <div className="p-4 bg-yellow-50 border-2 border-yellow-400 text-yellow-800">
          <p className="font-bold">Select Platform and Environment</p>
          <p className="text-sm">
            Choose a platform and environment above to view and manage items.
          </p>
        </div>
      )}
    </div>
  );
}

// Hook for using platform/env selection in pages
export function usePlatformEnvFilter() {
  const searchParams = useSearchParams();
  const [platform, setPlatform] = useState<string | null>(null);
  const [environment, setEnvironment] = useState<string | null>(null);

  useEffect(() => {
    const urlPlatform = searchParams.get('platform');
    const urlEnvironment = searchParams.get('environment');

    if (urlPlatform && urlEnvironment) {
      setPlatform(urlPlatform);
      setEnvironment(urlEnvironment);
    } else {
      // Try localStorage
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const parsed: StoredFilter = JSON.parse(stored);
          setPlatform(parsed.platform);
          setEnvironment(parsed.environment);
        } catch {
          // Ignore
        }
      }
    }
  }, [searchParams]);

  return { platform, environment };
}
