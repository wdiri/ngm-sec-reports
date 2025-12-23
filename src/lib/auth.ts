/**
 * Basic authentication helpers
 *
 * WARNING: This is a basic protection mechanism. For production use,
 * implement proper authentication with NextAuth.js or similar.
 */

import { NextRequest, NextResponse } from 'next/server';
import { env } from './env';

/**
 * Check if admin secret is required and valid
 *
 * If ADMIN_SECRET is set in environment, requests must include
 * matching 'x-admin-secret' header.
 *
 * @returns NextResponse with 401/403 error, or null if authorized
 */
export function checkAdminAuth(request: NextRequest): NextResponse | null {
  // If no ADMIN_SECRET is configured, allow all requests (development mode)
  if (!env.ADMIN_SECRET) {
    console.warn('⚠️  ADMIN_SECRET not set - admin endpoints are unprotected!');
    return null;
  }

  const providedSecret = request.headers.get('x-admin-secret');

  if (!providedSecret) {
    return NextResponse.json(
      {
        error: 'Unauthorized',
        message: 'Admin secret required. Set x-admin-secret header.',
      },
      { status: 401 }
    );
  }

  if (providedSecret !== env.ADMIN_SECRET) {
    return NextResponse.json(
      {
        error: 'Forbidden',
        message: 'Invalid admin secret',
      },
      { status: 403 }
    );
  }

  // Authorization successful
  return null;
}
