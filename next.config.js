/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
];

const supabaseHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co').hostname;
  } catch {
    return 'placeholder.supabase.co';
  }
})();

const r2Host = (() => {
  if (!process.env.R2_PUBLIC_URL) return null;
  try {
    return new URL(process.env.R2_PUBLIC_URL).hostname;
  } catch {
    return null;
  }
})();

const remotePatterns = [
  { protocol: 'https', hostname: supabaseHost, pathname: '/storage/v1/object/public/**' },
  ...(r2Host ? [{ protocol: 'https', hostname: r2Host, pathname: '/**' }] : []),
  { protocol: 'https', hostname: '*.r2.dev', pathname: '/**' },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

module.exports = nextConfig;
