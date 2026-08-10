import { WorkCategory, Status, Priority } from "@/lib/mockData";

export type RequestCategory = WorkCategory;
export type WorkOrderStatus = Status | "cancelled";

export interface MaintenanceRequest {
  id: number;
  work_order_no: string;
  asset_id: number;
  reported_by_id: number;
  assigned_technician_id?: number;
  category: RequestCategory;
  priority: Priority;
  problem_title: string;
  description?: string;
  status: WorkOrderStatus;
  created_at: string;
  updated_at: string;
}
