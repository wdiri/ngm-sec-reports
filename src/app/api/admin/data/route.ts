import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { deleteSeedData, getDataStatus, seedSampleData } from '@/lib/sampleData';

export async function GET() {
  try {
    const status = await getDataStatus(prisma);
    return NextResponse.json(status);
  } catch (error) {
    console.error('Error getting data status:', error);
    return NextResponse.json({ error: 'Failed to get data status' }, { status: 500 });
  }
}

export async function POST() {
  try {
    const status = await getDataStatus(prisma);
    if (status.periods > 0) {
      return NextResponse.json({ error: 'Data already present, delete it first to re-seed' }, { status: 400 });
    }

    const seeded = await seedSampleData(prisma);
    const updatedStatus = await getDataStatus(prisma);
    return NextResponse.json({ ...updatedStatus, seeded });
  } catch (error) {
    console.error('Error seeding data:', error);
    return NextResponse.json({ error: 'Failed to seed data' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const cleared = await deleteSeedData(prisma);
    const status = await getDataStatus(prisma);
    return NextResponse.json({ ...status, cleared });
  } catch (error) {
    console.error('Error deleting data:', error);
    return NextResponse.json({ error: 'Failed to delete data' }, { status: 500 });
  }
}
