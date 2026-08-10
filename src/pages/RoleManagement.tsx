import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  ShieldCheck,
  Plus,
  Edit,
  Trash2,
  Lock,
  Loader2,
  RefreshCw,
  Search,
  CheckCircle2,
  ShieldAlert,
  ArrowLeft,
  Save,
  CheckSquare,
  Square,
  Users,
  Layers,
  Key,
  Info,
  Eye,
  X,
} from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { api } from "@/lib/api";
import { AppLayout } from "@/components/AppLayout";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";

export interface PermissionItem {
  id: number;
  code: string;
  name: string;
  module: string;
}

export interface RoleItem {
  id: number;
  code: string;
  name: string;
  description: string;
  is_system: boolean;
  user_count: number;
  permissions: PermissionItem[];
  permission_ids: number[];
  created_at?: string;
}

const MODULE_NAMES: Record<string, { label: string; icon: string; description: string }> = {
  work_order: { label: "งานซ่อมบำรุง (Work Order)", icon: "📋", description: "แจ้งซ่อม, มอบหมายงาน, บันทึกผลการซ่อม และยกเลิกงาน" },
  requisition: { label: "การเบิกอะไหล่ (Spare Parts)", icon: "📦", description: "เบิกอะไหล่ซ่อมบำรุง และอนุมัติการเบิก" },
  asset: { label: "ทะเบียนเครื่องจักร & QR Tag (Asset)", icon: "🏭", description: "จัดการทะเบียนเครื่องจักร, สร้าง QR Code และแก้ไขข้อมูล" },
  user: { label: "การจัดการผู้ใช้งาน (User Management)", icon: "👥", description: "จัดการพนักงาน, บัญชีผู้ใช้, และกำหนดแผนก" },
  role: { label: "บทบาทและสิทธิ์ (Roles & Permissions)", icon: "🛡️", description: "สร้าง/แก้ไขบทบาท และกำหนดสิทธิ์การใช้งานระบบ" },
  dashboard: { label: "รายงานและสถิติ (Dashboard)", icon: "📊", description: "เข้าถึง Dashboard KPI, MTTR และ MTBF" },
};

type ViewMode = "list" | "create" | "edit";

export default function RoleManagement() {
  const currentUser = getCurrentUser();
  const canManageRoles = hasPermission("role:manage", currentUser);

  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [allPermissions, setAllPermissions] = useState<PermissionItem[]>([]);
  const [groupedPermissions, setGroupedPermissions] = useState<Record<string, PermissionItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Slide-over Right Sheet State (1/3 Screen Drawer for View Details)
  const [selectedViewRole, setSelectedViewRole] = useState<RoleItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Full Page View Mode
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedEditRole, setSelectedEditRole] = useState<RoleItem | null>(null);

  // Form states
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        api.get("/roles"),
        api.get("/permissions"),
      ]);

      if (rolesRes.data?.success) {
        setRoles(rolesRes.data.data);
      }
      if (permsRes.data?.success) {
        setAllPermissions(permsRes.data.data);
        setGroupedPermissions(permsRes.data.grouped || {});
      }
    } catch (error: any) {
      toast.error("ไม่สามารถโหลดข้อมูลบทบาทและสิทธิ์ได้", {
        description: error?.response?.data?.message || "โปรดตรวจสอบการเชื่อมต่อเซิร์ฟเวอร์",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetails = (role: RoleItem) => {
    setSelectedViewRole(role);
    setIsDetailOpen(true);
  };

  const handleOpenAdd = () => {
    setSelectedEditRole(null);
    setFormCode("");
    setFormName("");
    setFormDescription("");
    setSelectedPermissionIds([]);
    setViewMode("create");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleOpenEdit = (role: RoleItem) => {
    setSelectedEditRole(role);
    setFormCode(role.code);
    setFormName(role.name);
    setFormDescription(role.description || "");
    setSelectedPermissionIds(role.permission_ids || []);
    setViewMode("edit");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBackToList = () => {
    setViewMode("list");
    setSelectedEditRole(null);
  };

  const togglePermission = (permId: number) => {
    setSelectedPermissionIds((prev) =>
      prev.includes(permId) ? prev.filter((id) => id !== permId) : [...prev, permId]
    );
  };

  const toggleModulePermissions = (items: PermissionItem[]) => {
    const modulePermIds = items.map((i) => i.id);
    const allSelected = modulePermIds.every((id) => selectedPermissionIds.includes(id));

    if (allSelected) {
      setSelectedPermissionIds((prev) => prev.filter((id) => !modulePermIds.includes(id)));
    } else {
      setSelectedPermissionIds((prev) => Array.from(new Set([...prev, ...modulePermIds])));
    }
  };

  const selectAllPermissions = () => {
    setSelectedPermissionIds(allPermissions.map((p) => p.id));
  };

  const clearAllPermissions = () => {
    setSelectedPermissionIds([]);
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();

    if (viewMode === "create" && (!formCode.trim() || !formName.trim())) {
      toast.error("กรุณากรอกรหัสและชื่อบทบาทให้ครบถ้วน");
      return;
    }

    if (viewMode === "edit" && !formName.trim()) {
      toast.error("กรุณากรอกชื่อบทบาท");
      return;
    }

    setSubmitting(true);
    try {
      if (viewMode === "create") {
        const res = await api.post("/roles", {
          code: formCode.trim(),
          name: formName.trim(),
          description: formDescription.trim(),
          permission_ids: selectedPermissionIds,
        });

        if (res.data?.success) {
          toast.success(`สร้างบทบาท "${formName}" เรียบร้อยแล้ว`);
          handleBackToList();
          fetchData();
        }
      } else if (viewMode === "edit" && selectedEditRole) {
        const res = await api.patch(`/roles/${selectedEditRole.id}`, {
          name: formName.trim(),
          description: formDescription.trim(),
          permission_ids: selectedPermissionIds,
        });

        if (res.data?.success) {
          toast.success(`อัปเดตบทบาท "${formName}" เรียบร้อยแล้ว`);
          handleBackToList();
          fetchData();
        }
      }
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาดในการบันทึกข้อมูล", {
        description: error?.response?.data?.message || "โปรดลองใหม่อีกครั้ง",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRole = async (role: RoleItem) => {
    if (role.is_system) {
      toast.error("ไม่อนุญาตให้ลบบทบาทหลักของระบบ (System Role)");
      return;
    }

    if (role.user_count > 0) {
      toast.error(`ไม่สามารถลบได้ เนื่องจากมีผู้ใช้อยู่ในบทบาทนี้ ${role.user_count} คน`);
      return;
    }

    if (!confirm(`คุณแน่ใจหรือไม่ที่จะลบบทบาท "${role.name}"?`)) return;

    try {
      const res = await api.delete(`/roles/${role.id}`);
      if (res.data?.success) {
        toast.success(`ลบบทบาท "${role.name}" เรียบร้อยแล้ว`);
        fetchData();
      }
    } catch (error: any) {
      toast.error("ไม่สามารถลบบทบาทได้", {
        description: error?.response?.data?.message || "เกิดข้อผิดพลาด",
      });
    }
  };

  const filteredRoles = roles.filter(
    (r) =>
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!canManageRoles) {
    return (
      <AppLayout
        title="จัดการบทบาทและสิทธิ์ (Dynamic RBAC)"
        subtitle="เข้าถึงเฉพาะหัวหน้าช่าง หรือผู้ใช้ที่มีสิทธิ์ [role:manage] เท่านั้น"
      >
        <div className="space-y-6">
          <Card className="border-destructive/30 bg-destructive/5 dark:bg-destructive/10">
            <CardHeader className="text-center py-10">
              <div className="mx-auto w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center text-destructive mb-3">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <CardTitle className="text-destructive text-xl font-bold">ไม่มีสิทธิ์เข้าถึงหน้าจอนี้</CardTitle>
              <CardDescription className="text-sm">
                บัญชีผู้ใช้ของคุณไม่มีสิทธิ์ [role:manage] ในการบริหารจัดการบทบาทและสิทธิ์ของระบบ
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="จัดการบทบาทและสิทธิ์ (Dynamic RBAC)"
      subtitle="บริหารจัดการบทบาทพนักงาน (Roles) และกำหนดสิทธิ์การใช้งาน (Permissions) ในรูปแบบตารางตาราง"
      actions={
        viewMode === "list" ? (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="gap-1.5 text-xs">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> รีเฟรชข้อมูล
            </Button>
            <Button variant="industrial" size="sm" onClick={handleOpenAdd} className="gap-1.5 text-xs font-bold shadow-sm">
              <Plus className="h-4 w-4" /> + สร้างบทบาทใหม่
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={handleBackToList} className="gap-1.5 text-xs">
            <ArrowLeft className="h-4 w-4" /> ย้อนกลับไปยังรายการบทบาท
          </Button>
        )
      }
    >
      <div className="space-y-6">
        {/* VIEW 1: TABLE VIEW OF ROLES (Matching UserManagement.tsx Table Style) */}
        {viewMode === "list" && (
          <>
            {/* Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card/60 p-4 rounded-xl border border-border">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ค้นหารหัสบทบาท, ชื่อบทบาท หรือคำอธิบาย..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 text-xs bg-background"
                />
              </div>

              <div className="flex items-center gap-3 text-xs text-muted-foreground w-full sm:w-auto justify-end">
                <div className="flex items-center gap-1.5 bg-muted/50 px-3 py-1.5 rounded-lg border">
                  <Layers className="w-3.5 h-3.5 text-primary" />
                  <span>บทบาททั้งหมด: <strong className="text-foreground">{roles.length}</strong></span>
                </div>
                <div className="flex items-center gap-1.5 bg-muted/50 px-3 py-1.5 rounded-lg border">
                  <Key className="w-3.5 h-3.5 text-emerald-500" />
                  <span>สิทธิ์การใช้งาน: <strong className="text-foreground">{allPermissions.length}</strong> รายการ</span>
                </div>
              </div>
            </div>

            {/* Roles Table */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
              {loading ? (
                <div className="p-12 text-center space-y-3">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                  <p className="text-xs text-muted-foreground">กำลังโหลดรายชื่อบทบาทและสิทธิ์จากฐานข้อมูล PostgreSQL...</p>
                </div>
              ) : filteredRoles.length === 0 ? (
                <div className="p-12 text-center space-y-2">
                  <Layers className="h-10 w-10 text-muted-foreground/50 mx-auto" />
                  <p className="text-sm font-semibold text-foreground">ไม่พบข้อมูลบทบาทที่ค้นหา</p>
                  <p className="text-xs text-muted-foreground">ลองเปลี่ยนคำค้นหาหรือกดเพิ่มบทบาทใหม่</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead className="py-2.5 w-[160px]">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-foreground">รหัสบทบาท</span>
                            <span className="text-[10px] text-muted-foreground/80 font-mono tracking-wider">ROLE CODE</span>
                          </div>
                        </TableHead>
                        <TableHead className="py-2.5 w-[220px]">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-foreground">ชื่อบทบาท</span>
                            <span className="text-[10px] text-muted-foreground/80 font-mono tracking-wider">ROLE NAME</span>
                          </div>
                        </TableHead>
                        <TableHead className="py-2.5">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-foreground">คำอธิบาย</span>
                            <span className="text-[10px] text-muted-foreground/80 font-mono tracking-wider">DESCRIPTION</span>
                          </div>
                        </TableHead>
                        <TableHead className="py-2.5 w-[130px]">
                          <div className="flex flex-col items-center">
                            <span className="text-xs font-bold text-foreground">ผู้ใช้งาน</span>
                            <span className="text-[10px] text-muted-foreground/80 font-mono tracking-wider">USERS</span>
                          </div>
                        </TableHead>
                        <TableHead className="py-2.5 w-[140px]">
                          <div className="flex flex-col items-center">
                            <span className="text-xs font-bold text-foreground">สิทธิ์</span>
                            <span className="text-[10px] text-muted-foreground/80 font-mono tracking-wider">PERMISSIONS</span>
                          </div>
                        </TableHead>
                        <TableHead className="py-2.5 w-[150px]">
                          <div className="flex flex-col items-center">
                            <span className="text-xs font-bold text-foreground">การจัดการ</span>
                            <span className="text-[10px] text-muted-foreground/80 font-mono tracking-wider">ACTIONS</span>
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y">
                      {filteredRoles.map((role) => (
                        <TableRow key={role.id} className="hover:bg-muted/30 transition-colors">
                          {/* Role Code */}
                          <TableCell className="font-mono text-xs font-bold text-primary">
                            {role.code}
                          </TableCell>

                          {/* Role Name + System Badge */}
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-foreground">{role.name}</span>
                              {role.is_system && (
                                <Badge variant="outline" className="text-[10px] gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 font-semibold px-1.5 py-0">
                                  <Lock className="w-2.5 h-2.5" /> System Role
                                </Badge>
                              )}
                            </div>
                          </TableCell>

                          {/* Description */}
                          <TableCell className="text-xs text-muted-foreground">
                            {role.description || "ไม่มีคำอธิบายเพิ่มเติม"}
                          </TableCell>

                          {/* Users Count */}
                          <TableCell className="text-center">
                            <Badge variant="secondary" className="text-xs font-medium gap-1">
                              <Users className="w-3 h-3 text-muted-foreground" /> {role.user_count} คน
                            </Badge>
                          </TableCell>

                          {/* Permissions Badge Count */}
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-xs font-semibold bg-primary/5 text-primary border-primary/20">
                              {role.permissions.length} / {allPermissions.length} สิทธิ์
                            </Badge>
                          </TableCell>

                          {/* Actions: View Details (Drawer), Edit (Full Page), Delete */}
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1 mx-auto">
                              {/* 👁️ View Details Drawer Button */}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenDetails(role)}
                                className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                title="ดูรายละเอียดสิทธิ์"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>

                              {/* ✏️ Edit Full Page Button */}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenEdit(role)}
                                className="h-8 w-8 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
                                title="แก้ไขชื่อบทบาทและกำหนดสิทธิ์"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>

                              {/* 🗑️ Delete Button */}
                              {!role.is_system ? (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteRole(role)}
                                  disabled={role.user_count > 0}
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-30"
                                  title={role.user_count > 0 ? "ไม่สามารถลบได้เนื่องจากมีผู้ใช้งานอยู่" : "ลบบทบาท"}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              ) : (
                                <span className="w-8 inline-block" />
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </>
        )}

        {/* RIGHT SLIDE-OVER SHEET (DRAWER) FOR VIEW DETAILS - Occupies ~1/3 Screen Width (35vw / 480px) */}
        <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <SheetContent side="right" className="w-full sm:max-w-md md:max-w-lg lg:w-[35vw] max-w-[540px] p-0 flex flex-col">
            <SheetHeader className="p-6 border-b bg-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-6 h-6 text-primary" />
                  <SheetTitle className="text-lg font-bold text-foreground">
                    รายละเอียดบทบาท: {selectedViewRole?.name}
                  </SheetTitle>
                </div>
              </div>
              <SheetDescription className="text-xs text-muted-foreground mt-1">
                รหัสบทบาท: <span className="font-mono font-bold text-foreground">{selectedViewRole?.code}</span>
                {selectedViewRole?.is_system && (
                  <Badge variant="outline" className="ml-2 text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
                    System Role
                  </Badge>
                )}
              </SheetDescription>
            </SheetHeader>

            {selectedViewRole && (
              <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                {/* Basic Details */}
                <div className="bg-muted/40 p-4 rounded-xl border space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground font-semibold">จำนวนผู้ใช้อยู่ในบทบาท:</span>
                    <Badge variant="secondary" className="font-bold">
                      <Users className="w-3 h-3 mr-1" /> {selectedViewRole.user_count} คน
                    </Badge>
                  </div>
                  <div className="text-xs">
                    <span className="text-muted-foreground font-semibold block mb-0.5">คำอธิบาย:</span>
                    <p className="text-foreground leading-relaxed">{selectedViewRole.description || "ไม่มีคำอธิบายเพิ่มเติม"}</p>
                  </div>
                </div>

                {/* Permissions Breakdown Grouped by Module */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                      <Key className="w-4 h-4 text-emerald-500" /> รายการสิทธิ์ที่ได้รับอนุญาต
                    </h4>
                    <Badge variant="outline" className="text-xs font-semibold bg-primary/10 text-primary border-primary/30">
                      {selectedViewRole.permissions.length} / {allPermissions.length} สิทธิ์
                    </Badge>
                  </div>

                  {selectedViewRole.permissions.length > 0 ? (
                    <div className="space-y-3">
                      {Object.entries(
                        selectedViewRole.permissions.reduce((acc: Record<string, PermissionItem[]>, curr) => {
                          if (!acc[curr.module]) acc[curr.module] = [];
                          acc[curr.module].push(curr);
                          return acc;
                        }, {})
                      ).map(([modKey, permList]) => {
                        const modInfo = MODULE_NAMES[modKey] || { label: modKey, icon: "📁", description: "" };
                        return (
                          <div key={modKey} className="bg-card p-3 rounded-xl border text-xs shadow-2xs space-y-2">
                            <div className="font-bold text-foreground text-xs flex items-center justify-between border-b pb-1.5">
                              <span className="flex items-center gap-1.5">
                                <span>{modInfo.icon}</span>
                                <span>{modInfo.label}</span>
                              </span>
                              <Badge variant="secondary" className="text-[10px] font-semibold">
                                {permList.length} สิทธิ์
                              </Badge>
                            </div>
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {permList.map((p) => (
                                <Badge key={p.id} variant="outline" className="text-[11px] font-medium bg-muted/50 border">
                                  {p.name} <span className="text-[9px] font-mono text-muted-foreground ml-1">({p.code})</span>
                                </Badge>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-6 rounded-xl bg-destructive/5 border border-destructive/20 text-center space-y-2">
                      <p className="text-sm font-bold text-destructive">ไม่มีสิทธิ์ใช้งานใดๆ (Default Deny)</p>
                      <p className="text-xs text-muted-foreground">ผู้ใช้ในบทบาทนี้จะไม่สามารถทำรายการใดๆ ในระบบได้</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="p-4 border-t bg-muted/20 flex items-center justify-between">
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  setIsDetailOpen(false);
                  if (selectedViewRole) handleOpenEdit(selectedViewRole);
                }}
                className="w-full text-xs font-bold"
              >
                <Edit className="w-3.5 h-3.5 mr-1.5" /> แก้ไขบทบาทและสิทธิ์นี้
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        {/* VIEW 2 & 3: FULL PAGE CREATE / EDIT ROLE FORM */}
        {(viewMode === "create" || viewMode === "edit") && (
          <form onSubmit={handleSaveRole} className="space-y-6">
            {/* Top Navigation & Action Header */}
            <div className="bg-card p-4 md:p-6 rounded-2xl border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Button type="button" variant="outline" size="icon" onClick={handleBackToList} className="h-9 w-9 shrink-0">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                    {viewMode === "create" ? (
                      <>
                        <Plus className="w-5 h-5 text-primary" /> สร้างบทบาทใหม่ (Create New Role)
                      </>
                    ) : (
                      <>
                        <Edit className="w-5 h-5 text-blue-500" /> แก้ไขบทบาท: <span className="text-primary">{selectedEditRole?.name}</span>
                      </>
                    )}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {viewMode === "create"
                      ? "กำหนดชื่อบทบาทใหม่และทำเครื่องหมายเลือกสิทธิ์ที่อนุญาตให้บทบาทนี้ทำรายการได้"
                      : `ปรับแต่งรายละเอียดสิทธิ์ permissions สำหรับบทบาท ${selectedEditRole?.name} (${selectedEditRole?.code})`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" onClick={handleBackToList} disabled={submitting}>
                  ยกเลิก
                </Button>
                <Button type="submit" variant="industrial" disabled={submitting} className="font-bold gap-2">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {viewMode === "create" ? "บันทึกสร้างบทบาท" : "บันทึกการเปลี่ยนแปลง"}
                </Button>
              </div>
            </div>

            {/* Card 1: Role Basic Info */}
            <Card className="border shadow-xs">
              <CardHeader className="pb-3 border-b bg-card/60">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Info className="w-4 h-4 text-primary" /> ข้อมูลพื้นฐานของบทบาท (Role Details)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      รหัสบทบาท (Role Code) <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      placeholder="เช่น inventory_clerk"
                      value={formCode}
                      onChange={(e) => setFormCode(e.target.value)}
                      disabled={viewMode === "edit"}
                      className={`h-9 text-xs ${viewMode === "edit" ? "bg-muted font-mono" : ""}`}
                      required
                    />
                    <p className="text-[11px] text-muted-foreground">
                      {viewMode === "edit"
                        ? "รหัสบทบาทคงที่ไม่สามารถแก้ไขได้"
                        : "ภาษาอังกฤษตัวพิมพ์เล็ก ห้ามมีช่องว่าง ใช้เป็น Identifier ในระบบ"}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      ชื่อบทบาท (Role Name) <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      placeholder="เช่น เจ้าหน้าที่คลังอะไหล่"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="h-9 text-xs"
                      required
                    />
                    <p className="text-[11px] text-muted-foreground">ชื่อแสดงผลของบทบาทในระบบและหน้าจอผู้ใช้งาน</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">คำอธิบายหน้าที่และความรับผิดชอบ</Label>
                  <Input
                    placeholder="เช่น สามารถอนุมัติการเบิกอะไหล่ จัดการสต็อกเครื่องจักร..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Permissions Matrix Checklist */}
            <Card className="border shadow-xs">
              <CardHeader className="pb-3 border-b bg-card/60 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Key className="w-4 h-4 text-emerald-500" /> กำหนดสิทธิ์การใช้งาน (Permissions Matrix)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    เลือกสิทธิ์การทำรายการที่ต้องการให้อนุญาต (Default Deny — หากไม่เลือกจะไม่อนุญาตอัตโนมัติ)
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs font-bold bg-primary/10 text-primary border-primary/30 mr-2">
                    เลือกแล้ว {selectedPermissionIds.length} / {allPermissions.length} สิทธิ์
                  </Badge>
                  <Button type="button" variant="outline" size="sm" onClick={selectAllPermissions} className="text-xs gap-1 h-8">
                    <CheckSquare className="w-3.5 h-3.5 text-emerald-500" /> เลือกทั้งหมด
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={clearAllPermissions} className="text-xs gap-1 h-8">
                    <Square className="w-3.5 h-3.5 text-muted-foreground" /> ล้างทั้งหมด
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="pt-4 space-y-6">
                {Object.entries(groupedPermissions).map(([modKey, items]) => {
                  const modMeta = MODULE_NAMES[modKey] || {
                    label: modKey,
                    icon: "📁",
                    description: "สิทธิ์การใช้งานทั่วไป",
                  };
                  const modulePermIds = items.map((i) => i.id);
                  const isAllSelected = modulePermIds.every((id) => selectedPermissionIds.includes(id));
                  const selectedCountInModule = modulePermIds.filter((id) => selectedPermissionIds.includes(id)).length;

                  return (
                    <div key={modKey} className="border rounded-xl p-4 bg-card shadow-2xs space-y-3">
                      {/* Module Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{modMeta.icon}</span>
                          <div>
                            <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                              {modMeta.label}
                              <Badge variant="secondary" className="text-[10px] font-normal">
                                {selectedCountInModule} / {items.length}
                              </Badge>
                            </h4>
                            <p className="text-[11px] text-muted-foreground">{modMeta.description}</p>
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs font-semibold text-primary hover:bg-primary/10 self-start sm:self-auto"
                          onClick={() => toggleModulePermissions(items)}
                        >
                          {isAllSelected ? "ยกเลิกทั้งหมวดนี้" : "เลือกทั้งหมวดนี้"}
                        </Button>
                      </div>

                      {/* Checkboxes Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
                        {items.map((perm) => {
                          const isChecked = selectedPermissionIds.includes(perm.id);
                          return (
                            <label
                              key={perm.id}
                              className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                                isChecked
                                  ? "bg-primary/5 border-primary/40 shadow-2xs dark:bg-primary/10"
                                  : "bg-background border-border/70 hover:border-primary/30 hover:bg-muted/30"
                              }`}
                            >
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={() => togglePermission(perm.id)}
                                className="mt-0.5"
                              />
                              <div className="space-y-0.5">
                                <span className={`text-xs font-bold block ${isChecked ? "text-primary" : "text-foreground"}`}>
                                  {perm.name}
                                </span>
                                <span className="text-[10px] font-mono text-muted-foreground block">{perm.code}</span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Bottom Floating/Fixed Save Actions */}
            <div className="flex items-center justify-end gap-3 bg-card p-4 rounded-xl border shadow-sm">
              <Button type="button" variant="ghost" onClick={handleBackToList} disabled={submitting}>
                ยกเลิก
              </Button>
              <Button type="submit" variant="industrial" disabled={submitting} className="font-bold gap-2">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {viewMode === "create" ? "บันทึกสร้างบทบาทใหม่" : "บันทึกการเปลี่ยนแปลงสิทธิ์"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </AppLayout>
  );
}
