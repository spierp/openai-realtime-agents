import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Skip authentication for login page and static assets
  if (
    request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/favicon.ico') ||
    request.nextUrl.pathname.startsWith('/api/verify-key')
  ) {
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
    } catch {
      // If decoding fails, use as-is but still trim
      apiKey = cookieApiKey.trim();
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
    if (request.nextUrl.pathname.startsWith('/api/')) {
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

// Apply middleware to all routes except login
export const config = {
  matcher: ['/((?!login|_next/static|_next/image|favicon.ico).*)'],
} 