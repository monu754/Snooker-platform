import { getSecurityHeadersForRuntime } from "./lib/security-headers.js";

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: getSecurityHeadersForRuntime(process.env.NODE_ENV === "production"),
      },
    ];
  },
};

export default nextConfig;
