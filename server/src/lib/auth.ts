import { NextRequest } from 'next/server';
import { prisma } from './prisma';
import { Role } from '@prisma/client';
import { supabase } from './supabase';
import jwt from 'jsonwebtoken';

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  departmentId: string;
}

// Memory cache for authenticated tokens to prevent redundant database and Supabase Auth calls
interface CacheEntry {
  user: AuthenticatedUser | null;
  expiresAt: number;
}

const tokenCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // Cache positive verification for 5 minutes
const NEGATIVE_CACHE_TTL_MS = 10 * 1000; // Cache failed verification for 10 seconds

function cleanExpiredCache() {
  const now = Date.now();
  // Bound cache size and clean expired entries lazily
  if (tokenCache.size > 500) {
    for (const [token, entry] of tokenCache.entries()) {
      if (now > entry.expiresAt) {
        tokenCache.delete(token);
      }
    }
  }
}

/**
 * Verifies the authentication state of an incoming request.
 * Resolves to the authenticated user's database profile, or null if invalid.
 * Uses local JWT decoding/verification with fallback to Supabase Auth API.
 */
export async function verifyAuth(
  req: NextRequest,
): Promise<AuthenticatedUser | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return null;
  }

  // Check cache first
  const now = Date.now();
  const cached = tokenCache.get(token);
  if (cached && now < cached.expiresAt) {
    return cached.user;
  }

  cleanExpiredCache();

  try {
    // 1. Perform lightweight local checks on token structure/expiration
    const decoded = jwt.decode(token) as any;
    if (decoded && decoded.exp) {
      const isExpired = decoded.exp * 1000 < now;
      if (isExpired) {
        // Expired token, reject immediately without database or Supabase API overhead
        tokenCache.set(token, {
          user: null,
          expiresAt: now + NEGATIVE_CACHE_TTL_MS,
        });
        return null;
      }
    }

    // 2. Attempt local signature verification if JWT_SECRET is configured
    const jwtSecret = process.env.JWT_SECRET;
    if (jwtSecret && decoded) {
      try {
        const verified = jwt.verify(token, jwtSecret) as any;
        if (verified && verified.sub) {
          const dbUser = await prisma.user.findUnique({
            where: { supabaseUserId: verified.sub },
          });

          if (dbUser) {
            const user: AuthenticatedUser = {
              id: dbUser.id,
              email: dbUser.email,
              fullName: dbUser.fullName,
              role: dbUser.role,
              departmentId: dbUser.departmentId,
            };
            // Cache successful verification
            tokenCache.set(token, { user, expiresAt: now + CACHE_TTL_MS });
            return user;
          }
        }
      } catch (verifyError) {
        // Log locally but fall through to Supabase API fallback in case of secret mismatch
        console.warn(
          'Local JWT signature verification failed, trying Supabase Auth fallback:',
          verifyError,
        );
      }
    }

    // 3. Fallback to Supabase Auth network verification
    const { data, error } = await supabase.auth.getUser(token);
    if (!error && data.user) {
      const dbUser = await prisma.user.findUnique({
        where: { supabaseUserId: data.user.id },
      });

      if (dbUser) {
        const user: AuthenticatedUser = {
          id: dbUser.id,
          email: dbUser.email,
          fullName: dbUser.fullName,
          role: dbUser.role,
          departmentId: dbUser.departmentId,
        };
        // Cache successful authentication
        tokenCache.set(token, { user, expiresAt: now + CACHE_TTL_MS });
        return user;
      }
    }

    // Cache failure briefly to mitigate spam
    tokenCache.set(token, {
      user: null,
      expiresAt: now + NEGATIVE_CACHE_TTL_MS,
    });
  } catch (error) {
    console.error('Supabase authentication verification failed:', error);
  }

  return null;
}
