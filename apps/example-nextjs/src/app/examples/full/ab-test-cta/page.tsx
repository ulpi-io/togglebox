"use client";

import { useState, useEffect } from "react";
import { useExperiment, useAnalytics } from "@togglebox/sdk-nextjs";

const USER_CONTEXT = { userId: "user-123" };

export default function Page() {
  const { experiment, getVariant, isLoading } = useExperiment(
    "cta-test",
    USER_CONTEXT,
  );
  const { trackConversion, flushStats } = useAnalytics();
  const [variant, setVariant] = useState<string | undefined>(undefined);
  const [impressionTracked, setImpressionTracked] = useState(false);
  const [conversionTracked, setConversionTracked] = useState(false);

  useEffect(() => {
    if (!experiment || isLoading) return;
    if (experiment.status !== "running") return;

    let cancelled = false;
    getVariant()
      .then((v) => {
        if (cancelled) return;
        setVariant(v ?? undefined);
        if (v && !impressionTracked) {
          setImpressionTracked(true);
        }
      })
      .catch((err) => {
        console.error("[ab-test-cta] getVariant error:", err);
      });

    return () => {
      cancelled = true;
    };
  }, [experiment, isLoading, getVariant, impressionTracked]);

  const handleClick = async () => {
    if (!variant) return;

    await trackConversion("cta-test", USER_CONTEXT, {
      metricId: "cta_click",
      value: 1,
    });
    await flushStats();
    setConversionTracked(true);
  };

  const awaitingVariant =
    !isLoading && experiment?.status === "running" && variant === undefined;

  if (isLoading || awaitingVariant) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8">
        <div className="h-9 bg-gray-200 rounded w-72 mb-8 animate-pulse" />
        <div className="h-14 bg-gray-200 rounded-lg w-48 animate-pulse" />
        <div className="mt-8 space-y-2 flex flex-col items-center">
          <div className="h-4 bg-gray-200 rounded w-36 animate-pulse" />
          <div className="h-4 bg-gray-200 rounded w-48 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!variant) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8">
        <h1 className="text-3xl font-bold mb-4">A/B Test CTA</h1>
        <div className="bg-gray-100 rounded-lg p-6 text-center text-gray-500 max-w-md">
          <p className="font-medium mb-1">No variant assigned</p>
          <p className="text-sm">
            {!experiment
              ? 'The "cta-test" experiment was not found.'
              : `Experiment status: ${experiment.status}`}
          </p>
        </div>
      </div>
    );
  }

  const variants: Record<
    string,
    { text: string; bg: string; description: string }
  > = {
    "get-started": {
      text: "Get Started",
      bg: "bg-gray-600 hover:bg-gray-700",
      description: "Control: Neutral gray",
    },
    "free-trial": {
      text: "Start Free Trial",
      bg: "bg-blue-600 hover:bg-blue-700",
      description: "Variant: Free trial messaging",
    },
    "try-now": {
      text: "Try It Now!",
      bg: "bg-green-600 hover:bg-green-700",
      description: "Variant: Urgency messaging",
    },
  };

  const config = variants[variant] || variants["get-started"];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-bold mb-8">Welcome to Our Platform</h1>

      <button
        onClick={handleClick}
        className={`px-8 py-4 text-white text-xl font-medium rounded-lg ${config.bg}`}
      >
        {config.text}
      </button>

      <div className="mt-8 text-sm text-gray-500 text-center space-y-1">
        <p>
          <strong>Variant:</strong> {variant}
        </p>
        <p>
          <strong>Strategy:</strong> {config.description}
        </p>
        {conversionTracked && (
          <p className="text-green-600 font-medium">Conversion tracked!</p>
        )}
      </div>
    </div>
  );
}
