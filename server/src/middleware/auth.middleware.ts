import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: { 
    userId: number;
    email: string;
  };
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: "Sizda ruxsat yo'q (Token topilmadi)" });
  }

  try {
    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET || 'fallback_secret_123'
    ) as { userId: number; email: string };

    req.user = { 
      userId: decoded.userId,
      email: decoded.email 
    };

    next();
  } catch (error) {
    res.status(401).json({ message: "Token yaroqsiz yoki muddati o'tgan" });
  }
};