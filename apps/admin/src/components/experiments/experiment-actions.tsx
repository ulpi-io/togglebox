"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  startExperimentApi,
  pauseExperimentApi,
  resumeExperimentApi,
  completeExperimentApi,
  updateExperimentTrafficApi,
} from "@/lib/api/experiments";
import type { Experiment, User, TrafficAllocation } from "@/lib/api/types";
import { Button, Badge, Alert } from "@togglebox/ui";

interface ExperimentActionsProps {
  experiment: Experiment;
  user: User | null;
  onSuccess?: () => void;
}

export function ExperimentActions({
  experiment,
  user,
  onSuccess,
}: ExperimentActionsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Traffic adjustment modal state
  const [showTrafficModal, setShowTrafficModal] = useState(false);
  const [editedTraffic, setEditedTraffic] = useState<TrafficAllocation[]>([]);
  const [isSavingTraffic, setIsSavingTraffic] = useState(false);
  const [trafficError, setTrafficError] = useState<string | null>(null);

  const { platform, environment, experimentKey, status } = experiment;
  const canAdjustTraffic =
    status === "draft" || status === "running" || status === "paused";

  const handleStart = async () => {
    if (!user?.email) {
      setError("User email not found");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await startExperimentApi(
        platform,
        environment,
        experimentKey,
        user.email,
      );
      if (onSuccess) {
        onSuccess();
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to start experiment",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handlePause = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await pauseExperimentApi(platform, environment, experimentKey);
      if (onSuccess) {
        onSuccess();
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to pause experiment",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResume = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await resumeExperimentApi(platform, environment, experimentKey);
      if (onSuccess) {
        onSuccess();
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to resume experiment",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!user?.email) {
      setError("User email not found");
      return;
    }

    const confirmComplete = window.confirm(
      "Are you sure you want to complete this experiment? This action cannot be undone.",
    );

    if (!confirmComplete) return;

    try {
      setIsLoading(true);
      setError(null);
      await completeExperimentApi(
        platform,
        environment,
        experimentKey,
        undefined,
        user.email,
      );
      if (onSuccess) {
        onSuccess();
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to complete experiment",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const openTrafficModal = () => {
    setEditedTraffic([...experiment.trafficAllocation]);
    setTrafficError(null);
    setShowTrafficModal(true);
  };

  const closeTrafficModal = () => {
    setShowTrafficModal(false);
    setEditedTraffic([]);
    setTrafficError(null);
  };

  const updateTrafficPercentage = (
    variationKey: string,
    newPercentage: number,
  ) => {
    setEditedTraffic((prev) =>
      prev.map((t) =>
        t.variationKey === variationKey
          ? { ...t, percentage: newPercentage }
          : t,
      ),
    );
  };

  const handleSaveTraffic = async () => {
    const totalPercentage = editedTraffic.reduce(
      (sum, t) => sum + t.percentage,
      0,
    );
    if (totalPercentage !== 100) {
      setTrafficError(
        `Traffic allocation must sum to 100%, currently ${totalPercentage}%`,
      );
      return;
    }

    setIsSavingTraffic(true);
    setTrafficError(null);

    try {
      await updateExperimentTrafficApi(
        platform,
        environment,
        experimentKey,
        editedTraffic,
      );
      closeTrafficModal();
      if (onSuccess) {
        onSuccess();
      } else {
        router.refresh();
      }
    } catch (err) {
      setTrafficError(
        err instanceof Error
          ? err.message
          : "Failed to update traffic allocation",
      );
    } finally {
      setIsSavingTraffic(false);
    }
  };

  const editedTotalPercentage = editedTraffic.reduce(
    (sum, t) => sum + t.percentage,
    0,
  );

  return (
    <>
      <div className="flex flex-col items-end space-y-2">
        <div className="flex space-x-2">
          {canAdjustTraffic && (
            <Button
              onClick={openTrafficModal}
              disabled={isLoading}
              variant="outline"
              size="sm"
            >
              Adjust Traffic
            </Button>
          )}

          {status === "draft" && (
            <Button onClick={handleStart} disabled={isLoading} size="sm">
              {isLoading ? "Starting..." : "Start"}
            </Button>
          )}

          {status === "running" && (
            <>
              <Button
                onClick={handlePause}
                disabled={isLoading}
                variant="outline"
                size="sm"
              >
                {isLoading ? "Pausing..." : "Pause"}
              </Button>
              <Button onClick={handleComplete} disabled={isLoading} size="sm">
                {isLoading ? "Completing..." : "Complete"}
              </Button>
            </>
          )}

          {status === "paused" && (
            <>
              <Button onClick={handleResume} disabled={isLoading} size="sm">
                {isLoading ? "Resuming..." : "Resume"}
              </Button>
              <Button
                onClick={handleComplete}
                disabled={isLoading}
                variant="outline"
                size="sm"
              >
                {isLoading ? "Completing..." : "Complete"}
              </Button>
            </>
          )}
        </div>

        {error && <div className="text-xs text-red-500 mt-1">{error}</div>}
      </div>

      {/* Traffic Adjustment Modal */}
      {showTrafficModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={closeTrafficModal}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-black mb-4">
              Adjust Traffic Allocation
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Adjust traffic allocation for each variation. Total must equal
              100%.
            </p>

            {/* Traffic sliders */}
            <div className="space-y-4 mb-4">
              {editedTraffic.map((allocation) => {
                const variation = experiment.variations.find(
                  (v) => v.key === allocation.variationKey,
                );
                return (
                  <div key={allocation.variationKey} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {variation?.name || allocation.variationKey}
                        </span>
                        {variation?.isControl && (
                          <Badge variant="secondary" size="sm">
                            Control
                          </Badge>
                        )}
                      </div>
                      <span className="text-sm font-bold">
                        {allocation.percentage}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={allocation.percentage}
                      onChange={(e) =>
                        updateTrafficPercentage(
                          allocation.variationKey,
                          parseInt(e.target.value),
                        )
                      }
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      disabled={isSavingTraffic}
                    />
                  </div>
                );
              })}
            </div>

            {/* Visual bar */}
            <div className="h-6 rounded-full overflow-hidden flex mb-4">
              {editedTraffic.map((allocation, index) => {
                const colors = [
                  "bg-primary",
                  "bg-blue-400",
                  "bg-green-400",
                  "bg-orange-400",
                  "bg-purple-400",
                ];
                return (
                  <div
                    key={allocation.variationKey}
                    className={`${colors[index % colors.length]} transition-all duration-200 flex items-center justify-center text-xs text-white font-medium`}
                    style={{ width: `${allocation.percentage}%` }}
                  >
                    {allocation.percentage > 10 && `${allocation.percentage}%`}
                  </div>
                );
              })}
            </div>

            {/* Total indicator */}
            <div className="flex items-center justify-between py-2 border-t border-b mb-4">
              <span className="text-sm font-medium">Total:</span>
              <span
                className={`text-sm font-bold ${editedTotalPercentage === 100 ? "text-green-600" : "text-destructive"}`}
              >
                {editedTotalPercentage}%
              </span>
            </div>

            {trafficError && (
              <Alert variant="destructive" className="mb-4">
                <span>{trafficError}</span>
              </Alert>
            )}

            {/* Action buttons */}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={closeTrafficModal}
                disabled={isSavingTraffic}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveTraffic}
                disabled={isSavingTraffic || editedTotalPercentage !== 100}
              >
                {isSavingTraffic ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
