import { api } from "./api";
import { WorkOrderStatus } from "@/types/maintenance";
import {
  WorkRequest,
  Status,
  SubStatus,
  WorkCategory,
  MOCK_REQUESTS_WITH_TIMELINE,
  TechnicianUser,
  TECHNICIANS_LIST,
  getTechnicianName,
  STATUS_LABEL,
  AssessmentReport,
  RecheckData,
  DualApprovalData,
  Priority,
  StatusTimelineEvent,
} from "@/lib/mockData";

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

  let assignedTo = item.users_maintenance_requests_assigned_technician_idTousers?.emp_id || null;
  let assignedName = item.users_maintenance_requests_assigned_technician_idTousers?.name || null;

  // Ensure Requester (โฟล์ค / REQ042) or Supervisor (อาร์ม / SUP001) is never mapped as an assigned technician
  if (assignedTo === 'REQ042' || assignedName === 'โฟล์ค' || assignedTo === 'SUP001' || assignedName === 'อาร์ม') {
    assignedTo = null;
    assignedName = null;
  }

  let effectiveStatus: Status = status;
  let effectiveSubStatus: SubStatus = subStatus;

  // Rule 1: If job has an assigned technician and status is open, advance to assess
  if (assignedTo && effectiveStatus === 'open') {
    effectiveStatus = 'assess';
    effectiveSubStatus = 'assessing';
  }

  // Rule 2: If job has NO assigned technician and status is assess, demote back to open
  if (!assignedTo && effectiveStatus === 'assess') {
    effectiveStatus = 'open';
    effectiveSubStatus = 'reported';
  }

  return {
    request_id: item.work_order_no || `WO-${item.id}`,
    asset_name: item.assets?.name || item.problem_title || 'เครื่องจักร',
    asset_location: item.assets?.location || 'อาคารผลิตหลัก Line 1',
    issue_summary: `${item.problem_title}${item.description ? ' — ' + item.description : ''}`,
    priority: item.priority || 'medium',
    status: effectiveStatus,
    sub_status: effectiveSubStatus,
    reported_time: item.created_at || new Date().toISOString(),
    reported_by: item.users_maintenance_requests_reported_by_idTousers?.name || item.reported_by || 'ผู้แจ้งซ่อม',
    reported_by_id: item.users_maintenance_requests_reported_by_idTousers?.emp_id || 'REQ042',
    reported_by_department: item.users_maintenance_requests_reported_by_idTousers?.department || 'ฝ่ายผลิต',
    category: (item.category as WorkCategory) || 'mechanical',
    assigned_to: assignedTo,
    assigned_technician_name: assignedName,
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
      return res.data.data
        .filter((item: any) => item.status !== 'cancelled')
        .map(mapApiToWorkRequest);
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

export async function assignTechnicianApi(id: string, technicianId: string | number) {
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
        return parsed.map((r: WorkRequest) => {
          let assignedTo = r.assigned_to;
          let assignedName = r.assigned_technician_name;
          if (assignedTo === "REQ042" || assignedName === "โฟล์ค" || assignedTo === "SUP001" || assignedName === "อาร์ม") {
            assignedTo = null;
            assignedName = null;
          }
          let effectiveStatus = r.status;
          let effectiveSubStatus = r.sub_status;
          if (assignedTo && effectiveStatus === "open") {
            effectiveStatus = "assess";
            effectiveSubStatus = "assessing";
          }
          if (!assignedTo && effectiveStatus === "assess") {
            effectiveStatus = "open";
            effectiveSubStatus = "reported";
          }
          return {
            ...r,
            status: effectiveStatus,
            sub_status: effectiveSubStatus,
            assigned_to: assignedTo,
            assigned_technician_name: assignedName,
          };
        });
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
  add: (data: any): WorkRequest => {
    const newId = `WO-${Date.now().toString().slice(-6)}`;
    const newRequest: WorkRequest = {
      request_id: data.request_id || newId,
      asset_name: data.asset_name || data.issue_summary || 'เครื่องจักร',
      asset_location: data.asset_location || 'อาคารผลิตหลัก Line 1',
      issue_summary: data.issue_summary || data.problem_title || 'แจ้งซ่อมบำรุง',
      priority: data.priority || 'medium',
      status: 'open',
      sub_status: 'reported',
      reported_time: new Date().toISOString(),
      reported_by: data.reported_by || 'ผู้แจ้งซ่อม',
      reported_by_id: data.reported_by_id || 'REQ042',
      reported_by_department: data.reported_by_department || 'ฝ่ายผลิต',
      category: data.category || 'mechanical',
      assigned_to: data.assigned_to || null,
      assigned_technician_name: data.assigned_technician_name || null,
      attachments: data.attachments || (data.image_url ? [{
        attachment_id: `att-${Date.now()}`,
        name: 'รูปถ่ายอาการชำรุด',
        url: data.image_url,
        uploaded_at: new Date().toISOString(),
        uploaded_by: data.reported_by || 'ผู้แจ้งซ่อม',
      }] : []),
      request_details: data.request_details || {
        asset_id: data.asset_id || 'MC-01',
        asset_type: data.asset_type || 'เครื่องกล',
        machine_number: data.machine_number || 'MCH-01',
        machine_zone: data.machine_zone || 'ZONE-A',
        location_building: data.location_building || 'อาคารผลิตหลัก',
        location_floor: data.location_floor || 'ชั้น 1',
        location_line: data.location_line || 'Line 1',
        access_required: false,
        access_time_window: '08:00-17:00',
        issue_message: data.issue_summary || 'แจ้งซ่อมบำรุง',
        issue_symptom: 'other',
        issue_frequency: 'first-time',
        machine_operability: 'running',
        reporter_name: data.reported_by || 'นภดล',
        reporter_emp_id: data.reported_by_id || 'REQ042',
        reporter_department: data.reported_by_department || 'ฝ่ายผลิต',
        job_type: data.category || 'mechanical',
      },
      status_timeline: [
        {
          event_id: `EVT-${Date.now()}`,
          status: 'open',
          updated_by: data.reported_by || 'ผู้แจ้งซ่อม',
          updated_by_role: 'requester',
          updated_at: new Date().toISOString(),
          note: 'เปิดใบแจ้งซ่อมใหม่',
        }
      ],
      requester_notifications: [],
    };

    globalRequests = [newRequest, ...globalRequests];
    notifyListeners();

    createRequestApi({
      asset_id: typeof data.asset_id === 'number' ? data.asset_id : 1,
      category: data.category || 'mechanical',
      priority: data.priority || 'medium',
      problem_title: data.issue_summary || 'แจ้งซ่อม',
      description: data.description || data.issue_summary,
      image_url: data.image_url || data.attachments?.[0]?.url,
    }).catch(() => {});

    return newRequest;
  },
  addRequest: (data: any): WorkRequest => {
    return requestStore.add(data);
  },
  setStatus: (id: string, status: Status, techId?: string, opts?: any) => {
    const subStatus = opts?.subStatus || SUB_STATUS_BY_STATUS[status] || "reported";
    globalRequests = globalRequests.map((r) => {
      if (r.request_id === id) {
        const timelineEvent: StatusTimelineEvent = {
          event_id: `EVT-${Date.now()}`,
          status,
          updated_at: new Date().toISOString(),
          updated_by: opts?.actorName || "ผู้ดูแลระบบ",
          updated_by_role: "technician",
          note: opts?.note || `เปลี่ยนสถานะเป็น ${STATUS_LABEL[status]}`,
        };

        // Preserve existing assigned_to & assigned_technician_name unless explicitly changed
        let newAssignedTo = r.assigned_to;
        let newAssignedName = r.assigned_technician_name;

        if (opts?.assignTo !== undefined) {
          newAssignedTo = opts.assignTo;
          newAssignedName = opts.assignName || (opts.assignTo ? getTechnicianName(opts.assignTo, opts.assignTo) : null);
        } else if (techId && techId.startsWith("TECH")) {
          if (!newAssignedTo) {
            newAssignedTo = techId;
            newAssignedName = opts?.actorName || getTechnicianName(techId, techId);
          }
        }

        return {
          ...r,
          status,
          sub_status: subStatus,
          assigned_to: newAssignedTo,
          assigned_technician_name: newAssignedName,
          status_timeline: [timelineEvent, ...(r.status_timeline || [])],
        };
      }
      return r;
    });
    notifyListeners();
    updateRequestStatusApi(id, status as WorkOrderStatus).catch(() => {});
  },
  saveAssessmentReport: (id: string, report: AssessmentReport, nextStatus: Status, actorName?: string) => {
    const subStatus = SUB_STATUS_BY_STATUS[nextStatus] || "reported";
    globalRequests = globalRequests.map((r) => {
      if (r.request_id === id) {
        const timelineEvent: StatusTimelineEvent = {
          event_id: `EVT-${Date.now()}`,
          status: nextStatus,
          updated_at: new Date().toISOString(),
          updated_by: actorName || "ช่างซ่อมบำรุง",
          updated_by_role: "technician",
          note: `บันทึกผลการประเมินหน้างาน (ปรับสถานะเป็น: ${STATUS_LABEL[nextStatus]})`,
        };
        return {
          ...r,
          status: nextStatus,
          sub_status: subStatus,
          assessment_report: report,
          status_timeline: [timelineEvent, ...(r.status_timeline || [])],
        };
      }
      return r;
    });
    notifyListeners();
    updateRequestStatusApi(id, nextStatus as WorkOrderStatus).catch(() => {});
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
      globalRequests = globalRequests.filter((r) => r.request_id !== id && String(r.request_id) !== String(id));
      api.delete(`/requests/${id}`).catch(() => {
        updateRequestStatusApi(id, 'cancelled' as WorkOrderStatus).catch(() => {});
      });
    }
    notifyListeners();
  },
  deleteRequestBySupervisor: (id: string) => {
    globalRequests = globalRequests.filter((r) => r.request_id !== id && String(r.request_id) !== String(id));
    notifyListeners();
    api.delete(`/requests/${id}`).catch(() => {
      updateRequestStatusApi(id, 'cancelled' as WorkOrderStatus).catch(() => {});
    });
  },
  assignTechnician: (id: string, techId: string, assignedBy?: string, autoMoveToAssess: boolean = true) => {
    const allTechs = getAllTechniciansList();
    const tech = allTechs.find((t) => t.emp_id === techId);
    const techName = tech ? tech.name : getTechnicianName(techId, techId);

    globalRequests = globalRequests.map((r) => {
      if (r.request_id === id) {
        const shouldMoveToAssess = autoMoveToAssess && r.status === "open";
        const nextStatus: Status = shouldMoveToAssess ? "assess" : r.status;
        const subStatus: SubStatus = shouldMoveToAssess ? "assessing" : (r.sub_status || SUB_STATUS_BY_STATUS[nextStatus]);

        const timelineEvent: StatusTimelineEvent = {
          event_id: `EVT-${Date.now()}`,
          status: nextStatus,
          updated_at: new Date().toISOString(),
          updated_by: assignedBy || "Supervisor",
          updated_by_role: "technician",
          note: shouldMoveToAssess
            ? `มอบหมายงานให้ ${techName} (${techId}) และเปลี่ยนสถานะเป็นประเมินงาน`
            : `มอบหมายงานให้ ${techName} (${techId})`,
        };

        return {
          ...r,
          assigned_to: techId,
          assigned_technician_name: techName,
          status: nextStatus,
          sub_status: subStatus,
          status_timeline: [timelineEvent, ...(r.status_timeline || [])],
        };
      }
      return r;
    });
    notifyListeners();

    assignTechnicianApi(id, techId).catch(() => {});
    if (autoMoveToAssess) {
      updateRequestStatusApi(id, 'in_progress' as WorkOrderStatus).catch(() => {});
    }
  },
  approveRequisition: (id: string, approvedBy?: string, approved?: boolean) => {
    globalRequests = globalRequests.map((r) => {
      if (r.request_id === id) {
        const currentStock = r.stock_requisition || {
          is_system_connected: true,
          parts_ready: false,
          total_price: 0,
          requisitions: [],
          logs: [],
        };
        const newLog = {
          log_id: `LOG-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: 'อนุมัติการเบิกอะไหล่',
          actor: approvedBy || 'Supervisor',
          details: `หัวหน้างานอนุมัติการเบิกอะไหล่มูลค่าสูง (฿${currentStock.total_price.toLocaleString()}) เรียบร้อยแล้ว`,
        };
        return {
          ...r,
          requisition_approval: {
            required: true,
            threshold_amount: 10000,
            total_amount: currentStock.total_price,
            status: 'approved' as const,
            approved_by: approvedBy || 'Supervisor',
            approved_at: new Date().toISOString(),
          },
          stock_requisition: {
            ...currentStock,
            logs: [newLog, ...(currentStock.logs || [])],
          },
        };
      }
      return r;
    });
    notifyListeners();
    api.post(`/requests/${id}/requisitions/approve`, { is_approved: approved ?? true }).catch((err) => {
      console.warn('API approve requisition failed, retained locally:', err);
    });
  },
  addRequisitionItem: (id: string, item: any, actorName?: string) => {
    const itemTotal = Number(item.quantity || 1) * Number(item.unit_price || 0);
    globalRequests = globalRequests.map((r) => {
      if (r.request_id === id) {
        const currentStock = r.stock_requisition || {
          is_system_connected: false,
          parts_ready: false,
          total_price: 0,
          requisitions: [],
          logs: [],
        };

        const newReq = {
          requisition_id: item.requisition_id || `REQ-${Date.now()}`,
          part_id: item.part_id || `PART-${Date.now()}`,
          part_name: item.part_name,
          quantity: Number(item.quantity || 1),
          unit: item.unit || 'ชิ้น',
          unit_price: Number(item.unit_price || 0),
          total_price: itemTotal,
          requested_at: new Date().toISOString(),
          status: 'ready' as const,
        };

        const newLog = {
          log_id: `LOG-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: 'ขอเบิกอะไหล่',
          actor: actorName || 'ช่างซ่อมบำรุง',
          details: `ขอเบิก ${item.part_name} จำนวน ${item.quantity} ${item.unit || 'ชิ้น'} (฿${itemTotal.toLocaleString()})`,
        };

        const updatedRequisitions = [...(currentStock.requisitions || []), newReq];
        const newTotalPrice = updatedRequisitions.reduce((sum, req) => sum + Number(req.total_price || 0), 0);

        return {
          ...r,
          stock_requisition: {
            ...currentStock,
            total_price: newTotalPrice,
            requisitions: updatedRequisitions,
            logs: [newLog, ...(currentStock.logs || [])],
          },
        };
      }
      return r;
    });
    notifyListeners();

    api.post(`/requests/${id}/requisitions`, {
      part_id: item.part_id,
      part_name: item.part_name,
      quantity: Number(item.quantity || 1),
      unit_price: Number(item.unit_price || 0),
      unit: item.unit,
    }).catch((err) => {
      console.warn('API add requisition failed, retained locally in store:', err);
    });
  },
  removeRequisitionItem: (id: string, requisitionId: string, actorName?: string) => {
    globalRequests = globalRequests.map((r) => {
      if (r.request_id === id) {
        const currentStock = r.stock_requisition;
        if (!currentStock) return r;

        const targetReq = currentStock.requisitions.find((req) => req.requisition_id === requisitionId);
        const updatedRequisitions = currentStock.requisitions.filter((req) => req.requisition_id !== requisitionId);
        const newTotalPrice = updatedRequisitions.reduce((sum, req) => sum + Number(req.total_price || 0), 0);

        const newLog = {
          log_id: `LOG-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: 'ยกเลิกรายการเบิก',
          actor: actorName || 'ช่างซ่อมบำรุง',
          details: `ยกเลิกการเบิก ${targetReq?.part_name || 'อะไหล่'} จำนวน ${targetReq?.quantity || 1} ${targetReq?.unit || 'ชิ้น'} (คืนสต็อก)`,
        };

        return {
          ...r,
          requisition_approval: newTotalPrice < 10000 ? undefined : r.requisition_approval,
          stock_requisition: {
            ...currentStock,
            total_price: newTotalPrice,
            requisitions: updatedRequisitions,
            logs: [newLog, ...(currentStock.logs || [])],
          },
        };
      }
      return r;
    });
    notifyListeners();

    api.delete(`/requests/${id}/requisitions/${requisitionId}`).catch((err) => {
      console.warn('API remove requisition failed, retained locally in store:', err);
    });
  },
  update: (id: string, partialData: any) => {
    globalRequests = globalRequests.map((r) =>
      r.request_id === id ? { ...r, ...partialData } : r
    );
    notifyListeners();
  },
  togglePartsReady: (id: string, ready: boolean, actorName?: string) => {
    globalRequests = globalRequests.map((r) => {
      if (r.request_id === id) {
        const currentStock = r.stock_requisition || {
          is_system_connected: false,
          parts_ready: false,
          total_price: 0,
          requisitions: [],
          logs: [],
        };
        const newLog = {
          log_id: `LOG-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: ready ? 'อะไหล่พร้อมใช้งาน' : 'ยกเลิกสถานะอะไหล่พร้อม',
          actor: actorName || 'เจ้าหน้าที่คลัง',
          details: ready ? 'ปรับปรุงสถานะ: อะไหล่จัดเตรียมพร้อมนำไปใช้งานแล้ว' : 'ปรับปรุงสถานะ: ยกเลิกสถานะอะไหล่พร้อมใช้งาน',
        };
        return {
          ...r,
          stock_requisition: {
            ...currentStock,
            parts_ready: ready,
            logs: [newLog, ...(currentStock.logs || [])],
          },
        };
      }
      return r;
    });
    notifyListeners();
    api.patch(`/requests/${id}/parts-ready`, { parts_ready: ready }).catch((err) => {
      console.warn('API toggle parts ready failed, retained locally:', err);
    });
  },
  toggleSystemConnected: (id: string, connected: boolean, systemName?: string) => {
    globalRequests = globalRequests.map((r) => {
      if (r.request_id === id) {
        const currentStock = r.stock_requisition || {
          is_system_connected: false,
          parts_ready: false,
          total_price: 0,
          requisitions: [],
          logs: [],
        };
        const newLog = {
          log_id: `LOG-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: connected ? 'เชื่อมต่อระบบสต็อก' : 'ตัดการเชื่อมต่อระบบสต็อก',
          actor: systemName || 'ระบบคลังสินค้า',
          details: connected ? 'เชื่อมต่อฐานข้อมูลคลังอะไหล่โรงงานสำเร็จ' : 'สลับเป็นโหมดจัดการด้วยตนเอง (Manual Mode)',
        };
        return {
          ...r,
          stock_requisition: {
            ...currentStock,
            is_system_connected: connected,
            logs: [newLog, ...(currentStock.logs || [])],
          },
        };
      }
      return r;
    });
    notifyListeners();
  },
  markRequesterNotificationsRead: (requestId: string, notificationIds: string[]) => {
    globalRequests = globalRequests.map((r) => {
      if (r.request_id === requestId && r.requester_notifications) {
        return {
          ...r,
          requester_notifications: r.requester_notifications.map((n) =>
            notificationIds.includes(n.notification_id) ? { ...n, read: true } : n
          ),
        };
      }
      return r;
    });
    notifyListeners();
  },
  saveRecheckResult: (
    id: string,
    round: 1 | 2,
    result: {
      inspector_name: string;
      inspector_department?: string;
      status: "completed" | "issue_found";
      result_summary: string;
      requires_new_ticket?: boolean;
    }
  ) => {
    globalRequests = globalRequests.map((r) => {
      if (r.request_id === id) {
        const existingRecheck = r.recheck_data || {
          completed_at: new Date().toISOString(),
          round1: {
            round: 1 as const,
            scheduled_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
            status: "pending" as const,
          },
          round2: {
            round: 2 as const,
            scheduled_date: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
            status: "pending" as const,
          },
        };

        const updatedRound = {
          ...(round === 1 ? existingRecheck.round1 : existingRecheck.round2),
          round,
          status: result.status,
          inspector_name: result.inspector_name,
          inspector_department: result.inspector_department || "แผนกซ่อมบำรุง",
          checked_at: new Date().toISOString(),
          result_summary: result.result_summary,
          requires_new_ticket: result.requires_new_ticket,
        };

        const updatedRecheck: RecheckData = {
          ...existingRecheck,
          round1: round === 1 ? updatedRound : existingRecheck.round1,
          round2: round === 2 ? updatedRound : existingRecheck.round2,
        };

        const timelineEvent: StatusTimelineEvent = {
          event_id: `EVT-${Date.now()}`,
          status: r.status,
          updated_at: new Date().toISOString(),
          updated_by: result.inspector_name,
          updated_by_role: "technician",
          note: `บันทึกผลการเข้าตรวจซ้ำรอบที่ ${round}: ${result.status === "completed" ? "ปกติ (ผ่าน)" : "พบปัญหาขัดข้องเพิ่มเติม"}`,
        };

        return {
          ...r,
          recheck_data: updatedRecheck,
          status_timeline: [timelineEvent, ...(r.status_timeline || [])],
        };
      }
      return r;
    });
    notifyListeners();
  },
  addDualSignature: (
    id: string,
    signatureData: {
      activeSlot: "approver1" | "approver2";
      name: string;
      role?: string;
      department?: string;
      sigUrl?: string;
      note?: string;
    }
  ) => {
    globalRequests = globalRequests.map((r) => {
      if (r.request_id === id) {
        const currentApproval = r.dual_approval || { status: "pending" as const };
        const newSig = {
          signer_name: signatureData.name,
          signer_role: signatureData.role || (signatureData.activeSlot === "approver1" ? "Supervisor 1" : "Supervisor 2"),
          signer_department: signatureData.department || "แผนกซ่อมบำรุง",
          signed_at: new Date().toISOString(),
          signature_data_url: signatureData.sigUrl,
          note: signatureData.note,
        };

        const isFullySigned =
          (signatureData.activeSlot === "approver1" && !!currentApproval.approver2) ||
          (signatureData.activeSlot === "approver2" && !!currentApproval.approver1);

        const updatedApproval: DualApprovalData = {
          ...currentApproval,
          approver1: signatureData.activeSlot === "approver1" ? newSig : currentApproval.approver1,
          approver2: signatureData.activeSlot === "approver2" ? newSig : currentApproval.approver2,
          status: isFullySigned ? "approved" : "partial",
          approved_at: isFullySigned ? new Date().toISOString() : undefined,
        };

        const timelineEvent: StatusTimelineEvent = {
          event_id: `EVT-${Date.now()}`,
          status: r.status,
          updated_at: new Date().toISOString(),
          updated_by: signatureData.name,
          updated_by_role: "technician",
          note: `ลงนามอนุมัติ (${signatureData.activeSlot === "approver1" ? "ท่านที่ 1" : "ท่านที่ 2"})`,
        };

        return {
          ...r,
          dual_approval: updatedApproval,
          status_timeline: [timelineEvent, ...(r.status_timeline || [])],
        };
      }
      return r;
    });
    notifyListeners();
  },
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


