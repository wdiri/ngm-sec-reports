import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const config = await prisma.dashboardConfig.findUnique({
      where: { id: 'config' },
    });
    return NextResponse.json(config);
  } catch (error) {
    console.error('Error fetching config:', error);
    return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const updated = await prisma.dashboardConfig.update({
      where: { id: 'config' },
      data: {
        headerText: body.headerText,
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating config:', error);
    return NextResponse.json({ error: 'Failed to update config' }, { status: 500 });
  }
}

