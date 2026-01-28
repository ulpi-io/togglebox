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

  // Fetch all data in parallel - bulk and single-entity APIs
  const [
    { config },
    { flags },
    { flag: darkModeFlag, exists: darkModeExists, enabled: darkModeEnabled },
    { experiments },
    { experiment: ctaExperiment, exists: ctaExists, variant: ctaVariant },
  ] = await Promise.all([
    getConfig(serverOptions),
    getFlags(serverOptions),
    getFlag("dark-mode", { userId: "ssr-user" }, serverOptions),
    getExperiments(serverOptions),
    getExperiment("checkout-test", { userId: "ssr-user" }, serverOptions),
  ]);

  const theme = (config?.theme as string) ?? "light";
  const configKeys = Object.keys(config || {});
  const enabledFlags = flags.filter((f) => f.enabled);
  const runningExperiments = experiments.filter((e) => e.status === "running");

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-6">SSR + Hydration</h1>

      <div className="max-w-md space-y-6">
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs font-medium rounded">
              SSR
            </span>
            <span className="text-sm text-purple-700">
              Server-rendered data
            </span>
          </div>
          <p className="text-xs text-purple-600">
            This content was rendered on the server and is visible in page
            source.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold">{configKeys.length}</div>
            <div className="text-xs text-gray-500">Config Keys</div>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold">
              {enabledFlags.length}/{flags.length}
            </div>
            <div className="text-xs text-gray-500">Flags</div>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold">
              {runningExperiments.length}/{experiments.length}
            </div>
            <div className="text-xs text-gray-500">Experiments</div>
          </div>
        </div>

        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-2 text-gray-900">
            Theme from config
          </h3>
          <p className="text-lg font-mono">{theme}</p>
        </div>

        {/* Single-entity API results */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">dark-mode (getFlag)</p>
            <p className="text-lg font-semibold text-blue-700">
              {darkModeExists
                ? darkModeEnabled
                  ? "Enabled"
                  : "Disabled"
                : "Not Found"}
            </p>
          </div>
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">
              checkout-test (getExperiment)
            </p>
            <p className="text-lg font-semibold text-orange-700">
              {ctaExists
                ? ctaVariant?.variationKey || "No variant"
                : "Not Found"}
            </p>
          </div>
        </div>

        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">SSR Benefits</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Instant page loads with pre-rendered content</li>
            <li>• SEO-friendly: search engines see the content</li>
            <li>• No loading spinners on initial render</li>
            <li>• Client hydration keeps data fresh</li>
          </ul>
        </div>

        <p className="text-xs text-gray-400">
          View page source to see the server-rendered HTML.
        </p>
      </div>
    </div>
  );
}
