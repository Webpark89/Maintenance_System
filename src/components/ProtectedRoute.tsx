import React from "react";
import { Navigate } from "react-router-dom";
import { getCurrentUser, getUserDefaultRoute, UserRole } from "@/lib/auth";
import { toast } from "sonner";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const user = getCurrentUser();

  // If user is not logged in or missing valid JWT session token, redirect to login page
  if (!user || !user.token) {
    return <Navigate to="/" replace />;
  }

  // If user role is not allowed for this route
  if (!allowedRoles.includes(user.role)) {
    // Notify user clearly that their current SSO role lacks permissions
    toast.error(`ปฏิเสธการเข้าถึง: บทบาทของคุณ (${user.role}) ไม่มีสิทธิ์เข้าใช้งานหน้านี้`, {
      description: "กรุณาล็อกอินด้วยบัญชี SSO ที่มีสิทธิ์เหมาะสม",
    });

    // If requester attempts to access technician/supervisor routes, redirect to login so they can switch role via SSO
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
