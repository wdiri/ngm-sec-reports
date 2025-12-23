/**
 * Centralized logging system
 * Captures logs with categories for filtering and display
 */

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';
export type LogSource = 'system' | 'ai' | 'database' | 'api' | 'insights' | 'export';

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  source: LogSource;
  message: string;
  details?: any;
  errorCode?: string;
  metadata?: Record<string, any>;
}

// In-memory log store (in production, consider using a proper logging service)
const logs: LogEntry[] = [];
const MAX_LOGS = 1000; // Keep last 1000 logs

/**
 * Add a log entry
 */
export function log(
  level: LogLevel,
  source: LogSource,
  message: string,
  details?: any,
  errorCode?: string,
  metadata?: Record<string, any>
): void {
  const entry: LogEntry = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date(),
    level,
    source,
    message,
    details,
    errorCode,
    metadata,
  };

  logs.push(entry);

  // Keep only the last MAX_LOGS entries
  if (logs.length > MAX_LOGS) {
    logs.shift();
  }

  // Also log to console for development
  const consoleMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
  const prefix = `[${source.toUpperCase()}]`;
  const errorCodeStr = errorCode ? ` [ERR:${errorCode}]` : '';
  console[consoleMethod](`${prefix}${errorCodeStr}`, message, details || '');
}

/**
 * Get logs with optional filtering
 */
export function getLogs(options?: {
  sources?: LogSource[];
  levels?: LogLevel[];
  limit?: number;
  since?: Date;
}): LogEntry[] {
  let filtered = [...logs];

  if (options?.sources && options.sources.length > 0) {
    filtered = filtered.filter(log => options.sources!.includes(log.source));
  }

  if (options?.levels && options.levels.length > 0) {
    filtered = filtered.filter(log => options.levels!.includes(log.level));
  }

  if (options?.since) {
    filtered = filtered.filter(log => log.timestamp >= options.since!);
  }

  // Sort by timestamp (newest first)
  filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  if (options?.limit) {
    filtered = filtered.slice(0, options.limit);
  }

  return filtered;
}

/**
 * Clear logs
 */
export function clearLogs(): void {
  logs.length = 0;
}

/**
 * Get log statistics
 */
export function getLogStats(): {
  total: number;
  byLevel: Record<LogLevel, number>;
  bySource: Record<LogSource, number>;
  recentErrors: number;
} {
  const byLevel: Record<LogLevel, number> = {
    info: 0,
    warn: 0,
    error: 0,
    debug: 0,
  };

  const bySource: Record<LogSource, number> = {
    system: 0,
    ai: 0,
    database: 0,
    api: 0,
    insights: 0,
    export: 0,
  };

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  let recentErrors = 0;

  logs.forEach(log => {
    byLevel[log.level]++;
    bySource[log.source]++;
    if (log.level === 'error' && log.timestamp >= oneHourAgo) {
      recentErrors++;
    }
  });

  return {
    total: logs.length,
    byLevel,
    bySource,
    recentErrors,
  };
}

