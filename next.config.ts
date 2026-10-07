import type { NextConfig } from "next";

// Served as a GitHub Pages project site: https://capirotocodes.github.io/death-metal-fetch/
const basePath = "/death-metal-fetch";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
