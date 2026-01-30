"use client";

import { useState, useEffect } from "react";
import { useExperiment, useAnalytics } from "@togglebox/sdk-nextjs";

export default function Page() {
  const { experiment, getVariant, isLoading } = useExperiment(
    "cta-experiment",
    { userId: "user-123" },
  );
  const { trackEvent, trackConversion, flushStats } = useAnalytics();
  const [variant, setVariant] = useState<string | null>(null);
  const [impressionTracked, setImpressionTracked] = useState(false);
  const [conversionTracked, setConversionTracked] = useState(false);

  useEffect(() => {
    if (isLoading || !experiment || experiment.status !== "running") return;

    getVariant().then((v) => {
      setVariant(v);
      if (v && !impressionTracked) {
        trackEvent(
          "impression",
          { userId: "user-123" },
          {
            experimentKey: "cta-experiment",
            variationKey: v,
          },
        );
        setImpressionTracked(true);
      }
    });
  }, [isLoading, experiment, getVariant, trackEvent, impressionTracked]);

  const handleClick = async () => {
    if (!variant) return;

    await trackConversion(
      "cta-experiment",
      { userId: "user-123" },
      {
        metricId: "cta_click",
        value: 1,
      },
    );
    await flushStats();
    setConversionTracked(true);
  };

  if (isLoading || !variant) {
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

  const variants: Record<
    string,
    { text: string; bg: string; description: string }
  > = {
    control: {
      text: "Get Started",
      bg: "bg-gray-600 hover:bg-gray-700",
      description: "Control: Neutral gray",
    },
    "variant-a": {
      text: "Start Free Trial",
      bg: "bg-blue-600 hover:bg-blue-700",
      description: "Variant A: Free trial messaging",
    },
    "variant-b": {
      text: "Try It Now!",
      bg: "bg-green-600 hover:bg-green-700",
      description: "Variant B: Urgency messaging",
    },
  };

  const config = variants[variant] || variants.control;

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
