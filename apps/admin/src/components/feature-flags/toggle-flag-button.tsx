'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toggleFeatureFlagAction } from '@/actions/feature-flags';

interface ToggleFlagButtonProps {
  platform: string;
  environment: string;
  flagName: string;
  enabled: boolean;
}

export function ToggleFlagButton({ platform, environment, flagName, enabled }: ToggleFlagButtonProps) {
  const router = useRouter();
  const [isToggling, setIsToggling] = useState(false);

  async function handleToggle() {
    setIsToggling(true);
    try {
      const result = await toggleFeatureFlagAction(platform, environment, flagName);
      if (result.success) {
        router.refresh();
      } else {
        alert(result.error);
        setIsToggling(false);
      }
    } catch (error) {
      alert('Failed to toggle feature flag');
      setIsToggling(false);
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isToggling}
      className={`relative inline-flex h-8 w-14 items-center rounded-none border-2 border-black transition-colors ${
        enabled ? 'bg-black' : 'bg-white'
      } disabled:opacity-50`}
    >
      <span
        className={`inline-block h-6 w-6 transform border-2 border-black bg-white transition-transform ${
          enabled ? 'translate-x-7' : 'translate-x-0'
        }`}
      />
    </button>
  );
}
