/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    PUBLIC_SUPABASE_URL: process.env.PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY:
      process.env.PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY,
  },
};

module.exports = nextConfig;
