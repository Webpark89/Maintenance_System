import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WorkRequest } from "@/lib/mockData";
import { calculateRepairDuration } from "@/lib/holidayUtils";
import { getCurrentUser } from "@/lib/auth";
import { api } from "@/lib/api";
import { FileCheck2, PenTool, CheckCircle, ShieldCheck, UserCheck, RefreshCw, Sparkles, Clock3, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/sonner";

interface Props {
  request: WorkRequest;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DualSignatureDialog({ request, open, onOpenChange }: Props) {
  const currentUser = getCurrentUser();
  const isSupervisor = currentUser?.role === "supervisor";

  const approval = request.dual_approval ?? { status: "pending" };

  const [activeSlot, setActiveSlot] = useState<"approver1" | "approver2">("approver1");
  const [name, setName] = useState(activeSlot === "approver1" ? "อาร์ม (หัวหน้าซ่อมบำรุง)" : "อาร์ม (หัวหน้างานซ่อมบำรุง 2)");
  const [department, setDepartment] = useState("แผนกซ่อมบำรุง");
  const [role, setRole] = useState("หัวหน้าแผนกซ่อมบำรุง / Supervisor");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  // Canvas drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleSimulateSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = "22px cursive";
    ctx.fillStyle = "#1e3a8a";
    ctx.fillText(name || "Approved", 50, 45);
    ctx.beginPath();
    ctx.arc(160, 45, 12, 0, Math.PI * 2);
    ctx.strokeStyle = "#1e3a8a";
    ctx.stroke();
    setHasDrawn(true);
  };

  const handleSignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupervisor) {
      toast.error("ปฏิเสธการทำรายการ: เฉพาะหัวหน้าช่าง (Supervisor) เท่านั้นที่สามารถลงนามอนุมัติงานซ่อมได้ (ต้องใช้หัวหน้าช่าง 2 คนในการอนุมัติ)");
      return;
    }
    if (!name.trim()) {
      toast.error("กรุณาระบุชื่อผู้อนุมัติ");
      return;
    }

    const canvas = canvasRef.current;
    const sigUrl = canvas && hasDrawn ? canvas.toDataURL() : undefined;

    if (!sigUrl) {
      toast.error("กรุณาจรดปากกาลงลายเซ็นก่อนกดบันทึก");
      return;
    }

    setSubmitting(true);
    try {
      // Call Backend API POST /api/v1/signatures/:id
      const res = await api.post(`/signatures/${request.request_id}`, {
        activeSlot,
        name,
        role,
        department,
        sigUrl,
        note,
      });

      const { isFullySigned, message } = res.data;

      if (isFullySigned) {
        toast.success("อนุมัติครบ 2 ลายเซ็นสมบูรณ์! สถานะงานอัปเดตเป็น 'ปิดงาน' ลงฐานข้อมูลสำเร็จ");
      } else {
        toast.info(message || `บันทึกการลงนามอนุมัติ (${activeSlot === 'approver1' ? 'ท่านที่ 1' : 'ท่านที่ 2'}) สำเร็จ`);
      }

      clearCanvas();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "บันทึกลายเซ็นล้มเหลว");
    } finally {
      setSubmitting(false);
    }
  };

  const approvedCount = (approval.approver1 ? 1 : 0) + (approval.approver2 ? 1 : 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader className="border-b pb-3">
          {/* Mobile, Tablet & iPad Layout (< 1024px) */}
          <div className="flex lg:hidden flex-col items-center text-center space-y-1.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary w-fit mx-auto">
              <FileCheck2 className="h-5 w-5" />
            </div>
            <DialogTitle className="text-base sm:text-lg font-bold text-foreground [text-wrap:balance]">
              อนุมัติตรวจรับงานซ่อม (Dual Signatures QC)
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground max-w-xs sm:max-w-md mx-auto leading-relaxed [text-wrap:balance]">
              ต้องได้รับการลงนามอนุมัติรวม 2 ท่าน ตามระเบียบความปลอดภัยก่อนปิดงาน
            </DialogDescription>
            <Badge
              variant={approvedCount === 2 ? "default" : "outline"}
              className={
                approvedCount === 2
                  ? "bg-emerald-600 text-white font-bold mt-1 text-xs px-3 py-1 mx-auto w-fit"
                  : approvedCount === 1
                  ? "bg-amber-500 text-white font-semibold mt-1 text-xs px-3 py-1 mx-auto w-fit"
                  : "border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950/30 mt-1 text-xs px-3 py-1 mx-auto w-fit"
              }
            >
              {approvedCount === 2
                ? "อนุมัติสมบูรณ์ (2/2)"
                : approvedCount === 1
                ? "อนุมัติแล้ว 1 ท่าน (1/2)"
                : "รออนุมัติ (0/2)"}
            </Badge>
          </div>

          {/* Desktop & Laptop Layout (>= 1024px) */}
          <div className="hidden lg:flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                <FileCheck2 className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">
                  อนุมัติตรวจรับงานซ่อม (Dual Signatures QC)
                </DialogTitle>
                <DialogDescription className="text-xs">
                  ต้องได้รับการลงนามอนุมัติรวม 2 ท่าน ตามระเบียบความปลอดภัยก่อนปิดงาน
                </DialogDescription>
              </div>
            </div>
            <Badge
              variant={approvedCount === 2 ? "default" : "outline"}
              className={
                approvedCount === 2
                  ? "bg-emerald-600 text-white font-bold shrink-0 text-xs px-2.5 py-1"
                  : approvedCount === 1
                  ? "bg-amber-500 text-white font-semibold shrink-0 text-xs px-2.5 py-1"
                  : "border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950/30 shrink-0 text-xs px-2.5 py-1"
              }
            >
              {approvedCount === 2
                ? "อนุมัติสมบูรณ์ (2/2)"
                : approvedCount === 1
                ? "อนุมัติแล้ว 1 ท่าน (1/2)"
                : "รออนุมัติ (0/2)"}
            </Badge>
          </div>
        </DialogHeader>

        {/* Working Days & Repair Performance Comparison Banner */}
        {(() => {
          const report = request.assessment_report;
          const startDate = report?.repair_date_range?.start || request.reported_time.slice(0, 10);
          const endDate = report?.repair_date_range?.end || new Date().toISOString().slice(0, 10);
          const duration = calculateRepairDuration(startDate, endDate);

          return (
            <div className="p-3 bg-gradient-to-r from-sky-50 to-indigo-50 dark:from-sky-950/40 dark:to-indigo-950/40 border border-sky-200 dark:border-sky-800 rounded-lg space-y-2 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 font-bold text-sky-900 dark:text-sky-200">
                <span className="flex items-center gap-1.5">
                  <Clock3 className="h-4 w-4 text-sky-600 shrink-0" />
                  <span>สรุปเวลาการซ่อมบำรุงจริง (Working Days Comparison)</span>
                </span>
                <Badge variant="outline" className="bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-300 font-medium w-fit">
                  {duration.workingDays} วันทำงานจริง ({duration.totalCalendarDays} วันตามปฏิทิน)
                </Badge>
              </div>
            </div>
          );
        })()}

        {/* Status Tracker Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-muted/40 rounded-lg border">
          {/* Approver 1 Status */}
          <Card
            onClick={() => {
              setActiveSlot("approver1");
              setName("สมศักดิ์ (หัวหน้าซ่อมบำรุง)");
              setDepartment("แผนกซ่อมบำรุง");
              setRole("หัวหน้าแผนกซ่อมบำรุง");
            }}
            className={`p-3 cursor-pointer transition-all ${
              activeSlot === "approver1" ? "ring-2 ring-primary bg-card shadow-sm" : "bg-card/60 opacity-90 hover:opacity-100"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-primary flex items-center gap-1.5 min-w-0 truncate">
                <UserCheck className="h-4 w-4 shrink-0" />
                <span className="truncate">ท่านที่ 1: หัวหน้าแผนกซ่อมบำรุง</span>
              </span>
              {approval.approver1 ? (
                <Badge className="bg-emerald-600 text-[10px] shrink-0">อนุมัติแล้ว</Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] text-amber-600 shrink-0">รอดำเนินการ</Badge>
              )}
            </div>
          </Card>

          {/* Approver 2 Status */}
          <Card
            onClick={() => {
              setActiveSlot("approver2");
              setName("นภดล (หัวหน้าฝ่ายผลิต)");
              setDepartment("แผนกการผลิต");
              setRole("หัวหน้าแผนกหน้างาน");
            }}
            className={`p-3 cursor-pointer transition-all ${
              activeSlot === "approver2" ? "ring-2 ring-primary bg-card shadow-sm" : "bg-card/60 opacity-90 hover:opacity-100"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-primary flex items-center gap-1.5 min-w-0 truncate">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                <span className="truncate">ท่านที่ 2: หัวหน้าแผนกหน้างาน/ผู้จัดการ</span>
              </span>
              {approval.approver2 ? (
                <Badge className="bg-emerald-600 text-[10px] shrink-0">อนุมัติแล้ว</Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] text-amber-600 shrink-0">รอดำเนินการ</Badge>
              )}
            </div>
          </Card>
        </div>

        {/* Supervisor Guard Banner */}
        {!isSupervisor && (
          <div className="p-3 bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 rounded-lg flex items-start gap-2.5 text-xs font-medium">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <div className="font-bold text-amber-900 dark:text-amber-100">สงวนสิทธิ์เฉพาะหัวหน้าช่าง (Supervisor)</div>
              <div>การลงนามอนุมัติตรวจรับงานซ่อมต้องทำโดยหัวหน้าช่างจำนวน 2 ท่าน ช่างซ่อมบำรุงทั่วไปสามารถเข้าดูสถานะได้แต่ไม่สามารถลงนามอนุมัติงานได้เอง</div>
            </div>
          </div>
        )}

        {/* Signature Input Form */}
        <form onSubmit={handleSignSubmit} className="space-y-4 pt-2 border-t">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="text-xs font-bold text-primary flex items-center gap-1.5">
              <PenTool className="h-4 w-4 shrink-0" />
              <span>ฟอร์มลงนามอนุมัติ: <span className="underline">{activeSlot === "approver1" ? "ท่านที่ 1 (หัวหน้าซ่อมบำรุง)" : "ท่านที่ 2 (หัวหน้างานซ่อมบำรุง 2)"}</span></span>
            </div>
            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <Button type="button" size="sm" variant="ghost" className="h-7 text-[11px] gap-1 px-2" onClick={handleSimulateSignature} disabled={!isSupervisor || submitting}>
                <Sparkles className="h-3 w-3 text-amber-500" />
                <span>จำลองลายเซ็น</span>
              </Button>
              <Button type="button" size="sm" variant="ghost" className="h-7 text-[11px] gap-1 px-2" onClick={clearCanvas} disabled={!isSupervisor || submitting}>
                <RefreshCw className="h-3 w-3" />
                <span>ล้าง Canvas</span>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">ชื่อ-นามสกุล ผู้อนุมัติ</Label>
              <Input className="h-9 text-xs" value={name} onChange={(e) => setName(e.target.value)} required disabled={!isSupervisor || submitting} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">ตำแหน่ง</Label>
              <Input className="h-9 text-xs" value={role} onChange={(e) => setRole(e.target.value)} required disabled={!isSupervisor || submitting} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">หน่วยงาน / แผนก</Label>
              <Input className="h-9 text-xs" value={department} onChange={(e) => setDepartment(e.target.value)} required disabled={!isSupervisor || submitting} />
            </div>
          </div>

          {/* Signature Canvas Box */}
          <div className="space-y-1">
            <Label className="text-xs flex flex-wrap items-center justify-between gap-1">
              <span className="font-semibold">พื้นที่จรดปากกาลงลายเซ็น (Digital Signature Canvas)</span>
              <span className="text-[10px] text-muted-foreground">ใช้เมาส์หรือนิ้วสัมผัสเซ็นชื่อได้</span>
            </Label>
            <div className={`border-2 border-dashed rounded-lg bg-white p-1 text-center relative overflow-hidden ${!isSupervisor || submitting ? "opacity-60 pointer-events-none" : ""}`}>
              <canvas
                ref={canvasRef}
                width={500}
                height={120}
                onMouseDown={isSupervisor ? startDrawing : undefined}
                onMouseMove={isSupervisor ? draw : undefined}
                onMouseUp={isSupervisor ? stopDrawing : undefined}
                onMouseLeave={isSupervisor ? stopDrawing : undefined}
                onTouchStart={isSupervisor ? startDrawing : undefined}
                onTouchMove={isSupervisor ? draw : undefined}
                onTouchEnd={isSupervisor ? stopDrawing : undefined}
                className="w-full h-28 cursor-crosshair touch-none"
              />
              {!hasDrawn && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-xs text-muted-foreground/50">
                  {isSupervisor ? "เซ็นชื่อลงในกรอบนี้..." : "เฉพาะหัวหน้าช่าง (Supervisor) เท่านั้นที่สามารถเซ็นชื่อได้"}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">ความเห็นเพิ่มเติม (ถ้ามี)</Label>
            <Input className="h-9 text-xs" placeholder="เช่น ซ่อมบำรุงเรียบร้อย ทดสอบรันเครื่องปกติ" value={note} onChange={(e) => setNote(e.target.value)} disabled={!isSupervisor || submitting} />
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button type="button" variant="outline" size="sm" className="h-9 text-xs" onClick={() => onOpenChange(false)}>
              ปิดหน้าต่าง
            </Button>
            <Button type="submit" size="sm" variant={isSupervisor ? "industrial" : "outline"} className="h-9 text-xs gap-1.5" disabled={!isSupervisor || submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> กำลังบันทึกลง PostgreSQL...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  {isSupervisor ? `บันทึกการอนุมัติ${activeSlot === "approver1" ? "ท่านที่ 1" : "ท่านที่ 2"}` : "ต้องใช้สิทธิ์ Supervisor"}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
