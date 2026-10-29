import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { timingSafeEqual } from "crypto";
import type { Request, Response, NextFunction } from "express";

const SALT_ROUNDS = 10;

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET must be set in production.");
  }
  return "dev-only-secret-change-me";
}

const JWT_SECRET = getJwtSecret();

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export function verifyPassword(
  password: string,
  hashedPassword: string,
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "30d" });
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string };
  } catch {
    return null;
  }
}

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.substring(7)
    : null;

  if (!token) {
    res.status(401).json({ message: "Zaloguj się, aby kontynuować" });
    return;
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    res.status(401).json({ message: "Sesja wygasła. Zaloguj się ponownie" });
    return;
  }

  req.userId = decoded.userId;
  next();
}

// Dispatcher endpoints are protected by a shared key from ADMIN_API_KEY.
export function authenticateAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const expected = process.env.ADMIN_API_KEY;
  if (!expected) {
    res.status(503).json({
      message: "Panel dyspozytora jest wyłączony. Ustaw ADMIN_API_KEY.",
    });
    return;
  }
  const provided = req.header("x-admin-key") ?? "";
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    res.status(401).json({ message: "Niepoprawny klucz dyspozytora" });
    return;
  }
  next();
}
