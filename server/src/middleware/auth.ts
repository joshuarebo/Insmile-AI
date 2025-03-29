import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler';

export interface JwtPayload {
  id: number;
  userId: string;
  email: string;
  role: string;
}

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user: JwtPayload | undefined;
    }
  }
}

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      throw new AppError('No token provided', 401);
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'insmile-ai-secret-key-2024'
    ) as JwtPayload;

    req.user = decoded;
    next();
  } catch (error) {
    next(error);
  }
};

export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Not authenticated', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError('Not authorized', 403));
    }

    next();
  };
}; 