/**
 * Environment variable validation
 * Ensures all required environment variables are present and valid
 */

import { z } from 'zod';

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Next.js specific
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),

  // Admin protection (optional - if not set, admin endpoints are unprotected)
  ADMIN_SECRET: z.string().min(1).optional(),

  // AI enhancement (optional - if not set, AI features are disabled)
  OPENAI_API_KEY: z.string().min(1).optional(),
});

// Lazy validation - only validates when first accessed at runtime
let _env: z.infer<typeof envSchema> | null = null;

function validateEnv() {
  if (_env) return _env;

  const parsedEnv = envSchema.safeParse(process.env);

  if (!parsedEnv.success) {
    console.error('❌ Invalid environment variables:');
    console.error(parsedEnv.error.flatten().fieldErrors);
    throw new Error('Invalid environment variables');
  }

  _env = parsedEnv.data;
  return _env;
}

/**
 * Validated environment variables
 * Use this instead of process.env for type safety
 *
 * Note: Uses lazy validation to avoid breaking Next.js build
 */
export const env = new Proxy({} as z.infer<typeof envSchema>, {
  get(_target, prop) {
    const validated = validateEnv();
    return validated[prop as keyof typeof validated];
  },
});
