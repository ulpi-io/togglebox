'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toggleFlagApi } from '@/lib/api/flags';

interface ToggleFlagButtonProps {
  platform: string;
  environment: string;
  flagKey: string;
  enabled: boolean;
  onSuccess?: () => void;
}

export function ToggleFlagButton({ platform, environment, flagKey, enabled, onSuccess }: ToggleFlagButtonProps) {
  const router = useRouter();
  const [isToggling, setIsToggling] = useState(false);

  async function handleToggle() {
    setIsToggling(true);
    try {
      await toggleFlagApi(platform, environment, flagKey, !enabled);
      if (onSuccess) {
        await onSuccess();
      } else {
        router.refresh();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to toggle flag');
    } finally {
      setIsToggling(false);
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isToggling}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black/20 ${
        enabled ? 'bg-success' : 'bg-muted'
      } disabled:opacity-50 disabled:cursor-not-allowed`}
      role="switch"
      aria-checked={enabled}
      aria-label={`Toggle ${flagKey}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}
