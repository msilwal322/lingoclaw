import type { NextConfig } from "next";

const allowedDevOrigins = process.env.NEXT_ALLOWED_DEV_ORIGINS
  ? process.env.NEXT_ALLOWED_DEV_ORIGINS.split(",").map((h) => h.trim())
  : ["20.197.17.110"];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins,
};

export default nextConfig;
