import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/server.ts"],
  format: ["cjs", "esm"],
  dts: {
    resolve: true,
  },
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  minify: false,
  // Bundle workspace dependencies
  noExternal: [
    "@togglebox/core",
    "@togglebox/configs",
    "@togglebox/flags",
    "@togglebox/experiments",
    "@togglebox/sdk",
  ],
  // Don't bundle React/Next.js (peer dependencies) and zod (type bundling issues)
  external: ["react", "react-dom", "next", "zod"],
});
