import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Avoid picking a parent folder lockfile (e.g. under your user profile) as the app root.
  outputFileTracingRoot: path.join(__dirname),
  // Allow dev assets when opening the app from another device on your LAN (Next 15+).
  allowedDevOrigins: ["192.168.2.130"],
};

export default nextConfig;
