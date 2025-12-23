'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
// Log types (duplicated from server-side for client use)
export type LogLevel = 'info' | 'warn' | 'error' | 'debug';
export type LogSource = 'system' | 'ai' | 'database' | 'api' | 'insights' | 'export';

export interface LogEntry {
  id: string;
  timestamp: Date | string;
  level: LogLevel;
  source: LogSource;
  message: string;
  details?: any;
  errorCode?: string;
  metadata?: Record<string, any>;
}

interface LogViewerProps {
  className?: string;
}

interface SystemHealth {
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
}

export function LogViewer({ className }: LogViewerProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedSources, setSelectedSources] = useState<LogSource[]>(['system', 'ai', 'database', 'api', 'insights', 'export']);
  const [selectedLevels, setSelectedLevels] = useState<LogLevel[]>(['info', 'warn', 'error', 'debug']);
  const [autoScroll, setAutoScroll] = useState(true);
  
  // Toggle between auto-scroll (active) and pause
  const toggleAutoScroll = () => {
    if (autoScroll) {
      // If auto-scroll is on, turn it off and pause
      setAutoScroll(false);
      setIsPaused(true);
    } else {
      // If paused, resume and enable auto-scroll
      setIsPaused(false);
      setAutoScroll(true);
    }
  };
  const [isClearing, setIsClearing] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const loadLogs = useCallback(async () => {
    if (isPaused || !autoScroll) return;

    try {
      const sourcesParam = selectedSources.join(',');
      const levelsParam = selectedLevels.join(',');
      const response = await fetch(`/api/logs?sources=${sourcesParam}&levels=${levelsParam}&limit=200`);
      
      if (!response.ok) throw new Error('Failed to fetch logs');
      
      const data = await response.json();
      
      // Convert timestamp strings to Date objects
      const logsWithDates = data.logs.map((log: any) => ({
        ...log,
        timestamp: new Date(log.timestamp),
      }));
      
      setLogs(logsWithDates);
      setHealth(data.health);

      // Auto-scroll to bottom if enabled (only scroll the container, not the page)
      if (autoScroll && scrollContainerRef.current) {
        setTimeout(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
          }
        }, 100);
      }
    } catch (error) {
      console.error('Error loading logs:', error);
    }
  }, [isPaused, selectedSources, selectedLevels, autoScroll]);

  // Load logs on mount and when filters change
  useEffect(() => {
    loadLogs();
    const interval = setInterval(loadLogs, 2000); // Poll every 2 seconds
    return () => clearInterval(interval);
  }, [loadLogs]);

  const toggleSource = (source: LogSource) => {
    setSelectedSources(prev =>
      prev.includes(source)
        ? prev.filter(s => s !== source)
        : [...prev, source]
    );
  };

  const toggleLevel = (level: LogLevel) => {
    setSelectedLevels(prev =>
      prev.includes(level)
        ? prev.filter(l => l !== level)
        : [...prev, level]
    );
  };

  const getLevelColor = (level: LogLevel): string => {
    switch (level) {
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      case 'warn': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'info': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'debug': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSourceColor = (source: LogSource): string => {
    switch (source) {
      case 'ai': return 'text-purple-600';
      case 'database': return 'text-green-600';
      case 'api': return 'text-blue-600';
      case 'insights': return 'text-indigo-600';
      case 'export': return 'text-pink-600';
      case 'system': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const formatTimestamp = (date: Date | string): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    });
  };

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const handleClearLogs = async () => {
    if (!confirm('Clear all logs? This action cannot be undone.')) {
      return;
    }
    try {
      setIsClearing(true);
      const response = await fetch('/api/logs', {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to clear logs');
      setLogs([]);
    } catch (error) {
      console.error('Error clearing logs:', error);
    } finally {
      setIsClearing(false);
    }
  };

  const getStatusColor = (status: 'healthy' | 'warning' | 'error'): string => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-50';
      case 'warning': return 'text-amber-600 bg-amber-50';
      case 'error': return 'text-red-600 bg-red-50';
    }
  };

  const allSources: LogSource[] = ['system', 'ai', 'database', 'api', 'insights', 'export'];
  const allLevels: LogLevel[] = ['debug', 'info', 'warn', 'error'];

  return (
    <div className={`${className}`}>
      {/* Logging Container */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Logging</h2>
          <div className="flex gap-2">
            <button
              onClick={toggleAutoScroll}
              className={`px-3 py-1.5 rounded text-xs font-medium ${
                autoScroll && !isPaused
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {autoScroll && !isPaused ? '📌 Auto-scroll' : '⏸ Pause'}
            </button>
            <button
              onClick={handleClearLogs}
              disabled={isClearing || logs.length === 0}
              className="px-3 py-1.5 rounded text-xs font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isClearing ? 'Clearing...' : '🗑 Clear Logs'}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-3 space-y-2">
          <div>
            <div className="text-xs font-medium text-gray-700 mb-1">Log Sources</div>
            <div className="flex flex-wrap gap-1">
              {allSources.map(source => (
                <label key={source} className="flex items-center gap-1 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedSources.includes(source)}
                    onChange={() => toggleSource(source)}
                    className="rounded border-gray-300"
                  />
                  <span className={getSourceColor(source)}>{source}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium text-gray-700 mb-1">Log Levels</div>
            <div className="flex flex-wrap gap-1">
              {allLevels.map(level => (
                <label key={level} className="flex items-center gap-1 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedLevels.includes(level)}
                    onChange={() => toggleLevel(level)}
                    className="rounded border-gray-300"
                  />
                  <span className={getLevelColor(level).split(' ')[0]}>{level}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Logs */}
        <div
          ref={scrollContainerRef}
          className="bg-gray-900 text-green-400 font-mono text-xs rounded border border-ngm-border overflow-auto"
          style={{ maxHeight: '500px', minHeight: '300px' }}
        >
          {logs.length === 0 ? (
            <div className="p-4 text-gray-500 text-center">No logs to display</div>
          ) : (
            <div className="p-2 space-y-1">
              {logs.map(log => (
                <div key={log.id} className="flex gap-2 hover:bg-gray-800 px-1 py-0.5 rounded">
                  <span className="text-gray-500 flex-shrink-0">{formatTimestamp(log.timestamp)}</span>
                  <span className={`px-1 rounded flex-shrink-0 ${getLevelColor(log.level)}`}>
                    {log.level.toUpperCase()}
                  </span>
                  <span className={`flex-shrink-0 ${getSourceColor(log.source)}`}>
                    [{log.source}]
                  </span>
                  {log.errorCode && (
                    <span className="text-red-400 flex-shrink-0">ERR:{log.errorCode}</span>
                  )}
                  <span className="flex-1">{log.message}</span>
                  {log.details && (
                    <span className="text-gray-500 text-xs">
                      {typeof log.details === 'object' ? JSON.stringify(log.details) : log.details}
                    </span>
                  )}
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

