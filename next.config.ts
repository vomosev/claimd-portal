// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['nodejs.gridiron-app.com', 'i.scdn.co'],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "nodejs.gridiron-app.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "digga.geo-drops.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "www.geo-drops.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "i.scdn.co",
        port: "",
        pathname: "/**",
      },
    ],
  },
};

module.exports = nextConfig;
