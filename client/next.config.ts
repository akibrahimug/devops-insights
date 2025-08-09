import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_BACKEND_URL:
      process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000",
  },
  // Disable ESLint during production builds on Vercel to avoid missing dependency failures
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
