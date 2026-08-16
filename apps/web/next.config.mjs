import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const configDirectory = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Keep Next's repository instruction discovery disabled for this product.
  agentRules: false,
  // Trace workspace dependencies from the repository root so standalone output
  // includes @mcb/platform and its transitive workspace sources.
  outputFileTracingRoot: join(configDirectory, '../..'),
  // apps/web 首次运行时依赖 @mcb/platform 的 TS 源。
  // Next 默认不转译 node_modules 里的 workspace TS 包，须显式声明由 Next SWC 编译。
  transpilePackages: ["@mcb/platform"],
};

export default nextConfig;
