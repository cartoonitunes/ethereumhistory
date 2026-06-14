/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable source maps in production to reduce bundle size and deploy time
  productionBrowserSourceMaps: false,
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
  async rewrites() {
    return [
      // the EH Explorer game is a static canvas app served from public/game/
      { source: "/game", destination: "/game/index.html" },
    ];
  },
};

module.exports = nextConfig;
