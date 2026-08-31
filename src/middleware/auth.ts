import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
  };
}

export function jwtMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ error: 'missing authorization header' });
    return;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    res.status(401).json({ error: 'invalid authorization header format' });
    return;
  }

  const tokenStr = parts[1];
  try {
    const decoded = jwt.verify(tokenStr, config.jwtSecret) as { sub?: string; userId?: string };
    const userId = decoded.sub || decoded.userId;

    if (!userId) {
      res.status(401).json({ error: 'invalid token subject' });
      return;
    }

    req.user = { userId };
    next();
  } catch (err) {
    res.status(401).json({ error: 'invalid or expired token' });
  }
}
