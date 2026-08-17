import { Response } from 'express';
import { prisma } from '../config/db.js';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { logAudit } from '../utils/auditLogger.js';

// 1. GET /api/v1/parts - Get all spare parts with Low Stock flag
export async function getParts(req: AuthenticatedRequest, res: Response) {
  try {
    const { search, category, low_stock_only } = req.query;

    const where: any = {};
    if (category && category !== 'all') {
      where.category = String(category);
    }
    if (search) {
      const searchStr = String(search).trim();
      where.OR = [
        { part_code: { contains: searchStr } },
        { name: { contains: searchStr } },
        { location_rack: { contains: searchStr } },
      ];
    }

    const parts = await prisma.spare_parts.findMany({
      where,
      orderBy: { id: 'asc' },
    });

    const formatted = parts.map((p) => {
      const isLowStock = p.stock_qty <= (p.min_stock_qty || 5);
      return {
        id: p.id,
        part_code: p.part_code,
        name: p.name,
        unit_price: Number(p.unit_price),
        stock_qty: p.stock_qty,
        min_stock_qty: p.min_stock_qty,
        unit: p.unit || 'ชิ้น',
        location_rack: p.location_rack || 'Rack-A1',
        category: p.category || 'อะไหล่ทั่วไป',
        is_low_stock: isLowStock,
        total_value: Number(p.unit_price) * p.stock_qty,
      };
    });

    const result = low_stock_only === 'true' ? formatted.filter((p) => p.is_low_stock) : formatted;

    return res.json({
      success: true,
      data: result,
      summary: {
        total_items: formatted.length,
        low_stock_count: formatted.filter((p) => p.is_low_stock).length,
        total_inventory_value: formatted.reduce((acc, p) => acc + p.total_value, 0),
      },
    });
  } catch (error: any) {
    console.error('Error fetching spare parts:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลอะไหล่' });
  }
}

// 2. POST /api/v1/parts - Create new spare part
export async function createPart(req: AuthenticatedRequest, res: Response) {
  try {
    const { part_code, name, unit_price, stock_qty, min_stock_qty, unit, location_rack, category } = req.body || {};

    if (!part_code || !name) {
      return res.status(400).json({ success: false, message: 'กรุณากรอกรหัสอะไหล่และชื่ออะไหล่ให้ครบถ้วน' });
    }

    const cleanCode = String(part_code).trim().toUpperCase();

    const existing = await prisma.spare_parts.findUnique({ where: { part_code: cleanCode } });
    if (existing) {
      return res.status(400).json({ success: false, message: `รหัสอะไหล่ ${cleanCode} มีในระบบแล้ว` });
    }

    const newPart = await prisma.spare_parts.create({
      data: {
        part_code: cleanCode,
        name: String(name).trim(),
        unit_price: Number(unit_price) || 0,
        stock_qty: Math.max(0, Number(stock_qty) || 0),
        min_stock_qty: Math.max(1, Number(min_stock_qty) || 5),
        unit: unit ? String(unit).trim() : 'ชิ้น',
        location_rack: location_rack ? String(location_rack).trim() : 'Rack-A1',
        category: category ? String(category).trim() : 'อะไหล่ทั่วไป',
      },
    });

    await logAudit({
      req,
      action: 'CREATE_PART',
      module: 'INVENTORY',
      targetId: newPart.id,
      details: { part_code: newPart.part_code, name: newPart.name, stock_qty: newPart.stock_qty },
    });

    return res.status(201).json({
      success: true,
      message: `เพิ่มรายการอะไหล่ ${newPart.name} สำเร็จ`,
      data: newPart,
    });
  } catch (error: any) {
    console.error('Error creating spare part:', error);
    return res.status(500).json({ success: false, message: error?.message || 'เกิดข้อผิดพลาดในการสร้างรายการอะไหล่' });
  }
}

// 3. PUT /api/v1/parts/:id - Update spare part details
export async function updatePart(req: AuthenticatedRequest, res: Response) {
  try {
    const partId = Number(req.params.id);
    if (isNaN(partId) || partId <= 0) {
      return res.status(400).json({ success: false, message: 'รหัสอะไหล่ไม่ถูกต้อง' });
    }

    const { name, unit_price, min_stock_qty, unit, location_rack, category } = req.body || {};

    const targetPart = await prisma.spare_parts.findUnique({ where: { id: partId } });
    if (!targetPart) {
      return res.status(404).json({ success: false, message: 'ไม่พบรายการอะไหล่นี้ในระบบ' });
    }

    const updated = await prisma.spare_parts.update({
      where: { id: partId },
      data: {
        ...(name && { name: String(name).trim() }),
        ...(unit_price !== undefined && { unit_price: Number(unit_price) || 0 }),
        ...(min_stock_qty !== undefined && { min_stock_qty: Math.max(1, Number(min_stock_qty) || 5) }),
        ...(unit && { unit: String(unit).trim() }),
        ...(location_rack !== undefined && { location_rack: String(location_rack).trim() }),
        ...(category !== undefined && { category: String(category).trim() }),
      },
    });

    await logAudit({
      req,
      action: 'UPDATE_PART',
      module: 'INVENTORY',
      targetId: partId,
      details: { name: updated.name, unit_price: Number(updated.unit_price), min_stock_qty: updated.min_stock_qty },
    });

    return res.json({
      success: true,
      message: `อัปเดตข้อมูลอะไหล่ ${updated.name} สำเร็จ`,
      data: updated,
    });
  } catch (error: any) {
    console.error('Error updating spare part:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการอัปเดตอะไหล่' });
  }
}

// 4. POST /api/v1/parts/:id/adjust - Adjust stock (Receive in / Scrap / Adjustment)
export async function adjustStock(req: AuthenticatedRequest, res: Response) {
  try {
    const partId = Number(req.params.id);
    if (isNaN(partId) || partId <= 0) {
      return res.status(400).json({ success: false, message: 'รหัสอะไหล่ไม่ถูกต้อง' });
    }

    const { adjust_qty, type, reason } = req.body || {};
    // type: 'in' (รับเข้า), 'out' (เบิกออก/ตัดทิ้ง), 'set' (ตั้งยอดคงเหลือใหม่)
    const qty = Number(adjust_qty);
    if (isNaN(qty)) {
      return res.status(400).json({ success: false, message: 'จำนวนอะไหล่ต้องเป็นตัวเลข' });
    }

    const targetPart = await prisma.spare_parts.findUnique({ where: { id: partId } });
    if (!targetPart) {
      return res.status(404).json({ success: false, message: 'ไม่พบรายการอะไหล่นี้ในระบบ' });
    }

    let newStock = targetPart.stock_qty;
    if (type === 'in') {
      newStock += Math.abs(qty);
    } else if (type === 'out') {
      newStock = Math.max(0, newStock - Math.abs(qty));
    } else if (type === 'set') {
      newStock = Math.max(0, qty);
    }

    const updated = await prisma.spare_parts.update({
      where: { id: partId },
      data: { stock_qty: newStock },
    });

    await logAudit({
      req,
      action: 'STOCK_ADJUSTMENT',
      module: 'INVENTORY',
      targetId: partId,
      details: {
        part_code: targetPart.part_code,
        name: targetPart.name,
        old_stock: targetPart.stock_qty,
        new_stock: newStock,
        adjust_qty: qty,
        type,
        reason: reason || 'ปรับยอดสต็อก',
      },
    });

    return res.json({
      success: true,
      message: `ปรับปรุงยอดสต็อก ${updated.name} เรียบร้อยแล้ว (คงเหลือ: ${newStock} ${updated.unit || 'ชิ้น'})`,
      data: updated,
    });
  } catch (error: any) {
    console.error('Error adjusting stock:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการปรับยอดสต็อก' });
  }
}
