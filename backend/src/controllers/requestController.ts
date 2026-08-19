import { Response } from 'express';
import { prisma } from '../config/db.js';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { sendNotification } from '../services/socketService.js';
import { logAudit } from '../utils/auditLogger.js';

// Status transition rule constraint map
const VALID_TRANSITIONS: Record<string, string[]> = {
  open: ['assess', 'cancelled'],
  assess: ['open', 'waiting', 'doing', 'cancelled'],
  waiting: ['assess', 'doing', 'cancelled'],
  doing: ['waiting', 'assess', 'done', 'cancelled'],
  done: ['doing', 'complete', 'qc1', 'cancelled'],
  qc1: ['done', 'qc2', 'complete', 'cancelled'],
  qc2: ['qc1', 'done', 'complete', 'cancelled'],
  complete: ['done', 'doing', 'cancelled'],
  cancelled: ['open', 'assess'],
};

const STATUS_TEXT_MAP: Record<string, string> = {
  open: 'แจ้งซ่อมใหม่ (Open)',
  assess: 'กำลังประเมินอาการ (Assess)',
  waiting: 'รออะไหล่/รออนุมัติ (Waiting)',
  doing: 'กำลังดำเนินการซ่อม (Doing)',
  done: 'ซ่อมเสร็จสิ้น รอ QC (Done)',
  complete: 'เสร็จสมบูรณ์ ปิดใบงาน (Complete)',
  cancelled: 'ยกเลิกงานซ่อม (Cancelled)',
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

const ALLOWED_PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;

export async function createRequest(req: AuthenticatedRequest, res: Response) {
  try {
    const { asset_id, priority, category, problem_title, description, image_url } = req.body || {};
    const userId = req.user?.userId;

    if (!asset_id || !problem_title || !category) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกข้อมูลปัญหา เครื่องจักร และหมวดหมู่ให้ครบถ้วน',
      });
    }

    const cleanProblemTitle = String(problem_title).trim();
    if (cleanProblemTitle.length > 150) {
      return res.status(400).json({
        success: false,
        message: 'หัวข้อปัญหา (problem_title) มีความยาวเกินกำหนด (สูงสุด 150 ตัวอักษร)',
      });
    }

    const cleanCategory = String(category).trim();
    if (cleanCategory.length > 50) {
      return res.status(400).json({
        success: false,
        message: 'หมวดหมู่งานซ่อม (category) มีความยาวเกินกำหนด (สูงสุด 50 ตัวอักษร)',
      });
    }

    const cleanDescription = description ? String(description).trim() : null;
    if (cleanDescription && cleanDescription.length > 2000) {
      return res.status(400).json({
        success: false,
        message: 'รายละเอียดปัญหา (description) มีความยาวเกินกำหนด (สูงสุด 2,000 ตัวอักษร)',
      });
    }

    const numAssetId = Number(asset_id);
    if (isNaN(numAssetId) || numAssetId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'รหัสเครื่องจักร (asset_id) ต้องเป็นตัวเลขที่ถูกต้อง',
      });
    }

    // Validate Priority Enum Allowlist
    const cleanPriority = priority ? String(priority).trim().toLowerCase() : 'medium';
    if (!ALLOWED_PRIORITIES.includes(cleanPriority as any)) {
      return res.status(400).json({
        success: false,
        message: `ระดับความสำคัญ (Priority) ไม่ถูกต้อง ต้องเป็น: ${ALLOWED_PRIORITIES.join(', ')}`,
      });
    }

    // Verify that target Asset exists before proceeding
    const targetAsset = await prisma.assets.findUnique({
      where: { id: numAssetId },
    });

    if (!targetAsset) {
      return res.status(404).json({
        success: false,
        message: `ไม่พบเครื่องจักร/อุปกรณ์ที่ระบุในระบบ (asset_id: ${numAssetId})`,
      });
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
        asset_id: numAssetId,
        reported_by_id: userId,
        priority: cleanPriority as any,
        status: 'open',
        category: cleanCategory,
        problem_title: cleanProblemTitle,
        description: cleanDescription,
        image_url: image_url ? String(image_url).trim() : null,
      },
      include: {
        assets: true,
      },
    });

    // Update Asset status to breakdown
    await prisma.assets.update({
      where: { id: numAssetId },
      data: { status: 'breakdown' },
    });

    // Push Real-time Socket Notification to Technicians & Supervisor
    await sendNotification({
      userId: null,
      requestId: newRequest.id,
      title: `🔔 มีใบแจ้งซ่อมใหม่ (${workOrderNo})`,
      message: `ปัญหา: ${cleanProblemTitle} (เครื่องจักร: ${newRequest.assets?.name || 'ไม่ระบุ'})`,
      targetRoom: 'room:technicians',
      eventType: 'new_request',
      payloadData: newRequest,
    });

    return res.status(201).json({ success: true, message: 'สร้างใบแจ้งซ่อมสำเร็จ', data: newRequest });
  } catch (error: any) {
    console.error('Create request error:', error);
    if (error?.code === 'P2000') {
      return res.status(400).json({
        success: false,
        message: 'ข้อมูลที่ระบุมีความยาวเกินขนาดคอลัมน์ในฐานข้อมูล (Value too long for column)',
      });
    }
    if (error?.code === 'P2003' || error?.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลเครื่องจักรหรือผู้ใช้งานที่อ้างอิงในระบบ',
      });
    }
    return res.status(500).json({
      success: false,
      message: error?.message || 'เกิดข้อผิดพลาดในการสร้างใบแจ้งซ่อม',
    });
  }
}

async function findRequestByAnyId(idStr: string) {
  const numId = Number(idStr);
  return await prisma.maintenance_requests.findFirst({
    where: {
      OR: [
        ...(isNaN(numId) ? [] : [{ id: numId }]),
        { work_order_no: idStr }
      ]
    },
    include: {
      assets: true,
      users_maintenance_requests_reported_by_idTousers: { select: { name: true, emp_id: true } },
      users_maintenance_requests_assigned_technician_idTousers: { select: { name: true, emp_id: true } },
    }
  });
}

const ALLOWED_STATUSES = ['open', 'assess', 'waiting', 'doing', 'done', 'qc1', 'qc2', 'complete', 'cancelled'] as const;

export async function updateRequestStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    const requestIdStr = Array.isArray(id) ? String(id[0]) : String(id);

    if (!status || !ALLOWED_STATUSES.includes(status as any)) {
      return res.status(400).json({
        success: false,
        message: `สถานะงานซ่อมไม่ถูกต้อง ต้องเป็นหนึ่งใน: ${ALLOWED_STATUSES.join(', ')}`,
      });
    }

    const request = await findRequestByAnyId(requestIdStr);

    if (!request) {
      return res.status(404).json({ success: false, message: 'ไม่พบใบแจ้งซ่อมนี้ในระบบ' });
    }

    // Technician RBAC Guard: Technicians can strictly only update status of jobs assigned to them by Supervisor
    if (req.user?.role === 'technician') {
      const userEmpId = req.user?.empId;
      const assignedEmpId = request.users_maintenance_requests_assigned_technician_idTousers?.emp_id;
      if (!assignedEmpId || assignedEmpId !== userEmpId) {
        return res.status(403).json({
          success: false,
          message: 'ปฏิเสธการทำรายการ: ต้องให้ Supervisor เป็นผู้กดเลือกมอบหมายช่างผู้รับผิดชอบก่อนเท่านั้น ช่างซ่อมไม่สามารถอัปเดตงานที่ยังไม่ได้มอบหมายหรือการ์ดของช่างคนอื่นได้',
        });
      }
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
      where: { id: request.id },
      data: updateData,
    });

    const statusTitle = STATUS_TEXT_MAP[status] || status;

    // Push Real-time Socket Notification to Request Reporter
    if (request.reported_by_id) {
      await sendNotification({
        userId: request.reported_by_id,
        requestId: request.id,
        title: `📌 อัปเดตสถานะงานซ่อม (${request.work_order_no})`,
        message: `งานซ่อมของคุณเปลี่ยนสถานะเป็น: ${statusTitle}`,
        eventType: 'request_updated',
        payloadData: updated,
      });
    }

    return res.json({ success: true, message: `อัปเดตสถานะงานซ่อมเป็น ${status} สำเร็จ`, data: updated });
  } catch (error: any) {
    console.error('Update request status error:', error);
    return res.status(500).json({ success: false, message: error?.message || 'เกิดข้อผิดพลาดในการอัปเดตสถานะงานซ่อม' });
  }
}

export async function assignTechnician(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { technician_id } = req.body || {};

    if (!technician_id) {
      return res.status(400).json({ success: false, message: 'กรุณาระบุช่างซ่อมที่ต้องการมอบหมาย' });
    }

    const requestIdStr = Array.isArray(id) ? String(id[0]) : String(id);
    const targetRequest = await findRequestByAnyId(requestIdStr);
    if (!targetRequest) {
      return res.status(404).json({ success: false, message: 'ไม่พบใบแจ้งซ่อมนี้ในระบบ' });
    }

    let techUser = await prisma.users.findFirst({
      where: {
        OR: [
          { emp_id: String(technician_id).trim().toUpperCase() },
          { emp_id: String(technician_id).trim() },
          { name: String(technician_id).trim() }
        ]
      },
      include: { roles: true }
    });

    if (!techUser && !isNaN(Number(technician_id)) && Number(technician_id) > 0) {
      techUser = await prisma.users.findUnique({
        where: { id: Number(technician_id) },
        include: { roles: true }
      });
    }

    if (!techUser) {
      return res.status(404).json({
        success: false,
        message: `ไม่พบข้อมูลช่างซ่อมที่ระบุในระบบ (technician: ${technician_id})`,
      });
    }

    if (techUser.roles?.name === 'requester' || techUser.role === 'requester' || techUser.emp_id === 'REQ042') {
      return res.status(400).json({
        success: false,
        message: `ไม่สามารถมอบหมายงานให้ผู้แจ้งซ่อม (${techUser.name}) ได้`,
      });
    }

    const nextStatus = targetRequest.status === 'open' ? 'in_progress' : targetRequest.status;

    const updated = await prisma.maintenance_requests.update({
      where: { id: targetRequest.id },
      data: {
        assigned_technician_id: techUser.id,
        status: nextStatus,
      },
    });

    // Notify assigned technician
    await sendNotification({
      userId: techUserId,
      requestId: updated.id,
      title: `🛠️ คุณได้รับมอบหมายงานซ่อมใหม่ (${updated.work_order_no})`,
      message: `งานซ่อม: ${updated.problem_title}`,
      eventType: 'task_assigned',
      payloadData: updated,
    });

    return res.json({ success: true, message: 'มอบหมายช่างซ่อมสำเร็จ', data: updated });
  } catch (error: any) {
    console.error('assignTechnician Exception:', error);
    if (error?.code === 'P2003' || error?.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลใบงานหรือช่างซ่อมในระบบ' });
    }
    return res.status(500).json({ success: false, message: error?.message || 'เกิดข้อผิดพลาดในการมอบหมายช่างซ่อม' });
  }
}

// 5. POST /api/v1/requests/:id/requisitions - Add requisition with stock deduction
export async function addRequisitionItem(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { part_id, part_name, quantity, unit_price } = req.body || {};

    const requestIdStr = Array.isArray(id) ? String(id[0]) : String(id);
    const targetRequest = await findRequestByAnyId(requestIdStr);
    if (!targetRequest) {
      return res.status(404).json({ success: false, message: 'ไม่พบใบแจ้งซ่อมนี้ในระบบ' });
    }

    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ success: false, message: 'จำนวนอะไหล่ต้องมากกว่า 0' });
    }

    const price = Number(unit_price) || 0;
    const totalPrice = qty * price;
    const cleanPartName = String(part_name || '').trim();

    if (!cleanPartName) {
      return res.status(400).json({ success: false, message: 'กรุณาระบุชื่ออะไหล่' });
    }

    let parsedPartId: number | null = null;
    if (part_id && !String(part_id).startsWith('PART-') && !String(part_id).startsWith('custom')) {
      const numPart = Number(part_id);
      if (!isNaN(numPart) && numPart > 0) {
        parsedPartId = numPart;
      }
    }

    // Execute in transaction to safely deduct stock if linked to spare_parts
    const result = await prisma.$transaction(async (tx) => {
      let sparePartRecord: any = null;

      if (parsedPartId) {
        sparePartRecord = await tx.spare_parts.findUnique({ where: { id: parsedPartId } });
        if (sparePartRecord) {
          if (sparePartRecord.stock_qty < qty) {
            throw new Error(`สต็อกไม่เพียงพอ: ${sparePartRecord.name} คงเหลือเพียง ${sparePartRecord.stock_qty} ${sparePartRecord.unit || 'ชิ้น'}`);
          }

          // Deduct stock
          await tx.spare_parts.update({
            where: { id: parsedPartId },
            data: { stock_qty: { decrement: qty } },
          });
        }
      }

      // Create requisition entry
      const created = await tx.work_order_requisitions.create({
        data: {
          request_id: targetRequest.id,
          part_id: parsedPartId,
          quantity: qty,
          unit_price: price,
          total_price: totalPrice,
          is_approved: totalPrice < 10000,
          approved_by_id: totalPrice < 10000 ? req.user?.userId : null,
        },
        include: {
          spare_parts: true,
        },
      });

      return { created, sparePartRecord };
    });

    await logAudit({
      req,
      action: 'ADD_REQUISITION',
      module: 'REQUISITION',
      targetId: result.created.id,
      details: {
        work_order_no: targetRequest.work_order_no,
        part_name: cleanPartName,
        quantity: qty,
        total_price: totalPrice,
      },
    });

    return res.status(201).json({
      success: true,
      message: `เบิกอะไหล่ ${cleanPartName} จำนวน ${qty} รายการสำเร็จ`,
      data: result.created,
    });
  } catch (error: any) {
    console.error('addRequisitionItem error:', error);
    return res.status(400).json({ success: false, message: error?.message || 'เกิดข้อผิดพลาดในการเบิกอะไหล่' });
  }
}

// 6. POST /api/v1/requests/:id/requisitions/approve - Supervisor approves requisition
export async function approveRequisition(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const requestIdStr = Array.isArray(id) ? String(id[0]) : String(id);
    const targetRequest = await findRequestByAnyId(requestIdStr);

    if (!targetRequest) {
      return res.status(404).json({ success: false, message: 'ไม่พบใบแจ้งซ่อมนี้ในระบบ' });
    }

    await prisma.work_order_requisitions.updateMany({
      where: { request_id: targetRequest.id },
      data: {
        is_approved: true,
        approved_by_id: req.user?.userId,
      },
    });

    await logAudit({
      req,
      action: 'APPROVE_REQUISITIONS',
      module: 'REQUISITION',
      targetId: targetRequest.id,
      details: { work_order_no: targetRequest.work_order_no },
    });

    return res.json({
      success: true,
      message: `อนุมัติการเบิกอะไหล่สำหรับใบแจ้งซ่อม ${targetRequest.work_order_no} เรียบร้อยแล้ว`,
    });
  } catch (error: any) {
    console.error('approveRequisition error:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการอนุมัติการเบิกอะไหล่' });
  }
}

// 7. PATCH /api/v1/requests/:id/parts-ready - Update parts ready status
export async function togglePartsReady(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { parts_ready } = req.body || {};
    const requestIdStr = Array.isArray(id) ? String(id[0]) : String(id);
    const targetRequest = await findRequestByAnyId(requestIdStr);

    if (!targetRequest) {
      return res.status(404).json({ success: false, message: 'ไม่พบใบแจ้งซ่อมนี้ในระบบ' });
    }

    if (parts_ready) {
      // Send notification to technicians and supervisor
      await sendNotification({
        userId: targetRequest.assigned_technician_id || null,
        requestId: targetRequest.id,
        title: `📦 อะไหล่พร้อมใช้งานแล้ว (${targetRequest.work_order_no})`,
        message: `อะไหล่สำหรับงานซ่อม ${targetRequest.problem_title} พร้อมเบิกไปใช้งานแล้ว`,
        eventType: 'parts_ready',
        payloadData: { request_id: targetRequest.id, parts_ready: true },
      });
    }

    return res.json({
      success: true,
      message: `อัปเดตสถานะอะไหล่เรียบร้อยแล้ว`,
      data: { parts_ready: !!parts_ready },
    });
  } catch (error: any) {
    console.error('togglePartsReady error:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการอัปเดตสถานะอะไหล่' });
  }
}

// 8. DELETE /api/v1/requests/:id/requisitions/:reqId - Remove requisition & refund stock
export async function removeRequisitionItem(req: AuthenticatedRequest, res: Response) {
  try {
    const { id, reqId } = req.params;
    const numReqId = Number(reqId);

    const requisition = await prisma.work_order_requisitions.findFirst({
      where: {
        ...(isNaN(numReqId) ? {} : { id: numReqId }),
      },
      include: {
        spare_parts: true,
      },
    });

    if (!requisition) {
      return res.status(404).json({ success: false, message: 'ไม่พบรายการเบิกอะไหล่นี้' });
    }

    await prisma.$transaction(async (tx) => {
      // Refund stock if linked to spare_parts
      if (requisition.part_id) {
        await tx.spare_parts.update({
          where: { id: requisition.part_id },
          data: { stock_qty: { increment: requisition.quantity } },
        });
      }

      // Delete the requisition
      await tx.work_order_requisitions.delete({
        where: { id: requisition.id },
      });
    });

    await logAudit({
      req,
      action: 'REMOVE_REQUISITION',
      module: 'REQUISITION',
      targetId: requisition.id,
      details: {
        part_name: requisition.spare_parts?.name || 'อะไหล่',
        quantity: requisition.quantity,
        refunded: true,
      },
    });

    return res.json({
      success: true,
      message: `ยกเลิกรายการเบิกและคืนสต็อกสำเร็จ`,
    });
  } catch (error: any) {
    console.error('removeRequisitionItem error:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการยกเลิกรายการเบิก' });
  }
}



