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
    setLoadingPlatforms(true);
    getPlatformsApi()
      .then(setPlatforms)
      .catch(console.error)
      .finally(() => setLoadingPlatforms(false));
  }, []);

  // Load environments when platform changes
  useEffect(() => {
    if (selectedPlatform) {
      setLoadingEnvironments(true);
      setSelectedEnvironment("");
      getEnvironmentsApi(selectedPlatform)
        .then(setEnvironments)
        .catch(console.error)
        .finally(() => setLoadingEnvironments(false));
    } else {
      setEnvironments([]);
    }
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
