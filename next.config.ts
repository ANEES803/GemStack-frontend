import fs from "fs";
import path from "path";
import type { NextConfig } from "next";

/** Single canonical directory path for this app (Windows NTFS can surface the same folder under different spellings). */
function appDir(absoluteDir: string): string {
  const resolved = path.resolve(absoluteDir);
  try {
    if (typeof fs.realpathSync.native === "function") {
      return fs.realpathSync.native(resolved);
    }
  } catch {
    /* fall through */
  }
  try {
    return fs.realpathSync(resolved);
  } catch {
    return resolved;
  }
}

const rootDir = appDir(__dirname);
const nodeModulesRoot = path.join(rootDir, "node_modules");

/**
 * Pin the app root when another lockfile exists higher up (e.g. under your user profile).
 * @see https://nextjs.org/docs/app/api-reference/config/next-config-js/output#caveats
 */
const nextConfig: NextConfig = {
  outputFileTracingRoot: rootDir,
  /**
   * ESLint during `next build` re-lints the whole tree and prints almost no progress; with very
   * large components (e.g. multi-thousand-line modules) it can take many minutes and feel stuck.
   * Run `npm run lint` before commits / in CI — see `package.json` script `check`.
   */
  eslint: {
    ignoreDuringBuilds: true,
  },
  /**
   * `next build` runs type-checking after compile; huge modules make this very slow on Windows with
   * almost no progress (looks frozen). Next 15 uses `ignoreBuildErrors` for this. Run `npm run
   * typecheck` or `npm run check` before deploy / in CI.
   */
  typescript: {
    ignoreBuildErrors: true,
  },
  /**
   * - optimizePackageImports: smaller webpack graphs for lucide.
   * - staticGenerationMaxConcurrency: default parallel prerender can thrash RAM on Windows and
   *   appear “stuck”; 1 keeps builds predictable (slower wall-clock, fewer freezes).
   */
  experimental: {
    optimizePackageImports: ["lucide-react"],
    staticGenerationMaxConcurrency: 1,
    /** Off: Next 15.5 devtools segment tree + webpack can hit null context / invalid hook call (500 on `/`). */
    devtoolSegmentExplorer: false,
  },
  /**
   * Windows path casing: pin webpack context + first `node_modules` lookup to this app’s realpath.
   * Do not alias `react` / `react-dom` here — that duplicates React vs Next’s compiled internals and
   * breaks `next/script`, HeadManagerContext, and the app router.
   */
  webpack: (config) => {
    config.context = rootDir;
    const resolve = config.resolve ?? {};
    config.resolve = resolve;
    const mods = resolve.modules;
    if (Array.isArray(mods)) {
      const rest = mods.filter((m) => path.normalize(String(m)) !== path.normalize(nodeModulesRoot));
      resolve.modules = [nodeModulesRoot, ...rest];
    } else {
      resolve.modules = [nodeModulesRoot, "node_modules"];
    }
    return config;
  },
};

export default nextConfig;
