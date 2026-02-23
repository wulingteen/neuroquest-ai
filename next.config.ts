import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Workaround: Turbopack panics on Chinese characters in path
  // Setting root to an ASCII path prevents the issue
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
