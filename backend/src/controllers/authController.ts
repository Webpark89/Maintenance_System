import { Request, Response } from 'express';
import { prisma } from '../config/db.js';
import { generateToken } from '../utils/jwt.js';
import { comparePassword } from '../utils/password.js';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';

export async function login(req: Request, res: Response) {
  try {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกชื่อผู้ใช้/รหัสพนักงาน และรหัสผ่าน',
      });
    }

    const user = await prisma.users.findFirst({
      where: {
        OR: [
          { emp_id: username },
          { name: { contains: username } }
        ]
      },
      include: {
        departments: true,
        roles: {
          include: {
            role_permissions: {
              include: { permissions: true }
            }
          }
        }
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'ไม่พบชื่อผู้ใช้งานนี้ในระบบ',
      });
    }

    if (user.is_active === false) {
      return res.status(403).json({
        success: false,
        message: 'บัญชีนี้ถูกระงับการใช้งานชั่วคราว\nกรุณาติดต่อหัวหน้าช่าง หรือผู้ดูแลระบบ',
      });
    }

    const isPasswordValid = await comparePassword(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'รหัสผ่านไม่ถูกต้อง',
      });
    }

    const permissions = user.roles?.role_permissions.map((rp) => rp.permissions.code) || [];
    const roleCode = user.roles?.code || user.role;

    const tokenPayload = {
      userId: user.id,
      empId: user.emp_id,
      name: user.name,
      role: roleCode,
      roleId: user.role_id,
      roleCode: roleCode,
      permissions,
      departmentId: user.department_id,
    };

    const token = generateToken(tokenPayload);

    // Set HttpOnly Cookie for security
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.json({
      success: true,
      message: `ยินดีต้อนรับเข้าสู่ระบบ: ${user.name}`,
      data: {
        token,
        user: {
          emp_id: user.emp_id,
          name: user.name,
          role: roleCode,
          role_id: user.role_id,
          role_name: user.roles?.name || (user.role === 'supervisor' ? 'หัวหน้าช่าง' : user.role === 'technician' ? 'ช่างซ่อม' : 'ผู้แจ้งซ่อม'),
          permissions,
          department: user.departments?.dept_name || 'ทั่วไป',
          skills: user.skills || [],
        }
      }
    });
  } catch (error: any) {
    console.error('Login Exception Error:', error);
    return res.status(500).json({ success: false, message: error?.message || 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' });
  }
}

export async function getCurrentUser(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const user = await prisma.users.findUnique({
      where: { id: req.user.userId },
      include: {
        departments: true,
        roles: {
          include: {
            role_permissions: {
              include: { permissions: true }
            }
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const permissions = user.roles?.role_permissions.map((rp) => rp.permissions.code) || req.user.permissions || [];
    const roleCode = user.roles?.code || user.role;

    return res.json({
      success: true,
      data: {
        emp_id: user.emp_id,
        name: user.name,
        role: roleCode,
        role_id: user.role_id,
        role_name: user.roles?.name || (user.role === 'supervisor' ? 'หัวหน้าช่าง' : user.role === 'technician' ? 'ช่างซ่อม' : 'ผู้แจ้งซ่อม'),
        permissions,
        department: user.departments?.dept_name || 'ทั่วไป',
        skills: user.skills || [],
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function logout(req: Request, res: Response) {
  res.clearCookie('token');
  return res.json({ success: true, message: 'ออกจากระบบสำเร็จ' });
}

export async function getTechnicians(req: Request, res: Response) {
  try {
    const technicians = await prisma.users.findMany({
      where: { role: 'technician' },
      include: { departments: true },
      orderBy: { id: 'asc' },
    });

    const data = technicians.map((tech) => ({
      emp_id: tech.emp_id,
      name: tech.name,
      department: tech.departments?.dept_name || 'แผนกซ่อมบำรุง',
      skills: tech.skills || [],
    }));

    return res.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error('Error fetching technicians:', error);
    return res.status(500).json({ success: false, message: 'ไม่สามารถดึงข้อมูลรายชื่อช่างได้' });
  }
}

