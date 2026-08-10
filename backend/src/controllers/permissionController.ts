import { Request, Response } from 'express';
import { prisma } from '../config/db.js';

// GET /api/v1/permissions - Get all system permissions grouped or listed by module
export async function getPermissions(req: Request, res: Response) {
  try {
    const permissions = await prisma.permissions.findMany({
      orderBy: [{ module: 'asc' }, { id: 'asc' }],
    });

    // Group permissions by module
    const grouped = permissions.reduce((acc: Record<string, typeof permissions>, curr) => {
      if (!acc[curr.module]) {
        acc[curr.module] = [];
      }
      acc[curr.module].push(curr);
      return acc;
    }, {});

    return res.json({
      success: true,
      data: permissions,
      grouped: grouped,
    });
  } catch (error: any) {
    console.error('Error fetching permissions:', error);
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสิทธิ์การใช้งาน',
      error: error.message,
    });
  }
}
