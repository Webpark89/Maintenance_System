import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WorkOrderPrintDialog } from "@/components/WorkOrderPrintDialog";
import { ExportDataDialog } from "@/components/ExportDataDialog";
import { PriorityBadge } from "@/components/PriorityBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { AppLayout } from "@/components/AppLayout";
import { requestStore, useRequests } from "@/lib/requestStore";
import { api } from "@/lib/api";
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

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--chart-6))",
  "hsl(var(--chart-7))",
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const item = payload[0];
    const itemName = label || item.name || item.payload?.name || "";
    const value = item.value;
    const color = item.color || item.fill || item.payload?.fill || "hsl(var(--primary))";

    return (
      <div className="bg-card border border-border p-3 rounded-lg shadow-2xl text-card-foreground text-xs min-w-[150px] z-50">
        {itemName && (
          <p className="font-bold text-foreground text-sm mb-1.5 border-b border-border pb-1 flex items-center justify-between">
            <span>{itemName}</span>
          </p>
        )}
        <div className="flex items-center justify-between gap-3 pt-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: color }} />
            <span className="text-muted-foreground font-medium">{item.name === "value" ? "จำนวนงาน" : item.name}:</span>
          </div>
          <span className="font-black text-primary font-mono text-base">{value}</span>
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

  // Fetch Real KPI Analytics from Backend API
  const [apiKpi, setApiKpi] = useState<any>(null);
  useState(() => {
    api.get("/analytics/kpi").then((res) => {
      if (res.data?.data) {
        setApiKpi(res.data.data);
      }
    }).catch(() => {});
  });

  const handleOpenPrint = (req: WorkRequest) => {
    setSelectedRequestForPrint(req);
    setIsPrintDialogOpen(true);
  };

  return (
    <AppLayout
      title="DASHBOARD EXECUTIVE"
      subtitle="ระบบบริหารจัดการและสรุปผลสถิติงานซ่อมบำรุง"
      actions={
        <Button
          onClick={() => setIsExportDialogOpen(true)}
          variant="outline"
          size="sm"
          className="text-xs px-3 h-8 gap-1.5 border-emerald-600/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600/10 hover:text-emerald-700 dark:hover:text-emerald-300"
        >
          <FileSpreadsheet className="h-3.5 w-3.5" /> Export Excel
        </Button>
      }
    >
      <div className="space-y-6">
        
        {/* Banner / Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-card p-6 rounded-2xl border border-border shadow-card">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-accent/10 text-accent border border-accent/20 mb-2">
              <Activity className="h-3.5 w-3.5 animate-pulse" /> Real-time Maintenance Analytics
            </span>
            <h2 className="text-2xl font-bold text-foreground tracking-tight">
              สถิติภาพรวมและการดำเนินงานซ่อมบำรุง
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              สรุปดัชนีชี้วัดประสิทธิภาพ (KPI), เวลาซ่อมเฉลี่ย (MTTR), ค่าอะไหล่ และแนวโน้มเครื่องจักรชำรุด
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => navigate("/request")}
              variant="industrial"
              className="gap-2 text-xs font-semibold"
            >
              <PlusCircle className="h-4 w-4" /> สร้างใบแจ้งซ่อมใหม่
            </Button>
          </div>
        </div>

        {/* Top KPI Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          
          {/* Card 1: Total Requests */}
          <Card className="bg-card border-border p-4 space-y-2 shadow-card">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>ใบแจ้งซ่อมทั้งหมด</span>
              <FileText className="h-4 w-4 text-accent" />
            </div>
            <p className="text-2xl font-extrabold text-foreground">{stats.total}</p>
            <p className="text-xs text-success flex items-center gap-0.5">
              <ArrowUpRight className="h-3 w-3" /> รวมทุกรายการ
            </p>
          </Card>

          {/* Card 2: Active / In Progress */}
          <Card className="bg-card border-border p-4 space-y-2 shadow-card">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>งานกำลังดำเนินการ</span>
              <Clock className="h-4 w-4 text-warning" />
            </div>
            <p className="text-2xl font-extrabold text-warning">{stats.active}</p>
            <p className="text-xs text-muted-foreground">เปิด / ประเมิน / ซ่อม / รออะไหล่</p>
          </Card>

          {/* Card 3: Critical Pending */}
          <Card className="bg-card border-border p-4 space-y-2 shadow-card">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>วิกฤต (Critical)</span>
              <Flame className="h-4 w-4 text-destructive" />
            </div>
            <p className="text-2xl font-extrabold text-destructive">{stats.critical}</p>
            <p className="text-xs text-destructive">ต้องการแก้ไขเร่งด่วน</p>
          </Card>

          {/* Card 4: MTTR Avg */}
          <Card className="bg-card border-border p-4 space-y-2 shadow-card">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>MTTR (เวลาซ่อมเฉลี่ย)</span>
              <Activity className="h-4 w-4 text-accent" />
            </div>
            <p className="text-2xl font-extrabold text-accent">{stats.mttrAvgHours} <span className="text-xs font-normal text-muted-foreground">ชม.</span></p>
            <p className="text-xs text-muted-foreground">Mean Time To Repair</p>
          </Card>

          {/* Card 5: Completion Rate */}
          <Card className="bg-card border-border p-4 space-y-2 shadow-card">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>อัตราซ่อมเสร็จ (%)</span>
              <CheckCircle2 className="h-4 w-4 text-success" />
            </div>
            <p className="text-2xl font-extrabold text-success">{stats.completionRate}%</p>
            <p className="text-xs text-muted-foreground">{stats.completed} จาก {stats.total} รายการ</p>
          </Card>

          {/* Card 6: Total Parts Cost */}
          <Card className="bg-card border-border p-4 space-y-2 shadow-card">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>ค่าอะไหล่เบิกรวม</span>
              <Package className="h-4 w-4 text-primary" />
            </div>
            <p className="text-xl font-extrabold text-primary">฿{stats.totalCost.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">จากคลัง Stock</p>
          </Card>

        </div>

        {/* Visual Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Chart 1: Work Breakdown by Category */}
          <Card className="bg-card border-border p-5 space-y-4 shadow-card">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-accent" /> สัดส่วนงานซ่อมแยกตามประเภท (Category)
                </h3>
                <p className="text-xs text-muted-foreground">จำนวนใบแจ้งซ่อมแบ่งตามระบบเครื่องกล/ไฟฟ้า/ลม</p>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.categoryData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--chart-grid))" />
                  <XAxis dataKey="name" stroke="hsl(var(--chart-axis))" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" />
                  <YAxis stroke="hsl(var(--chart-axis))" tick={{ fontSize: 11 }} allowDecimals={false} />
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
          <Card className="bg-card border-border p-5 space-y-4 shadow-card">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <Activity className="h-4 w-4 text-accent" /> สัดส่วนสถานะงานซ่อมปัจจุบัน (Status Breakdown)
                </h3>
                <p className="text-xs text-muted-foreground">สถานะงานในระบบตั้งแต่เปิดงานถึงเสร็จสิ้น</p>
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
                  <Legend wrapperStyle={{ fontSize: "11px", color: "hsl(var(--muted-foreground))" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Chart 3: Top Breakdown Assets */}
          <Card className="bg-card border-border p-5 space-y-4 shadow-card">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-destructive" /> Top 5 เครื่องจักรที่เสียบ่อยที่สุด (Top Breakdown Assets)
                </h3>
                <p className="text-xs text-muted-foreground">เครื่องจักรที่มีสถิติแจ้งซ่อมสูงสุดเพื่อนำไปวางแผน PM</p>
              </div>
            </div>
            <div className="space-y-3">
              {stats.topAssets.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between bg-muted/40 p-3 rounded-lg border border-border text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-muted text-muted-foreground font-bold flex items-center justify-center text-xs">
                      #{idx + 1}
                    </div>
                    <div>
                      <p className="font-bold text-foreground">{item.asset}</p>
                      <p className="text-xs text-muted-foreground">รหัสเครื่องจักรในไลน์ผลิต</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-warning text-sm">{item.count} ครั้ง</span>
                    <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 text-2xs">
                      High Frequency
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Chart 4: Priority Distribution */}
          <Card className="bg-card border-border p-5 space-y-4 shadow-card">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <Flame className="h-4 w-4 text-warning" /> ระดับความเร่งด่วนของงานซ่อม (Priority Distribution)
                </h3>
                <p className="text-xs text-muted-foreground">แบ่งตามระดับ Critical / High / Medium / Low</p>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.priorityData} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--chart-grid))" />
                  <XAxis type="number" stroke="hsl(var(--chart-axis))" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" stroke="hsl(var(--chart-axis))" tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="จำนวนงาน" fill="hsl(var(--chart-5))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

        </div>

        {/* Recent Work Orders & Instant Print Section */}
        <Card className="bg-card border-border p-5 space-y-4 shadow-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
            <div>
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <FileText className="h-4 w-4 text-accent" /> รายการใบแจ้งซ่อมล่าสุดและพิมพ์ใบสั่งซ่อม (Work Orders)
              </h3>
              <p className="text-xs text-muted-foreground">สามารถกดพิมพ์ใบสั่งซ่อม A4 หรือ Export รายชิ้นได้ทันที</p>
            </div>
            <Button
              onClick={() => navigate("/board")}
              variant="outline"
              size="sm"
              className="text-xs gap-1.5"
            >
              ดูบอร์ดช่างทั้งหมด <ArrowUpRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-foreground">
              <thead className="bg-muted text-muted-foreground font-semibold border-b border-border">
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
              <tbody className="divide-y divide-border">
                {requests.slice(0, 5).map((req) => (
                  <tr key={req.request_id} className="hover:bg-muted/50 transition">
                    <td className="p-3 font-mono font-bold text-primary">{req.request_id}</td>
                    <td className="p-3 font-medium text-foreground">{req.asset_name}</td>
                    <td className="p-3 max-w-xs truncate text-muted-foreground">{req.issue_summary}</td>
                    <td className="p-3">{req.reported_by}</td>
                    <td className="p-3">
                      <PriorityBadge priority={req.priority} className="text-2xs px-1.5 py-0.5" />
                    </td>
                    <td className="p-3">
                      <StatusBadge status={req.status} className="text-2xs px-1.5 py-0.5" />
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        onClick={() => handleOpenPrint(req)}
                        size="sm"
                        variant="secondary"
                        className="h-7 text-xs gap-1"
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

      </div>

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
    </AppLayout>
  );
}
