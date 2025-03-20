import { NextResponse } from 'next/server';

// This endpoint bypasses middleware for direct testing
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { apiKey } = body;
    
    // Get the expected API key (convert to string to ensure consistent comparison)
    const expectedApiKey = String(process.env.API_KEY || '');
    
    // Print values to server console
    console.log('DEBUG API KEY TEST:');
    console.log(`Input key: "${apiKey}"`);
    console.log(`Expected key: "${expectedApiKey}"`);
    console.log(`Input length: ${apiKey?.length || 0}`);
    console.log(`Expected length: ${expectedApiKey.length}`);
    console.log(`Equality test: ${apiKey === expectedApiKey}`);
    
    // Return all debug information
    return NextResponse.json({
      debug: {
        inputKey: apiKey,
        expectedKey: expectedApiKey,
        inputLength: apiKey?.length || 0,
        expectedLength: expectedApiKey.length,
        inputFirstChars: apiKey?.substring(0, 5) || '',
        expectedFirstChars: expectedApiKey.substring(0, 5),
        inputLastChars: apiKey?.substring(apiKey?.length - 5) || '',
        expectedLastChars: expectedApiKey.substring(expectedApiKey.length - 5),
        isEqual: apiKey === expectedApiKey
      }
    });
  } catch (error) {
    console.error('Debug key error:', error);
    return NextResponse.json({ error: String(error) });
  }
} 