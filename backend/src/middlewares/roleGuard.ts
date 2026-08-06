import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authMiddleware.js';

export function roleGuard(allowedRoles: Array<'requester' | 'technician' | 'supervisor'>) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'กรุณาเข้าสู่ระบบก่อนใช้งาน',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `ปฏิเสธการเข้าถึง: Role '${req.user.role}' ไม่มีสิทธิ์ใช้งานฟังก์ชันนี้ (เฉพาะ ${allowedRoles.join(', ')} เท่านั้น)`,
      });
    }

    next();
  };
}
