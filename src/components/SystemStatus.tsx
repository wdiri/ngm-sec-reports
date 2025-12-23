'use client';

import { useState, useEffect } from 'react';

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

export function SystemStatus() {
  const [health, setHealth] = useState<SystemHealth | null>(null);

  useEffect(() => {
    const loadHealth = async () => {
      try {
        const response = await fetch('/api/logs?limit=1');
        if (!response.ok) throw new Error('Failed to fetch health');
        const data = await response.json();
        setHealth(data.health);
      } catch (error) {
        console.error('Error loading health:', error);
      }
    };

    loadHealth();
    const interval = setInterval(loadHealth, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: 'healthy' | 'warning' | 'error'): string => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-50';
      case 'warning': return 'text-amber-600 bg-amber-50';
      case 'error': return 'text-red-600 bg-red-50';
    }
  };

  if (!health) {
    return <div className="text-xs text-gray-500">Loading...</div>;
  }

  return (
    <div className="grid grid-cols-3 gap-3 text-xs">
      <div className="bg-gray-50 rounded-lg p-3 border border-ngm-border flex flex-col">
        <div className="font-semibold text-gray-900 mb-1">Database</div>
        <div className="text-gray-600 mb-1 flex-grow">
          {health.database.size}
        </div>
        <div className="text-gray-600 mb-1">
          {health.database.periods} periods
        </div>
        <span className={`px-2 py-1 rounded text-xs font-medium text-left ${getStatusColor(health.database.status)}`}>
          {health.database.status}
        </span>
      </div>
      <div className="bg-gray-50 rounded-lg p-3 border border-ngm-border flex flex-col">
        <div className="font-semibold text-gray-900 mb-1">AI</div>
        <div className="text-gray-600 mb-1 flex-grow">
          {health.ai.configured ? 'Configured' : 'Not configured'}
        </div>
        <div className="mb-1"></div>
        <span className={`px-2 py-1 rounded text-xs font-medium text-left ${getStatusColor(health.ai.status)}`}>
          {health.ai.status}
        </span>
      </div>
      <div className="bg-gray-50 rounded-lg p-3 border border-ngm-border flex flex-col">
        <div className="font-semibold text-gray-900 mb-1">System</div>
        <div className="text-gray-600 mb-1 flex-grow">
          Memory: {(health.system.memory.heapUsed / 1024 / 1024).toFixed(1)} MB
        </div>
        <div className="mb-1"></div>
        <span className={`px-2 py-1 rounded text-xs font-medium text-left ${getStatusColor(health.system.status)}`}>
          {health.system.status}
        </span>
      </div>
    </div>
  );
}

