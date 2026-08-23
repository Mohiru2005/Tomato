/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  swcMinify: true,
  async redirects() {
    if (process.env.VERCEL) {
      return [
        {
          source: '/:path*',
          destination: 'https://tomato-26nw.onrender.com/:path*',
          permanent: false,
        },
      ];
    }
    return [];
  },
};

export default nextConfig;
