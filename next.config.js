/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Jika kamu nanti butuh mengambil gambar dari domain luar (misal Supabase Storage)
  images: {
    domains: [], 
  },
};

module.exports = nextConfig;