import { NextRequest, NextResponse } from 'next/server';
import { getLogs, getLogStats, clearLogs } from '@/lib/logging';
import { prisma } from '@/lib/db';
import * as fs from 'fs';
import * as path from 'path';

type LogSource = 'system' | 'ai' | 'database' | 'api' | 'insights' | 'export';
type LogLevel = 'info' | 'warn' | 'error' | 'debug';

/**
 * GET /api/logs
 * Returns logs with optional filtering and system health info
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sourcesParam = searchParams.get('sources');
    const levelsParam = searchParams.get('levels');
    const limitParam = searchParams.get('limit');
    const sinceParam = searchParams.get('since');

    // Parse filters
    const sources = sourcesParam ? (sourcesParam.split(',') as LogSource[]) : undefined;
    const levels = levelsParam ? (levelsParam.split(',') as LogLevel[]) : undefined;
    const limit = limitParam ? parseInt(limitParam, 10) : 100;
    const since = sinceParam ? new Date(sinceParam) : undefined;

    // Get logs
    const logs = getLogs({ sources, levels, limit, since });

    // Get log statistics
    const stats = getLogStats();

    // Get system health
    const health = await getSystemHealth();

    return NextResponse.json({
      logs,
      stats,
      health,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch logs' },
      { status: 500 }
    );
  }
}

/**
 * Get system health information
 */
async function getSystemHealth(): Promise<{
  database: {
    size: string;
    periods: number;
    metrics: number;
    status: 'healthy' | 'warning' | 'error';
  };
  ai: {
    configured: boolean;
    recentErrors: number;
    status: 'healthy' | 'warning' | 'error';
  };
  system: {
    uptime: number;
    memory: NodeJS.MemoryUsage;
    status: 'healthy' | 'warning' | 'error';
  };
}> {
  try {
    // Database health
    const [periods, metrics, dbSize] = await Promise.all([
      prisma.reportingPeriod.count(),
      prisma.metric.count(),
      getDatabaseSize(),
    ]);

    const dbStatus = dbSize > 100 * 1024 * 1024 ? 'warning' : 'healthy'; // Warn if > 100MB

    // AI health
    const config = await prisma.dashboardConfig.findUnique({
      where: { id: 'config' },
      select: { openaiApiKey: true },
    });
    const aiConfigured = !!config?.openaiApiKey;
    // Count AI errors specifically (not just all AI logs)
    const allLogs = getLogs();
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const aiRecentErrors = allLogs.filter(l => 
      l.source === 'ai' && 
      l.level === 'error' && 
      l.timestamp >= oneHourAgo
    ).length;
    const aiStatus = aiRecentErrors > 10 ? 'error' : aiRecentErrors > 5 ? 'warning' : 'healthy';

    // System health
    const memory = process.memoryUsage();
    const uptime = process.uptime();
    const memoryUsageMB = memory.heapUsed / 1024 / 1024;
    const systemStatus = memoryUsageMB > 500 ? 'warning' : 'healthy'; // Warn if > 500MB

    return {
      database: {
        size: `${(dbSize / 1024 / 1024).toFixed(2)} MB`, // Always show in MB
        periods,
        metrics,
        status: dbStatus,
      },
      ai: {
        configured: aiConfigured,
        recentErrors: aiRecentErrors,
        status: aiStatus,
      },
      system: {
        uptime,
        memory,
        status: systemStatus,
      },
    };
  } catch (error) {
    console.error('Error getting system health:', error);
    return {
      database: {
        size: 'unknown',
        periods: 0,
        metrics: 0,
        status: 'error' as const,
      },
      ai: {
        configured: false,
        recentErrors: 0,
        status: 'error' as const,
      },
      system: {
        uptime: 0,
        memory: process.memoryUsage(),
        status: 'error' as const,
      },
    };
  }
}

/**
 * Get database size (works for both SQLite and PostgreSQL)
 */
async function getDatabaseSize(): Promise<number> {
  try {
    const dbUrl = process.env.DATABASE_URL || '';
    
    // Check if it's PostgreSQL
    if (dbUrl.startsWith('postgresql://')) {
      // For PostgreSQL, query the database size
      const result = await prisma.$queryRaw<Array<{ size: bigint }>>`
        SELECT pg_database_size(current_database()) as size;
      `;
      return Number(result[0]?.size || 0);
    }
    
    // For SQLite, get file size
    let dbPath = dbUrl.replace('file:', '');
    
    // Handle relative paths
    if (dbPath.startsWith('./')) {
      dbPath = path.join(process.cwd(), dbPath.substring(2));
    } else if (!path.isAbsolute(dbPath)) {
      dbPath = path.join(process.cwd(), dbPath);
    }
    
    const fullPath = path.resolve(dbPath);

    if (fs.existsSync(fullPath)) {
      const stats = fs.statSync(fullPath);
      return stats.size;
    }
    return 0;
  } catch (error) {
    console.error('Error getting database size:', error);
    return 0;
  }
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * DELETE /api/logs
 * Clear all logs
 */
export async function DELETE() {
  try {
    clearLogs();
    return NextResponse.json({ success: true, message: 'Logs cleared' });
  } catch (error) {
    console.error('Error clearing logs:', error);
    return NextResponse.json(
      { error: 'Failed to clear logs' },
      { status: 500 }
    );
  }
}

