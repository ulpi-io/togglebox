"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteConfigParameterApi } from "@/lib/api/configs";
import { Button } from "@togglebox/ui";
import { Trash2 } from "lucide-react";

interface DeleteConfigParameterButtonProps {
  platform: string;
  environment: string;
  parameterKey: string;
  onSuccess?: () => void;
}

/**
 * Delete button for a config parameter (deletes ALL versions of the parameter).
 */
export function DeleteConfigParameterButton({
  platform,
  environment,
  parameterKey,
  onSuccess,
}: DeleteConfigParameterButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await deleteConfigParameterApi(platform, environment, parameterKey);
      if (onSuccess) {
        onSuccess();
      } else {
        router.refresh();
      }
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Failed to delete config parameter",
      );
      setIsDeleting(false);
      setShowConfirm(false);
    }
  }

  if (showConfirm) {
    return (
      <div className="flex items-center gap-1">
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDelete}
          disabled={isDeleting}
          className="text-xs"
        >
          {isDeleting ? "..." : "Delete"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowConfirm(false)}
          disabled={isDeleting}
          className="text-xs"
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
      title={`Delete "${parameterKey}" and all its versions`}
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
