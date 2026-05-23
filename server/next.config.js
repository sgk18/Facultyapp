/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Ensure serverless compatibility
  typescript: {
    ignoreBuildErrors: false,
  }
};

module.exports = nextConfig;
