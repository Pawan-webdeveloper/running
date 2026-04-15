import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '../db/supabase';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    phone: string;
    role?: string;
  };
}

export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided', code: 'NO_TOKEN' });
    return;
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET || 'dev-secret') as {
      user_id: string;
      phone: string;
      role?: string;
    };

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, phone, is_banned')
      .eq('id', decoded.user_id)
      .single();

    if (!profile) {
      res.status(401).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
      return;
    }

    if (profile.is_banned) {
      res.status(403).json({ error: 'Account banned', code: 'BANNED' });
      return;
    }

    req.user = {
      id: profile.id,
      phone: profile.phone,
      role: decoded.role,
    };

    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token', code: 'INVALID_TOKEN' });
  }
}

export async function adminMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user?.role || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required', code: 'ADMIN_REQUIRED' });
    return;
  }
  next();
}