import { Response } from 'express';
import { prisma } from '../config/db.js';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';

export async function saveDualSignature(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { activeSlot, name, role, department, sigUrl, note } = req.body;

    if (!activeSlot || !name || !sigUrl) {
      return res.status(400).json({ success: false, message: 'ข้อมูลการเซ็นชื่อไม่สมบูรณ์' });
    }

    const requestId = Number(id);

    let existing = await prisma.dual_signatures.findUnique({
      where: { request_id: requestId },
    });

    const signatureData: any = {};

    if (activeSlot === 'approver1') {
      signatureData.approver1_name = name;
      signatureData.approver1_role = role;
      signatureData.approver1_department = department;
      signatureData.approver1_sig_url = sigUrl;
      signatureData.approver1_signed_at = new Date();
    } else {
      signatureData.approver2_name = name;
      signatureData.approver2_role = role;
      signatureData.approver2_department = department;
      signatureData.approver2_sig_url = sigUrl;
      signatureData.approver2_signed_at = new Date();
    }

    if (note) signatureData.note = note;

    let savedSignature;
    if (existing) {
      savedSignature = await prisma.dual_signatures.update({
        where: { request_id: requestId },
        data: signatureData,
      });
    } else {
      savedSignature = await prisma.dual_signatures.create({
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

      const request = await prisma.maintenance_requests.findUnique({ where: { id: requestId } });
      if (request?.asset_id) {
        await prisma.assets.update({
          where: { id: request.asset_id },
          data: { status: 'operational' },
        });
      }
    }

    return res.json({
      success: true,
      message: `บันทึกการลงนามอนุมัติ (${activeSlot === 'approver1' ? 'ท่านที่ 1' : 'ท่านที่ 2'}) สำเร็จ`,
      data: { signature: savedSignature, isFullySigned },
    });
  } catch (error) {
    console.error('Signature save error:', error);
    return res.status(500).json({ success: false, message: 'Failed to save dual signature' });
  }
}
