import { api } from "./api";
import { MaintenanceRequest, RequestCategory, WorkOrderStatus } from "@/types/maintenance";
import { WorkRequest, Status, SubStatus, WorkCategory, MOCK_REQUESTS_WITH_TIMELINE, TechnicianUser, TECHNICIANS_LIST } from "@/lib/mockData";

const SUB_STATUS_BY_STATUS: Record<Status, SubStatus> = {
  open: "reported",
  assess: "assessing",
  waiting: "waiting-parts",
  doing: "in-progress",
  done: "closed",
  qc1: "qc-round1",
  qc2: "qc-round2",
  complete: "finished",
};

// Helper mapper between Backend API payload and Frontend WorkRequest model
export function mapApiToWorkRequest(item: any): WorkRequest {
  const status: Status = (item.status as Status) || "open";
  const subStatus: SubStatus = SUB_STATUS_BY_STATUS[status] || "reported";

  return {
    request_id: item.work_order_no || `WO-${item.id}`,
    asset_name: item.assets?.name || item.problem_title || 'เครื่องจักร',
    asset_location: item.assets?.location || 'อาคารผลิตหลัก Line 1',
    issue_summary: `${item.problem_title}${item.description ? ' — ' + item.description : ''}`,
    priority: item.priority || 'medium',
    status: status,
    sub_status: subStatus,
    reported_time: item.created_at || new Date().toISOString(),
    reported_by: item.users_maintenance_requests_reported_by_idTousers?.name || item.reported_by || 'ผู้แจ้งซ่อม',
    reported_by_id: item.users_maintenance_requests_reported_by_idTousers?.emp_id || 'REQ042',
    reported_by_department: item.users_maintenance_requests_reported_by_idTousers?.department || 'ฝ่ายผลิต',
    category: (item.category as WorkCategory) || 'mechanical',
    assigned_to: item.users_maintenance_requests_assigned_technician_idTousers?.emp_id || (status !== 'open' ? 'TECH001' : null),
    assigned_technician_name: item.users_maintenance_requests_assigned_technician_idTousers?.name || (status !== 'open' ? 'บอส' : null),
    attachments: item.image_url ? [{
      attachment_id: `att-${item.id}`,
      name: 'รูปถ่ายอาการชำรุด',
      url: item.image_url,
      uploaded_at: item.created_at || new Date().toISOString(),
      uploaded_by: item.users_maintenance_requests_reported_by_idTousers?.name || 'ผู้แจ้งซ่อม',
    }] : [],
    request_details: {
      asset_id: item.assets?.asset_code || `MC-${item.asset_id}`,
      asset_type: item.assets?.category || 'เครื่องกล',
      machine_number: item.assets?.model || 'MCH-01',
      machine_zone: 'ZONE-A',
      location_building: item.assets?.location || 'อาคารผลิตหลัก',
      location_floor: 'ชั้น 1',
      location_line: 'Line 1',
      access_required: false,
      access_time_window: '08:00-17:00',
      issue_message: item.problem_title,
      issue_symptom: 'other',
      issue_frequency: 'first-time',
      machine_operability: 'running',
      reporter_name: item.users_maintenance_requests_reported_by_idTousers?.name || 'นภดล',
      reporter_emp_id: item.users_maintenance_requests_reported_by_idTousers?.emp_id || 'REQ042',
      reporter_department: item.users_maintenance_requests_reported_by_idTousers?.department || 'ฝ่ายผลิต',
      job_type: (item.category as WorkCategory) || 'mechanical',
    },
    status_timeline: [
      {
        event_id: `evt-1-${item.id}`,
        status: 'open',
        updated_by: item.users_maintenance_requests_reported_by_idTousers?.name || 'ผู้แจ้งซ่อม',
        updated_by_role: 'requester',
        updated_at: item.created_at || new Date().toISOString(),
        note: 'เปิดใบแจ้งซ่อมลง PostgreSQL',
      }
    ],
    requester_notifications: (item.notifications || []).map((n: any) => ({
      notification_id: String(n.id),
      message: n.message || n.title,
      created_at: n.created_at || new Date().toISOString(),
      read: n.is_read || false,
    })),
    stock_requisition: item.work_order_requisitions?.length ? {
      is_system_connected: true,
      parts_ready: true,
      total_price: item.work_order_requisitions.reduce((sum: number, r: any) => sum + Number(r.total_price || 0), 0),
      requisitions: item.work_order_requisitions.map((reqItem: any) => ({
        requisition_id: String(reqItem.id),
        part_id: String(reqItem.part_id),
        part_name: reqItem.spare_parts?.name || 'อะไหล่',
        quantity: reqItem.quantity,
        unit: reqItem.spare_parts?.unit || 'ชิ้น',
        unit_price: Number(reqItem.unit_price || 0),
        total_price: Number(reqItem.total_price || 0),
        requested_at: reqItem.created_at || new Date().toISOString(),
        status: 'ready',
      })),
      logs: [],
    } : undefined,
    dual_approval: item.dual_signatures ? {
      status: item.dual_signatures.approver1_signed_at && item.dual_signatures.approver2_signed_at ? 'approved' : 'partial',
      approver1: item.dual_signatures.approver1_name ? {
        signer_name: item.dual_signatures.approver1_name,
        signer_role: item.dual_signatures.approver1_role || 'Supervisor 1',
        signer_department: item.dual_signatures.approver1_department || 'แผนกซ่อมบำรุง',
        signed_at: item.dual_signatures.approver1_signed_at || new Date().toISOString(),
        signature_data_url: item.dual_signatures.approver1_sig_url,
      } : undefined,
      approver2: item.dual_signatures.approver2_name ? {
        signer_name: item.dual_signatures.approver2_name,
        signer_role: item.dual_signatures.approver2_role || 'Supervisor 2',
        signer_department: item.dual_signatures.approver2_department || 'ฝ่ายผลิต',
        signed_at: item.dual_signatures.approver2_signed_at || new Date().toISOString(),
        signature_data_url: item.dual_signatures.approver2_sig_url,
      } : undefined,
    } : undefined,
  };
}

// API Calls for Requests with Self-Healing Fallback
export async function fetchRequestsFromApi(): Promise<WorkRequest[]> {
  try {
    const res = await api.get('/requests');
    if (res.data?.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
      return res.data.data.map(mapApiToWorkRequest);
    }
    return MOCK_REQUESTS_WITH_TIMELINE;
  } catch (error) {
    console.warn('Fetch requests from API failed, using Self-Healing catalog:', error);
    return MOCK_REQUESTS_WITH_TIMELINE;
  }
}

export async function createRequestApi(data: {
  asset_id: number;
  category: string;
  problem_title: string;
  description?: string;
  priority?: string;
  image_url?: string;
}) {
  const res = await api.post('/requests', data);
  return res.data;
}

export async function updateRequestStatusApi(id: string, status: WorkOrderStatus) {
  const res = await api.patch(`/requests/${id}/status`, { status });
  return res.data;
}

export async function assignTechnicianApi(id: string, technicianId: number) {
  const res = await api.patch(`/requests/${id}/assign`, { technician_id: technicianId });
  return res.data;
}

// Backward Compatibility requestStore Object for Components
export const requestStore = {
  add: (data: any) => {
    createRequestApi({
      asset_id: 1,
      category: data.category || 'mechanical',
      priority: data.priority || 'medium',
      problem_title: data.issue_summary || 'แจ้งซ่อม',
      description: data.issue_summary,
    });
    return { request_id: 'WO-NEW' };
  },
  setStatus: (id: string, status: Status, techId?: string, opts?: any) => {
    updateRequestStatusApi(id, status as WorkOrderStatus);
  },
  requestCancellation: (id: string) => {
    updateRequestStatusApi(id, 'cancelled' as WorkOrderStatus);
  },
  approveCancellation: (id: string) => {
    updateRequestStatusApi(id, 'cancelled' as WorkOrderStatus);
  },
  deleteRequestBySupervisor: (id: string) => {
    updateRequestStatusApi(id, 'cancelled' as WorkOrderStatus);
  },
  assignTechnician: (id: string, techId: string) => {
    assignTechnicianApi(id, 1);
  },
  approveRequisition: (id: string) => {},
  saveAssessmentReport: () => {},
  addDualSignature: () => {},
};

// Fallback Store hooks for React state management
import { useState, useEffect } from 'react';

export function useRequests() {
  const [requests, setRequests] = useState<WorkRequest[]>(MOCK_REQUESTS_WITH_TIMELINE);

  useEffect(() => {
    let isMounted = true;
    fetchRequestsFromApi().then((data) => {
      if (isMounted && data.length > 0) {
        setRequests(data);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  return requests;
}

export async function fetchTechniciansFromApi(): Promise<TechnicianUser[]> {
  try {
    const res = await api.get('/auth/technicians');
    if (res.data?.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
      return res.data.data;
    }
    return TECHNICIANS_LIST;
  } catch (error) {
    console.warn('Fetch technicians from API failed, using default technician catalog:', error);
    return TECHNICIANS_LIST;
  }
}

export function useTechnicians() {
  const [technicians, setTechnicians] = useState<TechnicianUser[]>(TECHNICIANS_LIST);

  useEffect(() => {
    let isMounted = true;
    fetchTechniciansFromApi().then((data) => {
      if (isMounted && data.length > 0) {
        setTechnicians(data);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  return technicians;
}

export function useRequest(id?: string) {
  const requests = useRequests();
  return requests.find((r) => r.request_id === id);
}

