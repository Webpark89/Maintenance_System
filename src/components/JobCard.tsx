import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PriorityBadge } from "./PriorityBadge";
import { StatusBadge } from "./StatusBadge";
import { CATEGORY_LABEL, Status, timeAgo, WorkRequest, getTechnicianName, getTechnicianDepartment } from "@/lib/mockData";
import { Clock, MapPin, User, Zap, Wrench, Building2, Droplets, Cpu, Paperclip, Gauge, Waves, CircleHelp, ShoppingCart, FileCheck2, CalendarCheck2, ChevronDown, ChevronUp, Eye, Printer } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORY_ICON = {
  "electrical-control": Zap,
  electrical: Zap,
  mechanical: Wrench,
  "pneumatic-hydraulic": Gauge,
  "lubrication-fluid": Waves,
  other: CircleHelp,
  facility: Building2,
  plumbing: Droplets,
  it: Cpu,
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
  const Icon = CATEGORY_ICON[request.category];
  const isCritical = request.priority === "critical";
  const [isExpanded, setIsExpanded] = useState(false);
  const details = request.request_details;
  const thumbnail = request.attachments.find((attachment) =>
    attachment.mime_type ? attachment.mime_type.startsWith("image/") : attachment.url.startsWith("data:image"),
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

  return (
    <Card
      onClick={() => onOpen?.(request.request_id)}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`group relative overflow-hidden bg-gradient-card shadow-card hover:shadow-elevated transition-all duration-300 cursor-pointer animate-slide-up border-l-4 ${isCritical
        ? "border-l-priority-critical"
        : request.priority === "high"
          ? "border-l-priority-high"
          : request.priority === "medium"
            ? "border-l-priority-medium"
            : "border-l-priority-low"
        }`}
    >
      {isCritical && <div className="absolute inset-x-0 top-0 h-1 industrial-stripe" />}

      <div className="p-4 space-y-3">
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
          <PriorityBadge priority={request.priority} pulse />
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
          {request.attachments.length > 0 && (
            <div className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Paperclip className="h-3 w-3" />
              แนบไฟล์ {request.attachments.length}
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
                  <DetailLine label="ช่าง" value={getTechnicianName(request.assigned_to)} />
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

        {/* Assigned Technician */}
        {request.assigned_to && request.status !== "open" && (
          <div className="flex items-center justify-between text-xs text-foreground/70 pt-1.5 pb-1.5 px-2.5 rounded-md bg-muted/40 border border-border/40">
            <span className="font-medium">รับงานโดย:</span>
            <span className="font-semibold text-foreground truncate">{getTechnicianName(request.assigned_to)}</span>
          </div>
        )}

        {/* Action */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            {CATEGORY_LABEL[request.category]}
          </span>
          {showAccept && request.status === "open" ? (
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

        {/* Requirement Feature Badges & Quick Action Triggers */}
        {isExpanded && (
          <div className="space-y-1.5 pt-2 border-t border-dashed">
            <div className="flex flex-wrap gap-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 text-xs font-semibold px-2.5 gap-1.5 rounded-md border-warning/40 text-warning hover:bg-warning/10 transition-all shadow-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenStockRequisition?.(request.request_id);
                }}
              >
                <ShoppingCart className="h-3.5 w-3.5 shrink-0" />
                <span>เบิกอะไหล่ {request.stock_requisition?.parts_ready ? "✅ (พร้อม)" : request.stock_requisition?.requisitions?.length ? `(${request.stock_requisition.requisitions.length})` : ""}</span>
              </Button>

              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 text-xs font-semibold px-2.5 gap-1.5 rounded-md border-primary/40 text-primary hover:bg-primary/10 transition-all shadow-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenDualSignature?.(request.request_id);
                }}
              >
                <FileCheck2 className="h-3.5 w-3.5 shrink-0" />
                <span>อนุมัติ 2 คน {request.dual_approval?.status === "approved" ? "✅ (เรียบร้อย)" : request.dual_approval?.status === "partial" ? "(1/2)" : "(0/2)"}</span>
              </Button>

              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 text-xs font-semibold px-2.5 gap-1.5 rounded-md border-success/40 text-success hover:bg-success/10 transition-all shadow-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenRecheck?.(request.request_id);
                }}
              >
                <CalendarCheck2 className="h-3.5 w-3.5 shrink-0" />
                <span>ตรวจซ้ำ 2 อาทิตย์ {request.recheck_data?.round1?.status === "completed" ? "✅" : ""}</span>
              </Button>

              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 text-xs font-semibold px-2.5 gap-1.5 rounded-md border-accent/40 text-accent hover:bg-accent/10 transition-all shadow-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenPrint?.(request);
                }}
              >
                <Printer className="h-3.5 w-3.5 shrink-0" />
                <span>พิมพ์ A4</span>
              </Button>
            </div>
          </div>
        )}

        {showQuickActions && request.status !== "open" && request.status !== "complete" && isExpanded && (
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
