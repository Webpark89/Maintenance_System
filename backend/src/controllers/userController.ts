import { Request, Response } from 'express';
import { prisma } from '../config/db.js';
import { hashPassword } from '../utils/password.js';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';

// 1. Get All Users (for Supervisor)
export async function getUsers(req: Request, res: Response) {
  try {
    const users = await prisma.users.findMany({
      select: {
        id: true,
        emp_id: true,
        name: true,
        role: true,
        department_id: true,
        skills: true,
        is_active: true,
        created_at: true,
        departments: {
          select: {
            id: true,
            dept_code: true,
            dept_name: true,
          },
        },
      },
      orderBy: { id: 'asc' },
    });

    const formattedUsers = users.map((u) => ({
      id: u.id,
      emp_id: u.emp_id,
      name: u.name,
      role: u.role,
      department_id: u.department_id,
      department_name: u.departments?.dept_name || 'ไม่ระบุแผนก',
      skills: u.skills || [],
      is_active: u.is_active !== false,
      created_at: u.created_at,
    }));

    return res.json({
      success: true,
      data: formattedUsers,
    });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้งาน',
    });
  }
}

// 2. Get Departments List
export async function getDepartments(req: Request, res: Response) {
  try {
    const depts = await prisma.departments.findMany({
      orderBy: { id: 'asc' },
    });
    return res.json({
      success: true,
      data: depts,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลแผนก',
    });
  }
}

// 3. Create New User Direct to PostgreSQL DB
export async function createUser(req: AuthenticatedRequest, res: Response) {
  try {
    const { emp_id, name, password, role, department_id, skills } = req.body || {};

    if (!emp_id || !name || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกข้อมูลรหัสพนักงาน, ชื่อ, รหัสผ่าน และบทบาทให้ครบถ้วน',
      });
    }

    const cleanEmpId = emp_id.trim().toUpperCase();

    // Check Duplicate emp_id in DB
    const existingUser = await prisma.users.findUnique({
      where: { emp_id: cleanEmpId },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: `รหัสพนักงาน ${cleanEmpId} มีในระบบอยู่แล้ว`,
      });
    }

    // Hash Password with bcrypt
    const password_hash = await hashPassword(password);

    const newUser = await prisma.users.create({
      data: {
        emp_id: cleanEmpId,
        name: name.trim(),
        password_hash,
        role: role as any,
        department_id: department_id ? Number(department_id) : null,
        skills: Array.isArray(skills) ? skills : [],
        is_active: true,
      },
      include: {
        departments: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: `เพิ่มพนักงานใหม่ ${newUser.name} (${newUser.emp_id}) เข้าสู่ฐานข้อมูลเรียบร้อยแล้ว`,
      data: {
        id: newUser.id,
        emp_id: newUser.emp_id,
        name: newUser.name,
        role: newUser.role,
        department_id: newUser.department_id,
        department_name: newUser.departments?.dept_name || 'ไม่ระบุแผนก',
        skills: newUser.skills,
        is_active: true,
      },
    });
  } catch (error: any) {
    console.error('Error creating user:', error);
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการเพิ่มพนักงานใหม่เข้าสู่ระบบ',
    });
  }
}

// 4. Update User Profile & Role
export async function updateUser(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = Number(req.params.id);
    const { name, role, department_id, skills } = req.body || {};

    const targetUser = await prisma.users.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้งานนี้ในระบบ' });
    }

    const updatedUser = await prisma.users.update({
      where: { id: userId },
      data: {
        name: name ? name.trim() : targetUser.name,
        role: role ? (role as any) : targetUser.role,
        department_id: department_id !== undefined ? (department_id ? Number(department_id) : null) : targetUser.department_id,
        skills: Array.isArray(skills) ? skills : targetUser.skills,
      },
      include: {
        departments: true,
      },
    });

    return res.json({
      success: true,
      message: `อัปเดตข้อมูลผู้ใช้งาน ${updatedUser.name} เรียบร้อยแล้ว`,
      data: {
        id: updatedUser.id,
        emp_id: updatedUser.emp_id,
        name: updatedUser.name,
        role: updatedUser.role,
        department_id: updatedUser.department_id,
        department_name: updatedUser.departments?.dept_name || 'ไม่ระบุแผนก',
        skills: updatedUser.skills,
        is_active: updatedUser.is_active !== false,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูลผู้ใช้' });
  }
}

// 5. Toggle User Active/Suspend Status with Peer Supervisor Protection Guard
export async function toggleUserStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = Number(req.params.id);
    const { is_active } = req.body || {};

    const targetUser = await prisma.users.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้งานนี้ในระบบ' });
    }

    // Protection Guard: Prevents suspending Supervisor accounts
    if (targetUser.role === 'supervisor' && is_active === false) {
      return res.status(403).json({
        success: false,
        message: 'ไม่อนุญาตให้ระงับการใช้งานบัญชีผู้ใช้ในระดับ Supervisor (หัวหน้าช่าง)',
      });
    }

    const updatedUser = await prisma.users.update({
      where: { id: userId },
      data: { is_active: Boolean(is_active) },
    });

    const statusText = updatedUser.is_active ? 'เปิดใช้งานบัญชี' : 'ระงับการใช้งานบัญชี';

    return res.json({
      success: true,
      message: `${statusText} ${updatedUser.name} (${updatedUser.emp_id}) เรียบร้อยแล้ว`,
      data: {
        id: updatedUser.id,
        is_active: updatedUser.is_active,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการเปลี่ยนสถานะบัญชี' });
  }
}

// 6. Reset Password with bcrypt hash
export async function resetPassword(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = Number(req.params.id);
    const { new_password } = req.body || {};

    if (!new_password || new_password.trim().length < 4) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุรหัสผ่านใหม่ที่มีความยาวอย่างน้อย 4 ตัวอักษร',
      });
    }

    const targetUser = await prisma.users.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้งานนี้ในระบบ' });
    }

    const password_hash = await hashPassword(new_password.trim());

    await prisma.users.update({
      where: { id: userId },
      data: { password_hash },
    });

    return res.json({
      success: true,
      message: `รีเซ็ตรหัสผ่านใหม่สำหรับ ${targetUser.name} เรียบร้อยแล้ว`,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน' });
  }
}
