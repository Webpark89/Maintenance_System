import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';

export async function handleImageUpload(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'ไม่พบไฟล์รูปภาพที่ส่งมา' });
    }

    const relativeUrl = `/uploads/requests/${req.file.filename}`;

    return res.status(201).json({
      success: true,
      message: 'อัปโหลดรูปภาพสำเร็จ',
      data: {
        filename: req.file.filename,
        url: relativeUrl,
        size: req.file.size,
        mimetype: req.file.mimetype,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ' });
  }
}
