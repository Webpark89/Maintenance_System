import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WorkOrderPrintDialog } from "@/components/WorkOrderPrintDialog";
import { ExportDataDialog } from "@/components/ExportDataDialog";
import { requestStore, useRequests } from "@/lib/requestStore";
import { CATEGORY_LABEL, STATUS_LABEL, PRIORITY_LABEL, WorkRequest } from "@/lib/mockData";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Bell,
  Building,
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  Flame,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  PlusCircle,
  Printer,
  QrCode,
  ShieldAlert,
  Wrench,
  Zap,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";

const COLORS = ["#0284c7", "#eab308", "#ef4444", "#06b6d4", "#f97316", "#8b5cf6", "#10b981"];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const item = payload[0];
    const itemName = label || item.name || item.payload?.name || "";
    const value = item.value;
    const color = item.color || item.fill || item.payload?.fill || "#38bdf8";

    return (
      <div className="bg-slate-900 border-2 border-sky-400 p-3 rounded-lg shadow-2xl text-slate-100 text-xs min-w-[150px] z-50">
        {itemName && (
          <p className="font-bold text-white text-sm mb-1.5 border-b border-slate-700 pb-1 flex items-center justify-between">
            <span>{itemName}</span>
          </p>
        )}
        <div className="flex items-center justify-between gap-3 pt-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: color }} />
            <span className="text-slate-200 font-medium">{item.name === "value" ? "จำนวนงาน" : item.name}:</span>
          </div>
          <span className="font-black text-sky-300 font-mono text-base">{value}</span>
        </div>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const navigate = useNavigate();
  const requests = useRequests();
  const [selectedRequestForPrint, setSelectedRequestForPrint] = useState<WorkRequest | null>(null);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

  // Compute Dashboard Statistics & KPIs
  const stats = useMemo(() => {
    const total = requests.length;
    const completed = requests.filter((r) => r.status === "complete").length;
    const active = requests.filter((r) => ["open", "assess", "doing", "waiting"].includes(r.status)).length;
    const critical = requests.filter((r) => r.priority === "critical" && r.status !== "complete").length;

    // Calculate Total Parts Cost
    const totalCost = requests.reduce((sum, r) => sum + (r.stock_requisition?.total_price || 0), 0);

    // Completion Rate
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Average MTTR (Mean Time To Repair in hours - mock estimated)
    const mttrAvgHours = 3.5;

    // Total Estimated Downtime Hours
    const totalDowntimeHours = requests.length * 4.2;

    // 1. Category Breakdown Data
    const categoryCounts: Record<string, number> = {};
    requests.forEach((r) => {
      const label = CATEGORY_LABEL[r.category] || r.category;
      categoryCounts[label] = (categoryCounts[label] || 0) + 1;
    });
    const categoryData = Object.entries(categoryCounts).map(([name, value]) => ({ name, value }));

    // 2. Status Breakdown Data
    const statusCounts: Record<string, number> = {};
    requests.forEach((r) => {
      const label = STATUS_LABEL[r.status] || r.status;
      statusCounts[label] = (statusCounts[label] || 0) + 1;
    });
    const statusData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

    // 3. Top Breakdown Assets
    const assetCounts: Record<string, number> = {};
    requests.forEach((r) => {
      assetCounts[r.asset_name] = (assetCounts[r.asset_name] || 0) + 1;
    });
    const topAssets = Object.entries(assetCounts)
      .map(([asset, count]) => ({ asset, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 4. Priority Breakdown
    const priorityCounts: Record<string, number> = {};
    requests.forEach((r) => {
      const label = PRIORITY_LABEL[r.priority] || r.priority;
      priorityCounts[label] = (priorityCounts[label] || 0) + 1;
    });
    const priorityData = Object.entries(priorityCounts).map(([name, value]) => ({ name, value }));

    return {
      total,
      completed,
      active,
      critical,
      totalCost,
      completionRate,
      mttrAvgHours,
      totalDowntimeHours,
      categoryData,
      statusData,
      topAssets,
      priorityData,
    };
  }, [requests]);

  const handleOpenPrint = (req: WorkRequest) => {
    setSelectedRequestForPrint(req);
    setIsPrintDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans pb-12">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-tr from-sky-500 to-cyan-400 flex items-center justify-center font-bold text-white shadow-lg shadow-sky-500/20 shrink-0">
              M
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-sm sm:text-base text-white tracking-tight leading-tight truncate">
                Dashboard <span className="hidden sm:inline">Executive Maintenance</span>
              </h1>
              <p className="text-[10px] sm:text-[11px] text-slate-400 truncate hidden sm:block">ระบบบริหารจัดการและสรุปผลสถิติงานซ่อมบำรุง</p>
            </div>
          </div>

          {/* Desktop Navigation Links (Show on md+) */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-900/80 p-1 rounded-lg border border-slate-800 text-xs">
            <NavLink
              to="/dashboard"
              className="px-3 py-1.5 rounded-md font-medium text-slate-300 hover:text-white transition"
              activeClassName="bg-sky-600 text-white shadow-sm font-semibold"
            >
              <LayoutDashboard className="h-3.5 w-3.5 inline mr-1.5" /> Dashboard
            </NavLink>
            <NavLink
              to="/board"
              className="px-3 py-1.5 rounded-md font-medium text-slate-300 hover:text-white transition"
              activeClassName="bg-sky-600 text-white shadow-sm font-semibold"
            >
              <Wrench className="h-3.5 w-3.5 inline mr-1.5" /> บอร์ดงานซ่อม
            </NavLink>
            <NavLink
              to="/request"
              className="px-3 py-1.5 rounded-md font-medium text-slate-300 hover:text-white transition"
              activeClassName="bg-sky-600 text-white shadow-sm font-semibold"
            >
              <PlusCircle className="h-3.5 w-3.5 inline mr-1.5" /> แจ้งซ่อมใหม่
            </NavLink>
            <NavLink
              to="/assets"
              className="px-3 py-1.5 rounded-md font-medium text-slate-300 hover:text-white transition"
              activeClassName="bg-sky-600 text-white shadow-sm font-semibold"
            >
              <Building className="h-3.5 w-3.5 inline mr-1.5" /> ทรัพย์สิน & QR
            </NavLink>
            <NavLink
              to="/notifications"
              className="px-3 py-1.5 rounded-md font-medium text-slate-300 hover:text-white transition"
              activeClassName="bg-sky-600 text-white shadow-sm font-semibold"
            >
              <Bell className="h-3.5 w-3.5 inline mr-1.5" /> แจ้งเตือน
            </NavLink>
          </nav>

          {/* Desktop Actions (Show on md+) */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            <Button
              onClick={() => setIsExportDialogOpen(true)}
              variant="outline"
              size="sm"
              className="bg-emerald-950/40 border-emerald-800/80 text-emerald-300 hover:bg-emerald-900/60 text-xs px-3 h-8 gap-1.5"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" /> Export Excel
            </Button>
            <Button
              onClick={() => navigate("/")}
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-white text-xs gap-1 px-2 h-8"
            >
              <LogOut className="h-3.5 w-3.5" /> ออก
            </Button>
          </div>

          {/* Mobile Hamburger Menu (Show on mobile) */}
          <div className="flex items-center gap-2 md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 h-9 w-9">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-slate-950 text-slate-100 border-slate-800 p-6 flex flex-col justify-between">
                <div className="space-y-6">
                  <SheetHeader className="text-left border-b border-slate-800 pb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-md bg-sky-500 text-white font-bold grid place-items-center">
                        M
                      </div>
                      <div>
                        <SheetTitle className="text-white text-base font-bold">FixFlow Dashboard</SheetTitle>
                        <SheetDescription className="text-xs text-slate-400">ระบบบริหารจัดการและสรุปสถิติ</SheetDescription>
                      </div>
                    </div>
                  </SheetHeader>

                  <div className="space-y-2 pt-2">
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-3 bg-sky-950/40 border-sky-800/80 text-sky-300 hover:bg-sky-900/60 h-11 text-sm font-semibold"
                      onClick={() => navigate("/dashboard")}
                    >
                      <LayoutDashboard className="h-4 w-4 text-sky-400" />
                      Dashboard สถิติภาพรวม
                    </Button>

                    <Button
                      variant="outline"
                      className="w-full justify-start gap-3 bg-emerald-950/40 border-emerald-800/80 text-emerald-300 hover:bg-emerald-900/60 h-11 text-sm font-semibold"
                      onClick={() => setIsExportDialogOpen(true)}
                    >
                      <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
                      Export Data (Excel / CSV)
                    </Button>

                    <Button
                      variant="outline"
                      className="w-full justify-start gap-3 bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800 h-11 text-sm font-semibold"
                      onClick={() => navigate("/board")}
                    >
                      <Wrench className="h-4 w-4 text-cyan-400" />
                      บอร์ดจัดการงานซ่อม
                    </Button>

                    <Button
                      variant="outline"
                      className="w-full justify-start gap-3 bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800 h-11 text-sm font-semibold"
                      onClick={() => navigate("/request")}
                    >
                      <PlusCircle className="h-4 w-4 text-emerald-400" />
                      สร้างใบแจ้งซ่อมใหม่
                    </Button>

                    <Button
                      variant="outline"
                      className="w-full justify-start gap-3 bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800 h-11 text-sm font-semibold"
                      onClick={() => navigate("/assets")}
                    >
                      <Building className="h-4 w-4 text-amber-400" />
                      ทรัพย์สิน & QR Tag
                    </Button>

                    <Button
                      variant="outline"
                      className="w-full justify-start gap-3 bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800 h-11 text-sm font-semibold"
                      onClick={() => navigate("/notifications")}
                    >
                      <Bell className="h-4 w-4 text-violet-400" />
                      ศูนย์แจ้งเตือน
                    </Button>
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-4">
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 h-10"
                    onClick={() => navigate("/")}
                  >
                    <LogOut className="h-4 w-4" />
                    ออกจากระบบ
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Main Content Area (Matches Navbar Container Width) */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        
        {/* Banner / Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-950 via-slate-900 to-sky-950/40 p-6 rounded-2xl border border-slate-800 shadow-xl">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 mb-2">
              <Activity className="h-3.5 w-3.5 animate-pulse" /> Real-time Maintenance Analytics
            </span>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              สถิติภาพรวมและการดำเนินงานซ่อมบำรุง
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              สรุปดัชนีชี้วัดประสิทธิภาพ (KPI), เวลาซ่อมเฉลี่ย (MTTR), ค่าอะไหล่ และแนวโน้มเครื่องจักรชำรุด
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => navigate("/request")}
              className="bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 text-white shadow-lg shadow-sky-500/25 gap-2 text-xs font-semibold"
            >
              <PlusCircle className="h-4 w-4" /> สร้างใบแจ้งซ่อมใหม่
            </Button>
          </div>
        </div>

        {/* Top KPI Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          
          {/* Card 1: Total Requests */}
          <Card className="bg-slate-950/70 border-slate-800 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>ใบแจ้งซ่อมทั้งหมด</span>
              <FileText className="h-4 w-4 text-sky-400" />
            </div>
            <p className="text-2xl font-extrabold text-white">{stats.total}</p>
            <p className="text-[11px] text-emerald-400 flex items-center gap-0.5">
              <ArrowUpRight className="h-3 w-3" /> รวมทุกรายการ
            </p>
          </Card>

          {/* Card 2: Active / In Progress */}
          <Card className="bg-slate-950/70 border-slate-800 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>งานกำลังดำเนินการ</span>
              <Clock className="h-4 w-4 text-amber-400" />
            </div>
            <p className="text-2xl font-extrabold text-amber-400">{stats.active}</p>
            <p className="text-[11px] text-slate-400">เปิด / ประเมิน / ซ่อม / รออะไหล่</p>
          </Card>

          {/* Card 3: Critical Pending */}
          <Card className="bg-slate-950/70 border-slate-800 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>วิกฤต (Critical)</span>
              <Flame className="h-4 w-4 text-rose-500" />
            </div>
            <p className="text-2xl font-extrabold text-rose-500">{stats.critical}</p>
            <p className="text-[11px] text-rose-400/80">ต้องการแก้ไขเร่งด่วน</p>
          </Card>

          {/* Card 4: MTTR Avg */}
          <Card className="bg-slate-950/70 border-slate-800 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>MTTR (เวลาซ่อมเฉลี่ย)</span>
              <Activity className="h-4 w-4 text-cyan-400" />
            </div>
            <p className="text-2xl font-extrabold text-cyan-400">{stats.mttrAvgHours} <span className="text-xs font-normal text-slate-400">ชม.</span></p>
            <p className="text-[11px] text-slate-400">Mean Time To Repair</p>
          </Card>

          {/* Card 5: Completion Rate */}
          <Card className="bg-slate-950/70 border-slate-800 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>อัตราซ่อมเสร็จ (%)</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-extrabold text-emerald-400">{stats.completionRate}%</p>
            <p className="text-[11px] text-slate-400">{stats.completed} จาก {stats.total} รายการ</p>
          </Card>

          {/* Card 6: Total Parts Cost */}
          <Card className="bg-slate-950/70 border-slate-800 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>ค่าอะไหล่เบิกรวม</span>
              <Package className="h-4 w-4 text-purple-400" />
            </div>
            <p className="text-xl font-extrabold text-purple-300">฿{stats.totalCost.toLocaleString()}</p>
            <p className="text-[11px] text-slate-400">จากคลัง Stock</p>
          </Card>

        </div>

        {/* Visual Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Chart 1: Work Breakdown by Category */}
          <Card className="bg-slate-950/70 border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-sky-400" /> สัดส่วนงานซ่อมแยกตามประเภท (Category)
                </h3>
                <p className="text-[11px] text-slate-400">จำนวนใบแจ้งซ่อมแบ่งตามระบบเครื่องกล/ไฟฟ้า/ลม</p>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.categoryData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" />
                  <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="จำนวนงาน" radius={[4, 4, 0, 0]}>
                    {stats.categoryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Chart 2: Status Distribution Pie Chart */}
          <Card className="bg-slate-950/70 border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-cyan-400" /> สัดส่วนสถานะงานซ่อมปัจจุบัน (Status Breakdown)
                </h3>
                <p className="text-[11px] text-slate-400">สถานะงานในระบบตั้งแต่เปิดงานถึงเสร็จสิ้น</p>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {stats.statusData.map((_, index) => (
                      <Cell key={`cell-status-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: "11px", color: "#94a3b8" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Chart 3: Top Breakdown Assets */}
          <Card className="bg-slate-950/70 border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-rose-400" /> Top 5 เครื่องจักรที่เสียบ่อยที่สุด (Top Breakdown Assets)
                </h3>
                <p className="text-[11px] text-slate-400">เครื่องจักรที่มีสถิติแจ้งซ่อมสูงสุดเพื่อนำไปวางแผน PM</p>
              </div>
            </div>
            <div className="space-y-3">
              {stats.topAssets.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between bg-slate-900/60 p-3 rounded-lg border border-slate-800 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 font-bold flex items-center justify-center text-xs">
                      #{idx + 1}
                    </div>
                    <div>
                      <p className="font-bold text-slate-200">{item.asset}</p>
                      <p className="text-[11px] text-slate-400">รหัสเครื่องจักรในไลน์ผลิต</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-amber-400 text-sm">{item.count} ครั้ง</span>
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-300 border-amber-500/30 text-[10px]">
                      High Frequency
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Chart 4: Priority Distribution */}
          <Card className="bg-slate-950/70 border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                  <Flame className="h-4 w-4 text-orange-400" /> ระดับความเร่งด่วนของงานซ่อม (Priority Distribution)
                </h3>
                <p className="text-[11px] text-slate-400">แบ่งตามระดับ Critical / High / Medium / Low</p>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.priorityData} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="จำนวนงาน" fill="#f97316" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

        </div>

        {/* Recent Work Orders & Instant Print Section */}
        <Card className="bg-slate-950/70 border-slate-800 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <FileText className="h-4 w-4 text-sky-400" /> รายการใบแจ้งซ่อมล่าสุดและพิมพ์ใบสั่งซ่อม (Work Orders)
              </h3>
              <p className="text-[11px] text-slate-400">สามารถกดพิมพ์ใบสั่งซ่อม A4 หรือ Export รายชิ้นได้ทันที</p>
            </div>
            <Button
              onClick={() => navigate("/board")}
              variant="outline"
              size="sm"
              className="bg-slate-900 border-slate-700 text-slate-200 text-xs gap-1.5"
            >
              ดูบอร์ดช่างทั้งหมด <ArrowUpRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3">รหัสงาน</th>
                  <th className="p-3">เครื่องจักร</th>
                  <th className="p-3">อาการปัญหา</th>
                  <th className="p-3">ผู้แจ้ง</th>
                  <th className="p-3">ความเร่งด่วน</th>
                  <th className="p-3">สถานะ</th>
                  <th className="p-3 text-right">แอคชั่น</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {requests.slice(0, 5).map((req) => (
                  <tr key={req.request_id} className="hover:bg-slate-900/50 transition">
                    <td className="p-3 font-mono font-bold text-sky-400">{req.request_id}</td>
                    <td className="p-3 font-medium text-slate-200">{req.asset_name}</td>
                    <td className="p-3 max-w-xs truncate text-slate-400">{req.issue_summary}</td>
                    <td className="p-3">{req.reported_by}</td>
                    <td className="p-3">
                      <Badge variant="outline" className="text-[10px] uppercase font-bold border-rose-500/40 text-rose-300 bg-rose-950/30">
                        {req.priority}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className="text-[10px] border-sky-500/40 text-sky-300 bg-sky-950/30">
                        {STATUS_LABEL[req.status]}
                      </Badge>
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        onClick={() => handleOpenPrint(req)}
                        size="sm"
                        variant="secondary"
                        className="h-7 bg-sky-900/40 hover:bg-sky-800/60 text-sky-200 text-[11px] gap-1"
                      >
                        <Printer className="h-3 w-3" /> พิมพ์ A4
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

      </main>

      {/* Dialogs */}
      <WorkOrderPrintDialog
        open={isPrintDialogOpen}
        onOpenChange={setIsPrintDialogOpen}
        request={selectedRequestForPrint}
      />
      <ExportDataDialog
        open={isExportDialogOpen}
        onOpenChange={setIsExportDialogOpen}
        requests={requests}
      />
    </div>
  );
}
