import { api } from "./api";

export type UserRole = "technician" | "requester" | "supervisor" | string;

export interface UserPayload {
  emp_id: string;
  name: string;
  role: UserRole;
  role_id?: number | null;
  role_name?: string;
  permissions?: string[];
  department: string;
  skills: string[];
  token?: string;
}

export function getCurrentUser(): UserPayload | null {
  try {
    const raw = sessionStorage.getItem("fixflow_user");
    if (!raw) return null;
    return JSON.parse(raw) as UserPayload;
  } catch {
    return null;
  }
}

export async function refreshCurrentUserFromApi(): Promise<UserPayload | null> {
  const current = getCurrentUser();
  if (!current || !current.token) return current;

  try {
    const res = await api.get("/auth/me");
    if (res.data?.data) {
      const user = res.data.data;
      const updatedPayload: UserPayload = {
        emp_id: user.emp_id,
        name: user.name,
        role: user.role as UserRole,
        role_id: user.role_id,
        role_name: user.role_name,
        permissions: user.permissions || [],
        department: user.department,
        skills: user.skills || [],
        token: current.token,
      };
      sessionStorage.setItem("fixflow_user", JSON.stringify(updatedPayload));
      return updatedPayload;
    }
  } catch (error) {
    console.warn("Refresh user profile from DB failed:", error);
  }
  return current;
}

export function getUserRole(): UserRole | null {
  const user = getCurrentUser();
  return user ? user.role : null;
}

export function isAuthenticated(): boolean {
  return getCurrentUser() !== null;
}

export function getUserDefaultRoute(userOrRole?: UserPayload | UserRole | null): string {
  let user: UserPayload | null = null;
  let role: UserRole | null = null;

  if (typeof userOrRole === "object" && userOrRole !== null) {
    user = userOrRole;
    role = user.role;
  } else if (typeof userOrRole === "string") {
    role = userOrRole;
    user = getCurrentUser();
  } else {
    user = getCurrentUser();
    role = user ? user.role : null;
  }

  if (user) {
    // Supervisor Master
    if (user.role === "supervisor") return "/dashboard";

    const perms = user.permissions || [];
    if (perms.length > 0) {
      if (perms.includes("dashboard:view")) return "/dashboard";
      if (perms.includes("work_order:read") || perms.includes("work_order:assess")) return "/board";
      if (perms.includes("work_order:create")) return "/request";
      if (perms.includes("asset:read")) return "/assets";
      if (perms.includes("user:read")) return "/users";
      if (perms.includes("role:manage")) return "/roles";
    }
  }

  // Fallback for legacy role string
  switch (role) {
    case "supervisor":
      return "/dashboard";
    case "technician":
      return "/board";
    case "requester":
      return "/request";
    default:
      return "/request";
  }
}

export function hasAccess(allowedRoles: UserRole[]): boolean {
  const role = getUserRole();
  if (!role) return false;
  return allowedRoles.includes(role);
}
