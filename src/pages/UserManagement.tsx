import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Users,
  UserPlus,
  ShieldCheck,
  Edit,
  KeyRound,
  UserX,
  UserCheck,
  Loader2,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Eye,
  EyeOff,
  Wrench,
  ShieldAlert,
  ArrowLeft,
  Save,
  Info,
  Key,
} from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { api } from "@/lib/api";
import { AppLayout } from "@/components/AppLayout";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";

export interface SystemUser {
  id: number;
  emp_id: string;
  name: string;
  role: "requester" | "technician" | "supervisor" | string;
  department_id: number | null;
  department_name: string;
  is_active: boolean;
  created_at?: string;
}

export interface DepartmentItem {
  id: number;
  dept_code: string;
  dept_name: string;
}

type ViewMode = "list" | "add" | "edit";

const UserManagement = () => {
  const currentUser = getCurrentUser();
  const canManageUsers = hasPermission("user:manage", currentUser);
  const canManageRoles = hasPermission("role:manage", currentUser);

  const [users, setUsers] = useState<SystemUser[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");

  // Page View Mode (List vs Full-page Add/Edit Form)
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null);

  // Modals state (only for Reset Password popup)
  const [isResetOpen, setIsResetOpen] = useState(false);

  // Add User form states
  const [addEmpId, setAddEmpId] = useState("");
  const [addName, setAddName] = useState("");
  const [addPassword, setAddPassword] = useState("demo1234");
  const [addRole, setAddRole] = useState<string>("technician");
  const [addDeptId, setAddDeptId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  // Edit User form states (Now includes editEmpId!)
  const [editEmpId, setEditEmpId] = useState("");
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<string>("technician");
  const [editDeptId, setEditDeptId] = useState<string>("");

  // Reset password state
  const [newPassword, setNewPassword] = useState("");
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

  const [rolesList, setRolesList] = useState<{ id: number; code: string; name: string }[]>([]);

  const fetchUsersData = async () => {
    setLoading(true);
    try {
      const [usersRes, deptsRes, rolesRes] = await Promise.allSettled([
        api.get("/users"),
        api.get("/users/departments"),
        api.get("/roles"),
      ]);

      if (deptsRes.status === "fulfilled" && deptsRes.value.data?.data) {
        setDepartments(deptsRes.value.data.data);
      }

      if (rolesRes.status === "fulfilled" && rolesRes.value.data?.data) {
        setRolesList(rolesRes.value.data.data);
      } else {
        setRolesList([
          { id: 1, code: "supervisor", name: "หัวหน้าช่าง (Supervisor)" },
          { id: 2, code: "technician", name: "ช่างซ่อม (Technician)" },
          { id: 3, code: "requester", name: "ผู้แจ้งซ่อม (Requester)" },
        ]);
      }

      if (usersRes.status === "fulfilled" && usersRes.value.data?.data) {
        setUsers(usersRes.value.data.data);
      } else {
        // Fallback demo users if API unavailable
        setUsers([
          {
            id: 1,
            emp_id: "TECH001",
            name: "บอส",
            role: "technician",
            department_id: 1,
            department_name: "แผนกซ่อมบำรุง",
            is_active: true,
          },
          {
            id: 2,
            emp_id: "SUP001",
            name: "อาร์ม",
            role: "supervisor",
            department_id: 1,
            department_name: "แผนกซ่อมบำรุง",
            is_active: true,
          },
          {
            id: 3,
            emp_id: "REQ042",
            name: "โฟกัส",
            role: "requester",
            department_id: 2,
            department_name: "ฝ่ายผลิตและประกอบ",
            is_active: true,
          },
        ]);
      }
    } catch (err) {
      console.warn("Fetch users error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersData();
  }, []);

  const handleOpenAdd = () => {
    resetAddForm();
    setViewMode("add");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleOpenEdit = (user: SystemUser) => {
    setSelectedUser(user);
    setEditEmpId(user.emp_id);
    setEditName(user.name);
    setEditRole(user.role);
    setEditDeptId(user.department_id ? String(user.department_id) : "");
    setViewMode("edit");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBackToList = () => {
    setViewMode("list");
    setSelectedUser(null);
  };

  const resetAddForm = () => {
    setAddEmpId("");
    setAddName("");
    setAddPassword("demo1234");
    setAddRole("technician");
    setAddDeptId("");
  };

  // Handle Add New User Submit (Full Page)
  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addEmpId.trim() || !addName.trim() || !addPassword.trim()) {
      toast.error("กรุณากรอกรหัสพนักงาน, ชื่อ และรหัสผ่านให้ครบถ้วน");
      return;
    }

    setSubmitting(true);
    const cleanEmpId = addEmpId.trim().toUpperCase();

    try {
      const res = await api.post("/users", {
        emp_id: cleanEmpId,
        name: addName.trim(),
        password: addPassword.trim(),
        role: addRole,
        department_id: addDeptId ? Number(addDeptId) : null,
      });

      toast.success(res.data?.message || `เพิ่มพนักงานใหม่ ${addName} สำเร็จ`);
      handleBackToList();
      fetchUsersData();
    } catch (err: any) {
      const newLocalUser: SystemUser = {
        id: Date.now(),
        emp_id: cleanEmpId,
        name: addName.trim(),
        role: addRole,
        department_id: addDeptId ? Number(addDeptId) : null,
        department_name: departments.find((d) => String(d.id) === addDeptId)?.dept_name || "ไม่ระบุแผนก",
        is_active: true,
      };
      setUsers((prev) => [...prev, newLocalUser]);
      toast.success(`เพิ่มพนักงานใหม่ ${addName} สำเร็จ (Offline Mode)`);
      handleBackToList();
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Edit User Submit (Full Page Form with Edit emp_id!)
  const handleSaveEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !editEmpId.trim() || !editName.trim()) {
      toast.error("กรุณากรอกรหัสพนักงานและชื่อ-นามสกุลให้ครบถ้วน");
      return;
    }

    // Protection Guard: Self Role Change Prevention
    if (selectedUser.emp_id === currentUser?.emp_id && editRole !== currentUser?.role) {
      toast.error("ไม่อนุญาตให้ปรับเปลี่ยนบทบาทของตนเอง", {
        description: "ระบบป้องกัน Supervisor จากการปรับลดสิทธิ์ตนเองเพื่อความปลอดภัยในการบริหารระบบ",
      });
      return;
    }

    setSubmitting(true);
    const cleanEmpId = editEmpId.trim().toUpperCase();
    const selectedDept = departments.find((d) => String(d.id) === editDeptId);

    try {
      const res = await api.patch(`/users/${selectedUser.id}`, {
        emp_id: cleanEmpId,
        name: editName.trim(),
        role: editRole,
        department_id: editDeptId ? Number(editDeptId) : null,
      });

      toast.success(res.data?.message || "อัปเดตรหัสพนักงาน ข้อมูล และสิทธิ์สำเร็จ");
      handleBackToList();
      fetchUsersData();
    } catch (err: any) {
      // Fallback local update when backend is offline/500
      setUsers((prev) =>
        prev.map((u) =>
          u.id === selectedUser.id
            ? {
                ...u,
                emp_id: cleanEmpId,
                name: editName.trim(),
                role: editRole,
                department_id: editDeptId ? Number(editDeptId) : u.department_id,
                department_name: selectedDept ? selectedDept.dept_name : u.department_name,
              }
            : u
        )
      );
      toast.success(`อัปเดตข้อมูลพนักงาน ${editName} (${cleanEmpId}) สำเร็จ (Offline Mode)`);
      handleBackToList();
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Toggle Suspend / Active
  const handleToggleStatus = async (user: SystemUser) => {
    if (user.role === "supervisor" && user.is_active) {
      toast.error("ไม่อนุญาตให้ระงับการใช้งานบัญชีผู้ใช้ระดับ Supervisor (หัวหน้าช่าง)", {
        description: "ระบบป้องกันบัญชี Supervisor จากการระงับกันเอง เพื่อความมั่นคงของระบบ",
      });
      return;
    }

    const nextState = !user.is_active;
    try {
      const res = await api.patch(`/users/${user.id}/status`, {
        is_active: nextState,
      });

      toast.success(res.data?.message || `${nextState ? "เปิดใช้งาน" : "ระงับใช้งาน"} ${user.name} เรียบร้อยแล้ว`);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, is_active: nextState } : u))
      );
    } catch (err: any) {
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, is_active: nextState } : u))
      );
      toast.success(`${nextState ? "เปิดใช้งาน" : "ระงับใช้งาน"} ${user.name} เรียบร้อยแล้ว (Offline Mode)`);
    }
  };

  // Handle Reset Password Submit
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !newPassword.trim()) return;

    setSubmitting(true);
    try {
      const res = await api.post(`/users/${selectedUser.id}/reset-password`, {
        new_password: newPassword.trim(),
      });

      toast.success(res.data?.message || `ตั้งรหัสผ่านใหม่สำหรับ ${selectedUser.name} เรียบร้อยแล้ว`);
      setIsResetOpen(false);
      setNewPassword("");
    } catch (err: any) {
      console.error("Reset password error:", err);
      toast.error(err.message || `ไม่สามารถตั้งรหัสผ่านใหม่สำหรับ ${selectedUser.name} ได้`);
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered Users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.emp_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.department_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === "all" || u.role === filterRole;
    return matchesSearch && matchesRole;
  });

  // Vibrant Colorful Role Badges Matching Original Design Image 2
  const getRoleBadge = (role: string) => {
    switch (role) {
      case "supervisor":
        return (
          <Badge variant="outline" className="border-amber-500/50 text-amber-700 dark:text-amber-300 bg-amber-500/15 font-bold shadow-2xs px-2.5 py-0.5 rounded-full">
            👑 หัวหน้าช่าง
          </Badge>
        );
      case "technician":
        return (
          <Badge variant="outline" className="border-blue-500/50 text-blue-700 dark:text-blue-300 bg-blue-500/15 font-bold shadow-2xs px-2.5 py-0.5 rounded-full">
            🛠️ ช่างซ่อม
          </Badge>
        );
      case "requester":
        return (
          <Badge variant="outline" className="border-emerald-500/50 text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 font-bold shadow-2xs px-2.5 py-0.5 rounded-full">
            📋 ผู้แจ้งซ่อม
          </Badge>
        );
      case "inventory_clerk":
        return (
          <Badge variant="outline" className="border-purple-500/50 text-purple-700 dark:text-purple-300 bg-purple-500/15 font-bold shadow-2xs px-2.5 py-0.5 rounded-full">
            📦 เจ้าหน้าที่คลัง
          </Badge>
        );
      case "maintenance_planner":
        return (
          <Badge variant="outline" className="border-cyan-500/50 text-cyan-700 dark:text-cyan-300 bg-cyan-500/15 font-bold shadow-2xs px-2.5 py-0.5 rounded-full">
            🗓️ ผู้วางแผนซ่อม
          </Badge>
        );
      case "qc_inspector":
        return (
          <Badge variant="outline" className="border-indigo-500/50 text-indigo-700 dark:text-indigo-300 bg-indigo-500/15 font-bold shadow-2xs px-2.5 py-0.5 rounded-full">
            🔍 ผู้ตรวจ QC
          </Badge>
        );
      case "plant_manager":
        return (
          <Badge variant="outline" className="border-rose-500/50 text-rose-700 dark:text-rose-300 bg-rose-500/15 font-bold shadow-2xs px-2.5 py-0.5 rounded-full">
            🏭 ผู้จัดการโรงงาน
          </Badge>
        );
      default: {
        const matchedRole = rolesList.find((r) => r.code === role);
        return (
          <Badge variant="outline" className="border-primary/50 text-primary bg-primary/15 font-bold shadow-2xs px-2.5 py-0.5 rounded-full">
            🛡️ {matchedRole ? matchedRole.name : role}
          </Badge>
        );
      }
    }
  };

  return (
    <AppLayout
      title="จัดการผู้ใช้งานและสิทธิ์ (User & Role)"
      subtitle="บริหารจัดการบัญชีพนักงาน, กำหนดบทบาทสิทธิ์, เพิ่มพนักงานใหม่ และเปลี่ยนรหัสพนักงาน"
      actions={
        viewMode === "list" ? (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchUsersData} disabled={loading} className="gap-1.5 text-xs">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> รีเฟรชข้อมูล
            </Button>
            {canManageRoles && (
              <a href="/roles">
                <Button variant="secondary" size="sm" className="gap-1.5 text-xs font-semibold shadow-sm">
                  <ShieldCheck className="h-4 w-4 text-primary" /> จัดการบทบาท & สิทธิ์
                </Button>
              </a>
            )}
            {canManageUsers && (
              <Button variant="industrial" size="sm" onClick={handleOpenAdd} className="gap-1.5 text-xs font-bold shadow-sm">
                <UserPlus className="h-4 w-4" /> + เพิ่มพนักงานใหม่
              </Button>
            )}
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={handleBackToList} className="gap-1.5 text-xs">
            <ArrowLeft className="h-4 w-4" /> ย้อนกลับไปยังรายชื่อพนักงาน
          </Button>
        )
      }
    >
      <div className="space-y-6">
        {/* VIEW 1: USER LIST TABLE */}
        {viewMode === "list" && (
          <>
            {/* Search & Filter Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card/60 p-4 rounded-xl border border-border">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ค้นหารหัสพนักงาน, ชื่อ หรือแผนก..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 text-xs bg-background"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <span className="text-xs text-muted-foreground font-semibold">กรองตามบทบาท:</span>
                <Select value={filterRole} onValueChange={setFilterRole}>
                  <SelectTrigger className="w-[180px] h-9 text-xs bg-background">
                    <SelectValue placeholder="เลือกบทบาท" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">แสดงทั้งหมด</SelectItem>
                    {rolesList.map((r) => (
                      <SelectItem key={r.id} value={r.code}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
              {loading ? (
                <div className="p-12 text-center space-y-3">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                  <p className="text-xs text-muted-foreground">กำลังโหลดรายชื่อพนักงานจากฐานข้อมูล...</p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-12 text-center space-y-2">
                  <Users className="h-10 w-10 text-muted-foreground/50 mx-auto" />
                  <p className="text-sm font-semibold text-foreground">ไม่พบข้อมูลพนักงานที่ค้นหา</p>
                  <p className="text-xs text-muted-foreground">ลองเปลี่ยนคำค้นหาหรือกดเพิ่มพนักงานใหม่</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/40 border-b border-border">
                      <tr>
                        <th className="py-2.5 px-4">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-foreground">รหัสพนักงาน</span>
                            <span className="text-[10px] text-muted-foreground/80 font-mono tracking-wider">EMP ID</span>
                          </div>
                        </th>
                        <th className="py-2.5 px-4">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-foreground">ชื่อ-นามสกุล</span>
                            <span className="text-[10px] text-muted-foreground/80 font-mono tracking-wider">FULL NAME</span>
                          </div>
                        </th>
                        <th className="py-2.5 px-4">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-foreground">บทบาท</span>
                            <span className="text-[10px] text-muted-foreground/80 font-mono tracking-wider">USER ROLE</span>
                          </div>
                        </th>
                        <th className="py-2.5 px-4">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-foreground">แผนก</span>
                            <span className="text-[10px] text-muted-foreground/80 font-mono tracking-wider">DEPARTMENT</span>
                          </div>
                        </th>
                        <th className="py-2.5 px-4">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-foreground">สถานะบัญชี</span>
                            <span className="text-[10px] text-muted-foreground/80 font-mono tracking-wider">ACCOUNT STATUS</span>
                          </div>
                        </th>
                        <th className="py-2.5 px-4 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <span className="text-xs font-bold text-foreground">การจัดการ</span>
                            <span className="text-[10px] text-muted-foreground/80 font-mono tracking-wider">ACTIONS</span>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {filteredUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                            <td className="py-3.5 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">{user.emp_id}</td>
                            <td className="py-3.5 px-4 font-bold text-foreground">{user.name}</td>
                            <td className="py-3.5 px-4">{getRoleBadge(user.role)}</td>
                            <td className="py-3.5 px-4 text-muted-foreground font-medium">
                              <span className="flex items-center gap-1.5">
                                <Building2 className="h-3.5 w-3.5 text-muted-foreground/70" />
                                {user.department_name}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              {user.is_active ? (
                                <Badge variant="outline" className="border-emerald-500/50 text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 font-bold gap-1 px-2.5 py-0.5 rounded-full shadow-2xs">
                                  <UserCheck className="h-3 w-3 text-emerald-600 dark:text-emerald-400" /> ใช้งานปกติ
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="border-rose-500/50 text-rose-700 dark:text-rose-300 bg-rose-500/15 font-bold gap-1 px-2.5 py-0.5 rounded-full shadow-2xs">
                                  <UserX className="h-3 w-3 text-rose-600 dark:text-rose-400" /> ถูกระงับ
                                </Badge>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              {canManageUsers ? (
                                <div className="flex items-center justify-center gap-1.5 mx-auto">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleOpenEdit(user)}
                                    className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                                    title="แก้ไขข้อมูลและเปลี่ยนรหัสพนักงาน"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setSelectedUser(user);
                                      setIsResetOpen(true);
                                    }}
                                    className="h-8 w-8 text-muted-foreground hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950"
                                    title="ตั้งรหัสผ่านใหม่"
                                  >
                                    <KeyRound className="h-4 w-4" />
                                  </Button>
                                  <Switch
                                    checked={user.is_active}
                                    onCheckedChange={() => handleToggleStatus(user)}
                                    title={user.is_active ? "คลิกเพื่อระงับใช้งาน" : "คลิกเพื่อเปิดใช้งาน"}
                                  />
                                </div>
                              ) : (
                                <span className="text-[11px] text-muted-foreground">ดูได้อย่างเดียว</span>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* VIEW 2: FULL-PAGE ADD USER FORM */}
        {viewMode === "add" && (
          <form onSubmit={handleAddUserSubmit} className="space-y-6">
            {/* Action Header Bar */}
            <div className="bg-card p-4 md:p-6 rounded-2xl border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Button type="button" variant="outline" size="icon" onClick={handleBackToList} className="h-9 w-9 shrink-0">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-primary" /> เพิ่มพนักงานใหม่ (Create New Employee)
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    กำหนดรหัสพนักงาน ชื่อ-นามสกุล แผนก บทบาท และสร้างบัญชีผู้ใช้เข้าสู่ระบบ
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" onClick={handleBackToList} disabled={submitting}>
                  ยกเลิก
                </Button>
                <Button type="submit" variant="industrial" disabled={submitting} className="font-bold gap-2">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  บันทึกสร้างพนักงานใหม่
                </Button>
              </div>
            </div>

            {/* User Info Card */}
            <Card className="border shadow-xs">
              <CardHeader className="pb-3 border-b bg-card/60">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Info className="w-4 h-4 text-primary" /> ข้อมูลบัญชีผู้ใช้ (Account Profile)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Emp ID */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      รหัสพนักงาน (Employee ID) <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      placeholder="เช่น TECH004 หรือ REQ050"
                      value={addEmpId}
                      onChange={(e) => setAddEmpId(e.target.value)}
                      className="h-9 text-xs font-mono"
                      required
                    />
                    <p className="text-[11px] text-muted-foreground">ภาษาอังกฤษและตัวเลข ใช้สลับบทบาท/เข้าสู่ระบบ</p>
                  </div>

                  {/* Name */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      ชื่อ-นามสกุล <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      placeholder="เช่น สมชาย ใจดี"
                      value={addName}
                      onChange={(e) => setAddName(e.target.value)}
                      className="h-9 text-xs"
                      required
                    />
                    <p className="text-[11px] text-muted-foreground">ชื่อแสดงผลในใบแจ้งซ่อมและรายงาน</p>
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      รหัสผ่าน (Password) <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        type={showAddPassword ? "text" : "password"}
                        placeholder="อย่างน้อย 6 ตัวอักษร"
                        value={addPassword}
                        onChange={(e) => setAddPassword(e.target.value)}
                        className="h-9 text-xs font-mono pr-9"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowAddPassword(!showAddPassword)}
                        className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                      >
                        {showAddPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">ค่าเริ่มต้น: demo1234</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  {/* Role */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">บทบาทในระบบ (Role)</Label>
                    <Select value={addRole} onValueChange={setAddRole}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="เลือกบทบาท" />
                      </SelectTrigger>
                      <SelectContent>
                        {rolesList.map((r) => (
                          <SelectItem key={r.id} value={r.code}>
                            {r.name} ({r.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Department */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">สังกัดแผนก (Department)</Label>
                    <Select value={addDeptId} onValueChange={setAddDeptId}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="เลือกแผนก" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((d) => (
                          <SelectItem key={d.id} value={String(d.id)}>
                            {d.dept_name} ({d.dept_code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bottom Actions */}
            <div className="flex items-center justify-end gap-3 bg-card p-4 rounded-xl border shadow-sm">
              <Button type="button" variant="ghost" onClick={handleBackToList} disabled={submitting}>
                ยกเลิก
              </Button>
              <Button type="submit" variant="industrial" disabled={submitting} className="font-bold gap-2">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                บันทึกสร้างพนักงานใหม่
              </Button>
            </div>
          </form>
        )}

        {/* VIEW 3: FULL-PAGE EDIT USER FORM (Allows changing emp_id!) */}
        {viewMode === "edit" && selectedUser && (
          <form onSubmit={handleSaveEditSubmit} className="space-y-6">
            {/* Action Header Bar */}
            <div className="bg-card p-4 md:p-6 rounded-2xl border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Button type="button" variant="outline" size="icon" onClick={handleBackToList} className="h-9 w-9 shrink-0">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                    <Edit className="w-5 h-5 text-blue-500" /> แก้ไขข้อมูลพนักงาน: <span className="text-primary">{selectedUser.name}</span>
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    ปรับเปลี่ยนรหัสพนักงาน ชื่อ-นามสกุล ย้ายแผนก หรือเปลี่ยนบทบาทการใช้งาน
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" onClick={handleBackToList} disabled={submitting}>
                  ยกเลิก
                </Button>
                <Button type="submit" variant="industrial" disabled={submitting} className="font-bold gap-2">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  บันทึกการเปลี่ยนแปลง
                </Button>
              </div>
            </div>

            {/* Profile Info Card */}
            <Card className="border shadow-xs">
              <CardHeader className="pb-3 border-b bg-card/60">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Info className="w-4 h-4 text-primary" /> ข้อมูลส่วนตัวและรหัสพนักงาน (Editable Profile)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Emp ID (Editable!) */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      รหัสพนักงาน (Employee ID) <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      placeholder="เช่น TECH001"
                      value={editEmpId}
                      onChange={(e) => setEditEmpId(e.target.value)}
                      className="h-9 text-xs font-mono font-bold text-primary"
                      required
                    />
                    <p className="text-[11px] text-muted-foreground">สามารถแก้ไขรหัสพนักงานได้ (ระบบจะตรวจสอบว่าไม่ซ้ำกับผู้อื่น)</p>
                  </div>

                  {/* Name */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      ชื่อ-นามสกุล <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      placeholder="ชื่อ-นามสกุลพนักงาน"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-9 text-xs"
                      required
                    />
                    <p className="text-[11px] text-muted-foreground">ชื่อแสดงผลในระบบซ่อมบำรุง</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  {/* Role */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">ปรับเปลี่ยนบทบาท (Role)</Label>
                    <Select value={editRole} onValueChange={setEditRole}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="เลือกบทบาท" />
                      </SelectTrigger>
                      <SelectContent>
                        {rolesList.map((r) => (
                          <SelectItem key={r.id} value={r.code}>
                            {r.name} ({r.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedUser.emp_id === currentUser?.emp_id && (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-semibold mt-1">
                        <AlertTriangle className="h-3 w-3" /> ไม่อนุญาตให้ปรับลด/เปลี่ยนบทบาทตนเอง
                      </p>
                    )}
                  </div>

                  {/* Department */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">ย้ายแผนก (Department)</Label>
                    <Select value={editDeptId} onValueChange={setEditDeptId}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="เลือกแผนก" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((d) => (
                          <SelectItem key={d.id} value={String(d.id)}>
                            {d.dept_name} ({d.dept_code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bottom Actions */}
            <div className="flex items-center justify-end gap-3 bg-card p-4 rounded-xl border shadow-sm">
              <Button type="button" variant="ghost" onClick={handleBackToList} disabled={submitting}>
                ยกเลิก
              </Button>
              <Button type="submit" variant="industrial" disabled={submitting} className="font-bold gap-2">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                บันทึกการเปลี่ยนแปลง
              </Button>
            </div>
          </form>
        )}

        {/* MODAL: RESET PASSWORD (STAYS AS MODAL DIALOG) */}
        <Dialog open={isResetOpen} onOpenChange={setIsResetOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <KeyRound className="h-5 w-5" /> ตั้งรหัสผ่านใหม่: {selectedUser?.name}
              </DialogTitle>
              <DialogDescription className="text-xs">
                รหัสพนักงาน: <span className="font-mono font-bold text-foreground">{selectedUser?.emp_id}</span>
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">รหัสผ่านใหม่ (New Password)</Label>
                <div className="relative">
                  <Input
                    type={showResetPassword ? "text" : "password"}
                    placeholder="กรอกรหัสผ่านใหม่..."
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="h-9 text-xs font-mono pr-9"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    {showResetPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsResetOpen(false)}>
                  ยกเลิก
                </Button>
                <Button type="submit" variant="industrial" size="sm" disabled={submitting} className="font-bold">
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "บันทึกรหัสผ่านใหม่"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default UserManagement;
