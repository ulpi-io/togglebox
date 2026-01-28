"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteUserApi } from "@/lib/api/users";
import { Button } from "@togglebox/ui";

interface DeleteUserButtonProps {
  userId: string;
  userEmail: string;
  onSuccess?: () => void;
}

export function DeleteUserButton({
  userId,
  userEmail,
  onSuccess,
}: DeleteUserButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await deleteUserApi(userId);
      if (onSuccess) {
        onSuccess();
      } else {
        router.refresh();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete user");
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
          {isDeleting ? "Deleting..." : "Confirm"}
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
