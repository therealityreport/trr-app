import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const logEntry = await request.json();
    
    // In a real app, you'd send this to your logging service
    // For now, we'll just log it server-side
    console.log('[PRODUCTION DEBUG]', JSON.stringify(logEntry, null, 2));
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Debug log endpoint error:', error);
    return NextResponse.json({ error: 'Failed to log' }, { status: 500 });
  }
}
