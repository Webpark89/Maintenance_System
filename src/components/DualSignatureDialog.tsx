import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DualApprovalData, SignatureEntry, WorkRequest } from "@/lib/mockData";
import { requestStore } from "@/lib/requestStore";
import { calculateRepairDuration } from "@/lib/holidayUtils";
import { FileCheck2, PenTool, CheckCircle, ShieldCheck, UserCheck, RefreshCw, Sparkles, CalendarDays, Clock3 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  request: WorkRequest;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DualSignatureDialog({ request, open, onOpenChange }: Props) {
  const approval: DualApprovalData = request.dual_approval ?? { status: "pending" };

  const [activeSlot, setActiveSlot] = useState<"approver1" | "approver2">("approver1");
  const [name, setName] = useState(activeSlot === "approver1" ? "สมศักดิ์ (หัวหน้าซ่อมบำรุง)" : "นภดล (หัวหน้าฝ่ายผลิต)");
  const [department, setDepartment] = useState(activeSlot === "approver1" ? "แผนกซ่อมบำรุง" : "แผนกการผลิต");
  const [role, setRole] = useState(activeSlot === "approver1" ? "หัวหน้าแผนกซ่อมบำรุง" : "หัวหน้าแผนกหน้างาน");
  const [note, setNote] = useState("");

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

  const handleSignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("กรุณาระบุชื่อผู้อนุมัติ");
      return;
    }

    const canvas = canvasRef.current;
    const sigUrl = canvas && hasDrawn ? canvas.toDataURL() : undefined;

    const signatureEntry: SignatureEntry = {
      signer_name: name,
      signer_role: role,
      signer_department: department,
      signed_at: new Date().toISOString(),
      signature_data_url: sigUrl,
      note,
    };

    requestStore.addDualSignature(request.request_id, activeSlot, signatureEntry);

    const isSlot1 = activeSlot === "approver1";
    const otherApproved = isSlot1 ? !!approval.approver2 : !!approval.approver1;

    if (otherApproved) {
      toast.success("อนุมัติครบ 2 ลายเซ็นสมบูรณ์! สถานะงานอัปเดตเป็น 'เสร็จสิ้น'");
    } else {
      toast.info(`ลงลายเซ็นอนุมัติท่านที่ ${isSlot1 ? 1 : 2} เรียบร้อยแล้ว (รออีก 1 ท่าน)`);
    }

    clearCanvas();
  };

  const approvedCount = (approval.approver1 ? 1 : 0) + (approval.approver2 ? 1 : 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <FileCheck2 className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">อนุมัติตรวจรับงานซ่อม (Dual Signatures QC)</DialogTitle>
                <DialogDescription className="text-xs">
                  ต้องได้รับการลงนามอนุมัติรวม 2 ท่าน ตามระเบียบความปลอดภัยก่อนปิดงาน
                </DialogDescription>
              </div>
            </div>
            <Badge
              variant={approvedCount === 2 ? "default" : "outline"}
              className={
                approvedCount === 2
                  ? "bg-emerald-600 text-white font-bold"
                  : approvedCount === 1
                  ? "bg-amber-500 text-white"
                  : "border-amber-500 text-amber-600"
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
            <div className="p-3 bg-gradient-to-r from-sky-50 to-indigo-50 dark:from-sky-950/40 dark:to-indigo-950/40 border border-sky-200 dark:border-sky-800 rounded-lg space-y-1.5 text-xs">
              <div className="flex items-center justify-between font-bold text-sky-900 dark:text-sky-200">
                <span className="flex items-center gap-1.5">
                  <Clock3 className="h-4 w-4 text-sky-600" />
                  สรุปเวลาการซ่อมบำรุงจริง (Working Days Comparison)
                </span>
                <Badge variant="outline" className="bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-300 font-medium">
                  {duration.workingDays} วันทำงานจริง ({duration.totalCalendarDays} วันตามปฏิทิน)
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-sky-200/60 text-[11px]">
                <div>
                  <span className="text-muted-foreground block">ช่วงเวลาดำเนินการ:</span>
                  <span className="font-medium">{startDate} ถึง {endDate}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">วันหยุดคาบเกี่ยว:</span>
                  <span className="font-medium text-amber-700 dark:text-amber-300">
                    {duration.weekendDaysCount + duration.holidaysCount} วัน (หักวันหยุดแล้ว)
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">การประเมินระยะเวลา:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {duration.workingDays <= 3 ? "ตรงตามกรอบประเมิน" : "งานซ่อมขนาดยาว (มีวันหยุด)"}
                  </span>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Status Tracker Banner */}
        <div className="grid grid-cols-2 gap-3 p-3 bg-muted/40 rounded-lg border">
          {/* Approver 1 Status */}
          <Card
            onClick={() => {
              setActiveSlot("approver1");
              setName("สมศักดิ์ (หัวหน้าซ่อมบำรุง)");
              setDepartment("แผนกซ่อมบำรุง");
              setRole("หัวหน้าแผนกซ่อมบำรุง");
            }}
            className={`p-3 cursor-pointer transition-all ${
              activeSlot === "approver1" ? "ring-2 ring-primary bg-card" : "bg-card/60 opacity-90"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-primary flex items-center gap-1">
                <UserCheck className="h-3.5 w-3.5" />
                ท่านที่ 1: หัวหน้าแผนกซ่อมบำรุง
              </span>
              {approval.approver1 ? (
                <Badge className="bg-emerald-600 text-[10px]">อนุมัติแล้ว</Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] text-amber-600">รอดำเนินการ</Badge>
              )}
            </div>
            {approval.approver1 ? (
              <div className="mt-2 text-xs space-y-0.5 border-t pt-1.5">
                <div className="font-semibold text-foreground">{approval.approver1.signer_name}</div>
                <div className="text-[10px] text-muted-foreground">{approval.approver1.signer_role} ({approval.approver1.signer_department})</div>
                {approval.approver1.signature_data_url && (
                  <img src={approval.approver1.signature_data_url} alt="ลายเซ็น 1" className="h-9 mt-1 border rounded bg-white" />
                )}
              </div>
            ) : (
              <div className="mt-2 text-[11px] text-muted-foreground">คลิกเพื่อลงลายเซ็นอนุมัติท่านที่ 1</div>
            )}
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
              activeSlot === "approver2" ? "ring-2 ring-primary bg-card" : "bg-card/60 opacity-90"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-primary flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" />
                ท่านที่ 2: หัวหน้าแผนกหน้างาน/ผู้จัดการ
              </span>
              {approval.approver2 ? (
                <Badge className="bg-emerald-600 text-[10px]">อนุมัติแล้ว</Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] text-amber-600">รอดำเนินการ</Badge>
              )}
            </div>
            {approval.approver2 ? (
              <div className="mt-2 text-xs space-y-0.5 border-t pt-1.5">
                <div className="font-semibold text-foreground">{approval.approver2.signer_name}</div>
                <div className="text-[10px] text-muted-foreground">{approval.approver2.signer_role} ({approval.approver2.signer_department})</div>
                {approval.approver2.signature_data_url && (
                  <img src={approval.approver2.signature_data_url} alt="ลายเซ็น 2" className="h-9 mt-1 border rounded bg-white" />
                )}
              </div>
            ) : (
              <div className="mt-2 text-[11px] text-muted-foreground">คลิกเพื่อลงลายเซ็นอนุมัติท่านที่ 2</div>
            )}
          </Card>
        </div>

        {/* Signature Input Form */}
        <form onSubmit={handleSignSubmit} className="space-y-4 pt-2 border-t">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-primary flex items-center gap-1.5">
              <PenTool className="h-4 w-4" />
              ฟอร์มลงนามอนุมัติ: <span className="underline">{activeSlot === "approver1" ? "ท่านที่ 1 (หัวหน้าซ่อมบำรุง)" : "ท่านที่ 2 (หัวหน้าหน้างาน)"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Button type="button" size="sm" variant="ghost" className="h-7 text-[11px] gap-1" onClick={handleSimulateSignature}>
                <Sparkles className="h-3 w-3 text-amber-500" />
                จำลองลายเซ็น
              </Button>
              <Button type="button" size="sm" variant="ghost" className="h-7 text-[11px] gap-1" onClick={clearCanvas}>
                <RefreshCw className="h-3 w-3" />
                ล้าง Canvas
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">ชื่อ-นามสกุล ผู้อนุมัติ</Label>
              <Input className="h-9 text-xs" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">ตำแหน่ง</Label>
              <Input className="h-9 text-xs" value={role} onChange={(e) => setRole(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">หน่วยงาน / แผนก</Label>
              <Input className="h-9 text-xs" value={department} onChange={(e) => setDepartment(e.target.value)} required />
            </div>
          </div>

          {/* Signature Canvas Box */}
          <div className="space-y-1">
            <Label className="text-xs flex items-center justify-between">
              <span>พื้นที่จรดปากกาลงลายเซ็น (Digital Signature Canvas)</span>
              <span className="text-[10px] text-muted-foreground">ใช้เมาส์หรือนิ้วสัมผัสเซ็นชื่อได้</span>
            </Label>
            <div className="border-2 border-dashed rounded-lg bg-white p-1 text-center relative overflow-hidden">
              <canvas
                ref={canvasRef}
                width={500}
                height={120}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-28 cursor-crosshair touch-none"
              />
              {!hasDrawn && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-xs text-muted-foreground/50">
                  เซ็นชื่อลงในกรอบนี้...
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">ความเห็นเพิ่มเติม (ถ้ามี)</Label>
            <Input className="h-9 text-xs" placeholder="เช่น ซ่อมบำรุงเรียบร้อย ทดสอบรันเครื่องปกติ" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button type="button" variant="outline" size="sm" className="h-9 text-xs" onClick={() => onOpenChange(false)}>
              ปิดหน้าต่าง
            </Button>
            <Button type="submit" size="sm" variant="industrial" className="h-9 text-xs gap-1.5">
              <CheckCircle className="h-4 w-4" />
              บันทึกการอนุมัติ{activeSlot === "approver1" ? "ท่านที่ 1" : "ท่านที่ 2"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
