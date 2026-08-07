import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RecheckData, WorkRequest } from "@/lib/mockData";
import { requestStore } from "@/lib/requestStore";
import { CalendarCheck2, Clock, CheckCircle2, AlertTriangle, UserCheck, ShieldAlert, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  request: WorkRequest;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RecheckTrackingDialog({ request, open, onOpenChange }: Props) {
  const completedDate = request.recheck_data?.completed_at
    ? new Date(request.recheck_data.completed_at)
    : new Date();

  // Default dates: 7 days and 14 days after completed
  const defaultRound1Date = new Date(completedDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const defaultRound2Date = new Date(completedDate.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const recheck: RecheckData = request.recheck_data ?? {
    completed_at: new Date().toISOString(),
    round1: {
      round: 1,
      scheduled_date: defaultRound1Date,
      status: "pending",
    },
    round2: {
      round: 2,
      scheduled_date: defaultRound2Date,
      status: "pending",
    },
  };

  const [selectedRound, setSelectedRound] = useState<1 | 2>(1);
  const [inspectorName, setInspectorName] = useState("บอส (ช่างซ่อมบำรุง)");
  const [inspectorDepartment, setInspectorDepartment] = useState("แผนกซ่อมบำรุง");
  const [resultStatus, setResultStatus] = useState<"completed" | "issue_found">("completed");
  const [resultSummary, setResultSummary] = useState("เข้าตรวจสอบรอบสัปดาห์ เครื่องจักรทำงานได้ตามปกติ ไม่มีอาการเสียงดังหรือน้ำมันรั่วซึม");
  const [requiresNewTicket, setRequiresNewTicket] = useState(false);

  const handleSubmitRecheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectorName.trim()) {
      toast.error("กรุณาระบุชื่อผู้เข้าตรวจ");
      return;
    }
    if (!resultSummary.trim()) {
      toast.error("กรุณากรอกสรุปผลการเข้าตรวจซ้ำ");
      return;
    }

    requestStore.saveRecheckResult(request.request_id, selectedRound, {
      inspector_name: inspectorName,
      inspector_department: inspectorDepartment,
      status: resultStatus,
      result_summary: resultSummary,
      requires_new_ticket: requiresNewTicket,
    });

    if (resultStatus === "issue_found") {
      toast.warning(`บันทึกผลการตรวจซ้ำรอบที่ ${selectedRound}: พบปัญหาขัดข้องเพิ่มเติม`);
    } else {
      toast.success(`บันทึกผลการตรวจซ้ำรอบที่ ${selectedRound} เรียบร้อยแล้ว (ปกติ)`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader className="border-b pb-3">
          {/* Mobile, Tablet & iPad Layout (< 1024px) */}
          <div className="flex lg:hidden flex-col items-center text-center space-y-1.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary w-fit mx-auto">
              <CalendarCheck2 className="h-5 w-5" />
            </div>
            <DialogTitle className="text-base sm:text-lg font-bold text-foreground [text-wrap:balance]">
              ระบบติดตามการเข้าตรวจซ้ำ 2 สัปดาห์ (Re-check Tracker)
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground max-w-xs sm:max-w-md mx-auto leading-relaxed [text-wrap:balance]">
              ตรวจสอบคุณภาพหลังซ่อมบำรุงตามกำหนด 2 สัปดาห์ (สัปดาห์ละ 1 ครั้ง)
            </DialogDescription>
            <Badge variant="outline" className="border-primary text-primary font-bold w-fit mx-auto mt-1 text-xs px-3 py-1">
              เสร็จสิ้นเมื่อ: {new Date(recheck.completed_at).toLocaleDateString("th-TH")}
            </Badge>
          </div>

          {/* Desktop & Laptop Layout (>= 1024px) */}
          <div className="hidden lg:flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                <CalendarCheck2 className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">
                  ระบบติดตามการเข้าตรวจซ้ำ 2 สัปดาห์ (Re-check Tracker)
                </DialogTitle>
                <DialogDescription className="text-xs">
                  ตรวจสอบคุณภาพหลังซ่อมบำรุงตามกำหนด 2 สัปดาห์ (สัปดาห์ละ 1 ครั้ง)
                </DialogDescription>
              </div>
            </div>
            <Badge variant="outline" className="border-primary text-primary font-bold shrink-0">
              เสร็จสิ้นเมื่อ: {new Date(recheck.completed_at).toLocaleDateString("th-TH")}
            </Badge>
          </div>
        </DialogHeader>

        {/* 2-Week Timeline Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-muted/40 rounded-lg border">
          {/* Round 1 Card */}
          <Card
            onClick={() => setSelectedRound(1)}
            className={`p-3.5 cursor-pointer transition-all border-l-4 ${
              recheck.round1.status === "completed"
                ? "border-l-emerald-500 bg-card"
                : recheck.round1.status === "issue_found"
                ? "border-l-rose-500 bg-card"
                : "border-l-amber-500 bg-card/60"
            } ${selectedRound === 1 ? "ring-2 ring-primary shadow-sm" : ""}`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 font-bold text-xs text-primary min-w-0 flex-1">
                <Clock className="h-4 w-4 shrink-0 text-amber-500" />
                <span className="truncate">รอบที่ 1: สัปดาห์ที่ 1 (หลังซ่อม 7 วัน)</span>
              </div>
              <Badge
                className={cn(
                  "whitespace-nowrap shrink-0 font-bold px-3 py-1 text-[11px] justify-center items-center rounded-full shadow-sm text-center leading-none inline-flex min-w-[80px]",
                  recheck.round1.status === "completed"
                    ? "bg-emerald-600 hover:bg-emerald-600 text-white"
                    : recheck.round1.status === "issue_found"
                    ? "bg-rose-600 hover:bg-rose-600 text-white"
                    : "bg-amber-500 hover:bg-amber-500 text-white"
                )}
              >
                {recheck.round1.status === "completed"
                  ? "ตรวจแล้ว (ปกติ)"
                  : recheck.round1.status === "issue_found"
                  ? "พบปัญหา"
                  : "รอเข้าตรวจ"}
              </Badge>
            </div>
            <div className="mt-2.5 text-xs space-y-1 border-t border-border/60 pt-2">
              <div className="text-muted-foreground flex items-center justify-between">
                <span>กำหนดตรวจ:</span>
                <span className="font-semibold text-foreground">{recheck.round1.scheduled_date}</span>
              </div>
              {recheck.round1.checked_at && (
                <>
                  <div className="text-foreground font-medium pt-1">
                    ผู้ตรวจ: {recheck.round1.inspector_name} ({recheck.round1.inspector_department})
                  </div>
                  <div className="text-[11px] text-muted-foreground line-clamp-2">"{recheck.round1.result_summary}"</div>
                </>
              )}
            </div>
          </Card>

          {/* Round 2 Card */}
          <Card
            onClick={() => setSelectedRound(2)}
            className={`p-3.5 cursor-pointer transition-all border-l-4 ${
              recheck.round2.status === "completed"
                ? "border-l-emerald-500 bg-card"
                : recheck.round2.status === "issue_found"
                ? "border-l-rose-500 bg-card"
                : "border-l-amber-500 bg-card/60"
            } ${selectedRound === 2 ? "ring-2 ring-primary shadow-sm" : ""}`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 font-bold text-xs text-primary min-w-0 flex-1">
                <Clock className="h-4 w-4 shrink-0 text-amber-500" />
                <span className="truncate">รอบที่ 2: สัปดาห์ที่ 2 (หลังซ่อม 14 วัน)</span>
              </div>
              <Badge
                className={cn(
                  "whitespace-nowrap shrink-0 font-bold px-3 py-1 text-[11px] justify-center items-center rounded-full shadow-sm text-center leading-none inline-flex min-w-[80px]",
                  recheck.round2.status === "completed"
                    ? "bg-emerald-600 hover:bg-emerald-600 text-white"
                    : recheck.round2.status === "issue_found"
                    ? "bg-rose-600 hover:bg-rose-600 text-white"
                    : "bg-amber-500 hover:bg-amber-500 text-white"
                )}
              >
                {recheck.round2.status === "completed"
                  ? "ตรวจแล้ว (ปกติ)"
                  : recheck.round2.status === "issue_found"
                  ? "พบปัญหา"
                  : "รอเข้าตรวจ"}
              </Badge>
            </div>
            <div className="mt-2.5 text-xs space-y-1 border-t border-border/60 pt-2">
              <div className="text-muted-foreground flex items-center justify-between">
                <span>กำหนดตรวจ:</span>
                <span className="font-semibold text-foreground">{recheck.round2.scheduled_date}</span>
              </div>
              {recheck.round2.checked_at && (
                <>
                  <div className="text-foreground font-medium pt-1">
                    ผู้ตรวจ: {recheck.round2.inspector_name} ({recheck.round2.inspector_department})
                  </div>
                  <div className="text-[11px] text-muted-foreground line-clamp-2">"{recheck.round2.result_summary}"</div>
                </>
              )}
            </div>
          </Card>
        </div>

        {/* Record Form */}
        <form onSubmit={handleSubmitRecheck} className="space-y-3 pt-2 border-t">
          <div className="text-xs font-bold text-primary flex items-center justify-between">
            <span className="flex items-center gap-1">
              <UserCheck className="h-4 w-4" />
              ฟอร์มบันทึกการเข้าตรวจซ้ำ: <span className="underline">สัปดาห์ที่ {selectedRound}</span>
            </span>
            <span className="text-[11px] text-muted-foreground font-normal">
              กำหนดวันที่: {selectedRound === 1 ? recheck.round1.scheduled_date : recheck.round2.scheduled_date}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">ชื่อผู้เข้าตรวจ</Label>
              <Input className="h-9 text-xs" value={inspectorName} onChange={(e) => setInspectorName(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">หน่วยงาน / แผนก</Label>
              <Input className="h-9 text-xs" value={inspectorDepartment} onChange={(e) => setInspectorDepartment(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">ผลการตรวจสอบ</Label>
              <Select value={resultStatus} onValueChange={(val) => setResultStatus(val as any)}>
                <SelectTrigger className="h-9 text-xs font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="completed" className="text-xs font-semibold text-emerald-600">
                    ✅ ปกติ สมบูรณ์ใช้งานได้ดี
                  </SelectItem>
                  <SelectItem value="issue_found" className="text-xs font-semibold text-rose-600">
                    ⚠️ พบอาการขัดข้อง / ต้องออกใบงานซ่อมใหม่
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">สรุปผลการเข้าตรวจซ้ำหน้างาน</Label>
            <Textarea
              className="min-h-[70px] text-xs"
              placeholder="ระบุสิ่งที่พบในการเข้าตรวจซ้ำ เช่น อุณหภูมิเครื่องปกติ ไม่พบเสียงดังหรือรอยรั่วซึม..."
              value={resultSummary}
              onChange={(e) => setResultSummary(e.target.value)}
              required
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button type="button" variant="outline" size="sm" className="h-9 text-xs" onClick={() => onOpenChange(false)}>
              ปิดหน้าต่าง
            </Button>
            <Button type="submit" size="sm" variant="industrial" className="h-9 text-xs gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              บันทึกผลการตรวจซ้ำสัปดาห์ที่ {selectedRound}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
