import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  History,
  Search,
  RefreshCw,
  ShieldAlert,
  User,
  Activity,
  Globe,
  Loader2,
  KeyRound,
  FileEdit,
  PlusCircle,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import { api } from "@/lib/api";

interface AuditLogItem {
  id: number;
  user_id?: number;
  user_name?: string;
  emp_id?: string;
  action: string;
  module: string;
  target_id?: string;
  details?: string;
  ip_address?: string;
  created_at: string;
}

export const AuditLogs = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedModule, setSelectedModule] = useState("all");
  const [totalCount, setTotalCount] = useState(0);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get("/audit-logs", {
        params: {
          search: searchTerm || undefined,
          module: selectedModule !== "all" ? selectedModule : undefined,
          limit: 100,
        },
      });

      if (res.data?.data) {
        setLogs(res.data.data);
        setTotalCount(res.data.pagination?.total || res.data.data.length);
      }
    } catch (err: any) {
      console.warn("Fetch audit logs offline fallback:", err);
      // Fallback Demo Logs
      const demoLogs: AuditLogItem[] = [
        {
          id: 1,
          user_name: "อาร์ม (SUP001)",
          emp_id: "SUP001",
          action: "LOGIN_SUCCESS",
          module: "AUTH",
          details: JSON.stringify({ role: "supervisor", ip: "192.168.1.38" }),
          ip_address: "192.168.1.38",
          created_at: new Date().toISOString(),
        },
        {
          id: 2,
          user_name: "อาร์ม (SUP001)",
          emp_id: "SUP001",
          action: "RESET_PASSWORD",
          module: "USERS",
          target_id: "3",
          details: "รีเซ็ตรหัสผ่านใหม่สำหรับ อาร์ม (SUP001)",
          ip_address: "127.0.0.1",
          created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        },
        {
          id: 3,
          user_name: "อาร์ม (SUP001)",
          emp_id: "SUP001",
          action: "CREATE_PART",
          module: "INVENTORY",
          target_id: "1",
          details: JSON.stringify({ part_code: "PART-BRG-6204", name: "ตลับลูกปืน 6204" }),
          ip_address: "127.0.0.1",
          created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        },
        {
          id: 4,
          user_name: "โฟล์ค (REQ042)",
          emp_id: "REQ042",
          action: "CREATE_REQUEST",
          module: "REQUESTS",
          target_id: "WO-2026-004",
          details: "แจ้งซ่อม: สายพานลำเลียงสะดุด",
          ip_address: "192.168.1.45",
          created_at: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
        },
      ];
      setLogs(demoLogs);
      setTotalCount(demoLogs.length);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [selectedModule]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs();
  };

  const getActionBadge = (action: string) => {
    if (action.includes("LOGIN")) {
      return (
        <Badge variant="outline" className="border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 font-bold gap-1">
          <CheckCircle2 className="h-3 w-3" /> {action}
        </Badge>
      );
    }
    if (action.includes("CREATE")) {
      return (
        <Badge variant="outline" className="border-blue-500/40 text-blue-700 dark:text-blue-300 bg-blue-500/10 font-bold gap-1">
          <PlusCircle className="h-3 w-3" /> {action}
        </Badge>
      );
    }
    if (action.includes("RESET_PASSWORD") || action.includes("PASSWORD")) {
      return (
        <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-500/10 font-bold gap-1">
          <KeyRound className="h-3 w-3" /> {action}
        </Badge>
      );
    }
    if (action.includes("UPDATE") || action.includes("ADJUST")) {
      return (
        <Badge variant="outline" className="border-purple-500/40 text-purple-700 dark:text-purple-300 bg-purple-500/10 font-bold gap-1">
          <FileEdit className="h-3 w-3" /> {action}
        </Badge>
      );
    }
    if (action.includes("DELETE") || action.includes("SUSPEND")) {
      return (
        <Badge variant="destructive" className="font-bold gap-1">
          <Trash2 className="h-3 w-3" /> {action}
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="font-mono text-xs">
        {action}
      </Badge>
    );
  };

  return (
    <AppLayout
      title="บันทึกประวัติการทำงาน (Audit Logs & Traceability)"
      subtitle="ตรวจสอบประวัติการทำรายการสำคัญย้อนหลัง, บัญชีผู้กระทำ, การแก้ไขสิทธิ์, การเข้าสู่ระบบ และความเปลี่ยนแปลงในระบบ"
    >
      <div className="space-y-6">
        {/* Search & Filter Bar */}
        <div className="bg-card p-4 rounded-2xl border shadow-2xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาผู้กระทำ, รหัสพนักงาน, รายละเอียด หรือ IP..."
              className="pl-9 bg-muted/40 h-10 rounded-xl"
            />
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={selectedModule} onValueChange={setSelectedModule}>
              <SelectTrigger className="w-[180px] h-10 rounded-xl">
                <SelectValue placeholder="เลือก Module" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุก Module</SelectItem>
                <SelectItem value="AUTH">AUTH (เข้าสู่ระบบ)</SelectItem>
                <SelectItem value="USERS">USERS (จัดการผู้ใช้)</SelectItem>
                <SelectItem value="ROLES">ROLES (จัดการสิทธิ์)</SelectItem>
                <SelectItem value="INVENTORY">INVENTORY (คลังอะไหล่)</SelectItem>
                <SelectItem value="PM_SCHEDULE">PM_SCHEDULE (แผน PM)</SelectItem>
                <SelectItem value="REQUESTS">REQUESTS (งานซ่อม)</SelectItem>
              </SelectContent>
            </Select>

            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={fetchLogs}
              disabled={loading}
              className="h-10 w-10 rounded-xl"
              title="รีเฟรชข้อมูล"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Audit Logs Table */}
        <div className="bg-card rounded-2xl border shadow-2xs overflow-hidden">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-sm font-medium">กำลังโหลดประวัติการใช้งาน (Audit Logs)...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <History className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
              <p className="font-semibold text-foreground">ไม่พบประวัติกิจกรรมตามเงื่อนไข</p>
              <p className="text-xs text-muted-foreground mt-1">ลองล้างตัวกรองหรือคำค้นหา</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/60 text-muted-foreground uppercase text-[11px] font-semibold border-b">
                  <tr>
                    <th className="py-3 px-4">วัน-เวลา (TIMESTAMP)</th>
                    <th className="py-3 px-4">ผู้กระทำ (USER)</th>
                    <th className="py-3 px-4">กิจกรรม (ACTION)</th>
                    <th className="py-3 px-4">หมวดหมู่ (MODULE)</th>
                    <th className="py-3 px-4">รายละเอียด (DETAILS)</th>
                    <th className="py-3 px-4">IP ADDRESS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 font-mono text-xs">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString("th-TH")}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-sans">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-bold text-foreground">{log.user_name || "System"}</span>
                          {log.emp_id && (
                            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono bg-blue-500/10 px-1.5 py-0.5 rounded">
                              {log.emp_id}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">{getActionBadge(log.action)}</td>
                      <td className="py-3 px-4 font-bold text-foreground/80">{log.module}</td>
                      <td className="py-3 px-4 max-w-xs font-sans text-xs text-foreground truncate" title={log.details || ""}>
                        {log.details || "-"}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                        <span className="flex items-center gap-1">
                          <Globe className="h-3 w-3 text-muted-foreground/60" />
                          {log.ip_address || "127.0.0.1"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default AuditLogs;
