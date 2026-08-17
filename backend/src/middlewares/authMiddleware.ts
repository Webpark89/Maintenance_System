import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../utils/jwt.js';
import { prisma } from '../config/db.js';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export async function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  let token = req.cookies?.token;

  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'กรุณาเข้าสู่ระบบก่อนใช้งาน (Unauthorized)',
    });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({
      success: false,
      message: 'Token ไม่ถูกต้องหรือหมดอายุ กรุณาเข้าสู่ระบบใหม่',
    });
  }

  req.user = payload;

  // Load user permissions dynamically if not present in token payload
  if (!req.user.permissions) {
    try {
      const dbUser = await prisma.users.findUnique({
        where: { id: req.user.userId },
        include: {
          roles: {
            include: {
              role_permissions: {
                include: {
                  permissions: true,
                },
              },
            },
          },
        },
      });

      if (dbUser && dbUser.roles) {
        req.user.roleId = dbUser.roles.id;
        req.user.roleCode = dbUser.roles.code;
        req.user.permissions = dbUser.roles.role_permissions.map((rp: any) => rp.permissions.code);
      } else {
        // Fallback for legacy role string
        req.user.permissions = [];
      }
    } catch {
      req.user.permissions = [];
    }
  }

  next();
}

export function authorize(roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || (!roles.includes(req.user.role) && !roles.includes(req.user.roleCode || ''))) {
      return res.status(403).json({
        success: false,
        message: 'คุณไม่มีสิทธิ์เข้าถึงฟังก์ชันนี้ (Forbidden)',
      });
    }
    next();
  };
}

export function requirePermission(permissionCode: string | string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'กรุณาเข้าสู่ระบบก่อนใช้งาน (Unauthorized)',
      });
    }

    const userPermissions = req.user.permissions || [];
    // Allow supervisor role as master fallback for system protection if specified
    const isSupervisor = req.user.role === 'supervisor' || req.user.roleCode === 'supervisor';

    if (isSupervisor) {
      return next();
    }

    const requiredList = Array.isArray(permissionCode) ? permissionCode : [permissionCode];
    const hasAny = requiredList.some((code) => userPermissions.includes(code));

    if (!hasAny) {
      return res.status(403).json({
        success: false,
        message: `คุณไม่มีสิทธิ์ [${requiredList.join(', ')}] ในการทำรายการนี้ (Forbidden)`,
      });
    }

    next();
  };
}

