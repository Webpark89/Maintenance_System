import jwt, { SignOptions } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fixflow_cmms_jwt_secret_key_2026_industrial_maintenance_secure_guard';

export interface TokenPayload {
  userId: number;
  empId: string;
  name: string;
  role: string;
  roleId?: number | null;
  roleCode?: string;
  permissions?: string[];
  departmentId: number | null;
}

export function generateToken(payload: TokenPayload): string {
  const options: SignOptions = {
    expiresIn: '7d',
  };
  return jwt.sign(payload, JWT_SECRET, options);
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}
