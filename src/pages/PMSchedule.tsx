import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Search,
  LayoutGrid,
  Table as TableIcon,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  X,
  Filter,
} from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { api } from "@/lib/api";
import { requestStore } from "@/lib/requestStore";
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
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const canManagePM = hasPermission("pm:manage", currentUser);

  const [viewMode, setViewMode] = useState<"list" | "create">("list");
  const [schedules, setSchedules] = useState<PMScheduleItem[]>([]);
  const [assets, setAssets] = useState<{ id: number; name: string; asset_code: string }[]>([]);
  const [technicians, setTechnicians] = useState<{ id: number; name: string; emp_id: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Search, Filter & View Controls
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<"all" | "overdue" | "due_soon" | "upcoming">("all");
  const [selectedFrequencyFilter, setSelectedFrequencyFilter] = useState<string>("all");
  const [viewLayout, setViewLayout] = useState<"grid" | "table">("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

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
      const newWO = res.data?.data;
      const woNo = newWO?.work_order_no || `WO-PM-${new Date().getFullYear()}-${String(schedule.id).padStart(3, "0")}`;

      // Synchronize into local request store for instant visibility on /board
      requestStore.addRequest({
        request_id: woNo,
        asset_name: schedule.asset_name || "เครื่องจักรเป้าหมาย PM",
        asset_location: schedule.location || "พื้นที่โรงงาน",
        issue_summary: newWO?.problem_title || `[PM Plan] ${schedule.title} (${schedule.pm_code})`,
        description: newWO?.description || `งานบำรุงรักษาเชิงป้องกันตามรอบ (${schedule.frequency})\nรายการตรวจสอบ: ${schedule.checklist?.join(", ")}`,
        priority: "medium",
        status: "open",
        category: "preventive-maintenance",
        assigned_to: schedule.assigned_tech_id ? `TECH${String(schedule.assigned_tech_id).padStart(3, "0")}` : undefined,
        assigned_technician_name: schedule.assigned_tech_name,
      });

      toast.success(`ออกใบงาน PM (${woNo}) สำเร็จแล้ว`, {
        description: `เปิดใบงานและมอบหมายช่างเข้าสู่บอร์ดเรียบร้อย สามารถคลิกเพื่อดูใบงานได้ทันที`,
        action: {
          label: "ดูใบงานบนบอร์ด",
          onClick: () => navigate("/board"),
        },
        duration: 8000,
      });

      fetchData();
    } catch (err: any) {
      toast.error(err.message || "ไม่สามารถออกใบงาน PM ได้");
    } finally {
      setGeneratingId(null);
    }
  };

  // Filter & Search Logic
  const filteredSchedules = useMemo(() => {
    return schedules.filter((item) => {
      // 1. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchCode = (item.pm_code || "").toLowerCase().includes(q);
        const matchTitle = (item.title || "").toLowerCase().includes(q);
        const matchAssetName = (item.asset_name || "").toLowerCase().includes(q);
        const matchAssetCode = (item.asset_code || "").toLowerCase().includes(q);
        const matchLocation = (item.location || "").toLowerCase().includes(q);
        const matchTech = (item.assigned_tech_name || "").toLowerCase().includes(q);
        if (!matchCode && !matchTitle && !matchAssetName && !matchAssetCode && !matchLocation && !matchTech) {
          return false;
        }
      }

      // 2. Due Status Filter
      if (selectedStatusFilter !== "all") {
        if (item.due_status !== selectedStatusFilter) {
          return false;
        }
      }

      // 3. Frequency Filter
      if (selectedFrequencyFilter !== "all") {
        if (item.frequency !== selectedFrequencyFilter) {
          return false;
        }
      }

      return true;
    });
  }, [schedules, searchQuery, selectedStatusFilter, selectedFrequencyFilter]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedStatusFilter, selectedFrequencyFilter]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredSchedules.length / itemsPerPage) || 1;
  const paginatedSchedules = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredSchedules.slice(start, start + itemsPerPage);
  }, [filteredSchedules, currentPage, itemsPerPage]);

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
              <h3 className="text-base font-bold text-foreground flex items-center gap-2 border-b pb-3">
                <CalendarClock className="h-5 w-5 text-blue-600" /> ข้อมูลทั่วไปของแผนบำรุงรักษา
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="pm_title" className="text-xs font-semibold">
                    ชื่อแผนบำรุงรักษา <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="pm_title"
                    placeholder="เช่น ตรวจเช็คระบบไฮดรอลิกและเปลี่ยนไส้กรองประจำเดือน"
                    value={addTitle}
                    onChange={(e) => setAddTitle(e.target.value)}
                    required
                    className="h-10 rounded-xl bg-muted/30"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="asset_id" className="text-xs font-semibold">
                    เลือกเครื่องจักรเป้าหมาย <span className="text-destructive">*</span>
                  </Label>
                  <Select value={addAssetId} onValueChange={setAddAssetId} required>
                    <SelectTrigger className="h-10 rounded-xl bg-muted/30">
                      <SelectValue placeholder="-- เลือกเครื่องจักร --" />
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
                  <Label htmlFor="tech_id" className="text-xs font-semibold">
                    ช่างผู้รับผิดชอบหลัก
                  </Label>
                  <Select value={addTechId} onValueChange={setAddTechId}>
                    <SelectTrigger className="h-10 rounded-xl bg-muted/30">
                      <SelectValue placeholder="-- เลือกช่างผู้รับผิดชอบ (Optional) --" />
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
              <h3 className="text-base font-bold text-foreground flex items-center gap-2 border-b pb-3">
                <Clock className="h-5 w-5 text-amber-500" /> รอบเวลาและกำหนดการบำรุงรักษา
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="frequency" className="text-xs font-semibold">
                    ความถี่รอบการตรวจเช็ค <span className="text-destructive">*</span>
                  </Label>
                  <Select value={addFrequency} onValueChange={handleFrequencyChange}>
                    <SelectTrigger className="h-10 rounded-xl bg-muted/30">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">ทุกสัปดาห์ (Weekly)</SelectItem>
                      <SelectItem value="monthly">ทุกเดือน (Monthly)</SelectItem>
                      <SelectItem value="quarterly">ทุก 3 เดือน (Quarterly)</SelectItem>
                      <SelectItem value="yearly">ทุกปี (Yearly)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="interval_days" className="text-xs font-semibold">
                    ระยะห่างรอบ (วัน) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="interval_days"
                    type="number"
                    value={addIntervalDays}
                    onChange={(e) => setAddIntervalDays(e.target.value)}
                    required
                    min="1"
                    className="h-10 rounded-xl bg-muted/30"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="next_due" className="text-xs font-semibold">
                    วันที่กำหนดรอบแรก <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="next_due"
                    type="date"
                    value={addDueDate}
                    onChange={(e) => setAddDueDate(e.target.value)}
                    required
                    className="h-10 rounded-xl bg-muted/30"
                  />
                </div>
              </div>
            </div>

            {/* Card 3: Checklist Items */}
            <div className="bg-card rounded-2xl border p-5 sm:p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <ListChecks className="h-5 w-5 text-emerald-600" /> รายการ Checklist ตรวจสอบมาตรฐาน ({checklists.length} รายการ)
                </h3>
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="พิมพ์ข้อหัวตรวจเช็ค เช่น วัดแรงดันลม, ตรวจรอยรั่วซึม..."
                  value={newCheckItem}
                  onChange={(e) => setNewCheckItem(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddChecklist();
                    }
                  }}
                  className="h-10 rounded-xl bg-muted/30"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleAddChecklist}
                  className="gap-1.5 rounded-xl shrink-0"
                >
                  <Plus className="h-4 w-4" /> เพิ่มข้อตรวจ
                </Button>
              </div>

              <div className="space-y-2 mt-3">
                {checklists.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border text-xs text-foreground group hover:border-border transition-all"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="h-5 w-5 rounded-full bg-blue-500/10 text-blue-600 font-bold grid place-items-center text-[10px]">
                        {idx + 1}
                      </span>
                      <span>{item}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveChecklist(idx)}
                      className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setViewMode("list")}
                className="rounded-xl px-6"
              >
                ยกเลิก
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-700 text-white gap-2 rounded-xl px-8 shadow-xs"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                บันทึกและสร้างแผน PM
              </Button>
            </div>
          </form>
        </div>
      </AppLayout>
    );
  }

  // ----------------------------------------------------
  // LIST VIEW: ALL PM SCHEDULES
  // ----------------------------------------------------
  return (
    <AppLayout
      title="แผนบำรุงรักษาเชิงป้องกัน (Preventive Maintenance)"
      subtitle="กำหนดรอบเวลาตรวจเช็คเครื่องจักรตามวาระ, สร้าง Checklist มาตรฐาน และออกใบงานสั่งซ่อมล่วงหน้าอัตโนมัติ"
      actions={
        canManagePM && (
          <Button
            onClick={() => setViewMode("create")}
            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs"
          >
            <Plus className="h-4 w-4" /> สร้างแผน PM ใหม่
          </Button>
        )
      }
    >
      <div className="space-y-6">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div
            onClick={() => setSelectedStatusFilter("all")}
            className={`bg-card p-4 md:p-5 rounded-2xl border shadow-2xs flex items-center justify-between cursor-pointer transition-all ${
              selectedStatusFilter === "all" ? "ring-2 ring-blue-500/50 bg-blue-500/5" : "hover:border-border"
            }`}
          >
            <div>
              <p className="text-xs text-muted-foreground font-medium">แผน PM ทั้งหมด</p>
              <h3 className="text-2xl font-bold font-mono text-foreground mt-1">{summary.total}</h3>
              <p className="text-[11px] text-muted-foreground/80 mt-0.5">แผนงานประจำโรงงาน</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 grid place-items-center">
              <CalendarClock className="h-6 w-6" />
            </div>
          </div>

          <div
            onClick={() => setSelectedStatusFilter("overdue")}
            className={`bg-card p-4 md:p-5 rounded-2xl border shadow-2xs flex items-center justify-between cursor-pointer transition-all ${
              summary.overdue > 0 ? "border-rose-500/40 bg-rose-500/5" : ""
            } ${selectedStatusFilter === "overdue" ? "ring-2 ring-rose-500/50" : "hover:border-border"}`}
          >
            <div>
              <p className="text-xs text-muted-foreground font-medium">เกินกำหนด (Overdue)</p>
              <h3 className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-1">{summary.overdue}</h3>
              <p className="text-[11px] text-rose-600/80 font-medium mt-0.5">ต้องดำเนินการด่วน</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 grid place-items-center">
              <AlertCircle className="h-6 w-6" />
            </div>
          </div>

          <div
            onClick={() => setSelectedStatusFilter("due_soon")}
            className={`bg-card p-4 md:p-5 rounded-2xl border shadow-2xs flex items-center justify-between cursor-pointer transition-all ${
              selectedStatusFilter === "due_soon" ? "ring-2 ring-amber-500/50 bg-amber-500/5" : "hover:border-border"
            }`}
          >
            <div>
              <p className="text-xs text-muted-foreground font-medium">ใกล้ถึงกำหนด (ภายใน 7 วัน)</p>
              <h3 className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">{summary.due_soon}</h3>
              <p className="text-[11px] text-muted-foreground/80 mt-0.5">เตือนเตรียมความพร้อม</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 grid place-items-center">
              <Clock className="h-6 w-6" />
            </div>
          </div>

          <div
            onClick={() => setSelectedStatusFilter("upcoming")}
            className={`bg-card p-4 md:p-5 rounded-2xl border shadow-2xs flex items-center justify-between cursor-pointer transition-all ${
              selectedStatusFilter === "upcoming" ? "ring-2 ring-emerald-500/50 bg-emerald-500/5" : "hover:border-border"
            }`}
          >
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

        {/* Search, Filter & View Mode Controls Bar */}
        <div className="bg-card p-4 rounded-2xl border shadow-2xs space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาแผน PM, รหัสเครื่องจักร, ชื่อเครื่องจักร หรือช่างผู้รับผิดชอบ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-9 h-10 rounded-xl bg-muted/30 border-muted"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Filter Group: Frequency & Status & Layout Toggle */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
              {/* Frequency Selector */}
              <Select value={selectedFrequencyFilter} onValueChange={setSelectedFrequencyFilter}>
                <SelectTrigger className="h-10 w-[160px] rounded-xl bg-muted/30 text-xs">
                  <SelectValue placeholder="ความถี่ทั้งหมด" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกความถี่ (All)</SelectItem>
                  <SelectItem value="weekly">รายสัปดาห์ (Weekly)</SelectItem>
                  <SelectItem value="monthly">รายเดือน (Monthly)</SelectItem>
                  <SelectItem value="quarterly">รายไตรมาส (Quarterly)</SelectItem>
                  <SelectItem value="yearly">รายปี (Yearly)</SelectItem>
                </SelectContent>
              </Select>

              {/* View Layout Toggle */}
              <div className="flex items-center bg-muted/40 p-1 rounded-xl border shrink-0">
                <Button
                  type="button"
                  variant={viewLayout === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewLayout("grid")}
                  className="h-8 px-2.5 rounded-lg text-xs gap-1"
                  title="มุมมองการ์ด (Card View)"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">การ์ด</span>
                </Button>
                <Button
                  type="button"
                  variant={viewLayout === "table" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewLayout("table")}
                  className="h-8 px-2.5 rounded-lg text-xs gap-1"
                  title="มุมมองตารางกะทัดรัด (Table View)"
                >
                  <TableIcon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">ตาราง</span>
                </Button>
              </div>

              {/* Refresh Button */}
              <Button
                variant="outline"
                size="icon"
                onClick={fetchData}
                className="h-10 w-10 rounded-xl shrink-0"
                title="รีเฟรชข้อมูล"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          {/* Quick Filter Tabs */}
          <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-muted-foreground font-semibold flex items-center gap-1 mr-1">
                <Filter className="h-3.5 w-3.5" /> สถานะ:
              </span>
              <Badge
                variant={selectedStatusFilter === "all" ? "default" : "outline"}
                onClick={() => setSelectedStatusFilter("all")}
                className="cursor-pointer font-medium text-xs px-3.5 py-1.5 rounded-xl transition-all shadow-2xs"
              >
                ทั้งหมด ({schedules.length})
              </Badge>
              <Badge
                variant={selectedStatusFilter === "overdue" ? "destructive" : "outline"}
                onClick={() => setSelectedStatusFilter("overdue")}
                className="cursor-pointer font-medium text-xs px-3.5 py-1.5 rounded-xl transition-all shadow-2xs"
              >
                เกินกำหนด ({schedules.filter((s) => s.due_status === "overdue").length})
              </Badge>
              <Badge
                variant={selectedStatusFilter === "due_soon" ? "secondary" : "outline"}
                onClick={() => setSelectedStatusFilter("due_soon")}
                className={`cursor-pointer font-medium text-xs px-3.5 py-1.5 rounded-xl transition-all shadow-2xs ${
                  selectedStatusFilter === "due_soon" ? "bg-amber-500 text-white hover:bg-amber-600 border-amber-600" : ""
                }`}
              >
                ใกล้ถึงรอบ 7 วัน ({schedules.filter((s) => s.due_status === "due_soon").length})
              </Badge>
              <Badge
                variant={selectedStatusFilter === "upcoming" ? "secondary" : "outline"}
                onClick={() => setSelectedStatusFilter("upcoming")}
                className={`cursor-pointer font-medium text-xs px-3.5 py-1.5 rounded-xl transition-all shadow-2xs ${
                  selectedStatusFilter === "upcoming" ? "bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-700" : ""
                }`}
              >
                ตามแผน ({schedules.filter((s) => s.due_status === "upcoming").length})
              </Badge>
            </div>

            <div className="text-muted-foreground text-[11px]">
              พบ {filteredSchedules.length} จาก {schedules.length} แผนงาน
            </div>
          </div>
        </div>

        {/* Schedule List Content */}
        <div className="space-y-4">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground bg-card rounded-2xl border">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-sm font-medium">กำลังโหลดข้อมูลแผนงาน PM...</p>
            </div>
          ) : filteredSchedules.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground bg-card rounded-2xl border">
              <CalendarClock className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
              <p className="font-semibold text-foreground">ไม่พบแผนบำรุงรักษาตามเงื่อนไขที่ค้นหา</p>
              <p className="text-xs text-muted-foreground mt-1">ลองเปลี่ยนคำค้นหา หรือรีเซ็ตตัวกรองสถานะ</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedStatusFilter("all");
                  setSelectedFrequencyFilter("all");
                }}
                className="mt-3 rounded-xl text-xs"
              >
                ล้างการค้นหาทั้งหมด
              </Button>
            </div>
          ) : viewLayout === "grid" ? (
            /* ================= GRID VIEW ================= */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {paginatedSchedules.map((item) => (
                <div
                  key={item.id}
                  className="bg-card p-5 rounded-2xl border shadow-2xs space-y-4 hover:border-blue-400/50 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
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
                        <Badge variant="destructive" className="gap-1 font-semibold shrink-0">
                          <AlertCircle className="h-3 w-3" /> เกินกำหนด
                        </Badge>
                      ) : item.due_status === "due_soon" ? (
                        <Badge variant="outline" className="border-amber-500/50 text-amber-700 dark:text-amber-300 bg-amber-500/15 font-semibold gap-1 shrink-0">
                          <Clock className="h-3 w-3" /> อีก {item.days_remaining} วัน
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-emerald-500/50 text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 font-semibold gap-1 shrink-0">
                          <CheckCircle2 className="h-3 w-3" /> ตามแผน
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground bg-muted/30 p-3 rounded-xl border">
                      <div>
                        <span className="text-[11px] block text-muted-foreground/70">เครื่องจักรเป้าหมาย:</span>
                        <span className="font-semibold text-foreground flex items-center gap-1 mt-0.5 truncate">
                          <Wrench className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                          {item.asset_name} {item.asset_code ? `(${item.asset_code})` : ""}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] block text-muted-foreground/70">ช่างผู้รับผิดชอบ:</span>
                        <span className="font-semibold text-foreground flex items-center gap-1 mt-0.5 truncate">
                          <User className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          {item.assigned_tech_name || "ยังไม่ระบุช่าง"}
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
                            <li key={idx} className="text-xs text-foreground/90 flex items-center gap-1.5 truncate">
                              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
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
                  </div>

                  <div className="pt-3 border-t flex items-center justify-between gap-2">
                    <div className="text-xs">
                      <span className="text-muted-foreground">กำหนดรอบถัดไป: </span>
                      <span className="font-mono font-bold text-foreground block sm:inline">{item.next_due_date}</span>
                    </div>

                    {canManagePM && (
                      <Button
                        size="sm"
                        onClick={() => handleGenerateWO(item)}
                        disabled={generatingId === item.id}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 font-semibold text-xs rounded-xl shadow-xs shrink-0"
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
          ) : (
            /* ================= COMPACT TABLE VIEW ================= */
            <div className="bg-card rounded-2xl border shadow-2xs overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="w-[120px] font-bold text-xs">รหัสแผน PM</TableHead>
                    <TableHead className="font-bold text-xs">ชื่องาน PM & Checklist</TableHead>
                    <TableHead className="font-bold text-xs">เครื่องจักรเป้าหมาย</TableHead>
                    <TableHead className="font-bold text-xs">ความถี่รอบ</TableHead>
                    <TableHead className="font-bold text-xs">สถานะ & วันครบกำหนด</TableHead>
                    <TableHead className="font-bold text-xs">ช่างผู้รับผิดชอบ</TableHead>
                    <TableHead className="w-[150px] text-right font-bold text-xs">การดำเนินการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedSchedules.map((item) => (
                    <TableRow key={item.id} className="hover:bg-muted/30">
                      <TableCell className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
                        {item.pm_code}
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-bold text-foreground">{item.title}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                          <ListChecks className="h-3 w-3 text-emerald-600" />
                          {item.checklist?.length || 0} รายการตรวจสอบ
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-medium text-foreground flex items-center gap-1">
                          <Wrench className="h-3 w-3 text-blue-600" />
                          {item.asset_name}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono">
                          {item.asset_code || "-"} {item.location ? `• ${item.location}` : ""}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="outline" className="text-[11px] capitalize">
                          {item.frequency} ({item.interval_days} วัน)
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-mono font-bold text-foreground">{item.next_due_date}</div>
                        <div className="mt-1">
                          {item.due_status === "overdue" ? (
                            <Badge variant="destructive" className="text-[10px] py-0 px-1.5 font-bold">
                              เกินกำหนด ({Math.abs(item.days_remaining)} วัน)
                            </Badge>
                          ) : item.due_status === "due_soon" ? (
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-amber-500 text-amber-700 dark:text-amber-300 bg-amber-500/10 font-bold">
                              อีก {item.days_remaining} วัน
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-emerald-500 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 font-bold">
                              ตามแผน
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-medium text-foreground">
                        {item.assigned_tech_name || <span className="text-muted-foreground italic">ยังไม่ระบุช่าง</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        {canManagePM && (
                          <Button
                            size="sm"
                            onClick={() => handleGenerateWO(item)}
                            disabled={generatingId === item.id}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 font-semibold text-xs rounded-lg h-8 px-2.5 shadow-2xs"
                          >
                            {generatingId === item.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <PlayCircle className="h-3.5 w-3.5" />
                            )}
                            ออกใบงาน
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination Controls */}
          {filteredSchedules.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-card rounded-2xl border shadow-2xs text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <span>แสดง</span>
                <Select
                  value={String(itemsPerPage)}
                  onValueChange={(val) => {
                    setItemsPerPage(Number(val));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-16 rounded-lg bg-muted/30 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
                <span>รายการต่อหน้า (ทั้งหมด {filteredSchedules.length} รายการ)</span>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-8 px-2.5 rounded-lg text-xs gap-1"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> ก่อนหน้า
                </Button>

                <div className="flex items-center gap-1 px-2 font-medium">
                  <span>หน้า</span>
                  <span className="font-bold text-foreground">{currentPage}</span>
                  <span>/</span>
                  <span>{totalPages}</span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="h-8 px-2.5 rounded-lg text-xs gap-1"
                >
                  ถัดไป <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default PMSchedule;
