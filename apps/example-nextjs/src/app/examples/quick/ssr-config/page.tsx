import {
  getConfig,
  getFlags,
  getExperiments,
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
  "production";

export default async function Page() {
  const serverOptions = {
    platform: PLATFORM,
    environment: ENVIRONMENT,
    apiUrl: API_URL,
    apiKey: API_KEY, // Required if authentication is enabled
  };

  const [{ config }, { flags }, { experiments }] = await Promise.all([
    getConfig(serverOptions),
    getFlags(serverOptions),
    getExperiments(serverOptions),
  ]);

  const theme = (config?.theme as string) ?? "light";
  const enabledFlags = flags.filter((f) => f.enabled);
  const runningExperiments = experiments.filter((e) => e.status === "running");

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-6">Server-Side Config</h1>

      <div className="max-w-md space-y-4">
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-1">theme (SSR)</p>
          <p className="text-lg font-semibold text-purple-700">{theme}</p>
        </div>

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
