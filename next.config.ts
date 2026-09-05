import createMDX from "@next/mdx";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  reactCompiler: true,
  experimental: {
    turbopackRustReactCompiler: true,
    turbopackChunking: {
      generateComponentChunks: true,
    },
  },
  images: {
    remotePatterns: [
      {
        hostname: "plugins.omarchy.org",
        pathname: "/assets/img/plugins/**",
        protocol: "https",
      },
    ],
    unoptimized: true,
  },
  allowedDevOrigins: ["192.168.1.84"],
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
  trailingSlash: true,
  turbopack: {
    resolveAlias: {
      clsx: "cn",
    },
    rules: {
      "*.wgsl": {
        as: "*.js",
        loaders: [
          {
            loader: "@vgpu/wgsl/loader-webpack",
            options: { minify: true },
          },
        ],
      },
    },
  },
};

const withMDX = createMDX({
  options: {
    rehypePlugins: ["rehype-slug"],
    remarkPlugins: ["remark-gfm"],
  },
});

export default withMDX(nextConfig);
