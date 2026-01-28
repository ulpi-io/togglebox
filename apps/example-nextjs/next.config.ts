import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@togglebox/sdk-nextjs", "@togglebox/sdk"],
};

export default nextConfig;
