import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, FileSpreadsheet, Filter, LayoutDashboard, LayoutGrid, List, LogOut, Menu, QrCode, Search, Wrench } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { JobCard } from "@/components/JobCard";
import { StockRequisitionDialog } from "@/components/StockRequisitionDialog";
import { DualSignatureDialog } from "@/components/DualSignatureDialog";
import { RecheckTrackingDialog } from "@/components/RecheckTrackingDialog";
import { WorkOrderPrintDialog } from "@/components/WorkOrderPrintDialog";
import { ExportDataDialog } from "@/components/ExportDataDialog";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AppLayout } from "@/components/AppLayout";
import { updateRequestStatusApi, requestStore, useRequests } from "@/lib/requestStore";
import {
  CATEGORY_LABEL,
  PRIORITY_RANK,
  PRIORITY_LABEL,
  Status,
  STATUS_LABEL,
  SUB_STATUS_LABEL,
  SubStatus,
  WorkRequest,
} from "@/lib/mockData";
import { cn } from "@/lib/utils";

import { getCurrentUser } from "@/lib/auth";
import { canManageRequest } from "@/lib/rbac";

const STATUS_COLUMNS: { key: Status; title: string; accent: string }[] = [
  { key: "open", title: "เปิดงาน", accent: "border-status-new" },
  { key: "assess", title: "ประเมินงาน", accent: "border-warning" },
  { key: "waiting", title: "รออะไหล่", accent: "border-status-waiting" },
  { key: "doing", title: "กำลังซ่อม", accent: "border-status-doing" },
  { key: "done", title: "ปิดงาน", accent: "border-primary" },
  { key: "qc1", title: "รอตรวจครั้งที่ 1", accent: "border-accent" },
  { key: "qc2", title: "รอตรวจครั้งที่ 2", accent: "border-accent" },
  { key: "complete", title: "เสร็จสิ้น", accent: "border-status-done" },
];

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

const searchIndex = (request: WorkRequest) => {
  const details = request.request_details;
  return [
    request.asset_name,
    request.issue_summary,
    request.request_id,
    request.asset_location,
    request.reported_by,
    details?.asset_id,
    details?.asset_type,
    details?.machine_number,
    details?.machine_zone,
    details?.location_building,
    details?.location_floor,
    details?.location_line,
    details?.issue_message,
    details?.reporter_name,
    details?.reporter_department,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
};

export default function TechnicianBoard() {
  const navigate = useNavigate();
  const requests = useRequests();
  const kanbanScrollRef = useRef<HTMLDivElement | null>(null);
  const isPanningRef = useRef(false);
  const panStartXRef = useRef(0);
  const panStartScrollLeftRef = useRef(0);
  const currentUser = getCurrentUser();
  const currentTech = currentUser?.emp_id || "TECH001";
  const technicianName = currentUser?.name || "ช่างซ่อมบำรุง";
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<"all" | WorkRequest["priority"]>("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | WorkRequest["category"]>("all");
  const [responsibleFilter, setResponsibleFilter] = useState<"all" | "mine" | "unassigned">("all");
  const [subStatusFilter, setSubStatusFilter] = useState<"all" | SubStatus>("all");
  const [timeSort, setTimeSort] = useState<"reported-desc" | "reported-asc">("reported-desc");
  const [view, setView] = useState<"kanban" | "list">("kanban");

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (priorityFilter !== "all") count++;
    if (categoryFilter !== "all") count++;
    if (responsibleFilter !== "all") count++;
    if (subStatusFilter !== "all") count++;
    if (timeSort !== "reported-desc") count++;
    return count;
  }, [priorityFilter, categoryFilter, responsibleFilter, subStatusFilter, timeSort]);

  const resetFilters = () => {
    setPriorityFilter("all");
    setCategoryFilter("all");
    setResponsibleFilter("all");
    setSubStatusFilter("all");
    setTimeSort("reported-desc");
  };
  const [draggedId, setDraggedId] = useState<string | null>(null);

  // Dialog States for Requirement Features
  const [stockReqId, setStockReqId] = useState<string | null>(null);
  const [dualSigReqId, setDualSigReqId] = useState<string | null>(null);
  const [recheckReqId, setRecheckReqId] = useState<string | null>(null);
  const [printRequest, setPrintRequest] = useState<WorkRequest | null>(null);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  const prevRequestCountRef = useRef(requests.length);

  // Listen for real-time new requests cross-window
  useEffect(() => {
    const handleNewRequest = (e: Event) => {
      const customEvent = e as CustomEvent<WorkRequest>;
      const newReq = customEvent.detail;
      if (newReq) {
        toast.info(`🔔 มีงานแจ้งซ่อมใหม่: ${newReq.request_id}`, {
          description: `${newReq.asset_name} — ${newReq.issue_summary} (${newReq.reported_by})`,
          duration: 7000,
        });
      }
    };

    window.addEventListener("fixflow_new_request", handleNewRequest);
    return () => {
      window.removeEventListener("fixflow_new_request", handleNewRequest);
    };
  }, []);

  // Secondary check if request length increased cross-tab
  useEffect(() => {
    if (requests.length > prevRequestCountRef.current) {
      const newest = requests[0];
      if (newest && newest.status === "open") {
        toast.info(`🔔 งานซ่อมเข้ามาใหม่: ${newest.request_id}`, {
          description: `${newest.asset_name} - ${newest.issue_summary}`,
          duration: 6000,
        });
      }
    }
    prevRequestCountRef.current = requests.length;
  }, [requests]);

  const stockRequest = useMemo(() => requests.find((r) => r.request_id === stockReqId), [requests, stockReqId]);
  const dualSigRequest = useMemo(() => requests.find((r) => r.request_id === dualSigReqId), [requests, dualSigReqId]);
  const recheckRequest = useMemo(() => requests.find((r) => r.request_id === recheckReqId), [requests, recheckReqId]);

  const filtered = useMemo(() => {
    return requests
      .filter((request) => (priorityFilter === "all" ? true : request.priority === priorityFilter))
      .filter((request) => (categoryFilter === "all" ? true : request.category === categoryFilter))
      .filter((request) =>
        responsibleFilter === "all"
          ? true
          : responsibleFilter === "mine"
          ? request.assigned_to === currentTech
          : !request.assigned_to,
      )
      .filter((request) => (subStatusFilter === "all" ? true : request.sub_status === subStatusFilter))
      .filter((request) => (search.trim() === "" ? true : searchIndex(request).includes(search.toLowerCase())))
      .sort((left, right) => {
        const priorityDiff = PRIORITY_RANK[left.priority] - PRIORITY_RANK[right.priority];
        if (priorityDiff !== 0) return priorityDiff;

        return timeSort === "reported-desc"
          ? new Date(right.reported_time).getTime() - new Date(left.reported_time).getTime()
          : new Date(left.reported_time).getTime() - new Date(right.reported_time).getTime();
      });
  }, [requests, search, priorityFilter, categoryFilter, responsibleFilter, subStatusFilter, timeSort, currentTech]);

  const counts = useMemo(() => {
    const statusCounts = Object.fromEntries(STATUS_COLUMNS.map((column) => [column.key, 0])) as Record<Status, number>;
    filtered.forEach((request) => {
      statusCounts[request.status] += 1;
    });
    return {
      critical: filtered.filter((request) => request.priority === "critical").length,
      assigned: filtered.filter((request) => request.assigned_to === currentTech).length,
      unassigned: filtered.filter((request) => !request.assigned_to).length,
      ...statusCounts,
    };
  }, [filtered, currentTech]);

  const handleAccept = (id: string) => {
    requestStore.setStatus(id, "assess", currentTech, {
      actorName: TECHNICIAN_NAME,
      note: "ช่างรับงานและเริ่มประเมิน",
      notifyRequester: true,
      subStatus: SUB_STATUS_BY_STATUS.assess,
    });
    toast.success("รับงานสำเร็จ");
    setTimeout(() => navigate(`/assessment/${id}`), 350);
  };

  const handleChangeStatus = async (id: string, status: Status, actionLabel: string) => {
    const reqItem = requests.find((r) => r.request_id === id);
    if (reqItem && !canManageRequest(currentUser, reqItem)) {
      toast.error("ปฏิเสธการทำรายการ: คุณไม่มีสิทธิ์จัดการงานซ่อมของช่างคนอื่น", {
        description: "ช่างซ่อมสามารถจัดการได้เฉพาะงานที่ได้รับมอบหมายให้ตนเองเท่านั้น",
      });
      return;
    }

    try {
      requestStore.setStatus(id, status, currentTech, {
        actorName: technicianName,
        subStatus: SUB_STATUS_BY_STATUS[status],
      });
      toast.success(`อัปเดตสถานะเป็น ${actionLabel} เรียบร้อยแล้ว`);
    } catch (err: any) {
      toast.error(err.message || "อัปเดตสถานะล้มเหลว");
    }
  };

  const handleDragStart = (requestId: string) => {
    setDraggedId(requestId);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  const autoScrollKanbanByPointer = (clientX: number) => {
    if (!draggedId || !kanbanScrollRef.current) return;

    const container = kanbanScrollRef.current;
    const rect = container.getBoundingClientRect();
    const edgeThreshold = 96;
    const maxScrollStep = 26;

    let scrollDelta = 0;
    if (clientX < rect.left + edgeThreshold) {
      const ratio = Math.min(1, (rect.left + edgeThreshold - clientX) / edgeThreshold);
      scrollDelta = -Math.ceil(maxScrollStep * ratio);
    } else if (clientX > rect.right - edgeThreshold) {
      const ratio = Math.min(1, (clientX - (rect.right - edgeThreshold)) / edgeThreshold);
      scrollDelta = Math.ceil(maxScrollStep * ratio);
    }

    if (scrollDelta !== 0) {
      container.scrollLeft += scrollDelta;
    }
  };

  useEffect(() => {
    const stopPanning = () => {
      if (isPanningRef.current) {
        isPanningRef.current = false;
        kanbanScrollRef.current?.classList.remove("cursor-grabbing");
      }
    };

    window.addEventListener("mouseup", stopPanning);
    window.addEventListener("pointerup", stopPanning);
    window.addEventListener("blur", stopPanning);

    return () => {
      window.removeEventListener("mouseup", stopPanning);
      window.removeEventListener("pointerup", stopPanning);
      window.removeEventListener("blur", stopPanning);
    };
  }, []);

  const handleKanbanDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    autoScrollKanbanByPointer(event.clientX);
  };

  const handleKanbanMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !kanbanScrollRef.current) return;

    const target = event.target as HTMLElement;
    if (
      target.closest(
        "button, input, textarea, select, a, [role='button'], [role='combobox'], [role='option'], [role='listbox'], [draggable='true'], [data-radix-focus-guard]"
      )
    ) {
      return;
    }

    isPanningRef.current = true;
    panStartXRef.current = event.clientX;
    panStartScrollLeftRef.current = kanbanScrollRef.current.scrollLeft;
    kanbanScrollRef.current.classList.add("cursor-grabbing");
    event.preventDefault();
  };

  const handleKanbanMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.buttons === 0) {
      if (isPanningRef.current) {
        isPanningRef.current = false;
        kanbanScrollRef.current?.classList.remove("cursor-grabbing");
      }
      return;
    }
    if (!isPanningRef.current || !kanbanScrollRef.current) return;
    const deltaX = event.clientX - panStartXRef.current;
    kanbanScrollRef.current.scrollLeft = panStartScrollLeftRef.current - deltaX;
  };

  const handleKanbanMouseUp = () => {
    if (!isPanningRef.current || !kanbanScrollRef.current) return;
    isPanningRef.current = false;
    kanbanScrollRef.current.classList.remove("cursor-grabbing");
  };

  const handleDropToStatus = (status: Status) => {
    if (!draggedId) return;
    const request = filtered.find((item) => item.request_id === draggedId);
    if (!request || request.status === status) {
      setDraggedId(null);
      return;
    }
    if (!canManageRequest(currentUser, request)) {
      toast.error("ปฏิเสธการย้ายการ์ด: คุณไม่มีสิทธิ์จัดการงานซ่อมของช่างคนอื่น", {
        description: "ช่างซ่อมสามารถลากย้ายได้เฉพาะงานที่ได้รับมอบหมายให้ตนเองเท่านั้น",
      });
      setDraggedId(null);
      return;
    }
    handleChangeStatus(draggedId, status, STATUS_LABEL[status]);
    setDraggedId(null);
  };

  const userRole = (JSON.parse(sessionStorage.getItem("fixflow_user") ?? "{}") as { role?: string }).role || "technician";
  const isSupervisor = userRole === "supervisor";

  const pendingApprovalsCount = useMemo(() => {
    return requests.filter((r) => r.cancellation_request?.status === "pending" || r.requisition_approval?.status === "pending").length;
  }, [requests]);

  return (
    <AppLayout
      title="TECHNICIAN BOARD"
      subtitle={`${technicianName} · ${currentTech}`}
      actions={
        <Button
          variant="outline"
          size="sm"
          className="text-xs px-3 h-8 gap-1.5 border-emerald-600/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600/10 hover:text-emerald-700 dark:hover:text-emerald-300"
          onClick={() => setIsExportOpen(true)}
        >
          <FileSpreadsheet className="h-3.5 w-3.5" /> Export Excel
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Supervisor Pending Approvals Banner */}
        {isSupervisor && pendingApprovalsCount > 0 && (
          <div className="p-3 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex items-center justify-between gap-2 text-xs font-semibold animate-pulse">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
              <span>⚠️ มีรายการที่รอ Supervisor ตรวจสอบและอนุมัติทั้งหมด {pendingApprovalsCount} รายการ (คำขอยกเลิกงาน / เบิกอะไหล่มูลค่าสูง)</span>
            </div>
            <Button size="sm" variant="outline" className="h-7 text-xs border-amber-400 text-amber-900 dark:text-amber-100 hover:bg-amber-100 dark:hover:bg-amber-900/40" onClick={() => setSearch("ขอยกเลิก")}>
              กรองงานรออนุมัติ
            </Button>
          </div>
        )}

        {/* Desktop Filter Toolbar (Show on sm+) */}
        <div className="hidden sm:flex flex-wrap items-center gap-1.5 lg:gap-2 w-full">

          <div className="relative flex-1 min-w-[140px] sm:min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="ค้นหารหัสงาน, เครื่องจักร..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-8 sm:pl-9 h-9 bg-card text-xs sm:text-sm"
            />
          </div>
          <Select value={priorityFilter} onValueChange={(value) => setPriorityFilter(value as "all" | WorkRequest["priority"]) }>
            <SelectTrigger className="w-[115px] sm:w-[130px] lg:w-[145px] h-9 bg-card text-xs sm:text-sm px-2 sm:px-3">
              <Filter className="h-3 w-3 mr-1 text-muted-foreground shrink-0" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกความสำคัญ</SelectItem>
              <SelectItem value="critical">🔴 วิกฤติ</SelectItem>
              <SelectItem value="high">🟠 สูง</SelectItem>
              <SelectItem value="medium">🔵 ปานกลาง</SelectItem>
              <SelectItem value="low">⚪ ต่ำ</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value as "all" | WorkRequest["category"]) }>
            <SelectTrigger className="w-[115px] sm:w-[135px] lg:w-[150px] h-9 bg-card text-xs sm:text-sm px-2 sm:px-3">
              <SelectValue placeholder="หมวดหมู่" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกหมวดหมู่</SelectItem>
              {Object.entries(CATEGORY_LABEL).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={responsibleFilter} onValueChange={(value) => setResponsibleFilter(value as "all" | "mine" | "unassigned") }>
            <SelectTrigger className="w-[110px] sm:w-[125px] lg:w-[140px] h-9 bg-card text-xs sm:text-sm px-2 sm:px-3">
              <SelectValue placeholder="ผู้รับผิดชอบ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกงาน</SelectItem>
              <SelectItem value="mine">งานของฉัน</SelectItem>
              <SelectItem value="unassigned">ยังไม่รับงาน</SelectItem>
            </SelectContent>
          </Select>
          <Select value={subStatusFilter} onValueChange={(value) => setSubStatusFilter(value as "all" | SubStatus) }>
            <SelectTrigger className="w-[115px] sm:w-[130px] lg:w-[145px] h-9 bg-card text-xs sm:text-sm px-2 sm:px-3">
              <SelectValue placeholder="สถานะย่อย" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกสถานะย่อย</SelectItem>
              {Object.entries(SUB_STATUS_LABEL).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={timeSort} onValueChange={(value) => setTimeSort(value as "reported-desc" | "reported-asc") }>
            <SelectTrigger className="w-[115px] sm:w-[130px] lg:w-[145px] h-9 bg-card text-xs sm:text-sm px-2 sm:px-3">
              <SelectValue placeholder="เรียงเวลา" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="reported-desc">ใหม่สุดก่อน</SelectItem>
              <SelectItem value="reported-asc">เก่าสุดก่อน</SelectItem>
            </SelectContent>
          </Select>
          <div className="inline-flex items-center rounded-md border bg-card p-1 h-9 shrink-0">
            <Button variant={view === "kanban" ? "industrial" : "ghost"} size="sm" onClick={() => setView("kanban") } className="h-7 text-xs px-2 sm:px-2.5">
              <LayoutGrid className="mr-1 h-3.5 w-3.5" />
              Kanban
            </Button>
            <Button variant={view === "list" ? "industrial" : "ghost"} size="sm" onClick={() => setView("list") } className="h-7 text-xs px-2 sm:px-2.5">
              <List className="mr-1 h-3.5 w-3.5" />
              List
            </Button>
          </div>
        </div>

        {/* Mobile Filter Toolbar (Show on mobile ONLY - Clean 1-Row Layout) */}
        <div className="flex items-center gap-2 sm:hidden">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ค้นหารหัสงาน, เครื่องจักร..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9 h-10 bg-card text-xs shadow-sm"
            />
          </div>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="h-10 px-3 bg-card gap-1.5 shrink-0 relative shadow-sm border-primary/20 hover:bg-muted hover:text-foreground">
                <Filter className="h-4 w-4" />
                <span className="text-xs font-semibold">ตัวกรอง</span>
                {activeFilterCount > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto p-5">
              <SheetHeader className="text-left pb-3 border-b">
                <SheetTitle className="flex items-center justify-between text-base">
                  <span className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-primary" /> ตัวกรองข้อมูลงานซ่อม
                  </span>
                  {activeFilterCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={resetFilters} className="text-xs text-rose-500 hover:text-rose-600 h-7 px-2">
                      ล้างตัวกรองทั้งหมด
                    </Button>
                  )}
                </SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground">
                  เลือกเงื่อนไขเพื่อกรองแสดงผลการเปิดคำขอแจ้งซ่อมบนบอร์ด
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-4 py-4 text-xs">
                {/* Priority */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground">ความสำคัญ</label>
                  <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as any)}>
                    <SelectTrigger className="h-10 bg-card w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">ทุกความสำคัญ</SelectItem>
                      <SelectItem value="critical">🔴 วิกฤติ (Critical)</SelectItem>
                      <SelectItem value="high">🟠 สูง (High)</SelectItem>
                      <SelectItem value="medium">🔵 ปานกลาง (Medium)</SelectItem>
                      <SelectItem value="low">⚪ ต่ำ (Low)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Category */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground">หมวดหมู่ปัญหา</label>
                  <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as any)}>
                    <SelectTrigger className="h-10 bg-card w-full">
                      <SelectValue placeholder="ทุกหมวดหมู่" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">ทุกหมวดหมู่</SelectItem>
                      {Object.entries(CATEGORY_LABEL).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Responsible */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground">ผู้รับผิดชอบ</label>
                  <Select value={responsibleFilter} onValueChange={(v) => setResponsibleFilter(v as any)}>
                    <SelectTrigger className="h-10 bg-card w-full">
                      <SelectValue placeholder="ผู้รับผิดชอบ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">ทุกงาน</SelectItem>
                      <SelectItem value="mine">งานของฉัน</SelectItem>
                      <SelectItem value="unassigned">ยังไม่รับงาน</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* SubStatus */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground">สถานะย่อย</label>
                  <Select value={subStatusFilter} onValueChange={(v) => setSubStatusFilter(v as any)}>
                    <SelectTrigger className="h-10 bg-card w-full">
                      <SelectValue placeholder="สถานะย่อย" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">ทุกสถานะย่อย</SelectItem>
                      {Object.entries(SUB_STATUS_LABEL).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* TimeSort */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground">การเรียงลำดับเวลา</label>
                  <Select value={timeSort} onValueChange={(v) => setTimeSort(v as any)}>
                    <SelectTrigger className="h-10 bg-card w-full">
                      <SelectValue placeholder="เรียงเวลา" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reported-desc">ใหม่สุดก่อน (Newest)</SelectItem>
                      <SelectItem value="reported-asc">เก่าสุดก่อน (Oldest)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <div className="inline-flex items-center rounded-md border bg-card p-1 shrink-0">
            <Button variant={view === "kanban" ? "industrial" : "ghost"} size="sm" onClick={() => setView("kanban")} className="h-8 text-xs px-2.5">
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button variant={view === "list" ? "industrial" : "ghost"} size="sm" onClick={() => setView("list")} className="h-8 text-xs px-2.5">
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {view === "kanban" ? (
          <div
            ref={kanbanScrollRef}
            className="flex gap-4 overflow-x-auto pb-3 cursor-grab"
            onDragOver={handleKanbanDragOver}
            onMouseDown={handleKanbanMouseDown}
            onMouseMove={handleKanbanMouseMove}
            onMouseUp={handleKanbanMouseUp}
            onMouseLeave={handleKanbanMouseUp}
          >
            {STATUS_COLUMNS.map((column) => {
              const columnRequests = filtered.filter((request) => request.status === column.key);
              return (
                <Card
                  key={column.key}
                  className={cn(
                    "flex-none w-[20rem] rounded-xl border-t-4 bg-card/80 shadow-sm",
                    column.accent,
                  )}
                  onDragOver={handleKanbanDragOver}
                  onDrop={() => handleDropToStatus(column.key)}
                >
                  <div className="p-3 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">STATUS</div>
                        <h2 className="font-bold text-sm text-foreground">{column.title}</h2>
                      </div>
                      <div className="h-8 min-w-8 rounded-full bg-muted px-2 text-sm font-semibold grid place-items-center">
                        {columnRequests.length}
                      </div>
                    </div>

                    <div className="space-y-3 min-h-[18rem]">
                      {columnRequests.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-center text-sm text-muted-foreground">
                          ลากการ์ดมาวางที่คอลัมน์นี้
                        </div>
                      ) : (
                        columnRequests.map((request) => (
                          <JobCard
                            key={request.request_id}
                            request={request}
                            onOpen={(id) => navigate(`/assessment/${id}`)}
                            onAccept={handleAccept}
                            onChangeStatus={handleChangeStatus}
                            onOpenStockRequisition={(id) => setStockReqId(id)}
                            onOpenDualSignature={(id) => setDualSigReqId(id)}
                            onOpenRecheck={(id) => setRecheckReqId(id)}
                            onOpenPrint={(req) => {
                              setPrintRequest(req);
                              setIsPrintOpen(true);
                            }}
                            showAccept={column.key === "open"}
                            showQuickActions={column.key !== "open" && column.key !== "complete"}
                            draggable={canManageRequest(currentUser, request)}
                            onDragStart={() => handleDragStart(request.request_id)}
                            onDragEnd={handleDragEnd}
                          />
                        ))
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((request) => (
              <JobCard
                key={request.request_id}
                request={request}
                onOpen={(id) => navigate(`/assessment/${id}`)}
                onAccept={handleAccept}
                onChangeStatus={handleChangeStatus}
                onOpenStockRequisition={(id) => setStockReqId(id)}
                onOpenDualSignature={(id) => setDualSigReqId(id)}
                onOpenRecheck={(id) => setRecheckReqId(id)}
                onOpenPrint={(req) => {
                  setPrintRequest(req);
                  setIsPrintOpen(true);
                }}
                draggable
                onDragStart={() => handleDragStart(request.request_id)}
                onDragEnd={handleDragEnd}
              />
            ))}
          </div>
        )}

        {/* Dialog Renderings */}
        {stockRequest && (
          <StockRequisitionDialog
            request={stockRequest}
            open={!!stockReqId}
            onOpenChange={(open) => !open && setStockReqId(null)}
          />
        )}

        {dualSigRequest && (
          <DualSignatureDialog
            request={dualSigRequest}
            open={!!dualSigReqId}
            onOpenChange={(open) => !open && setDualSigReqId(null)}
          />
        )}

        {recheckRequest && (
          <RecheckTrackingDialog
            request={recheckRequest}
            open={!!recheckReqId}
            onOpenChange={(open) => !open && setRecheckReqId(null)}
          />
        )}

        <WorkOrderPrintDialog
          request={printRequest}
          open={isPrintOpen}
          onOpenChange={setIsPrintOpen}
        />

        <ExportDataDialog
          requests={filtered}
          open={isExportOpen}
          onOpenChange={setIsExportOpen}
        />
      </div>
    </AppLayout>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div
      className={cn(
        "min-w-[8.5rem] rounded-lg border px-3 py-2 text-xs flex items-center justify-between gap-3 backdrop-blur-sm",
        accent,
      )}
    >
      <span className="font-medium truncate">{label}</span>
      <span className="text-base font-semibold tabular-nums">{value}</span>
    </div>
  );
}
