import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { apiKey } = body;
    
    // Get the expected API key
    const expectedApiKey = String(process.env.API_KEY || '').trim();
    
    // Strict comparison
    const exactMatch = apiKey.trim() === expectedApiKey;
    
    if (exactMatch) {
      return NextResponse.json({ success: true }, { status: 200 });
    } else {
      return NextResponse.json({ 
        error: 'Invalid API key'
      }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ 
      error: 'Invalid request'
    }, { status: 400 });
  }
} 