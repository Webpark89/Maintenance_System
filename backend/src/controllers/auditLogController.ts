import { Response } from 'express';
import { prisma } from '../config/db.js';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';

export async function getAuditLogs(req: AuthenticatedRequest, res: Response) {
  try {
    const { module, action, search, limit = '100', page = '1' } = req.query;

    const take = Math.min(Number(limit) || 100, 200);
    const skip = ((Number(page) || 1) - 1) * take;

    const where: any = {};

    if (module && module !== 'all') {
      where.module = String(module);
    }

    if (action && action !== 'all') {
      where.action = String(action);
    }

    if (search) {
      const searchStr = String(search).trim();
      where.OR = [
        { user_name: { contains: searchStr } },
        { emp_id: { contains: searchStr } },
        { action: { contains: searchStr } },
        { module: { contains: searchStr } },
        { details: { contains: searchStr } },
        { target_id: { contains: searchStr } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.audit_logs.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take,
        skip,
      }),
      prisma.audit_logs.count({ where }),
    ]);

    return res.json({
      success: true,
      data: logs,
      pagination: {
        total,
        page: Number(page) || 1,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error: any) {
    console.error('Error fetching audit logs:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลประวัติการใช้งาน' });
  }
}
