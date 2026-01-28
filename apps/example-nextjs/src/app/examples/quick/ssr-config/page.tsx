import {
  getConfig,
  getFlags,
  getFlag,
  getExperiments,
  getExperiment,
} from "@togglebox/sdk-nextjs/server";

// Server-side env vars (no NEXT_PUBLIC_ prefix needed for server components)
const API_URL =
  process.env.TOGGLEBOX_API_URL ||
  process.env.NEXT_PUBLIC_TOGGLEBOX_API_URL ||
  "http://localhost:3000/api/v1";
const API_KEY =
  process.env.TOGGLEBOX_API_KEY || process.env.NEXT_PUBLIC_TOGGLEBOX_API_KEY;
const PLATFORM =
  process.env.TOGGLEBOX_PLATFORM ||
  process.env.NEXT_PUBLIC_TOGGLEBOX_PLATFORM ||
  "web";
const ENVIRONMENT =
  process.env.TOGGLEBOX_ENVIRONMENT ||
  process.env.NEXT_PUBLIC_TOGGLEBOX_ENVIRONMENT ||
  "staging";

export default async function Page() {
  const serverOptions = {
    platform: PLATFORM,
    environment: ENVIRONMENT,
    apiUrl: API_URL,
    apiKey: API_KEY, // Required if authentication is enabled
  };

  // Fetch all data in parallel
  const [
    { config, getConfigValue },
    { flags, isFlagEnabled },
    { flag: darkModeFlag, exists: darkModeExists, enabled: darkModeEnabled },
    { experiments, getVariant },
    { experiment: ctaExperiment, exists: ctaExists, variant: ctaVariant },
  ] = await Promise.all([
    getConfig(serverOptions),
    getFlags(serverOptions),
    getFlag("dark-mode", { userId: "ssr-user" }, serverOptions),
    getExperiments(serverOptions),
    getExperiment("checkout-test", { userId: "ssr-user" }, serverOptions),
  ]);

  // Use helper functions from results
  const theme = getConfigValue("theme", "light");
  const betaEnabled = isFlagEnabled("beta-features", { userId: "ssr-user" });
  const pricingVariant = getVariant("pricing-display-test", {
    userId: "ssr-user",
  });

  const enabledFlags = flags.filter((f) => f.enabled);
  const runningExperiments = experiments.filter((e) => e.status === "running");

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-6">Server-Side Config</h1>

      <div className="max-w-md space-y-4">
        {/* Config values */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-1">theme (from getConfig)</p>
          <p className="text-lg font-semibold text-purple-700">{theme}</p>
        </div>

        {/* Single flag (getFlag) */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-1">dark-mode (from getFlag)</p>
          <p className="text-lg font-semibold text-blue-700">
            {darkModeExists
              ? darkModeEnabled
                ? "Enabled"
                : "Disabled"
              : "Not Found"}
          </p>
        </div>

        {/* Flag from getFlags */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-1">
            beta-features (from getFlags.isFlagEnabled)
          </p>
          <p className="text-lg font-semibold text-green-700">
            {betaEnabled ? "Enabled" : "Disabled"}
          </p>
        </div>

        {/* Single experiment (getExperiment) */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-1">
            checkout-test (from getExperiment)
          </p>
          <p className="text-lg font-semibold text-orange-700">
            {ctaExists
              ? ctaVariant?.variationKey || "No variant"
              : "Not Found"}
          </p>
        </div>

        {/* Experiment from getExperiments */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-1">
            pricing-display-test (from getExperiments.getVariant)
          </p>
          <p className="text-lg font-semibold text-yellow-700">
            {pricingVariant?.variationKey || "Not Found"}
          </p>
        </div>

        {/* Summary */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-sm font-medium mb-2">Summary</p>
          <ul className="text-sm space-y-1">
            <li>Config keys: {Object.keys(config || {}).length}</li>
            <li>
              Enabled flags: {enabledFlags.length} / {flags.length}
            </li>
            <li>
              Running experiments: {runningExperiments.length} /{" "}
              {experiments.length}
            </li>
          </ul>
        </div>

        <p className="text-xs text-gray-400">
          This page was rendered on the server. View source to see pre-rendered
          HTML.
        </p>
      </div>
    </div>
  );
}
