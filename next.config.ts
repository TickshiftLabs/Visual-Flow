import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev only: lets the dev server be opened via this machine's LAN address
  // (the "Network" URL that `next dev` prints) as well as localhost.
  allowedDevOrigins: ["192.168.1.218"],
};

export default nextConfig;
