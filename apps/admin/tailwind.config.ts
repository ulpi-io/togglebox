import type { Config } from "tailwindcss";
import toggleboxPreset from "@togglebox/ui/tailwind";

const config: Config = {
  presets: [toggleboxPreset as Config],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  plugins: [],
};

export default config;
