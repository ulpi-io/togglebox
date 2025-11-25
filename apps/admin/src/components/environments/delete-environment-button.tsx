'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteEnvironmentAction } from '@/actions/environments';
import { Button } from '@/components/ui/button';

interface DeleteEnvironmentButtonProps {
  platform: string;
  environment: string;
}

export function DeleteEnvironmentButton({ platform, environment }: DeleteEnvironmentButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const result = await deleteEnvironmentAction(platform, environment);
      if (result.success) {
        router.refresh();
      } else {
        alert(result.error);
        setIsDeleting(false);
      }
    } catch (error) {
      alert('Failed to delete environment');
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
