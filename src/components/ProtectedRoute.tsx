import React from "react";
import { Navigate } from "react-router-dom";
import { getCurrentUser, getUserDefaultRoute, UserRole } from "@/lib/auth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const user = getCurrentUser();

  // If user is not logged in, redirect to login page
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // If user role is not allowed for this route, redirect to their default landing page
  if (!allowedRoles.includes(user.role)) {
    const defaultRoute = getUserDefaultRoute(user.role);
    return <Navigate to={defaultRoute} replace />;
  }

  return <>{children}</>;
}
