import React from "react";
import { Navigate } from "react-router-dom";
import { getCurrentUser, getUserDefaultRoute, UserRole } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { toast } from "@/components/ui/sonner";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requiredPermission?: string;
  requiredAnyPermissions?: string[];
}

export function ProtectedRoute({
  children,
  allowedRoles,
  requiredPermission,
  requiredAnyPermissions,
}: ProtectedRouteProps) {
  const user = getCurrentUser();

  // If user is not logged in or missing valid JWT session token, redirect to login page
  if (!user || !user.token) {
    return <Navigate to="/" replace />;
  }

  // Master override for supervisor role
  if (user.role === "supervisor") {
    return <>{children}</>;
  }

  let hasAccessGranted = true;

  if (requiredPermission) {
    hasAccessGranted = hasPermission(requiredPermission, user);
  } else if (requiredAnyPermissions && requiredAnyPermissions.length > 0) {
    hasAccessGranted = hasPermission(requiredAnyPermissions, user);
  } else if (allowedRoles && allowedRoles.length > 0) {
    hasAccessGranted = allowedRoles.includes(user.role);
  }

  if (!hasAccessGranted) {
    const roleName = user.role_name || user.role;
    toast.error(`ปฏิเสธการเข้าถึง: บทบาทของคุณ (${roleName}) ไม่มีสิทธิ์เข้าใช้งานหน้านี้`, {
      description: "ระบบได้นำคุณไปยังหน้าที่คุณมีสิทธิ์การใช้งาน",
    });

    const fallbackRoute = getUserDefaultRoute(user);
    return <Navigate to={fallbackRoute} replace />;
  }

  return <>{children}</>;
}

