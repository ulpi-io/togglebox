'use client';

import { useState } from 'react';
import { deletePlatformApi } from '@/lib/api/platforms';
import { Button } from '@togglebox/ui';

interface DeletePlatformButtonProps {
  platform: string;
  onSuccess?: () => void;
}

export function DeletePlatformButton({ platform, onSuccess }: DeletePlatformButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await deletePlatformApi(platform);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete platform');
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
