import { useSyncExternalStore } from "react";
import {
  MOCK_REQUESTS_WITH_TIMELINE,
  Priority,
  RequestAttachment,
  AssessmentReport,
  RequestDetails,
  RequestNotification,
  Status,
  StatusTimelineEvent,
  SubStatus,
  WorkRequest,
} from "./mockData";

type Listener = () => void;

let state: WorkRequest[] = [];
const listeners = new Set<Listener>();

const randomId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

const STATUS_CHANGE_LABEL: Record<Status, string> = {
  open: "เปิดงาน",
  assess: "ประเมินงาน",
  doing: "กำลังซ่อม",
  waiting: "รออะไหล่",
  done: "ปิดงานแล้ว",
  qc1: "รอตรวจครั้งที่ 1",
  qc2: "รอตรวจครั้งที่ 2",
  complete: "เสร็จสิ้น",
};

const DEFAULT_SUB_STATUS_BY_STATUS: Record<Status, SubStatus> = {
  open: "reported",
  assess: "assessing",
  doing: "in-progress",
  waiting: "waiting-parts",
  done: "closed",
  qc1: "qc-round1",
  qc2: "qc-round2",
  complete: "finished",
};

function normalizeRequest(request: WorkRequest): WorkRequest {
  const defaultTimeline: StatusTimelineEvent[] = [
    {
      event_id: randomId("evt"),
      status: "open",
      updated_by: request.reported_by,
      updated_by_role: "requester",
      updated_at: request.reported_time,
      note: "เปิดงาน",
    },
  ];

  const timeline: StatusTimelineEvent[] = request.status_timeline?.length
    ? request.status_timeline
    : defaultTimeline;

  return {
    ...request,
    attachments: request.attachments ?? [],
    status_timeline: timeline,
    requester_notifications: request.requester_notifications ?? [],
  };
}

state = MOCK_REQUESTS_WITH_TIMELINE.map(normalizeRequest);

function emit() {
  listeners.forEach((l) => l());
}

export const requestStore = {
  getAll(): WorkRequest[] {
    return state;
  },
  subscribe(l: Listener) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  add(input: {
    asset_name: string;
    asset_location: string;
    issue_summary: string;
    priority: Priority;
    category: WorkRequest["category"];
    reported_by: string;
    reported_by_id?: string;
    reported_by_department?: string;
    attachments?: RequestAttachment[];
    request_details?: RequestDetails;
  }): WorkRequest {
    const seq = String(state.length + 1).padStart(3, "0");
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const newReq: WorkRequest = {
      request_id: `REQ-${today}-${seq}`,
      status: "open",
      sub_status: "reported",
      reported_time: new Date().toISOString(),
      ...input,
      attachments: input.attachments ?? [],
      request_details: input.request_details,
      status_timeline: [],
      requester_notifications: [],
    };
    const normalized = normalizeRequest(newReq);
    state = [normalized, ...state];
    emit();
    return normalized;
  },
  update(id: string, patch: Partial<WorkRequest>) {
    state = state.map((r) => (r.request_id === id ? { ...r, ...patch } : r));
    emit();
  },
  setAssessmentReport(id: string, assessmentReport: AssessmentReport) {
    this.update(id, { assessment_report: assessmentReport });
  },
  setStatus(
    id: string,
    status: Status,
    technicianId?: string,
    options?: {
      actorName?: string;
      actorRole?: "technician" | "requester" | "system";
      note?: string;
      notifyRequester?: boolean;
      subStatus?: SubStatus;
    },
  ) {
    state = state.map((request) => {
      if (request.request_id !== id) return request;

      const now = new Date().toISOString();
      const actorName = options?.actorName ?? technicianId ?? "ระบบ";
      const actorRole = options?.actorRole ?? "technician";
      const nextTimeline: StatusTimelineEvent[] = [
        ...request.status_timeline,
        {
          event_id: randomId("evt"),
          status,
          updated_by: actorName,
          updated_by_role: actorRole,
          updated_at: now,
          note: options?.note,
        },
      ];

      const shouldNotifyRequester = options?.notifyRequester ?? true;
      const shouldAppendRequesterNotice = shouldNotifyRequester && actorRole === "technician";
      const notifications: RequestNotification[] = shouldAppendRequesterNotice
        ? [
            {
              notification_id: randomId("ntf"),
              message: `งาน ${request.request_id} ถูกอัปเดตเป็น ${STATUS_CHANGE_LABEL[status]} โดย ${actorName}`,
              created_at: now,
              read: false,
            },
            ...request.requester_notifications,
          ]
        : request.requester_notifications;

      return {
        ...request,
        status,
        sub_status: options?.subStatus ?? DEFAULT_SUB_STATUS_BY_STATUS[status],
        ...(technicianId ? { assigned_to: technicianId } : {}),
        status_timeline: nextTimeline,
        requester_notifications: notifications,
      };
    });
    emit();
  },
  markRequesterNotificationsRead(requestId: string, notificationIds: string[]) {
    const idSet = new Set(notificationIds);
    state = state.map((request) => {
      if (request.request_id !== requestId) return request;
      return {
        ...request,
        requester_notifications: request.requester_notifications.map((notification) =>
          idSet.has(notification.notification_id)
            ? { ...notification, read: true }
            : notification,
        ),
      };
    });
    emit();
  },

  // --- 1. Stock Requisition Management ---
  addRequisitionItem(
    requestId: string,
    item: { part_id: string; part_name: string; quantity: number; unit: string; unit_price: number },
    actorName: string = "เจ้าหน้าที่",
  ) {
    state = state.map((req) => {
      if (req.request_id !== requestId) return req;
      const currentStock = req.stock_requisition ?? {
        is_system_connected: false,
        parts_ready: false,
        total_price: 0,
        requisitions: [],
        logs: [],
      };

      const newItemPrice = item.quantity * item.unit_price;
      const newItem = {
        requisition_id: randomId("req-item"),
        part_id: item.part_id,
        part_name: item.part_name,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unit_price,
        total_price: newItemPrice,
        requested_at: new Date().toISOString(),
        status: "requested" as const,
      };

      const updatedRequisitions = [...currentStock.requisitions, newItem];
      const updatedTotalPrice = updatedRequisitions.reduce((acc, curr) => acc + curr.total_price, 0);

      const newLog = {
        log_id: randomId("log"),
        timestamp: new Date().toISOString(),
        actor: actorName,
        action: "เพิ่มรายการเบิกอะไหล่",
        details: `เบิก ${item.part_name} จำนวน ${item.quantity} ${item.unit} (ราคา @${item.unit_price} บาท = ${newItemPrice} บาท)`,
        price: newItemPrice,
      };

      return {
        ...req,
        stock_requisition: {
          ...currentStock,
          total_price: updatedTotalPrice,
          requisitions: updatedRequisitions,
          logs: [newLog, ...currentStock.logs],
        },
      };
    });
    emit();
  },

  togglePartsReady(requestId: string, ready: boolean, actorName: string = "เจ้าหน้าที่") {
    state = state.map((req) => {
      if (req.request_id !== requestId) return req;
      const currentStock = req.stock_requisition ?? {
        is_system_connected: false,
        parts_ready: false,
        total_price: 0,
        requisitions: [],
        logs: [],
      };

      const now = new Date().toISOString();
      const newLog = {
        log_id: randomId("log"),
        timestamp: now,
        actor: actorName,
        action: ready ? "ทำรายการ: อะไหล่พร้อมแล้ว" : "ยกเลิก: อะไหล่พร้อมแล้ว",
        details: ready
          ? "อัปเดตสถานะอะไหล่เป็นพร้อมใช้งาน และสามารถดำเนินการซ่อมได้"
          : "ปรับสถานะอะไหล่กลับเป็นยังไม่พร้อม",
      };

      const updatedNotifications = ready
        ? [
            {
              notification_id: randomId("ntf"),
              message: `งาน ${req.request_id}: อะไหล่พร้อมสำหรับการซ่อมแล้ว`,
              created_at: now,
              read: false,
            },
            ...req.requester_notifications,
          ]
        : req.requester_notifications;

      const shouldMoveToDoing = ready && (req.status === "waiting" || req.status === "assess");
      const nextStatus = shouldMoveToDoing ? ("doing" as const) : req.status;
      const nextSubStatus = shouldMoveToDoing ? ("in-progress" as const) : req.sub_status;

      const nextTimeline = shouldMoveToDoing
        ? [
            ...req.status_timeline,
            {
              event_id: randomId("evt"),
              status: "doing" as const,
              updated_by: actorName,
              updated_by_role: "technician" as const,
              updated_at: now,
              note: "อะไหล่พร้อมแล้ว — ย้ายสถานะเป็นกำลังซ่อมบำรุง",
            },
          ]
        : req.status_timeline;

      return {
        ...req,
        status: nextStatus,
        sub_status: nextSubStatus,
        status_timeline: nextTimeline,
        stock_requisition: {
          ...currentStock,
          parts_ready: ready,
          logs: [newLog, ...currentStock.logs],
        },
        requester_notifications: updatedNotifications,
      };
    });
    emit();
  },

  toggleSystemConnected(requestId: string, isConnected: boolean, actorName: string = "ระบบ") {
    state = state.map((req) => {
      if (req.request_id !== requestId) return req;
      const currentStock = req.stock_requisition ?? {
        is_system_connected: false,
        parts_ready: false,
        total_price: 0,
        requisitions: [],
        logs: [],
      };

      return {
        ...req,
        stock_requisition: {
          ...currentStock,
          is_system_connected: isConnected,
          logs: [
            {
              log_id: randomId("log"),
              timestamp: new Date().toISOString(),
              actor: actorName,
              action: isConnected ? "เชื่อมต่อระบบ Stock คลังสินค้าแล้ว" : "สลับเป็นโหมดไม่เชื่อมต่อระบบ Stock",
              details: isConnected ? "ดึงข้อมูลสต็อกและตัดยอดแบบเรียลไทม์" : "ใช้งาน Checkbox อะไหล่พร้อมแล้วแบบ Manual",
            },
            ...currentStock.logs,
          ],
        },
      };
    });
    emit();
  },

  // --- 2. Dual Signature Approval Management ---
  addDualSignature(
    requestId: string,
    approverSlot: "approver1" | "approver2",
    signatureData: { signer_name: string; signer_role: string; signer_department: string; signature_data_url?: string; note?: string },
  ) {
    state = state.map((req) => {
      if (req.request_id !== requestId) return req;
      const currentApproval = req.dual_approval ?? { status: "pending" as const };
      const now = new Date().toISOString();

      const newEntry = {
        ...signatureData,
        signed_at: now,
      };

      const updated = {
        ...currentApproval,
        [approverSlot]: newEntry,
      };

      const hasApp1 = !!updated.approver1;
      const hasApp2 = !!updated.approver2;

      let newStatus: "pending" | "partial" | "approved" = "pending";
      if (hasApp1 && hasApp2) {
        newStatus = "approved";
        updated.approved_at = now;
      } else if (hasApp1 || hasApp2) {
        newStatus = "partial";
      }

      updated.status = newStatus;

      // Auto update request status to 'complete' if both approved
      const nextReqStatus = newStatus === "approved" ? ("complete" as const) : req.status;
      const nextSubStatus = newStatus === "approved" ? ("finished" as const) : req.sub_status;

      // Initialize 2-week recheck schedule when completed
      let recheckData = req.recheck_data;
      if (newStatus === "approved" && !recheckData) {
        const completedDate = new Date();
        const round1Date = new Date(completedDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const round2Date = new Date(completedDate.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

        recheckData = {
          completed_at: now,
          round1: {
            round: 1,
            scheduled_date: round1Date,
            status: "pending",
          },
          round2: {
            round: 2,
            scheduled_date: round2Date,
            status: "pending",
          },
        };
      }

      return {
        ...req,
        dual_approval: updated,
        status: nextReqStatus,
        sub_status: nextSubStatus,
        recheck_data: recheckData,
      };
    });
    emit();
  },

  // --- 3. Re-check 2 Weeks Management ---
  saveRecheckResult(
    requestId: string,
    round: 1 | 2,
    result: {
      inspector_name: string;
      inspector_department: string;
      status: "completed" | "issue_found";
      result_summary: string;
      requires_new_ticket?: boolean;
    },
  ) {
    state = state.map((req) => {
      if (req.request_id !== requestId) return req;
      if (!req.recheck_data) return req;

      const now = new Date().toISOString();
      const roundKey = round === 1 ? "round1" : "round2";
      const currentRound = req.recheck_data[roundKey];

      const updatedRound = {
        ...currentRound,
        ...result,
        checked_at: now,
      };

      const updatedRecheck = {
        ...req.recheck_data,
        [roundKey]: updatedRound,
      };

      return {
        ...req,
        recheck_data: updatedRecheck,
      };
    });
    emit();
  },
};

export function useRequests(): WorkRequest[] {
  return useSyncExternalStore(
    (l) => requestStore.subscribe(l),
    () => requestStore.getAll(),
    () => requestStore.getAll(),
  );
}

export function useRequest(id?: string): WorkRequest | undefined {
  const all = useRequests();
  return id ? all.find((r) => r.request_id === id) : undefined;
}
