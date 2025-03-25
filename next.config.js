/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,
  
  // Output standalone build for better Docker performance
  output: 'standalone',
  
  // Configure image domains if needed
  images: {
    domains: [],
  },
  
  // Environment variables that should be available to the browser
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
  
  // Add trailing slash to improve compatibility with Nginx
  trailingSlash: true,
  
  // Configure redirects if needed
  async redirects() {
    return [];
  },
  
  // Configure headers for security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
        ],
      },
    ];
  },
  
  // Webpack configuration to handle NodeJS-only modules
  webpack: (config, { isServer }) => {
    // If this is a server-side build
    if (isServer) {
      // Keep the Node.js modules as external
      // This prevents bundling binary modules and their dependencies
      config.externals.push(
        'sharp', 
        '@xenova/transformers', 
        'onnxruntime-node',
        'chromadb-default-embed',
        'onnxruntime-common'
      );
    }
    
    return config;
  },
};

module.exports = nextConfig; 