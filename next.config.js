/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Enable server actions for form handling
  },
  turbopack: {
    // Avoid incorrect root inference when multiple lockfiles exist
    root: __dirname,
  },
};

module.exports = nextConfig;
