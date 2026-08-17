import { Response } from 'express';
import { prisma } from '../config/db.js';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { logAudit } from '../utils/auditLogger.js';
import { sendNotification } from '../services/socketService.js';

// 1. GET /api/v1/pm - Get all PM schedules
export async function getPMSchedules(req: AuthenticatedRequest, res: Response) {
  try {
    const { asset_id, is_active } = req.query;

    const where: any = {};
    if (asset_id) {
      where.asset_id = Number(asset_id);
    }
    if (is_active !== undefined) {
      where.is_active = is_active === 'true';
    }

    const schedules = await prisma.pm_schedules.findMany({
      where,
      include: {
        assets: true,
        users: { select: { id: true, name: true, emp_id: true } },
      },
      orderBy: { next_due_date: 'asc' },
    });

    const formatted = schedules.map((item) => {
      const today = new Date();
      const dueDate = new Date(item.next_due_date);
      const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      let status = 'upcoming';
      if (diffDays < 0) status = 'overdue';
      else if (diffDays <= 7) status = 'due_soon';

      return {
        id: item.id,
        pm_code: item.pm_code,
        title: item.title,
        asset_id: item.asset_id,
        asset_code: item.assets?.asset_code,
        asset_name: item.assets?.name,
        location: item.assets?.location,
        frequency: item.frequency,
        interval_days: item.interval_days,
        next_due_date: item.next_due_date,
        last_completed_at: item.last_completed_at,
        checklist: item.checklist || [],
        assigned_tech_id: item.assigned_tech_id,
        assigned_tech_name: item.users?.name || 'ยังไม่กำหนดช่าง',
        is_active: item.is_active,
        due_status: status,
        days_remaining: diffDays,
        created_at: item.created_at,
      };
    });

    return res.json({
      success: true,
      data: formatted,
      summary: {
        total: formatted.length,
        overdue: formatted.filter((s) => s.due_status === 'overdue').length,
        due_soon: formatted.filter((s) => s.due_status === 'due_soon').length,
        active: formatted.filter((s) => s.is_active).length,
      },
    });
  } catch (error: any) {
    console.error('Error fetching PM schedules:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลแผน PM' });
  }
}

// 2. POST /api/v1/pm - Create PM Schedule
export async function createPMSchedule(req: AuthenticatedRequest, res: Response) {
  try {
    const { title, asset_id, frequency, interval_days, next_due_date, checklist, assigned_tech_id } = req.body || {};

    if (!title || !asset_id || !next_due_date) {
      return res.status(400).json({ success: false, message: 'กรุณาระบุชื่องาน PM, เครื่องจักร และกำหนดการตรวจเช็ค' });
    }

    const numAssetId = Number(asset_id);
    const targetAsset = await prisma.assets.findUnique({ where: { id: numAssetId } });
    if (!targetAsset) {
      return res.status(404).json({ success: false, message: 'ไม่พบเครื่องจักรที่ระบุ' });
    }

    const lastPm = await prisma.pm_schedules.findFirst({ orderBy: { id: 'desc' } });
    const nextNum = (lastPm?.id || 0) + 1;
    const pmCode = `PM-${new Date().getFullYear()}-${String(nextNum).padStart(3, '0')}`;

    const newSchedule = await prisma.pm_schedules.create({
      data: {
        pm_code: pmCode,
        title: String(title).trim(),
        asset_id: numAssetId,
        frequency: frequency ? String(frequency).trim() : 'monthly',
        interval_days: Number(interval_days) || 30,
        next_due_date: new Date(next_due_date),
        checklist: Array.isArray(checklist) ? checklist : [],
        assigned_tech_id: assigned_tech_id ? Number(assigned_tech_id) : null,
        is_active: true,
      },
      include: {
        assets: true,
      },
    });

    await logAudit({
      req,
      action: 'CREATE_PM_SCHEDULE',
      module: 'PM_SCHEDULE',
      targetId: newSchedule.id,
      details: { pm_code: newSchedule.pm_code, title: newSchedule.title, asset: targetAsset.name },
    });

    return res.status(201).json({
      success: true,
      message: `สร้างแผนบำรุงรักษา ${newSchedule.pm_code} สำเร็จ`,
      data: newSchedule,
    });
  } catch (error: any) {
    console.error('Error creating PM schedule:', error);
    return res.status(500).json({ success: false, message: error?.message || 'เกิดข้อผิดพลาดในการสร้างแผน PM' });
  }
}

// 3. POST /api/v1/pm/:id/generate-wo - Generate instant Preventive Maintenance Work Order
export async function generatePMWorkOrder(req: AuthenticatedRequest, res: Response) {
  try {
    const pmId = Number(req.params.id);
    const schedule = await prisma.pm_schedules.findUnique({
      where: { id: pmId },
      include: { assets: true },
    });

    if (!schedule) {
      return res.status(404).json({ success: false, message: 'ไม่พบแผนบำรุงรักษาที่ระบุ' });
    }

    const lastRequest = await prisma.maintenance_requests.findFirst({ orderBy: { id: 'desc' } });
    const nextNum = (lastRequest?.id || 0) + 1;
    const workOrderNo = `WO-PM-${new Date().getFullYear()}-${String(nextNum).padStart(3, '0')}`;

    const newRequest = await prisma.maintenance_requests.create({
      data: {
        work_order_no: workOrderNo,
        asset_id: schedule.asset_id,
        reported_by_id: req.user?.userId || null,
        assigned_technician_id: schedule.assigned_tech_id || null,
        priority: 'medium',
        status: 'open',
        category: 'preventive-maintenance',
        problem_title: `[PM Plan] ${schedule.title} (${schedule.pm_code})`,
        description: `งานบำรุงรักษาเชิงป้องกันตามรอบ (${schedule.frequency})\nรายการตรวจสอบ: ${Array.isArray(schedule.checklist) ? schedule.checklist.join(', ') : 'ตามคู่มือมาตรฐาน'}`,
      },
      include: {
        assets: true,
      },
    });

    // Update next due date for PM schedule
    const nextDueDate = new Date();
    nextDueDate.setDate(nextDueDate.getDate() + schedule.interval_days);

    await prisma.pm_schedules.update({
      where: { id: pmId },
      data: {
        last_completed_at: new Date(),
        next_due_date: nextDueDate,
      },
    });

    await logAudit({
      req,
      action: 'TRIGGER_PM_WORK_ORDER',
      module: 'PM_SCHEDULE',
      targetId: pmId,
      details: { work_order_no: workOrderNo, pm_code: schedule.pm_code },
    });

    await sendNotification({
      userId: schedule.assigned_tech_id || null,
      requestId: newRequest.id,
      title: `📅 ใบงานบำรุงรักษาเชิงป้องกัน PM (${workOrderNo})`,
      message: `แผนงาน: ${schedule.title} (เครื่องจักร: ${schedule.assets?.name})`,
      targetRoom: 'room:technicians',
      eventType: 'new_request',
      payloadData: newRequest,
    });

    return res.status(201).json({
      success: true,
      message: `ออกใบงาน PM (${workOrderNo}) และตั้งรอบถัดไป (${nextDueDate.toISOString().split('T')[0]}) สำเร็จ`,
      data: newRequest,
    });
  } catch (error: any) {
    console.error('Error generating PM work order:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการออกใบงาน PM' });
  }
}
