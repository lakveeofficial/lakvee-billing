import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';
import { db } from './db';

export interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'billing_operator';
}

export interface JWTPayload {
  userId: number;
  username: string;
  role: string;
  iat?: number;
  exp?: number;
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// Verify password
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// Generate JWT token
export function generateToken(user: User): string {
  const payload: JWTPayload = {
    userId: user.id,
    username: user.username,
    role: user.role,
  };

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables.');
  }

  // Convert string duration to seconds (e.g., '7d' -> 604800)
  function parseDuration(duration: string): number {
    const match = duration.match(/^(\d+)([smhdwMY])/);
    if (!match) return 60 * 60 * 24 * 7; // Default to 7 days if format is invalid
    
    const value = parseInt(match[1], 10);
    const unit = match[2];
    
    const multipliers: {[key: string]: number} = {
      's': 1,                 // seconds
      'm': 60,                // minutes
      'h': 60 * 60,           // hours
      'd': 60 * 60 * 24,      // days
      'w': 60 * 60 * 24 * 7,  // weeks
      'M': 60 * 60 * 24 * 30, // months (approximate, uppercase M)
      'Y': 60 * 60 * 24 * 365 // years (approximate, uppercase Y)
    };
    
    const multiplier = multipliers[unit];
    if (multiplier === undefined) {
      throw new Error(`Invalid time unit: ${unit}. Use s, m, h, d, w, M, or Y`);
    }
    
    return value * multiplier;
  }
  
  try {
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
    const expiresInSeconds = parseDuration(expiresIn);
    
    return jwt.sign(payload, secret, { 
      algorithm: 'HS256',
      expiresIn: expiresInSeconds 
    });
  } catch (error) {
    console.error('Error generating JWT token:', error);
    throw new Error('Failed to generate authentication token');
  }
}

// Verify JWT token
export function verifyToken(token: string): JWTPayload | null {
  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is not defined in environment variables.');
    return null;
  }
  try {
    return jwt.verify(token, process.env.JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
}

// Get user from token
export async function getUserFromToken(token: string): Promise<User | null> {
  const payload = verifyToken(token);
  if (!payload) return null;

  try {
    const result = await db.query(
      'SELECT id, username, email, role FROM users WHERE id = $1',
      [payload.userId]
    );

    if (result.rows.length === 0) return null;
    return result.rows[0] as User;
  } catch (error) {
    console.error('Error getting user from token:', error);
    return null;
  }
}

// Authenticate user
export async function authenticateUser(username: string, password: string): Promise<User | null> {
  try {
    const result = await db.query(
      'SELECT id, username, email, password_hash, role FROM users WHERE username = $1 OR email = $1',
      [username]
    );

    if (result.rows.length === 0) return null;

    const user = result.rows[0];
    const isValidPassword = await verifyPassword(password, user.password_hash);

    if (!isValidPassword) return null;

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    };
  } catch (error) {
    console.error('Error authenticating user:', error);
    return null;
  }
}

// Middleware to extract user from request
export async function getUserFromRequest(request: NextRequest): Promise<User | null> {
  // 1. Check Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    return getUserFromToken(token);
  }

  // 2. Check cookies (Next.js API routes)
  // Note: The cookie name may be 'token', 'auth_token', or similar. Adjust if needed.
  const cookieToken = request.cookies.get('token')?.value;
  if (cookieToken) {
    return getUserFromToken(cookieToken);
  }

  return null;
}

// Check if user has required role
export function hasRole(user: User, requiredRole: 'admin' | 'billing_operator'): boolean {
  if (requiredRole === 'billing_operator') {
    return user.role === 'admin' || user.role === 'billing_operator';
  }
  return user.role === requiredRole;
}

// HOC for API routes to protect them and provide user context
export type AuthenticatedRouteHandler = (
  context: { user: User },
  req: NextRequest,
  ...args: any[]
) => Promise<Response>;

export function withAuth(handler: AuthenticatedRouteHandler) {
  return async (req: NextRequest, ...args: any[]) => {
    const user = await getUserFromRequest(req);

    if (!user) {
      return new Response(JSON.stringify({ message: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return handler({ user }, req, ...args);
  };
}
