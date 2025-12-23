import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { log } from '@/lib/logging';
import { get, set, del, CacheKeys } from '@/lib/cache';

export async function GET() {
  try {
    // Try to get from cache first
    const cached = await get<any>(CacheKeys.dashboardConfig);
    if (cached) {
      return NextResponse.json(cached);
    }

    let config = await prisma.dashboardConfig.findUnique({
      where: { id: 'config' },
    });
    
    // Create default config if it doesn't exist
    if (!config) {
      config = await prisma.dashboardConfig.create({
        data: {
          id: 'config',
          headerText: 'Example dashboard – Presented at CORF / TRGC and input to ERC/BRC',
          openaiApiKey: null,
        },
      });
    }
    
    // Don't return the actual API key for security - just indicate if it's set
    const response = { ...config };
    if (response.openaiApiKey) {
      response.openaiApiKey = '***configured***';
    }

    // Cache for 1 hour (config rarely changes)
    await set(CacheKeys.dashboardConfig, response, 3600);
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching config:', error);
    return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const updateData: { headerText?: string; openaiApiKey?: string | null } = {};
    
    if (body.headerText !== undefined) {
      updateData.headerText = body.headerText;
    }
    
    if (body.openaiApiKey !== undefined) {
      // Allow setting to null to clear the key, or set a new key
      updateData.openaiApiKey = body.openaiApiKey || null;
    }
    
    // Use upsert to create if doesn't exist
    const updated = await prisma.dashboardConfig.upsert({
      where: { id: 'config' },
      update: updateData,
      create: {
        id: 'config',
        headerText: body.headerText || 'Example dashboard – Presented at CORF / TRGC and input to ERC/BRC',
        openaiApiKey: body.openaiApiKey || null,
      },
    });
    
    // Don't return the API key in the response for security
    const response = { ...updated };
    if (response.openaiApiKey) {
      // Only return whether a key is set, not the actual key
      response.openaiApiKey = response.openaiApiKey ? '***configured***' : null;
    }
    
    // Log the API key update (without the actual key)
    if (body.openaiApiKey !== undefined) {
      log('info', 'system', 'OpenAI API key updated', { configured: !!body.openaiApiKey });
    }

    // Invalidate cache
    await del(CacheKeys.dashboardConfig);
    
    return NextResponse.json(response);
  } catch (error: any) {
    log('error', 'api', 'Error updating config', { error: error?.message || 'Unknown error' }, '500');
    return NextResponse.json({ error: 'Failed to update config' }, { status: 500 });
  }
}

