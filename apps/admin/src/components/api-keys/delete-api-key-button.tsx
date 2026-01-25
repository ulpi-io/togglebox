'use client';

import { useState } from 'react';
import { deleteApiKeyApi } from '@/lib/api/api-keys';
import { Button } from '@togglebox/ui';

interface DeleteApiKeyButtonProps {
  keyId: string;
  keyName: string;
  onSuccess?: () => void;
}

export function DeleteApiKeyButton({ keyId, keyName, onSuccess }: DeleteApiKeyButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await deleteApiKeyApi(keyId);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete API key');
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
          {isDeleting ? 'Deleting...' : 'Confirm'}
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
