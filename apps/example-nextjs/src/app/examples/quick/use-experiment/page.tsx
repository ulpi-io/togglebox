"use client";

import { useState, useEffect } from "react";
import { useExperiment, useAnalytics } from "@togglebox/sdk-nextjs";

const USER_ID = process.env.NEXT_PUBLIC_USER_ID || "demo-user-123";
const USER_CONTEXT = { userId: USER_ID };

export default function Page() {
  const { experiment, getVariant, isLoading } = useExperiment(
    "checkout-test",
    USER_CONTEXT,
  );
  const { trackConversion, flushStats } = useAnalytics();
  const [variant, setVariant] = useState<string | null>(null);
  const [converted, setConverted] = useState(false);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (!experiment || isLoading) return;

    if (experiment.status === "running") {
      setAssigning(true);
      getVariant()
        .then(async (v) => {
          setVariant(v);
          await flushStats();
        })
        .catch((err) => {
          console.error("[use-experiment] getVariant error:", err);
        })
        .finally(() => setAssigning(false));
    }
  }, [experiment, isLoading, getVariant]);

  const handleConversion = async () => {
    if (!variant) return;
    await trackConversion(
      "checkout-test",
      USER_CONTEXT,
      { metricId: "purchase", value: 99.99 },
    );
    await flushStats();
    setConverted(true);
  };

  if (isLoading || assigning) {
    return (
      <div className="min-h-screen p-8">
        <div className="h-8 bg-gray-200 rounded w-44 mb-6 animate-pulse" />
        <div className="max-w-md space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 animate-pulse">
            <div className="h-3 bg-blue-100 rounded w-32 mb-2" />
            <div className="h-6 bg-blue-100 rounded w-40" />
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 animate-pulse">
            <div className="h-4 bg-green-100 rounded w-36 mb-1" />
            <div className="h-3 bg-green-100 rounded w-24" />
          </div>
          <div className="h-10 bg-gray-200 rounded-lg w-52 animate-pulse" />
        </div>
      </div>
    );
  }

  const assignedVariation = experiment?.variations?.find(
    (v: { key: string }) => v.key === variant,
  );

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-6">A/B Experiment</h1>

      <div className="max-w-md space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-1">
            {experiment?.experimentKey ?? "checkout-test"} variant
          </p>
          <p className="text-lg font-semibold text-blue-700">
            {assignedVariation?.name ?? variant ?? "Not assigned"}
          </p>
        </div>

        {assignedVariation ? (
          <>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm font-medium text-green-800">
                Assigned: {assignedVariation.name}
              </p>
              <p className="text-xs text-green-600 mt-1">
                Key: {assignedVariation.key}
                {assignedVariation.isControl && " (control)"}
              </p>
            </div>

            <button
              onClick={handleConversion}
              disabled={converted}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {converted ? "Conversion Tracked" : "Complete Purchase ($99.99)"}
            </button>

            {converted && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-800">
                  Conversion tracked for variant &quot;{assignedVariation.key}&quot;
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="bg-gray-100 rounded-lg p-4 text-center text-gray-500">
            {experiment ? "Not assigned to a variant" : "No experiment found"}
          </div>
        )}
      </div>
    </div>
  );
}
