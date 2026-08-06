import { Request, Response } from 'express';
import { prisma } from '../config/db.js';

export async function getAllAssets(req: Request, res: Response) {
  try {
    const assets = await prisma.assets.findMany({
      orderBy: { created_at: 'desc' },
    });
    return res.json({ success: true, data: assets });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch assets' });
  }
}

export async function getAssetByCode(req: Request, res: Response) {
  try {
    const code = req.params.code as string;
    const asset = await prisma.assets.findUnique({
      where: { asset_code: code },
    });

    if (!asset) {
      return res.status(404).json({ success: false, message: 'ไม่พบเครื่องจักรตามรหัส QR Code นี้' });
    }

    return res.json({ success: true, data: asset });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch asset' });
  }
}

export async function createAsset(req: Request, res: Response) {
  try {
    const { asset_code, name, location, brand, model, serial_number, category } = req.body;

    if (!asset_code || !name || !location || !category) {
      return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลสำคัญให้ครบถ้วน' });
    }

    const existing = await prisma.assets.findUnique({ where: { asset_code } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'รหัสเครื่องจักรนี้มีในระบบแล้ว' });
    }

    const newAsset = await prisma.assets.create({
      data: {
        asset_code,
        name,
        location,
        brand,
        model,
        serial_number,
        category,
        status: 'operational',
      },
    });

    return res.status(201).json({ success: true, message: 'สร้างทะเบียนเครื่องจักรและ QR Code สำเร็จ', data: newAsset });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to create asset' });
  }
}
