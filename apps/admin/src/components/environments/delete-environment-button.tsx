'use client';

import { useState } from 'react';
import { deleteEnvironmentApi } from '@/lib/api/platforms';
import { Button } from '@togglebox/ui';

interface DeleteEnvironmentButtonProps {
  platform: string;
  environment: string;
  onSuccess?: () => void;
}

export function DeleteEnvironmentButton({ platform, environment, onSuccess }: DeleteEnvironmentButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await deleteEnvironmentApi(platform, environment);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete environment');
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
