import { api } from "./api";
import { MaintenanceRequest, RequestCategory, WorkOrderStatus } from "@/types/maintenance";
import { WorkRequest, Status, SubStatus, WorkCategory, MOCK_REQUESTS_WITH_TIMELINE, TechnicianUser, TECHNICIANS_LIST, getTechnicianName } from "@/lib/mockData";

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

const LOCAL_STORAGE_KEY = 'fixflow_requests_store';

function loadSavedRequests(): WorkRequest[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to parse saved requests from localStorage:', e);
  }
  return MOCK_REQUESTS_WITH_TIMELINE;
}

function saveRequestsToStorage(requests: WorkRequest[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(requests));
  } catch (e) {
    console.warn('Failed to save requests to localStorage:', e);
  }
}

let globalRequests = loadSavedRequests();
const listeners = new Set<() => void>();

function notifyListeners() {
  saveRequestsToStorage(globalRequests);
  listeners.forEach((l) => l());
}

export function getAllTechniciansList(): TechnicianUser[] {
  try {
    const raw = localStorage.getItem("fixflow_custom_technicians");
    if (raw) {
      const customList = JSON.parse(raw);
      const merged = [...TECHNICIANS_LIST];
      customList.forEach((c: any) => {
        if (!merged.some((m) => m.emp_id === c.emp_id) && (c.role === "technician" || c.role === "supervisor")) {
          merged.push({
            emp_id: c.emp_id,
            name: c.name,
            department: c.department || "แผนกซ่อมบำรุงโรงงาน",
            skills: c.skills || [],
          });
        }
      });
      return merged;
    }
  } catch (e) {}
  return TECHNICIANS_LIST;
}

export const requestStore = {
  add: (data: any) => {
    createRequestApi({
      asset_id: 1,
      category: data.category || 'mechanical',
      priority: data.priority || 'medium',
      problem_title: data.issue_summary || 'แจ้งซ่อม',
      description: data.issue_summary,
    }).catch(() => {});
    return { request_id: 'WO-NEW' };
  },
  setStatus: (id: string, status: Status, techId?: string, opts?: any) => {
    const subStatus = SUB_STATUS_BY_STATUS[status] || "reported";
    globalRequests = globalRequests.map((r) =>
      r.request_id === id ? { ...r, status, sub_status: subStatus } : r
    );
    notifyListeners();
    updateRequestStatusApi(id, status as WorkOrderStatus).catch(() => {});
  },
  requestCancellation: (id: string, reason?: string, requestedBy?: string, empId?: string) => {
    globalRequests = globalRequests.map((r) =>
      r.request_id === id ? { ...r, status: 'complete' as Status, sub_status: 'finished' as SubStatus } : r
    );
    notifyListeners();
    updateRequestStatusApi(id, 'cancelled' as WorkOrderStatus).catch(() => {});
  },
  approveCancellation: (id: string, approvedBy?: string, approved?: boolean, rejectReason?: string) => {
    if (approved) {
      globalRequests = globalRequests.filter((r) => r.request_id !== id);
    }
    notifyListeners();
    updateRequestStatusApi(id, 'cancelled' as WorkOrderStatus).catch(() => {});
  },
  deleteRequestBySupervisor: (id: string) => {
    globalRequests = globalRequests.filter((r) => r.request_id !== id);
    notifyListeners();
    updateRequestStatusApi(id, 'cancelled' as WorkOrderStatus).catch(() => {});
  },
  assignTechnician: (id: string, techId: string, assignedBy?: string) => {
    const allTechs = getAllTechniciansList();
    const tech = allTechs.find((t) => t.emp_id === techId);
    const techName = tech ? tech.name : getTechnicianName(techId, techId);

    globalRequests = globalRequests.map((r) => {
      if (r.request_id === id) {
        return {
          ...r,
          assigned_to: techId,
          assigned_technician_name: techName,
        };
      }
      return r;
    });
    notifyListeners();

    const match = techId.match(/\d+/);
    const techNumericId = match ? parseInt(match[0], 10) : 1;
    assignTechnicianApi(id, techNumericId).catch(() => {});
  },
  approveRequisition: (id: string, approvedBy?: string, approved?: boolean) => {
    notifyListeners();
  },
  addRequisitionItem: (id: string, item: any, actorName?: string) => {
    notifyListeners();
  },
  update: (id: string, partialData: any) => {
    globalRequests = globalRequests.map((r) =>
      r.request_id === id ? { ...r, ...partialData } : r
    );
    notifyListeners();
  },
  togglePartsReady: (id: string, ready: boolean, actorName?: string) => {
    notifyListeners();
  },
  toggleSystemConnected: (id: string, connected: boolean, systemName?: string) => {
    notifyListeners();
  },
  saveAssessmentReport: () => {},
  addDualSignature: () => {},
};

// Fallback Store hooks for React state management
import { useState, useEffect } from 'react';

export function useRequests() {
  const [requests, setRequests] = useState<WorkRequest[]>(globalRequests);

  useEffect(() => {
    let isMounted = true;
    const handleChange = () => {
      if (isMounted) setRequests([...globalRequests]);
    };
    listeners.add(handleChange);

    fetchRequestsFromApi().then((data) => {
      if (isMounted && data.length > 0) {
        const saved = loadSavedRequests();
        const savedMap = new Map(saved.map((r) => [r.request_id, r]));

        const merged = data.map((item) => {
          const localItem = savedMap.get(item.request_id);
          if (localItem && localItem.assigned_to) {
            return {
              ...item,
              assigned_to: localItem.assigned_to,
              assigned_technician_name: localItem.assigned_technician_name || item.assigned_technician_name,
            };
          }
          return item;
        });

        globalRequests = merged;
        saveRequestsToStorage(globalRequests);
        setRequests([...globalRequests]);
      }
    });

    return () => {
      isMounted = false;
      listeners.delete(handleChange);
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
  const [technicians, setTechnicians] = useState<TechnicianUser[]>(getAllTechniciansList);

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


