import { Request, Response } from 'express';
import { prisma } from '../config/db.js';
import { generateToken } from '../utils/jwt.js';
import { comparePassword } from '../utils/password.js';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import {
  checkLoginRateLimit,
  recordFailedLogin,
  resetLoginAttempts,
  formatCooldownTime,
} from '../utils/loginRateLimiter.js';
import { logAudit, getCleanIp } from '../utils/auditLogger.js';

export async function login(req: Request, res: Response) {
  try {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกชื่อผู้ใช้/รหัสพนักงาน และรหัสผ่าน',
      });
    }

    const clientIp = getCleanIp(req);
    const rateLimitKey = `${clientIp}:${String(username).trim().toUpperCase()}`;

    // 1. Check Rate Limit & Cooldown Lockout
    const rateLimitStatus = checkLoginRateLimit(rateLimitKey);
    if (rateLimitStatus.isPermanentlyLocked) {
      return res.status(429).json({
        success: false,
        message: 'บัญชีนี้ถูกระงับชั่วคราวเนื่องจากพิมพ์รหัสผ่านผิดเกิน 15 ครั้ง กรุณาติดต่อหัวหน้างานหรือผู้ดูแลระบบเพื่อปลดล็อก',
        isPermanentlyLocked: true,
      });
    }

    if (rateLimitStatus.isLocked) {
      const waitTimeFormatted = formatCooldownTime(rateLimitStatus.remainingSeconds);
      return res.status(429).json({
        success: false,
        message: `คุณพิมพ์รหัสผ่านผิดเกินกำหนด กรุณารออีก ${waitTimeFormatted} ก่อนลองใหม่อีกครั้ง (ครั้งที่ ${rateLimitStatus.attemptCount})`,
        cooldownSeconds: rateLimitStatus.remainingSeconds,
        attemptCount: rateLimitStatus.attemptCount,
      });
    }

    const user = await prisma.users.findFirst({
      where: {
        OR: [
          { emp_id: String(username).trim().toUpperCase() },
          { emp_id: String(username).trim() },
          { name: { contains: String(username).trim() } }
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
      const failResult = recordFailedLogin(rateLimitKey);
      return res.status(401).json({
        success: false,
        message: 'ไม่พบชื่อผู้ใช้งานหรือรหัสพนักงานนี้ในระบบ',
        attemptCount: failResult.attemptCount,
      });
    }

    if (user.is_active === false) {
      return res.status(403).json({
        success: false,
        message: 'บัญชีนี้ถูกระงับการใช้งานชั่วคราว\nกรุณาติดต่อหัวหน้าช่าง หรือผู้ดูแลระบบเพื่อเปิดใช้งาน',
      });
    }

    const isPasswordValid = await comparePassword(password, user.password_hash);
    if (!isPasswordValid) {
      const failResult = recordFailedLogin(rateLimitKey);

      // If reached 15 failed attempts, also lock user in database
      if (failResult.isPermanentlyLocked) {
        await prisma.users.update({
          where: { id: user.id },
          data: { is_active: false },
        });

        return res.status(429).json({
          success: false,
          message: 'คุณพิมพ์รหัสผ่านผิดครบ 15 ครั้ง บัญชีจึงถูกระงับ กรุณาติดต่อผู้ดูแลระบบเพื่อปลดล็อกหรือรีเซ็ตรหัสผ่าน',
          isPermanentlyLocked: true,
        });
      }

      if (failResult.cooldownSeconds > 0) {
        const waitTimeFormatted = formatCooldownTime(failResult.cooldownSeconds);
        return res.status(429).json({
          success: false,
          message: `รหัสผ่านไม่ถูกต้อง (ครั้งที่ ${failResult.attemptCount}) กรุณารออีก ${waitTimeFormatted} ก่อนลองใหม่`,
          cooldownSeconds: failResult.cooldownSeconds,
          attemptCount: failResult.attemptCount,
        });
      }

      const remainingBeforeCooldown = 4 - failResult.attemptCount;
      return res.status(401).json({
        success: false,
        message: `รหัสผ่านไม่ถูกต้อง (เหลือโอกาสลองอีก ${remainingBeforeCooldown} ครั้ง ก่อนระบบเริ่มหน่วงเวลา)`,
        attemptCount: failResult.attemptCount,
      });
    }

    // Successful login: Reset failed attempts counter
    resetLoginAttempts(rateLimitKey);

    await logAudit({
      req: { ...req, user: { userId: user.id, name: user.name, empId: user.emp_id } },
      action: 'LOGIN_SUCCESS',
      module: 'AUTH',
      targetId: user.id,
      details: { emp_id: user.emp_id, role: user.role, ip: clientIp },
    });

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

