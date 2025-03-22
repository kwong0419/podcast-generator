import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true, // This is important for Netlify deployment
  },
};

export default nextConfig;
