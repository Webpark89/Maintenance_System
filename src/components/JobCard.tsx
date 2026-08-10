import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PriorityBadge } from "./PriorityBadge";
import { StatusBadge } from "./StatusBadge";
import { CATEGORY_LABEL, Status, timeAgo, WorkRequest, getTechnicianName, getTechnicianDepartment } from "@/lib/mockData";
import { Clock, MapPin, User, Zap, Wrench, Building2, Droplets, Cpu, Paperclip, Gauge, Waves, CircleHelp, ShoppingCart, FileCheck2, CalendarCheck2, ChevronDown, ChevronUp, Eye, Printer, Lock, AlertTriangle, UserCheck, Trash2, CheckCircle2, XCircle, Ban } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth";
import { requestStore, useTechnicians } from "@/lib/requestStore";
import { toast } from "@/components/ui/sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

const CATEGORY_ICON: Record<string, React.ElementType> = {
  "electrical-control": Zap,
  electrical: Zap,
  mechanical: Wrench,
  "pneumatic-hydraulic": Gauge,
  "lubrication-fluid": Waves,
  other: CircleHelp,
  facility: Building2,
  plumbing: Droplets,
  it: Cpu,
  "utility-it": Cpu,
};

interface Props {
  request: WorkRequest;
  onAccept?: (id: string) => void;
  onOpen?: (id: string) => void;
  onChangeStatus?: (id: string, status: Status, actionLabel: string) => void;
  onOpenStockRequisition?: (id: string) => void;
  onOpenDualSignature?: (id: string) => void;
  onOpenRecheck?: (id: string) => void;
  onOpenPrint?: (request: WorkRequest) => void;
  showAccept?: boolean;
  showQuickActions?: boolean;
  draggable?: boolean;
  onDragStart?: React.DragEventHandler<HTMLDivElement>;
  onDragEnd?: React.DragEventHandler<HTMLDivElement>;
}

export function JobCard({
  request,
  onAccept,
  onOpen,
  onChangeStatus,
  onOpenStockRequisition,
  onOpenDualSignature,
  onOpenRecheck,
  onOpenPrint,
  showAccept = true,
  showQuickActions = true,
  draggable = false,
  onDragStart,
  onDragEnd,
}: Props) {
  const user = getCurrentUser();
  const techniciansList = useTechnicians();
  const isSupervisor = user?.role === "supervisor";
  const isCompleted = request.status === "complete";

  const Icon = CATEGORY_ICON[request.category] || CircleHelp;
  const isCritical = request.priority === "critical";
  const [isExpanded, setIsExpanded] = useState(false);

  // Cancellation Modal State
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);

  const details = request.request_details;
  const attachments = request.attachments || [];
  const thumbnail = attachments.find((attachment) =>
    attachment.mime_type ? attachment.mime_type.startsWith("image/") : attachment.url?.startsWith("data:image"),
  )?.url;

  const symptomLabel =
    details?.issue_symptom === "not-working"
      ? "ไม่ทำงาน"
      : details?.issue_symptom === "noise"
        ? "เสียงดัง"
        : details?.issue_symptom === "vibration"
          ? "สั่น"
          : details?.issue_symptom === "error"
            ? "แจ้ง Error"
            : details?.issue_symptom === "other"
              ? "อื่น ๆ"
              : "-";

  const frequencyLabel =
    details?.issue_frequency === "first-time"
      ? "ครั้งแรก"
      : details?.issue_frequency === "repeated"
        ? "เกิดซ้ำ"
        : details?.issue_frequency === "always"
          ? "เกิดตลอด"
          : "-";

  const operabilityLabel =
    details?.machine_operability === "running"
      ? "ยังใช้งานได้"
      : details?.machine_operability === "degraded"
        ? "เริ่มเสื่อมสภาพ"
        : details?.machine_operability === "stopped"
          ? "หยุดทำงาน"
          : "-";

  const machineCode = details?.asset_id || request.asset_name || "-";
  const machineNumber = details?.machine_number || "-";
  const machineZone = details?.machine_zone || request.asset_location || "-";
  const reporterName = details?.reporter_name || request.reported_by || "-";
  const reporterDepartment = details?.reporter_department || request.reported_by_department || "-";
  const issueText = details?.issue_message || request.issue_summary || "-";

  const handleSendCancellationRequest = () => {
    if (!cancelReason.trim()) {
      toast.error("กรุณาระบุเหตุผลการขอยกเลิกงาน");
      return;
    }
    requestStore.requestCancellation(request.request_id, cancelReason, user?.name || "ช่างซ่อม", user?.emp_id);
    toast.success("ส่งคำขอยกเลิกงานซ่อมไปยัง Supervisor แล้ว");
    setIsCancelModalOpen(false);
    setCancelReason("");
  };

  const handleApproveCancel = () => {
    requestStore.approveCancellation(request.request_id, user?.name || "Supervisor", true);
    toast.success(`อนุมัติยกเลิกงาน ${request.request_id} เรียบร้อยแล้ว`);
  };

  const handleRejectCancel = () => {
    requestStore.approveCancellation(request.request_id, user?.name || "Supervisor", false, rejectReason || "ไม่ผ่านการอนุมัติ");
    toast.info(`ปฏิเสธคำขอยกเลิกงาน ${request.request_id}`);
    setIsRejectDialogOpen(false);
    setRejectReason("");
  };

  const handleDirectDelete = () => {
    if (confirm(`คุณต้องการลบใบแจ้งซ่อม ${request.request_id} ออกจากระบบใช่หรือไม่?`)) {
      requestStore.deleteRequestBySupervisor(request.request_id);
      toast.success(`ลบใบแจ้งซ่อม ${request.request_id} สำเร็จ`);
    }
  };

  const handleAssignTechnician = (techId: string) => {
    requestStore.assignTechnician(request.request_id, techId, user?.name || "Supervisor");
    const techName = techniciansList.find((t) => t.emp_id === techId)?.name || techId;
    toast.success(`มอบหมายงาน ${request.request_id} ให้แก่ ${techName}`);
  };

  const handleApproveHighCostRequisition = () => {
    requestStore.approveRequisition(request.request_id, user?.name || "Supervisor", true);
    toast.success(`อนุมัติการเบิกอะไหล่มูลค่าสูงสำหรับงาน ${request.request_id} แล้ว`);
  };

  return (
    <>
      <Card
        onClick={() => onOpen?.(request.request_id)}
        draggable={draggable && !isCompleted}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        className={`group relative overflow-hidden bg-gradient-card shadow-card hover:shadow-elevated transition-all duration-300 cursor-pointer animate-slide-up border-l-4 ${
          isCritical
            ? "border-l-priority-critical"
            : request.priority === "high"
              ? "border-l-priority-high"
              : request.priority === "medium"
                ? "border-l-priority-medium"
                : "border-l-priority-low"
        } ${isCompleted ? "opacity-90 bg-muted/30" : ""}`}
      >
        {isCritical && <div className="absolute inset-x-0 top-0 h-1 industrial-stripe" />}

        <div className="p-4 space-y-3">
          {/* Lock Banner if Completed */}
          {isCompleted && (
            <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-slate-900/90 dark:bg-slate-950 text-slate-100 border border-slate-700/60 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-200 min-w-0">
                <Lock className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">งานเสร็จสิ้นสมบูรณ์ (ล็อกการแก้ไข)</span>
              </div>
              <span className="text-[10px] font-extrabold tracking-wider uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 whitespace-nowrap shrink-0">
                READ ONLY
              </span>
            </div>
          )}

          {/* Pending Approvals Banners */}
          {request.cancellation_request?.status === "pending" && (
            <div className="flex flex-col gap-2 p-2.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                <span>⚠️ คำขอยกเลิกงานรอ Supervisor อนุมัติ</span>
              </div>
              <p className="text-[11px] text-amber-800 dark:text-amber-300">
                เหตุผล: "{request.cancellation_request.reason}" (โดย {request.cancellation_request.requested_by})
              </p>
              {isSupervisor && (
                <div className="flex items-center gap-2 pt-1">
                  <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1" onClick={(e) => { e.stopPropagation(); handleApproveCancel(); }}>
                    <CheckCircle2 className="h-3.5 w-3.5" /> อนุมัติการยกเลิก
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs border-amber-400 text-amber-900 dark:text-amber-100 hover:bg-amber-100 dark:hover:bg-amber-900/50 gap-1" onClick={(e) => { e.stopPropagation(); setIsRejectDialogOpen(true); }}>
                    <XCircle className="h-3.5 w-3.5" /> ปฏิเสธ
                  </Button>
                </div>
              )}
            </div>
          )}

          {request.requisition_approval?.status === "pending" && (
            <div className="flex flex-col gap-1.5 p-2.5 rounded-md bg-blue-500/15 border border-blue-500/30 text-blue-900 dark:text-blue-200 text-xs">
              <div className="flex items-center justify-between gap-1 font-bold">
                <span className="flex items-center gap-1.5">
                  <ShoppingCart className="h-4 w-4 text-blue-500 shrink-0" />
                  💰 รออนุมัติเบิกอะไหล่มูลค่าสูง ({request.stock_requisition?.total_price?.toLocaleString()} บาท)
                </span>
              </div>
              {isSupervisor && (
                <Button size="sm" className="h-7 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white gap-1 self-start mt-1" onClick={(e) => { e.stopPropagation(); handleApproveHighCostRequisition(); }}>
                  <CheckCircle2 className="h-3.5 w-3.5" /> อนุมัติเบิกอะไหล่
                </Button>
              )}
            </div>
          )}

          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                <Icon className="h-3.5 w-3.5" />
                <span className="truncate">{request.request_id}</span>
              </div>
              <h3 className="font-semibold text-foreground mt-1 truncate">
                {request.asset_name}
              </h3>
            </div>
            <PriorityBadge priority={request.priority} pulse={!isCompleted} />
          </div>

          {/* Body */}
          <div className="space-y-1.5 text-sm">
            {thumbnail && isExpanded && (
              <img
                src={thumbnail}
                alt={`แนบรูป ${request.request_id}`}
                className="h-28 w-full rounded-md object-cover border"
              />
            )}
            <div className="flex items-start gap-1.5 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span className="line-clamp-1">{request.asset_location}</span>
            </div>
            <p className={`text-foreground/90 leading-snug ${isExpanded ? "line-clamp-none" : "line-clamp-2"}`}>
              {request.issue_summary}
            </p>
            {attachments.length > 0 && (
              <div className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <Paperclip className="h-3 w-3" />
                แนบไฟล์ {attachments.length}
              </div>
            )}

            {isExpanded && (
              <div className="space-y-2 pt-1">
                <DetailMiniGroup title="ข้อมูลเครื่อง">
                  <DetailLine label="รหัส/เครื่อง" value={`${machineCode} · ${machineNumber}`} />
                  <DetailLine label="โซน" value={machineZone} />
                </DetailMiniGroup>

                <DetailMiniGroup title="ข้อมูลผู้แจ้ง">
                  <DetailLine label="ผู้แจ้ง" value={reporterName} />
                  <DetailLine label="หน่วยงาน" value={reporterDepartment} />
                </DetailMiniGroup>

                {request.assigned_to && request.status !== "open" && (
                  <DetailMiniGroup title="ข้อมูลช่างผู้รับงาน">
                    <DetailLine label="ช่าง" value={getTechnicianName(request.assigned_to, request.assigned_technician_name)} />
                    <DetailLine label="หน่วยงาน" value={getTechnicianDepartment(request.assigned_to)} />
                  </DetailMiniGroup>
                )}

                <DetailMiniGroup title="รายละเอียดอาการ">
                  <DetailLine label="ข้อความ" value={issueText} />
                  <DetailLine label="อาการ" value={symptomLabel} />
                  <DetailLine label="ความถี่" value={frequencyLabel} />
                  <DetailLine label="สภาพ" value={operabilityLabel} />
                </DetailMiniGroup>
              </div>
            )}
          </div>

          <div className="pt-2 pb-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className={cn(
                "w-full h-8 text-xs font-bold gap-1.5 transition-all shadow-xs border rounded-md justify-center items-center flex",
                isExpanded
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-slate-300 dark:border-slate-700 hover:bg-slate-700 hover:text-white hover:border-slate-700"
                  : "bg-indigo-50 dark:bg-indigo-950 text-indigo-900 dark:text-indigo-100 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-600 hover:text-white hover:border-indigo-600"
              )}
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded((prev) => !prev);
              }}
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5 shrink-0" />
                  <span>ซ่อนรายละเอียด</span>
                </>
              ) : (
                <>
                  <Eye className="h-3.5 w-3.5 shrink-0" />
                  <span>ดูรายละเอียดเพิ่มเติม</span>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                </>
              )}
            </Button>
          </div>

          {/* Meta */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/60">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{timeAgo(request.reported_time)}</span>
            </div>
            <div className="flex items-center gap-1 truncate">
              <User className="h-3 w-3" />
              <span className="truncate">{request.reported_by}</span>
            </div>
          </div>

          {/* Assigned Technician & Supervisor Assign Dropdown */}
          <div className="flex items-center justify-between text-xs text-foreground/70 pt-1.5 pb-1.5 px-2.5 rounded-md bg-muted/40 border border-border/40 gap-2 min-w-0">
            <span className="font-medium shrink-0 flex items-center gap-1.5 text-foreground/80">
              <UserCheck className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>ช่างรับผิดชอบ:</span>
            </span>
            {isSupervisor && !isCompleted ? (
              <div
                className="flex-1 min-w-0 max-w-[60%] flex justify-end"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <Select value={request.assigned_to || ""} onValueChange={handleAssignTechnician}>
                  <SelectTrigger className="h-7 text-xs border-primary/30 font-semibold bg-background w-full min-w-0 px-2.5 justify-between shadow-2xs hover:border-primary/60 transition-colors">
                    <SelectValue placeholder="เลือกช่างผู้รับงาน" />
                  </SelectTrigger>
                  <SelectContent>
                    {techniciansList.map((tech) => (
                      <SelectItem key={tech.emp_id} value={tech.emp_id} className="text-xs">
                        {tech.name} ({tech.emp_id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <span className="font-semibold text-foreground truncate min-w-0 text-right">
                {request.assigned_to ? getTechnicianName(request.assigned_to, request.assigned_technician_name) : (
                  <span className="text-amber-600 dark:text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded text-[11px]">⏳ รอ Supervisor มอบหมายช่าง</span>
                )}
              </span>
            )}
          </div>

          {/* Status & Accept */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              {CATEGORY_LABEL[request.category]}
            </span>
            {showAccept && isSupervisor && request.status === "open" && !isCompleted ? (
              <Button
                size="sm"
                variant="industrial"
                onClick={(e) => {
                  e.stopPropagation();
                  onAccept?.(request.request_id);
                }}
              >
                รับงานนี้
              </Button>
            ) : (
              <StatusBadge status={request.status} />
            )}
          </div>

          {/* Action Buttons */}
          {isExpanded && (
            <div className="space-y-1.5 pt-2 border-t border-dashed">
              <div className="grid grid-cols-2 gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 text-[11px] font-semibold px-2 gap-1.5 rounded-md border-warning/40 text-warning hover:text-warning hover:bg-warning/10 transition-all shadow-xs justify-start"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenStockRequisition?.(request.request_id);
                  }}
                >
                  <ShoppingCart className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">เบิกอะไหล่ {request.stock_requisition?.parts_ready ? "✅" : request.stock_requisition?.requisitions?.length ? `(${request.stock_requisition.requisitions.length})` : ""}</span>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 text-[11px] font-semibold px-2 gap-1.5 rounded-md border-primary/40 text-primary hover:text-primary hover:bg-primary/10 transition-all shadow-xs justify-start"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenDualSignature?.(request.request_id);
                  }}
                  title={isSupervisor ? "ลงนามอนุมัติ (สิทธิ์ Supervisor)" : "ดูการอนุมัติ 2 คน (เฉพาะ Supervisor อนุมัติได้)"}
                >
                  <FileCheck2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">
                    อนุมัติ 2 คน {request.dual_approval?.status === "approved" ? "✅" : request.dual_approval?.status === "partial" ? "(1/2)" : "(0/2)"}
                  </span>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 text-[11px] font-semibold px-2 gap-1.5 rounded-md border-success/40 text-success hover:text-success hover:bg-success/10 transition-all shadow-xs justify-start"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenRecheck?.(request.request_id);
                  }}
                >
                  <CalendarCheck2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">ตรวจซ้ำ 2 อาทิตย์ {request.recheck_data?.round1?.status === "completed" ? "✅" : ""}</span>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 text-[11px] font-semibold px-2 gap-1.5 rounded-md border-accent/40 text-accent hover:text-accent hover:bg-accent/10 transition-all shadow-xs justify-start"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenPrint?.(request);
                  }}
                >
                  <Printer className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">พิมพ์ A4</span>
                </Button>
              </div>

              {/* Cancel or Delete Action Button or Re-open for Supervisor */}
              <div className="pt-1 flex justify-end gap-1.5">
                {isSupervisor ? (
                  <>
                    {isCompleted && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px] font-bold px-2.5 gap-1 rounded-md border-amber-500/80 bg-amber-500/10 text-amber-800 dark:text-amber-300 hover:bg-amber-600 hover:text-white dark:hover:bg-amber-500 dark:hover:text-white transition-all duration-200 shadow-2xs group/unlock"
                        onClick={(e) => {
                          e.stopPropagation();
                          onChangeStatus?.(request.request_id, "doing", "ปลดล็อกเปิดงานใหม่");
                          toast.info(`ปลดล็อกเปิดงานซ่อม ${request.request_id} กลับมาเป็นสถานะกำลังดำเนินการซ่อมแล้ว`);
                        }}
                        title="ปลดล็อกเปิดงานซ่อมใหม่ (สิทธิ์ Supervisor)"
                      >
                        <Lock className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400 group-hover/unlock:text-white transition-colors" />
                        <span>ปลดล็อกเปิดงานใหม่</span>
                      </Button>
                    )}

                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 text-[11px] font-semibold px-2.5 gap-1 rounded-md border border-rose-200 text-rose-600 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all shadow-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDirectDelete();
                      }}
                      title="ลบใบแจ้งซ่อม (เฉพาะ Supervisor)"
                    >
                      <Trash2 className="h-3.5 w-3.5 shrink-0" />
                      <span>ลบงาน</span>
                    </Button>
                  </>
                ) : !isCompleted ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 text-[11px] font-semibold px-2.5 gap-1 rounded-md border border-amber-300 text-amber-700 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-all shadow-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsCancelModalOpen(true);
                    }}
                    disabled={request.cancellation_request?.status === "pending"}
                    title="ขอยกเลิกงานซ่อม"
                  >
                    <Ban className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                    <span>{request.cancellation_request?.status === "pending" ? "รออนุมัติยกเลิก" : "ขอยกเลิกงาน"}</span>
                  </Button>
                ) : null}
              </div>
            </div>
          )}

          {/* Quick Status Buttons (Hidden if completed unless Supervisor) */}
          {showQuickActions && request.status !== "open" && (!isCompleted || isSupervisor) && isExpanded && (
            <div className="grid grid-cols-3 gap-1 pt-1 font-semibold text-[11px]">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2 border bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700/50 text-amber-900 dark:text-amber-200 hover:bg-amber-600 hover:text-white dark:hover:bg-amber-600 dark:hover:text-white transition-all shadow-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onChangeStatus?.(request.request_id, "assess", "ประเมินงาน");
                }}
              >
                ประเมินงาน
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2 border bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-700/50 text-rose-900 dark:text-rose-200 hover:bg-rose-600 hover:text-white dark:hover:bg-rose-600 dark:hover:text-white transition-all shadow-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onChangeStatus?.(request.request_id, "waiting", "รออะไหล่");
                }}
              >
                รออะไหล่
              </Button>
              <Button
                size="sm"
                variant="industrial"
                className="h-8 px-2 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenDualSignature?.(request.request_id);
                }}
              >
                อนุมัติปิดงาน
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Technician Cancel Request Modal */}
      <Dialog open={isCancelModalOpen} onOpenChange={setIsCancelModalOpen}>
        <DialogContent className="sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-amber-600">
              <Ban className="h-5 w-5" />
              ยื่นคำขอยกเลิกใบแจ้งซ่อม ({request.request_id})
            </DialogTitle>
            <DialogDescription className="text-xs">
              ช่างซ่อมไม่สามารถลบใบแจ้งซ่อมได้โดยตรง ระบบจะส่งเรื่องให้ Supervisor อนุมัติ
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">เหตุผลในการขอยกเลิกงาน *</label>
              <Textarea
                placeholder="ระบุเหตุผล เช่น ข้อมูลซ้ำซ้อน, ผู้แจ้งยกเลิก, ตรวจสอบแล้วไม่ใช่เครื่องเสีย..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button size="sm" variant="outline" onClick={() => setIsCancelModalOpen(false)}>
              ยกเลิก
            </Button>
            <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white" onClick={handleSendCancellationRequest}>
              ส่งคำขอให้ Supervisor อนุมัติ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Supervisor Reject Cancellation Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-600">
              ปฏิเสธคำขอยกเลิกงาน ({request.request_id})
            </DialogTitle>
            <DialogDescription className="text-xs">
              ระบุเหตุผลเพื่อแจ้งให้ช่างซ่อมทราบถึงสาเหตุที่ไม่อนุมัติการยกเลิกใบแจ้งซ่อมนี้
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold">เหตุผลการปฏิเสธคำขอ</label>
              <Textarea
                placeholder="ระบุเหตุผลเพื่อแจ้งให้ช่างซ่อมทราบ..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={2}
                className="text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
              ยกเลิก
            </Button>
            <Button size="sm" variant="destructive" onClick={handleRejectCancel}>
              ยืนยันการปฏิเสธ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function DetailMiniGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border/70 bg-muted/20 px-2.5 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-primary mb-1">{title}</div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-1.5 text-[11px] leading-snug">
      <span className="text-muted-foreground shrink-0">{label}:</span>
      <span className="text-foreground/90 break-words line-clamp-2">{value}</span>
    </div>
  );
}

