import { Request, Response } from 'express';
import { prisma } from '../config/db.js';

export async function getKPIMetrics(req: Request, res: Response) {
  try {
    const totalRequests = await prisma.maintenance_requests.count();
    const openRequests = await prisma.maintenance_requests.count({ where: { status: 'open' } });
    const inProgressRequests = await prisma.maintenance_requests.count({ where: { status: { in: ['assess', 'waiting', 'doing'] } } });
    const completedRequests = await prisma.maintenance_requests.count({ where: { status: 'complete' } });

    // Calculate MTTR (Mean Time To Repair in hours)
    const completedOrders = await prisma.maintenance_requests.findMany({
      where: {
        status: 'complete',
        repair_started_at: { not: null },
        repaired_at: { not: null },
      },
    });

    let totalRepairTimeMinutes = 0;
    completedOrders.forEach((item: any) => {
      if (item.repair_started_at && item.repaired_at) {
        const diffMs = new Date(item.repaired_at).getTime() - new Date(item.repair_started_at).getTime();
        totalRepairTimeMinutes += Math.max(0, diffMs / (1000 * 60));
      }
    });

    const mttrHours = completedOrders.length > 0
      ? Number((totalRepairTimeMinutes / (completedOrders.length * 60)).toFixed(2))
      : 2.5; // Demo fallback

    const totalAssets = await prisma.assets.count();
    const breakdownAssets = await prisma.assets.count({ where: { status: 'breakdown' } });

    // Calculate MTBF (Mean Time Between Failures)
    const mtbfHours = totalAssets > 0 ? Number(((totalAssets * 720) / Math.max(1, breakdownAssets)).toFixed(1)) : 148.0;

    return res.json({
      success: true,
      data: {
        totalRequests,
        openRequests,
        inProgressRequests,
        completedRequests,
        mttrHours,
        mtbfHours,
        assetAvailabilityPct: totalAssets > 0 ? Number((((totalAssets - breakdownAssets) / totalAssets) * 100).toFixed(1)) : 95.0,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch KPI analytics' });
  }
}
