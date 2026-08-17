import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarClock,
  Plus,
  PlayCircle,
  Clock,
  AlertCircle,
  CheckCircle2,
  ListChecks,
  User,
  Wrench,
  Loader2,
  RefreshCw,
  PlusCircle,
  Trash2,
  ArrowLeft,
  Save,
  Calendar,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";

interface PMScheduleItem {
  id: number;
  pm_code: string;
  title: string;
  asset_id: number;
  asset_code?: string;
  asset_name?: string;
  location?: string;
  frequency: string;
  interval_days: number;
  next_due_date: string;
  last_completed_at?: string;
  checklist: string[];
  assigned_tech_id?: number;
  assigned_tech_name?: string;
  is_active: boolean;
  due_status: "overdue" | "due_soon" | "upcoming";
  days_remaining: number;
}

export const PMSchedule = () => {
  const currentUser = getCurrentUser();
  const canManagePM = hasPermission("pm:manage", currentUser);

  const [viewMode, setViewMode] = useState<"list" | "create">("list");
  const [schedules, setSchedules] = useState<PMScheduleItem[]>([]);
  const [assets, setAssets] = useState<{ id: number; name: string; asset_code: string }[]>([]);
  const [technicians, setTechnicians] = useState<{ id: number; name: string; emp_id: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Summary
  const [summary, setSummary] = useState({
    total: 0,
    overdue: 0,
    due_soon: 0,
    active: 0,
  });

  // Form State: Create PM (Full Page)
  const [addTitle, setAddTitle] = useState("");
  const [addAssetId, setAddAssetId] = useState("");
  const [addFrequency, setAddFrequency] = useState("monthly");
  const [addIntervalDays, setAddIntervalDays] = useState("30");
  const [addDueDate, setAddDueDate] = useState("");
  const [addTechId, setAddTechId] = useState("");
  const [checklists, setChecklists] = useState<string[]>([
    "ตรวจสอบระดับน้ำมันหล่อลื่นและสารหล่อเย็น",
    "ตรวจเช็คอุณหภูมิและความสั่นสะเทือนขณะเดินเครื่อง",
    "วัดความตึงสายพานและตรวจเช็คการสึกหรอของลูกปืน",
  ]);
  const [newCheckItem, setNewCheckItem] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Quick Action Generating Work Order
  const [generatingId, setGeneratingId] = useState<number | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pmRes, assetRes, techRes] = await Promise.allSettled([
        api.get("/pm"),
        api.get("/assets"),
        api.get("/users"),
      ]);

      if (pmRes.status === "fulfilled" && pmRes.value.data?.data) {
        setSchedules(pmRes.value.data.data);
        if (pmRes.value.data.summary) {
          setSummary(pmRes.value.data.summary);
        }
      }

      if (assetRes.status === "fulfilled" && assetRes.value.data?.data) {
        setAssets(assetRes.value.data.data);
      }

      if (techRes.status === "fulfilled" && techRes.value.data?.data) {
        setTechnicians(techRes.value.data.data.filter((u: any) => u.role === "technician" || u.role === "supervisor"));
      }
    } catch (err: any) {
      console.warn("Fetch PM data offline fallback:", err);
      // Fallback Mock Data
      const demoPM: PMScheduleItem[] = [
        {
          id: 1,
          pm_code: "PM-2026-001",
          title: "ตรวจเช็คประจำเดือน: มอเตอร์หลักและระบบสายพาน",
          asset_id: 1,
          asset_code: "CNC-M01",
          asset_name: "CNC Milling Machine 5-Axis",
          location: "Zone A - Precision Room",
          frequency: "monthly",
          interval_days: 30,
          next_due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          checklist: ["วัดความตึงสายพาน", "ตรวจเช็คความร้อนลูกปืน", "อัดจารบีเพลาขับ"],
          assigned_tech_name: "บอส (TECH001)",
          is_active: true,
          due_status: "due_soon",
          days_remaining: 3,
        },
        {
          id: 2,
          pm_code: "PM-2026-002",
          title: "บำรุงรักษาประจำไตรมาส: ถ่ายน้ำมันไฮดรอลิกและเปลี่ยนไส้กรอง",
          asset_id: 2,
          asset_code: "HYD-P02",
          asset_name: "Hydraulic Press 200 Ton",
          location: "Zone B - Stamping Area",
          frequency: "quarterly",
          interval_days: 90,
          next_due_date: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          checklist: ["ตรวจวัดแรงดัน Pressure Relief", "เปลี่ยนไส้กรอง Oil Filter 10u", "ตรวจรอยรั่วท่อข้อต่อ"],
          assigned_tech_name: "ตะวัน (TECH002)",
          is_active: true,
          due_status: "upcoming",
          days_remaining: 25,
        },
      ];
      setSchedules(demoPM);
      setSummary({ total: 2, overdue: 0, due_soon: 1, active: 2 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Default next due date: 30 days ahead
    const d = new Date();
    d.setDate(d.getDate() + 30);
    setAddDueDate(d.toISOString().split("T")[0]);
  }, []);

  const handleFrequencyChange = (val: string) => {
    setAddFrequency(val);
    let days = 30;
    if (val === "weekly") days = 7;
    if (val === "monthly") days = 30;
    if (val === "quarterly") days = 90;
    if (val === "yearly") days = 365;
    setAddIntervalDays(String(days));

    const d = new Date();
    d.setDate(d.getDate() + days);
    setAddDueDate(d.toISOString().split("T")[0]);
  };

  const handleAddChecklist = () => {
    if (!newCheckItem.trim()) return;
    setChecklists([...checklists, newCheckItem.trim()]);
    setNewCheckItem("");
  };

  const handleRemoveChecklist = (index: number) => {
    setChecklists(checklists.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setAddTitle("");
    setAddAssetId("");
    setAddFrequency("monthly");
    setAddIntervalDays("30");
    const d = new Date();
    d.setDate(d.getDate() + 30);
    setAddDueDate(d.toISOString().split("T")[0]);
    setAddTechId("");
    setChecklists([
      "ตรวจสอบระดับน้ำมันหล่อลื่นและสารหล่อเย็น",
      "ตรวจเช็คอุณหภูมิและความสั่นสะเทือนขณะเดินเครื่อง",
      "วัดความตึงสายพานและตรวจเช็คการสึกหรอของลูกปืน",
    ]);
  };

  const handleCreatePMSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addTitle.trim() || !addAssetId || !addDueDate) {
      toast.error("กรุณากรอกชื่องาน PM, เครื่องจักร และกำหนดการ");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post("/pm", {
        title: addTitle.trim(),
        asset_id: Number(addAssetId),
        frequency: addFrequency,
        interval_days: Number(addIntervalDays) || 30,
        next_due_date: addDueDate,
        checklist: checklists,
        assigned_tech_id: addTechId ? Number(addTechId) : null,
      });

      toast.success(res.data?.message || "สร้างแผนบำรุงรักษา PM สำเร็จ");
      resetForm();
      setViewMode("list");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "ไม่สามารถสร้างแผน PM ได้");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateWO = async (schedule: PMScheduleItem) => {
    setGeneratingId(schedule.id);
    try {
      const res = await api.post(`/pm/${schedule.id}/generate-wo`);
      toast.success(res.data?.message || `ออกใบงาน PM (${schedule.pm_code}) เรียบร้อยแล้ว`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "ไม่สามารถออกใบงาน PM ได้");
    } finally {
      setGeneratingId(null);
    }
  };

  // ----------------------------------------------------
  // FULL PAGE VIEW: CREATE PM SCHEDULE
  // ----------------------------------------------------
  if (viewMode === "create") {
    return (
      <AppLayout
        title="สร้างแผนบำรุงรักษาเชิงป้องกัน (New PM Schedule)"
        subtitle="กำหนดรอบเวลาตรวจเช็คเครื่องจักรตามวาระ, มอบหมายช่าง และสร้าง Checklist รายการตรวจสอบมาตรฐาน"
        actions={
          <Button
            variant="outline"
            onClick={() => setViewMode("list")}
            className="gap-2 rounded-xl"
          >
            <ArrowLeft className="h-4 w-4" /> กลับหน้ารายการ
          </Button>
        }
      >
        <div className="w-full space-y-6 pb-12">
          <form onSubmit={handleCreatePMSchedule} className="space-y-6">
            {/* Card 1: Basic Information */}
            <div className="bg-card rounded-2xl border p-5 sm:p-6 shadow-2xs space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b">
                <div className="h-9 w-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 grid place-items-center">
                  <CalendarClock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground">ข้อมูลแผนงานและเครื่องจักรเป้าหมาย</h3>
                  <p className="text-xs text-muted-foreground">ระบุชื่องาน PM และเลือกเครื่องจักรที่ต้องตรวจเช็ค</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="pm-title" className="text-sm font-semibold">
                    ชื่องานบำรุงรักษา PM <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="pm-title"
                    value={addTitle}
                    onChange={(e) => setAddTitle(e.target.value)}
                    placeholder="เช่น ตรวจเช็คมอเตอร์หลักและระบบลูกปืนประจำเดือน"
                    required
                    className="h-10 rounded-xl bg-muted/30 text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold">
                    เครื่องจักรเป้าหมาย <span className="text-rose-500">*</span>
                  </Label>
                  <Select value={addAssetId} onValueChange={setAddAssetId}>
                    <SelectTrigger className="h-10 rounded-xl bg-muted/30">
                      <SelectValue placeholder="เลือกเครื่องจักร" />
                    </SelectTrigger>
                    <SelectContent>
                      {assets.map((a) => (
                        <SelectItem key={a.id} value={String(a.id)}>
                          {a.name} ({a.asset_code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold">มอบหมายช่างผู้รับผิดชอบหลัก</Label>
                  <Select value={addTechId} onValueChange={setAddTechId}>
                    <SelectTrigger className="h-10 rounded-xl bg-muted/30">
                      <SelectValue placeholder="เลือกช่าง (ไม่บังคับ)" />
                    </SelectTrigger>
                    <SelectContent>
                      {technicians.map((t) => (
                        <SelectItem key={t.id} value={String(t.id)}>
                          {t.name} ({t.emp_id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Card 2: Frequency & Schedule */}
            <div className="bg-card rounded-2xl border p-5 sm:p-6 shadow-2xs space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b">
                <div className="h-9 w-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 grid place-items-center">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground">รอบความถี่และกำหนดการ</h3>
                  <p className="text-xs text-muted-foreground">ตั้งค่าระยะเวลาการตรวจเช็คซ้ำและวันที่เริ่มรอบแรก</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">รอบความถี่</Label>
                  <Select value={addFrequency} onValueChange={handleFrequencyChange}>
                    <SelectTrigger className="h-10 rounded-xl bg-muted/30">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">รายสัปดาห์ (ทุก 7 วัน)</SelectItem>
                      <SelectItem value="monthly">รายเดือน (ทุก 30 วัน)</SelectItem>
                      <SelectItem value="quarterly">รายไตรมาส (ทุก 90 วัน)</SelectItem>
                      <SelectItem value="yearly">รายปี (ทุก 365 วัน)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="interval-days" className="text-sm font-semibold">
                    ระยะห่าง (จำนวนวัน)
                  </Label>
                  <Input
                    id="interval-days"
                    type="number"
                    min="1"
                    value={addIntervalDays}
                    onChange={(e) => setAddIntervalDays(e.target.value)}
                    className="h-10 rounded-xl bg-muted/30 font-mono text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pm-due-date" className="text-sm font-semibold">
                    วันที่เริ่มกำหนดรอบแรก <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="pm-due-date"
                    type="date"
                    value={addDueDate}
                    onChange={(e) => setAddDueDate(e.target.value)}
                    required
                    className="h-10 rounded-xl bg-muted/30 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Card 3: Checklist Items */}
            <div className="bg-card rounded-2xl border p-5 sm:p-6 shadow-2xs space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b">
                <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 grid place-items-center">
                  <ListChecks className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground">รายการ Checklist ตรวจเช็คมาตรฐาน</h3>
                  <p className="text-xs text-muted-foreground">รายการที่ช่างต้องตรวจสอบเมื่อปฏิบัติงาน PM</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={newCheckItem}
                    onChange={(e) => setNewCheckItem(e.target.value)}
                    placeholder="พิมพ์หัวข้อตรวจเช็ค เช่น วัดแรงดันลม, เปลี่ยนถ่ายน้ำมัน, ตรวจเช็คสายพาน..."
                    className="h-10 rounded-xl bg-muted/30 text-sm flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddChecklist();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={handleAddChecklist}
                    className="h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl gap-1.5 shrink-0"
                  >
                    <PlusCircle className="h-4 w-4" /> เพิ่มหัวข้อ
                  </Button>
                </div>

                <div className="space-y-2 pt-1">
                  {checklists.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-muted/30 hover:bg-muted/50 p-3 rounded-xl text-sm border transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="h-6 w-6 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold grid place-items-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="text-foreground font-medium">{item}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveChecklist(idx)}
                        className="h-8 w-8 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setViewMode("list")}
                className="h-11 px-5 rounded-xl text-sm"
              >
                ยกเลิก
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="h-11 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl gap-2 shadow-sm"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                บันทึกแผนงาน PM
              </Button>
            </div>
          </form>
        </div>
      </AppLayout>
    );
  }

  // ----------------------------------------------------
  // LIST VIEW: MAIN PM SCHEDULES
  // ----------------------------------------------------
  return (
    <AppLayout
      title="แผนบำรุงรักษาเชิงป้องกัน (Preventive Maintenance)"
      subtitle="กำหนดรอบเวลาตรวจเช็คเครื่องจักรตามวาระ, สร้าง Checklist มาตรฐาน และออกใบงานสั่งซ่อมล่วงหน้าอัตโนมัติ"
      actions={
        canManagePM && (
          <Button
            onClick={() => {
              resetForm();
              setViewMode("create");
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 shadow-sm font-semibold rounded-xl"
          >
            <Plus className="h-4 w-4" /> สร้างแผน PM ใหม่
          </Button>
        )
      }
    >
      <div className="space-y-6">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-card p-4 md:p-5 rounded-2xl border shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">แผน PM ทั้งหมด</p>
              <h3 className="text-2xl font-bold font-mono text-foreground mt-1">{summary.total}</h3>
              <p className="text-[11px] text-muted-foreground/80 mt-0.5">แผนงานประจำโรงงาน</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 grid place-items-center">
              <CalendarClock className="h-6 w-6" />
            </div>
          </div>

          <div className={`bg-card p-4 md:p-5 rounded-2xl border shadow-2xs flex items-center justify-between ${summary.overdue > 0 ? 'border-rose-500/40 bg-rose-500/5' : ''}`}>
            <div>
              <p className="text-xs text-muted-foreground font-medium">เกินกำหนด (Overdue)</p>
              <h3 className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-1">{summary.overdue}</h3>
              <p className="text-[11px] text-rose-600/80 font-medium mt-0.5">ต้องดำเนินการด่วน</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 grid place-items-center">
              <AlertCircle className="h-6 w-6" />
            </div>
          </div>

          <div className="bg-card p-4 md:p-5 rounded-2xl border shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">ใกล้ถึงกำหนด (ภายใน 7 วัน)</p>
              <h3 className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">{summary.due_soon}</h3>
              <p className="text-[11px] text-muted-foreground/80 mt-0.5">เตือนเตรียมความพร้อม</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 grid place-items-center">
              <Clock className="h-6 w-6" />
            </div>
          </div>

          <div className="bg-card p-4 md:p-5 rounded-2xl border shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">แผนที่เปิดใช้งาน (Active)</p>
              <h3 className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">{summary.active}</h3>
              <p className="text-[11px] text-muted-foreground/80 mt-0.5">กำลังวนรอบตามตาราง</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 grid place-items-center">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Schedule List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-blue-600" /> รายการแผนบำรุงรักษาเชิงป้องกัน
            </h3>
            <Button variant="ghost" size="sm" onClick={fetchData} className="gap-1 text-xs">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> รีเฟรช
            </Button>
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground bg-card rounded-2xl border">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-sm font-medium">กำลังโหลดข้อมูลแผนงาน PM...</p>
            </div>
          ) : schedules.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground bg-card rounded-2xl border">
              <CalendarClock className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
              <p className="font-semibold text-foreground">ยังไม่มีแผนบำรุงรักษาเชิงป้องกัน</p>
              <p className="text-xs text-muted-foreground mt-1">กดปุ่ม "สร้างแผน PM ใหม่" เพื่อเริ่มวางแผนบำรุงรักษาเครื่องจักร</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {schedules.map((item) => (
                <div key={item.id} className="bg-card p-5 rounded-2xl border shadow-2xs space-y-4 hover:border-blue-400/50 transition-all">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">
                          {item.pm_code}
                        </span>
                        <Badge variant="outline" className="text-xs font-semibold capitalize">
                          {item.frequency} (ทุก {item.interval_days} วัน)
                        </Badge>
                      </div>
                      <h4 className="font-bold text-foreground text-base mt-2">{item.title}</h4>
                    </div>

                    {item.due_status === "overdue" ? (
                      <Badge variant="destructive" className="gap-1 font-semibold">
                        <AlertCircle className="h-3 w-3" /> เกินกำหนด
                      </Badge>
                    ) : item.due_status === "due_soon" ? (
                      <Badge variant="outline" className="border-amber-500/50 text-amber-700 dark:text-amber-300 bg-amber-500/15 font-semibold gap-1">
                        <Clock className="h-3 w-3" /> อีก {item.days_remaining} วัน
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-emerald-500/50 text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 font-semibold gap-1">
                        <CheckCircle2 className="h-3 w-3" /> ตามแผน
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground bg-muted/30 p-3 rounded-xl border">
                    <div>
                      <span className="text-[11px] block text-muted-foreground/70">เครื่องจักรเป้าหมาย:</span>
                      <span className="font-semibold text-foreground flex items-center gap-1 mt-0.5">
                        <Wrench className="h-3.5 w-3.5 text-blue-600" />
                        {item.asset_name} ({item.asset_code})
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] block text-muted-foreground/70">ช่างผู้รับผิดชอบ:</span>
                      <span className="font-semibold text-foreground flex items-center gap-1 mt-0.5">
                        <User className="h-3.5 w-3.5 text-emerald-600" />
                        {item.assigned_tech_name}
                      </span>
                    </div>
                  </div>

                  {item.checklist && item.checklist.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                        <ListChecks className="h-3.5 w-3.5" /> รายการ Checklist ({item.checklist.length} รายการ):
                      </span>
                      <ul className="space-y-1 pl-1">
                        {item.checklist.slice(0, 3).map((check, idx) => (
                          <li key={idx} className="text-xs text-foreground/90 flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                            {check}
                          </li>
                        ))}
                        {item.checklist.length > 3 && (
                          <li className="text-[11px] text-muted-foreground italic pl-3">
                            + อีก {item.checklist.length - 3} รายการ
                          </li>
                        )}
                      </ul>
                    </div>
                  )}

                  <div className="pt-2 border-t flex items-center justify-between">
                    <div className="text-xs">
                      <span className="text-muted-foreground">กำหนดรอบถัดไป: </span>
                      <span className="font-mono font-bold text-foreground">{item.next_due_date}</span>
                    </div>

                    {canManagePM && (
                      <Button
                        size="sm"
                        onClick={() => handleGenerateWO(item)}
                        disabled={generatingId === item.id}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 font-semibold text-xs rounded-xl shadow-xs"
                      >
                        {generatingId === item.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <PlayCircle className="h-3.5 w-3.5" />
                        )}
                        ออกใบงาน PM ทันที
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default PMSchedule;
