export type UserRole = "technician" | "requester" | "supervisor";

export interface UserPayload {
  emp_id: string;
  name: string;
  role: UserRole;
  department: string;
  skills: string[];
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
