import { Request, Response } from 'express';
import { prisma } from '../config/db.js';

// 1. GET /api/v1/roles - Get all roles with permissions
export async function getRoles(req: Request, res: Response) {
  try {
    const rolesList = await prisma.roles.findMany({
      include: {
        role_permissions: {
          include: {
            permissions: true,
          },
        },
        _count: {
          select: { users: true },
        },
      },
      orderBy: { id: 'asc' },
    });

    const formattedRoles = rolesList.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      description: r.description || '',
      is_system: r.is_system,
      user_count: r._count.users,
      permissions: r.role_permissions.map((rp) => ({
        id: rp.permissions.id,
        code: rp.permissions.code,
        name: rp.permissions.name,
        module: rp.permissions.module,
      })),
      permission_ids: r.role_permissions.map((rp) => rp.permission_id),
      created_at: r.created_at,
    }));

    return res.json({
      success: true,
      data: formattedRoles,
    });
  } catch (error: any) {
    console.error('Error fetching roles:', error);
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลบทบาท',
      error: error.message,
    });
  }
}

// 2. POST /api/v1/roles - Create new role with permission IDs
export async function createRole(req: Request, res: Response) {
  try {
    const { code, name, description, permission_ids } = req.body;

    if (!code || !name) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกรหัสบทบาท (code) และชื่อบทบาท (name)',
      });
    }

    const cleanCode = code.trim().toLowerCase().replace(/\s+/g, '_');

    // Check duplicate code
    const existing = await prisma.roles.findUnique({
      where: { code: cleanCode },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `รหัสบทบาท "${cleanCode}" มีอยู่ในระบบแล้ว`,
      });
    }

    const newRole = await prisma.roles.create({
      data: {
        code: cleanCode,
        name: name.trim(),
        description: description?.trim() || null,
        is_system: false,
      },
    });

    // Attach permissions
    if (Array.isArray(permission_ids) && permission_ids.length > 0) {
      const rolePermissionsData = permission_ids.map((pId: number) => ({
        role_id: newRole.id,
        permission_id: pId,
      }));
      await prisma.role_permissions.createMany({
        data: rolePermissionsData,
        skipDuplicates: true,
      });
    }

    // Fetch complete role
    const createdRole = await prisma.roles.findUnique({
      where: { id: newRole.id },
      include: {
        role_permissions: {
          include: { permissions: true },
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: 'สร้างบทบาทใหม่สำเร็จ',
      data: createdRole,
    });
  } catch (error: any) {
    console.error('Error creating role:', error);
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการสร้างบทบาทใหม่',
      error: error.message,
    });
  }
}

// 3. PATCH /api/v1/roles/:id - Update role name, description, and permissions
export async function updateRole(req: Request, res: Response) {
  try {
    const rawId = req.params.id;
    const idStr = Array.isArray(rawId) ? rawId[0] : rawId;
    const roleId = parseInt(idStr, 10);
    if (isNaN(roleId)) {
      return res.status(400).json({ success: false, message: 'ID บทบาทไม่ถูกต้อง' });
    }

    const { name, description, permission_ids } = req.body;

    const existingRole = await prisma.roles.findUnique({
      where: { id: roleId },
    });

    if (!existingRole) {
      return res.status(404).json({ success: false, message: 'ไม่พบบทบาทที่ต้องการแก้ไข' });
    }

    // Update basic fields
    await prisma.roles.update({
      where: { id: roleId },
      data: {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
      },
    });

    // Sync permissions if provided
    if (Array.isArray(permission_ids)) {
      // Remove old role_permissions
      await prisma.role_permissions.deleteMany({
        where: { role_id: roleId },
      });

      // Insert new role_permissions
      if (permission_ids.length > 0) {
        await prisma.role_permissions.createMany({
          data: permission_ids.map((pId: number) => ({
            role_id: roleId,
            permission_id: pId,
          })),
          skipDuplicates: true,
        });
      }
    }

    const updatedRole = await prisma.roles.findUnique({
      where: { id: roleId },
      include: {
        role_permissions: {
          include: { permissions: true },
        },
      },
    });

    return res.json({
      success: true,
      message: 'อัปเดตบทบาทเรียบร้อยแล้ว',
      data: updatedRole,
    });
  } catch (error: any) {
    console.error('Error updating role:', error);
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการอัปเดตบทบาท',
      error: error.message,
    });
  }
}

// 4. DELETE /api/v1/roles/:id - Delete custom role
export async function deleteRole(req: Request, res: Response) {
  try {
    const rawId = req.params.id;
    const idStr = Array.isArray(rawId) ? rawId[0] : rawId;
    const roleId = parseInt(idStr, 10);
    if (isNaN(roleId)) {
      return res.status(400).json({ success: false, message: 'ID บทบาทไม่ถูกต้อง' });
    }

    const targetRole = await prisma.roles.findUnique({
      where: { id: roleId },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    if (!targetRole) {
      return res.status(404).json({ success: false, message: 'ไม่พบบทบาทที่ต้องการลบ' });
    }

    if (targetRole.is_system) {
      return res.status(403).json({
        success: false,
        message: 'ไม่อนุญาตให้ลบบทบาทหลักของระบบ (System Role)',
      });
    }

    if (targetRole._count.users > 0) {
      return res.status(400).json({
        success: false,
        message: `ไม่สามารถลบบทบาทนี้ได้ เนื่องจากมีผู้ใช้อยู่ในบทบาทนี้จำนวน ${targetRole._count.users} คน`,
      });
    }

    // Delete associated permissions then role
    await prisma.role_permissions.deleteMany({ where: { role_id: roleId } });
    await prisma.roles.delete({ where: { id: roleId } });

    return res.json({
      success: true,
      message: 'ลบบทบาทเรียบร้อยแล้ว',
    });
  } catch (error: any) {
    console.error('Error deleting role:', error);
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการลบบทบาท',
      error: error.message,
    });
  }
}
