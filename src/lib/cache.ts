/**
 * Redis cache utility for caching static and semi-static data
 * Falls back gracefully if Redis is not available
 */

import Redis from 'ioredis';

let redis: Redis | null = null;
let cacheEnabled = false;

// Initialize Redis connection
function initRedis(): void {
  if (redis) return; // Already initialized

  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  
  try {
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) {
          console.warn('[CACHE] Redis connection failed after 3 retries, caching disabled');
          return null; // Stop retrying
        }
        return Math.min(times * 50, 2000);
      },
      lazyConnect: true,
    });

    redis.on('error', (err) => {
      console.warn('[CACHE] Redis error:', err.message);
      cacheEnabled = false;
    });

    redis.on('connect', () => {
      console.log('[CACHE] Redis connected');
      cacheEnabled = true;
    });

    // Try to connect
    redis.connect().catch(() => {
      console.warn('[CACHE] Redis connection failed, caching disabled');
      cacheEnabled = false;
    });
  } catch (error) {
    console.warn('[CACHE] Failed to initialize Redis:', error);
    cacheEnabled = false;
  }
}

// Initialize on module load
if (typeof window === 'undefined') {
  // Only run on server side
  initRedis();
}

/**
 * Get value from cache
 */
export async function get<T>(key: string): Promise<T | null> {
  if (!cacheEnabled || !redis) return null;

  try {
    const value = await redis.get(key);
    if (!value) return null;
    return JSON.parse(value) as T;
  } catch (error) {
    console.warn(`[CACHE] Error getting key ${key}:`, error);
    return null;
  }
}

/**
 * Set value in cache with optional TTL (time to live in seconds)
 */
export async function set(key: string, value: any, ttl?: number): Promise<boolean> {
  if (!cacheEnabled || !redis) return false;

  try {
    const serialized = JSON.stringify(value);
    if (ttl) {
      await redis.setex(key, ttl, serialized);
    } else {
      await redis.set(key, serialized);
    }
    return true;
  } catch (error) {
    console.warn(`[CACHE] Error setting key ${key}:`, error);
    return false;
  }
}

/**
 * Delete value from cache
 */
export async function del(key: string): Promise<boolean> {
  if (!cacheEnabled || !redis) return false;

  try {
    await redis.del(key);
    return true;
  } catch (error) {
    console.warn(`[CACHE] Error deleting key ${key}:`, error);
    return false;
  }
}

/**
 * Delete all keys matching a pattern
 */
export async function delPattern(pattern: string): Promise<boolean> {
  if (!cacheEnabled || !redis) return false;

  try {
    const stream = redis.scanStream({
      match: pattern,
      count: 100,
    });

    const keys: string[] = [];
    stream.on('data', (resultKeys: string[]) => {
      keys.push(...resultKeys);
    });

    await new Promise<void>((resolve, reject) => {
      stream.on('end', resolve);
      stream.on('error', reject);
    });

    if (keys.length > 0) {
      await redis.del(...keys);
    }
    return true;
  } catch (error) {
    console.warn(`[CACHE] Error deleting pattern ${pattern}:`, error);
    return false;
  }
}

/**
 * Check if cache is available
 */
export function isAvailable(): boolean {
  return cacheEnabled && redis !== null;
}

/**
 * Cache keys
 */
export const CacheKeys = {
  toleranceBands: 'tolerance:bands',
  toleranceBand: (metricNumber: number) => `tolerance:band:${metricNumber}`,
  dashboardConfig: 'config:dashboard',
  metricNames: 'metrics:names',
  insights: (timeRange: number, metrics?: string, types?: string) => 
    `insights:${timeRange}:${metrics || 'all'}:${types || 'all'}`,
} as const;

