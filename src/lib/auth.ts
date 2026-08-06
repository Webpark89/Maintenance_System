import { api } from "./api";

export type UserRole = "technician" | "requester" | "supervisor";

export interface UserPayload {
  emp_id: string;
  name: string;
  role: UserRole;
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

export function getUserDefaultRoute(role?: UserRole | null): string {
  const currentRole = role ?? getUserRole();
  switch (currentRole) {
    case "requester":
      return "/request";
    case "technician":
      return "/board";
    case "supervisor":
      return "/dashboard";
    default:
      return "/";
  }
}

export function hasAccess(allowedRoles: UserRole[]): boolean {
  const role = getUserRole();
  if (!role) return false;
  return allowedRoles.includes(role);
}
