import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This function determines if a URL should be protected by authentication
function shouldProtectPath(pathname: string): boolean {
  const PUBLIC_PATHS = [
    '/login',
    '/api/verify-key',
    '/favicon.ico'
  ];

  // File extensions that should be publicly accessible
  const PUBLIC_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp'];

  // Skip static files and public paths
  if (
    pathname.startsWith('/_next/') ||
    PUBLIC_PATHS.some(path => pathname.startsWith(path)) ||
    PUBLIC_EXTENSIONS.some(ext => pathname.toLowerCase().endsWith(ext))
  ) {
    return false;
  }

  return true;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip authentication for static files and public paths
  if (!shouldProtectPath(pathname)) {
    return NextResponse.next();
  }

  // Get the expected API key and ensure it's a string
  const expectedApiKey = String(process.env.API_KEY || '').trim();
  
  // Check for API key in various places
  let apiKey = null;
  
  // Get from cookie (will be URL encoded)
  const cookieApiKey = request.cookies.get('api_key')?.value;
  if (cookieApiKey) {
    try {
      // Decode and trim the cookie value
      apiKey = decodeURIComponent(cookieApiKey).trim();
    } catch (e) {
      // If decoding fails, use as-is but still trim
      apiKey = cookieApiKey.trim();
      void e; // Explicitly void the error to avoid unused variable warning
    }
  }
  
  // Try header or query param if cookie not found
  if (!apiKey) {
    const headerKey = request.headers.get('x-api-key');
    const queryKey = request.nextUrl.searchParams.get('api_key');
    
    if (headerKey) {
      apiKey = headerKey.trim();
    } else if (queryKey) {
      apiKey = queryKey.trim(); 
    }
  }
  
  // Check if we found a key
  if (!apiKey) {
    return redirectToLogin(request);
  }
  
  // Verify the API key
  const isValid = apiKey === expectedApiKey;
  
  if (!isValid) {
    // If accessing the API
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // If accessing a page, redirect to login
    return redirectToLogin(request);
  }
  
  return NextResponse.next();
}

// Helper function to redirect to login
function redirectToLogin(request: NextRequest) {
  return NextResponse.redirect(new URL('/login', request.url));
}

// Configure which paths should trigger this middleware
export const config = {
  matcher: [
    /*
     * Match all API routes:
     * - /api/rag
     * - /api/session
     */
    '/api/:path*',
  ],
};

// NO matcher: use the shouldProtectPath function inside middleware instead 