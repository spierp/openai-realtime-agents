import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Skip authentication for login page, debug endpoints, and static assets
  if (
    request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/favicon.ico') ||
    request.nextUrl.pathname.startsWith('/api/debug-env') ||
    request.nextUrl.pathname.startsWith('/api/debug-key') ||
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
      console.log('Cookie API key found and decoded, length:', apiKey.length);
    } catch (e) {
      // If decoding fails, use as-is but still trim
      apiKey = cookieApiKey.trim();
      console.log('Cookie API key decoding failed, using raw value:', apiKey.length);
    }
  }
  
  // Try header or query param if cookie not found
  if (!apiKey) {
    const headerKey = request.headers.get('x-api-key');
    const queryKey = request.nextUrl.searchParams.get('api_key');
    
    if (headerKey) {
      apiKey = headerKey.trim();
      console.log('Using header API key, length:', apiKey.length);
    } else if (queryKey) {
      apiKey = queryKey.trim(); 
      console.log('Using query param API key, length:', apiKey.length);
    }
  }
  
  // Check if we found a key
  if (!apiKey) {
    console.log('No API key found in request');
    return redirectToLogin(request);
  }
  
  // Verify the API key
  const isValid = apiKey === expectedApiKey;
  
  if (!isValid) {
    console.log('API key validation failed:');
    console.log('- Expected key length:', expectedApiKey.length);
    console.log('- Received key length:', apiKey.length);
    console.log('- First 5 chars expected:', expectedApiKey.substring(0, 5));
    console.log('- First 5 chars received:', apiKey.substring(0, 5));
    
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

// Apply middleware to all routes except login and debug endpoints
export const config = {
  matcher: ['/((?!login|_next/static|_next/image|favicon.ico).*)'],
} 