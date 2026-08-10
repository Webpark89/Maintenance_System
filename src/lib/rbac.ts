import { UserPayload } from "./auth";
import { WorkRequest } from "./mockData";

/**
 * Checks if the given user has permission to manage/update/drag the specified request.
 * Follows the strict Allowlist (Default Deny) principle for RBAC security.
 */
export function canManageRequest(user: UserPayload | null, request: WorkRequest): boolean {
  if (!user) return false;

  // 1. Supervisor role has full management permissions over all work requests
  if (user.role === "supervisor") {
    return true;
  }

  // 2. Technician role (e.g. TECH001, TECH002, TECH003...) can only manage jobs assigned to them or unassigned jobs
  if (user.role === "technician") {
    // If job is unassigned, any technician can manage/accept it
    if (!request.assigned_to) {
      return true;
    }
    // If job is assigned, only the assigned technician can manage it
    return request.assigned_to === user.emp_id;
  }

  // 3. Requesters and all other current/future roles default to false (Default Deny)
  return false;
}
