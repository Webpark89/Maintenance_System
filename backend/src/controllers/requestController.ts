import { Response } from 'express';
import { prisma } from '../config/db.js';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';

// Status transition rule constraint map
const VALID_TRANSITIONS: Record<string, string[]> = {
  open: ['assess', 'cancelled'],
  assess: ['waiting', 'doing', 'cancelled'],
  waiting: ['doing', 'cancelled'],
  doing: ['done', 'cancelled'],
  done: ['complete', 'cancelled'],
  complete: [],
  cancelled: [],
};

export async function getAllRequests(req: AuthenticatedRequest, res: Response) {
  try {
    const userRole = req.user?.role;
    const userId = req.user?.userId;

    let whereClause = {};

    // Data Scope Control:
    // Requester: เห็นเฉพาะงานซ่อมของตนเอง
    if (userRole === 'requester') {
      whereClause = { reported_by_id: userId };
    }

    const requests = await prisma.maintenance_requests.findMany({
      where: whereClause,
      include: {
        assets: true,
        users_maintenance_requests_reported_by_idTousers: { select: { name: true, emp_id: true } },
        users_maintenance_requests_assigned_technician_idTousers: { select: { name: true, emp_id: true } },
        work_order_requisitions: { include: { spare_parts: true } },
        dual_signatures: true,
      },
      orderBy: { created_at: 'desc' },
    });

    return res.json({ success: true, data: requests });
  } catch (error) {
    console.error('Fetch requests error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch requests' });
  }
}

export async function createRequest(req: AuthenticatedRequest, res: Response) {
  try {
    const { asset_id, priority, category, problem_title, description, image_url } = req.body || {};
    const userId = req.user?.userId;

    if (!asset_id || !problem_title || !category) {
      return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลปัญหา เครื่องจักร และหมวดหมู่ให้ครบถ้วน' });
    }

    // Safe Work Order Number Generator
    const lastRequest = await prisma.maintenance_requests.findFirst({
      orderBy: { id: 'desc' },
    });
    const nextNum = (lastRequest?.id || 0) + 1;
    const workOrderNo = `WO-${new Date().getFullYear()}-${String(nextNum).padStart(3, '0')}`;

    const newRequest = await prisma.maintenance_requests.create({
      data: {
        work_order_no: workOrderNo,
        asset_id: Number(asset_id),
        reported_by_id: userId,
        priority: priority || 'medium',
        status: 'open',
        category: String(category).trim(),
        problem_title: String(problem_title).trim(),
        description: description ? String(description).trim() : null,
        image_url: image_url ? String(image_url).trim() : null,
      },
    });

    // Update Asset status to breakdown
    await prisma.assets.update({
      where: { id: Number(asset_id) },
      data: { status: 'breakdown' },
    });

    return res.status(201).json({ success: true, message: 'สร้างใบแจ้งซ่อมสำเร็จ', data: newRequest });
  } catch (error) {
    console.error('Create request error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create request' });
  }
}

export async function updateRequestStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    const request = await prisma.maintenance_requests.findUnique({
      where: { id: Number(id) },
    });

    if (!request) {
      return res.status(404).json({ success: false, message: 'ไม่พบใบแจ้งซ่อมนี้ในระบบ' });
    }

    const currentStatus = request.status || 'open';
    const allowedNextStatuses = VALID_TRANSITIONS[currentStatus] || [];

    // Enforce No-Skip State Transition Rule (ยกเว้น Supervisor สามารถ override ได้หากจำเป็น)
    if (req.user?.role !== 'supervisor' && !allowedNextStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `ไม่สามารถเปลี่ยนสถานะจาก '${currentStatus}' ไปเป็น '${status}' ได้ตามกฎ Workflow (สถานะถัดไปที่อนุญาต: ${allowedNextStatuses.join(', ') || 'ไม่มี'})`,
      });
    }

    const updateData: any = { status };

    if (status === 'assess') updateData.assessed_at = new Date();
    if (status === 'doing') updateData.repair_started_at = new Date();
    if (status === 'done') updateData.repaired_at = new Date();
    if (status === 'complete') updateData.completed_at = new Date();

    const updated = await prisma.maintenance_requests.update({
      where: { id: Number(id) },
      data: updateData,
    });

    return res.json({ success: true, message: `อัปเดตสถานะงานซ่อมเป็น ${status} สำเร็จ`, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update request status' });
  }
}

export async function assignTechnician(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { technician_id } = req.body || {};

    if (!technician_id) {
      return res.status(400).json({ success: false, message: 'กรุณาระบุช่างซ่อมที่ต้องการมอบหมาย' });
    }

    const updated = await prisma.maintenance_requests.update({
      where: { id: Number(id) },
      data: { assigned_technician_id: Number(technician_id) },
    });

    return res.json({ success: true, message: 'มอบหมายช่างซ่อมสำเร็จ', data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to assign technician' });
  }
}
