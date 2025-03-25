import { NextResponse } from 'next/server';

// This file helps establish correct API route handling

// Ensure proper handling of server-only modules
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Simple health check endpoint to verify API is working
export async function GET() {
  return NextResponse.json({ status: 'ok' });
} 