import type { Metadata } from "next";
import { Toaster } from "sonner";
import Link from "next/link";
import { Providers } from "./providers";
import {
  getConfig,
  getFlags,
  getExperiments,
} from "@togglebox/sdk-nextjs/server";
import "./globals.css";

// Server-side env vars (not exposed to client bundle)
const API_URL =
  process.env.NEXT_PUBLIC_TOGGLEBOX_API_URL || "http://localhost:3000/api/v1";
const API_KEY = process.env.TOGGLEBOX_API_KEY; // Server-only: NOT exposed to client
const PLATFORM = process.env.NEXT_PUBLIC_TOGGLEBOX_PLATFORM || "web";
const ENVIRONMENT = process.env.NEXT_PUBLIC_TOGGLEBOX_ENVIRONMENT || "staging";

export const metadata: Metadata = {
  title: "ToggleBox Example - Next.js",
  description: "Example application demonstrating ToggleBox SDK features",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const serverOptions = {
    platform: PLATFORM,
    environment: ENVIRONMENT,
    apiUrl: API_URL,
    apiKey: API_KEY,
  };

  const [{ config }, { flags }, { experiments }] = await Promise.all([
    getConfig(serverOptions),
    getFlags(serverOptions),
    getExperiments(serverOptions),
  ]);

  return (
    <html lang="en">
      <body className="antialiased">
        <Providers
          initialConfig={config}
          initialFlags={flags}
          initialExperiments={experiments}
        >
          <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <Link
                  href="/examples"
                  className="text-xl font-bold text-gray-900"
                >
                  ToggleBox SDK
                </Link>
                <span className="text-sm text-gray-500">Next.js Examples</span>
              </div>
            </header>
            <main className="p-6">{children}</main>
          </div>
          <Toaster position="bottom-right" richColors />
        </Providers>
      </body>
    </html>
  );
}
