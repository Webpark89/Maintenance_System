import { UserPayload, getCurrentUser } from "./auth";
import { WorkRequest } from "./mockData";

/**
 * Checks if the given user has a specific permission code.
 * Enforces strict Default Deny (Allowlist) principle.
 */
export function hasPermission(permissionCode: string | string[], targetUser?: UserPayload | null): boolean {
  const user = targetUser !== undefined ? targetUser : getCurrentUser();
  if (!user) return false;

  // Master override for system supervisor role
  if (user.role === "supervisor") return true;

  const checkCodes = Array.isArray(permissionCode) ? permissionCode : [permissionCode];

  // Explicit user permissions list check
  if (user.permissions && Array.isArray(user.permissions) && user.permissions.length > 0) {
    return checkCodes.some((code) => user.permissions!.includes(code));
  }

  // System Roles Fallback mapping if permissions array is missing
  if (user.role === "technician") {
    const techPermissions = [
      "work_order:read",
      "work_order:create",
      "work_order:assess",
      "requisition:request",
      "asset:read",
      "asset:create",
      "asset:edit",
    ];
    return checkCodes.some((code) => techPermissions.includes(code));
  }

  if (user.role === "requester") {
    const reqPermissions = ["work_order:read", "work_order:create"];
    return checkCodes.some((code) => reqPermissions.includes(code));
  }

  // Default Deny for unknown / custom roles without explicit permissions array
  return false;
}

/**
 * Checks if the given user has permission to manage/update/drag the specified request.
 * Follows the strict Allowlist (Default Deny) principle for RBAC security.
 *
 * Strict Workflow Rule:
 * 1. Supervisor role has full management & assignment permissions over all work requests.
 * 2. Technician role can ONLY manage jobs explicitly assigned to themselves by a Supervisor.
 *    Technicians CANNOT accept unassigned jobs or drag unassigned/blank cards on their own.
 */
export function canManageRequest(user: UserPayload | null, request: WorkRequest): boolean {
  if (!user) return false;

  // 1. Supervisor & Admin roles have full management & assignment permissions over all work requests
  if (user.role === "supervisor" || user.role === "admin" || hasPermission("work_order:assign", user)) {
    return true;
  }

  // 2. Technician role: strictly CANNOT manage unassigned jobs or jobs assigned to others
  if (user.role === "technician" || hasPermission("work_order:assess", user)) {
    if (!request.assigned_to) {
      return false; // Technicians cannot manage/drag unassigned jobs (Supervisor must assign first!)
    }
    return request.assigned_to === user.emp_id;
  }

  // 3. Requesters and all other current/future roles default to false (Default Deny)
  return false;
}

