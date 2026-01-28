"use client";

import { useState, useEffect } from "react";
import { getPlatformsApi, getEnvironmentsApi } from "@/lib/api/platforms";
import type { Platform, Environment } from "@/lib/api/types";

export interface PlatformEnvironmentSelection {
  platforms: Platform[];
  environments: Environment[];
  selectedPlatform: string;
  selectedEnvironment: string;
  setSelectedPlatform: (platform: string) => void;
  setSelectedEnvironment: (environment: string) => void;
  loadingPlatforms: boolean;
  loadingEnvironments: boolean;
}

/**
 * Hook for platform/environment selection with automatic loading.
 * Used in create pages for configs, flags, and experiments.
 */
export function usePlatformEnvironmentSelection(): PlatformEnvironmentSelection {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState("");
  const [selectedEnvironment, setSelectedEnvironment] = useState("");
  const [loadingPlatforms, setLoadingPlatforms] = useState(true);
  const [loadingEnvironments, setLoadingEnvironments] = useState(false);

  // Load platforms on mount
  useEffect(() => {
    // loadingPlatforms is initialized to true, no need to set it again
    getPlatformsApi()
      .then(setPlatforms)
      .catch(console.error)
      .finally(() => setLoadingPlatforms(false));
  }, []);

  // Load environments when platform changes
  useEffect(() => {
    if (!selectedPlatform) {
      setEnvironments([]);
      return;
    }

    let cancelled = false;

    const loadEnvironments = async () => {
      // Defer state updates to avoid synchronous setState in effect body
      await Promise.resolve();
      if (cancelled) return;

      setLoadingEnvironments(true);
      setSelectedEnvironment("");

      try {
        const data = await getEnvironmentsApi(selectedPlatform);
        if (!cancelled) {
          setEnvironments(data);
        }
      } catch (error) {
        console.error(error);
      } finally {
        if (!cancelled) {
          setLoadingEnvironments(false);
        }
      }
    };

    loadEnvironments();

    return () => {
      cancelled = true;
    };
  }, [selectedPlatform]);

  return {
    platforms,
    environments,
    selectedPlatform,
    selectedEnvironment,
    setSelectedPlatform,
    setSelectedEnvironment,
    loadingPlatforms,
    loadingEnvironments,
  };
}
