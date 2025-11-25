'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteFeatureFlagAction } from '@/actions/feature-flags';
import { Button } from '@/components/ui/button';

interface DeleteFlagButtonProps {
  platform: string;
  environment: string;
  flagName: string;
}

export function DeleteFlagButton({ platform, environment, flagName }: DeleteFlagButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const result = await deleteFeatureFlagAction(platform, environment, flagName);
      if (result.success) {
        router.refresh();
      } else {
        alert(result.error);
        setIsDeleting(false);
      }
    } catch (error) {
      alert('Failed to delete feature flag');
      setIsDeleting(false);
    }
  }

  if (showConfirm) {
    return (
      <div className="flex space-x-2">
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDelete}
          disabled={isDeleting}
        >
          {isDeleting ? 'Deleting...' : 'Confirm Delete'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowConfirm(false)}
          disabled={isDeleting}
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={() => setShowConfirm(true)}
    >
      Delete
    </Button>
  );
}
