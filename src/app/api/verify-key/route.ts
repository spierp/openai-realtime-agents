import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { apiKey } = body;
    
    // Get the expected API key
    const expectedApiKey = process.env.API_KEY || '';
    
    // Log detailed comparison for debugging
    console.log('API Key Verification:');
    console.log('- Input key length:', apiKey?.length || 0);
    console.log('- Expected key length:', expectedApiKey.length);
    console.log('- First 4 chars input:', apiKey?.substring(0, 4) || '');
    console.log('- First 4 chars expected:', expectedApiKey.substring(0, 4));
    
    // Strict comparison
    const exactMatch = apiKey === expectedApiKey;
    console.log('- Exact match:', exactMatch);
    
    if (exactMatch) {
      return NextResponse.json({ success: true }, { status: 200 });
    } else {
      // Convert input key to array of char codes (simpler approach)
      const inputCharCodes: number[] = [];
      const expectedCharCodes: number[] = [];
      
      if (apiKey) {
        for (let i = 0; i < Math.min(10, apiKey.length); i++) {
          inputCharCodes.push(apiKey.charCodeAt(i));
        }
      }
      
      for (let i = 0; i < Math.min(10, expectedApiKey.length); i++) {
        expectedCharCodes.push(expectedApiKey.charCodeAt(i));
      }
      
      // Return detailed debug info
      return NextResponse.json({ 
        error: 'Invalid API key',
        debug: {
          inputKeyLength: apiKey?.length || 0,
          expectedKeyLength: expectedApiKey.length,
          inputKeyStart: apiKey?.substring(0, 4) || '',
          expectedKeyStart: expectedApiKey.substring(0, 4),
          inputCharCodes,
          expectedCharCodes,
          exactMatch
        }
      }, { status: 401 });
    }
  } catch (error) {
    console.error('Error in API key verification:', error);
    return NextResponse.json({ 
      error: 'Invalid request',
      errorDetails: String(error)
    }, { status: 400 });
  }
} 