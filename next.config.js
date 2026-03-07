/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Enable server actions for form handling
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "static.alchemyapi.io",
        pathname: "/images/**",
      },
    ],
  },
  turbopack: {
    // Avoid incorrect root inference when multiple lockfiles exist
    root: __dirname,
  },
  async redirects() {
    return [
      {
        source: "/verified",
        destination: "/proofs",
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
