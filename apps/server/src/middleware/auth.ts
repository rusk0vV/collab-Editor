import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

export interface AuthUser {
  userId: string;
  email: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

/**
 * Middleware that extracts and verifies the JWT token from the Authorization header.
 * Attaches the decoded user payload to the request object.
 */
export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication token is required' });
  }

  const token = authHeader.substring(7); // Extract the token after 'Bearer '
  
  try {
    const secret = process.env.JWT_SECRET || 'local_dev_secret_change_in_prod';
    const decoded = jwt.verify(token, secret) as { userId: string; email: string };
    
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
    };
    
    next();
  } catch (error) {
    console.error('JWT Verification Error:', error);
    return res.status(401).json({ error: 'Invalid or expired authentication token' });
  }
}
