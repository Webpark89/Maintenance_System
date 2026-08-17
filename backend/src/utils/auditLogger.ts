import { prisma } from '../config/db.js';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';

interface LogAuditParams {
  req?: AuthenticatedRequest | any;
  action: string;
  module: string;
  targetId?: string | number | null;
  details?: string | object | null;
}

export function getCleanIp(req?: any): string {
  if (!req) return '127.0.0.1';
  const forwarded = req.headers?.['x-forwarded-for'];
  const rawIp = (typeof forwarded === 'string' ? forwarded.split(',')[0] : req.ip || req.socket?.remoteAddress || '127.0.0.1').trim();
  
  // Clean ::ffff: prefix from IPv6-mapped IPv4
  const cleaned = rawIp.replace(/^::ffff:/, '');
  return cleaned === '::1' ? '127.0.0.1' : cleaned;
}

export async function logAudit({ req, action, module, targetId, details }: LogAuditParams) {
  try {
    const userId = req?.user?.userId || null;
    const userName = req?.user?.name || 'ระบบ (System)';
    const empId = req?.user?.empId || null;
    const ipAddress = getCleanIp(req);

    const detailStr = typeof details === 'object' ? JSON.stringify(details) : details ? String(details) : null;

    await prisma.audit_logs.create({
      data: {
        user_id: userId,
        user_name: userName,
        emp_id: empId,
        action,
        module,
        target_id: targetId ? String(targetId) : null,
        details: detailStr,
        ip_address: ipAddress,
      },
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}
