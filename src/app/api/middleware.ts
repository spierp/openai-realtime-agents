import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// This middleware ensures proper API request handling
export function middleware(request: NextRequest) {
  // Get response headers
  const requestHeaders = new Headers(request.headers);
  const origin = requestHeaders.get('origin');

  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin || '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // Add CORS headers for regular requests
  return NextResponse.next({
    headers: {
      'Access-Control-Allow-Origin': origin || '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

// Configure which paths should trigger this middleware
export const config = {
  matcher: ['/api/:path*'],
}; 