/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["ipfs.io"], // 👈 Allow IPFS images
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ipfs.io",
        pathname: "/ipfs/**", // 👈 Allow all paths under /ipfs/
      },
    ],
  },
};

export default nextConfig;
