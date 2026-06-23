import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["bcryptjs", "@prisma/client", "prisma"],
  images: {
    remotePatterns: [],
  },
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
