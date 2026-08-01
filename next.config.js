/** @type {import('next').NextConfig} */

const supabaseWsHost = (() => {
  try {
    const h = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co').hostname;
    return h;
  } catch {
    return 'placeholder.supabase.co';
  }
})();

const cspDirectives = [
  "default-src 'self'",
  // Scripts : Next.js a besoin de 'unsafe-inline' pour les Server Actions + hydration inline
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  // Styles : inline styles pour Tailwind + Next.js
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  // Polices
  "font-src 'self' https://fonts.gstatic.com",
  // Images : self + supabase + r2 + unsplash CDN + data URIs
  `img-src 'self' data: blob: https://${supabaseWsHost} https://*.r2.dev https://images.unsplash.com ${process.env.R2_PUBLIC_URL || ''}`,
  // API calls : supabase + self
  `connect-src 'self' https://${supabaseWsHost} wss://${supabaseWsHost}`,
  // Objets interdits
  "object-src 'none'",
  // Iframes autorisées : carte Google Maps (embed) sur la page contact.
  "frame-src https://www.google.com https://maps.google.com",
  // 'self' (et non 'none') : autorise l'aperçu du site en iframe MÊME ORIGINE
  // (dashboard → /site-preview) tout en bloquant tout framing cross-origin.
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'Content-Security-Policy',
    value: cspDirectives,
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
  // Unsplash CDN — utilisé pour les photos de menu (licence libre, usage commercial)
  { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
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
