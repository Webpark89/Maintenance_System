import { Response } from 'express';
import { prisma } from '../config/db.js';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { saveSecureSignatureImage } from '../utils/signatureSecurity.js';
import { sendNotification } from '../services/socketService.js';

export async function saveDualSignature(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { activeSlot, name, role, department, sigUrl, note } = req.body || {};

    if (!activeSlot || !name || !sigUrl) {
      return res.status(400).json({ success: false, message: 'ข้อมูลการเซ็นชื่อไม่สมบูรณ์ (ขาดข้อมูล Slot, ชื่อ หรือลายเซ็น)' });
    }

    if (activeSlot !== 'approver1' && activeSlot !== 'approver2') {
      return res.status(400).json({ success: false, message: 'ระบุตำแหน่งการลงนามอนุมัติไม่ถูกต้อง' });
    }

    const requestId = Number(id);

    // Verify maintenance request exists
    const request = await prisma.maintenance_requests.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      return res.status(404).json({ success: false, message: 'ไม่พบใบแจ้งซ่อมที่ระบุ' });
    }

    let existingSignature = await prisma.dual_signatures.findUnique({
      where: { request_id: requestId },
    });

    // Anti-Replay Guard Check 1: Prevent overwriting an already completed signature slot unless requested
    if (existingSignature) {
      if (activeSlot === 'approver1' && existingSignature.approver1_sig_url && existingSignature.approver1_signed_at) {
        return res.status(400).json({
          success: false,
          message: 'คำเตือนความปลอดภัย: ตำแหน่งผู้อนุมัติท่านที่ 1 มีการเซ็นและบันทึกยืนยันแล้ว ไม่สามารถเซ็นทับหรือส่ง Replay ลายเซ็นซ้ำได้',
        });
      }
      if (activeSlot === 'approver2' && existingSignature.approver2_sig_url && existingSignature.approver2_signed_at) {
        return res.status(400).json({
          success: false,
          message: 'คำเตือนความปลอดภัย: ตำแหน่งผู้อนุมัติท่านที่ 2 มีการเซ็นและบันทึกยืนยันแล้ว ไม่สามารถเซ็นทับหรือส่ง Replay ลายเซ็นซ้ำได้',
        });
      }
    }

    // Process & Save Base64 Canvas image with Cryptographic Signature Binding & Anti-Replay Nonce
    let savedFile;
    try {
      savedFile = await saveSecureSignatureImage({
        requestId,
        workOrderNo: request.work_order_no,
        activeSlot,
        signerName: name,
        signerEmpId: req.user?.empId || 'UNKNOWN',
        base64Data: sigUrl,
      });
    } catch (imgError: any) {
      return res.status(400).json({ success: false, message: imgError.message || 'บันทึกไฟล์ลายเซ็นล้มเหลว' });
    }

    const signatureData: any = {};

    if (activeSlot === 'approver1') {
      signatureData.approver1_name = String(name).trim();
      signatureData.approver1_role = role ? String(role).trim() : 'หัวหน้าช่าง (Supervisor)';
      signatureData.approver1_department = department ? String(department).trim() : 'แผนกซ่อมบำรุง';
      signatureData.approver1_sig_url = savedFile.relativeUrl;
      signatureData.approver1_signed_at = savedFile.signedAt;
    } else {
      signatureData.approver2_name = String(name).trim();
      signatureData.approver2_role = role ? String(role).trim() : 'ผู้แจ้งซ่อม / หัวหน้าฝ่ายผลิต';
      signatureData.approver2_department = department ? String(department).trim() : 'ฝ่ายผลิต';
      signatureData.approver2_sig_url = savedFile.relativeUrl;
      signatureData.approver2_signed_at = savedFile.signedAt;
    }

    if (note) signatureData.note = String(note).trim();

    let savedRecord;
    if (existingSignature) {
      savedRecord = await prisma.dual_signatures.update({
        where: { request_id: requestId },
        data: signatureData,
      });
    } else {
      savedRecord = await prisma.dual_signatures.create({
        data: {
          request_id: requestId,
          ...signatureData,
        },
      });
    }

    // Check if both signatures are present
    const updatedRecord = await prisma.dual_signatures.findUnique({
      where: { request_id: requestId },
    });

    const isFullySigned = !!(updatedRecord?.approver1_sig_url && updatedRecord?.approver2_sig_url);

    if (isFullySigned) {
      // Auto complete request and restore asset operational status
      await prisma.maintenance_requests.update({
        where: { id: requestId },
        data: { status: 'complete', completed_at: new Date() },
      });

      if (request.asset_id) {
        await prisma.assets.update({
          where: { id: request.asset_id },
          data: { status: 'operational' },
        });
      }

      // Notify Reporter that Work Order is fully approved and completed
      if (request.reported_by_id) {
        await sendNotification({
          userId: request.reported_by_id,
          requestId,
          title: `🎉 งานซ่อมเสร็จสมบูรณ์ (${request.work_order_no})`,
          message: 'ลงนามอนุมัติ Dual Signature ครบถ้วนและปิดใบงานเรียบร้อยแล้ว',
          eventType: 'job_completed',
          payloadData: updatedRecord,
        });
      }
    }

    return res.json({
      success: true,
      message: `บันทึกการลงนามอนุมัติ (${activeSlot === 'approver1' ? 'ท่านที่ 1' : 'ท่านที่ 2'}) สำเร็จพร้อมระบบ Anti-Replay Guard`,
      data: {
        signature: savedRecord,
        isFullySigned,
        signatureHash: savedFile.signatureHash,
      },
    });
  } catch (error) {
    console.error('Signature save error:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์ขณะบันทึกลายเซ็น' });
  }
}
