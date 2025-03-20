import { NextResponse } from 'next/server';

export async function GET() {
  // For debugging only - never expose all environment variables in production
  const apiKey = process.env.API_KEY || '';
  
  return NextResponse.json({
    apiKeySet: !!apiKey,
    apiKeyLength: apiKey.length,
    apiKeyFirstFour: apiKey.substring(0, 4),
    apiKeyLastFour: apiKey.length > 4 ? apiKey.substring(apiKey.length - 4) : '',
    apiKeyContainsEquals: apiKey.includes('='),
    // Show all env variables for debugging (remove in production)
    allEnvKeys: Object.keys(process.env),
    envSnapshot: {
      NODE_ENV: process.env.NODE_ENV,
    }
  });
} 