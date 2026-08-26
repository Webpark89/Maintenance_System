import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Package,
  AlertTriangle,
  Plus,
  ArrowUpDown,
  Search,
  CheckCircle2,
  DollarSign,
  Boxes,
  MapPin,
  RefreshCw,
  Loader2,
  ArrowLeft,
  Tag,
  Warehouse,
  Save,
  Layers,
} from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { api } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";

interface SparePart {
  id: number;
  part_code: string;
  name: string;
  unit_price: number;
  stock_qty: number;
  min_stock_qty: number;
  unit: string;
  location_rack: string;
  category: string;
  is_low_stock: boolean;
  total_value: number;
}

export const InventoryManagement = () => {
  const currentUser = getCurrentUser();
  const canManageInventory = hasPermission("inventory:manage", currentUser);

  const [viewMode, setViewMode] = useState<"list" | "create">("list");
  const [parts, setParts] = useState<SparePart[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Summary counts
  const [summary, setSummary] = useState({
    total_items: 0,
    low_stock_count: 0,
    total_inventory_value: 0,
  });

  // Form State: Add Part (Full Page)
  const [addCode, setAddCode] = useState("");
  const [addName, setAddName] = useState("");
  const [addPrice, setAddPrice] = useState("");
  const [addQty, setAddQty] = useState("");
  const [addMinQty, setAddMinQty] = useState("5");
  const [addUnit, setAddUnit] = useState("ชิ้น");
  const [addRack, setAddRack] = useState("Rack-A1");
  const [addCategory, setAddCategory] = useState("ระบบไฟฟ้า");
  const [submitting, setSubmitting] = useState(false);

  // Modal State: Stock Adjustment
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [selectedPart, setSelectedPart] = useState<SparePart | null>(null);
  const [adjustType, setAdjustType] = useState<"in" | "out" | "set">("in");
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustReason, setAdjustReason] = useState("");

  const fetchParts = async () => {
    setLoading(true);
    try {
      const res = await api.get("/parts", {
        params: {
          search: searchTerm || undefined,
          category: selectedCategory !== "all" ? selectedCategory : undefined,
          low_stock_only: lowStockOnly ? "true" : undefined,
        },
      });

      if (res.data?.data) {
        setParts(res.data.data);
        if (res.data.summary) {
          setSummary(res.data.summary);
        }
      }
    } catch (err: any) {
      console.warn("Fetch parts offline fallback:", err);
      // Fallback Demo Data
      const demoParts: SparePart[] = [
        { id: 1, part_code: "PART-BRG-6204", name: "ตลับลูกปืน Deep Groove Bearing 6204", unit_price: 320, stock_qty: 4, min_stock_qty: 10, unit: "ชิ้น", location_rack: "Rack-A2", category: "ระบบกลไก", is_low_stock: true, total_value: 1280 },
        { id: 2, part_code: "PART-PLC-RLY24", name: "รีเลย์คอนโทรล Omron 24VDC", unit_price: 185, stock_qty: 18, min_stock_qty: 8, unit: "ตัว", location_rack: "Rack-E1", category: "ระบบไฟฟ้า", is_low_stock: false, total_value: 3330 },
        { id: 3, part_code: "PART-VLT-B45", name: "สายพานร่อง V-Belt Type B45", unit_price: 250, stock_qty: 2, min_stock_qty: 5, unit: "เส้น", location_rack: "Rack-C3", category: "ระบบส่งกำลัง", is_low_stock: true, total_value: 500 },
        { id: 4, part_code: "PART-OIL-ISO68", name: "น้ำมันไฮดรอลิก Shell Tellus S2 M 68 (20L)", unit_price: 2450, stock_qty: 12, min_stock_qty: 4, unit: "ถัง", location_rack: "Zone-Fluid", category: "สารหล่อลื่น", is_low_stock: false, total_value: 29400 },
      ];
      setParts(demoParts);
      setSummary({
        total_items: demoParts.length,
        low_stock_count: demoParts.filter((p) => p.is_low_stock).length,
        total_inventory_value: demoParts.reduce((acc, p) => acc + p.total_value, 0),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParts();
  }, [selectedCategory, lowStockOnly]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchParts();
  };

  // Handle Add Part
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addCode.trim() || !addName.trim()) {
      toast.error("กรุณากรอกรหัสอะไหล่และชื่ออะไหล่");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post("/parts", {
        part_code: addCode.trim().toUpperCase(),
        name: addName.trim(),
        unit_price: Number(addPrice) || 0,
        stock_qty: Number(addQty) || 0,
        min_stock_qty: Number(addMinQty) || 5,
        unit: addUnit.trim(),
        location_rack: addRack.trim(),
        category: addCategory,
      });

      toast.success(res.data?.message || `เพิ่มอะไหล่ ${addName} สำเร็จ`);
      resetAddForm();
      setViewMode("list");
      fetchParts();
    } catch (err: any) {
      toast.error(err.message || "ไม่สามารถเพิ่มรายการอะไหล่ได้");
    } finally {
      setSubmitting(false);
    }
  };

  const resetAddForm = () => {
    setAddCode("");
    setAddName("");
    setAddPrice("");
    setAddQty("");
    setAddMinQty("5");
    setAddUnit("ชิ้น");
    setAddRack("Rack-A1");
    setAddCategory("ระบบไฟฟ้า");
  };

  // Handle Adjust Stock
  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPart || !adjustQty) return;

    setSubmitting(true);
    try {
      const res = await api.post(`/parts/${selectedPart.id}/adjust`, {
        adjust_qty: Number(adjustQty),
        type: adjustType,
        reason: adjustReason.trim(),
      });

      toast.success(res.data?.message || `ปรับยอดสต็อกสำเร็จ`);
      setIsAdjustOpen(false);
      setAdjustQty("");
      setAdjustReason("");
      fetchParts();
    } catch (err: any) {
      toast.error(err.message || "ไม่สามารถปรับยอดสต็อกได้");
    } finally {
      setSubmitting(false);
    }
  };

  // ----------------------------------------------------
  // FULL PAGE VIEW: CREATE NEW SPARE PART
  // ----------------------------------------------------
  if (viewMode === "create") {
    return (
      <AppLayout
        title="เพิ่มรายการอะไหล่ใหม่ (New Spare Part)"
        subtitle="บันทึกข้อมูลอะไหล่, กำหนดรหัส, หมวดหมู่, ตำแหน่งจัดเก็บ และระดับแจ้งเตือนสต็อกขั้นต่ำ"
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
          <form onSubmit={handleAddSubmit} className="space-y-6">
            {/* Card 1: Basic Information */}
            <div className="bg-card rounded-2xl border p-5 sm:p-6 shadow-2xs space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b">
                <div className="h-9 w-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 grid place-items-center">
                  <Tag className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground">ข้อมูลทั่วไปของอะไหล่</h3>
                  <p className="text-xs text-muted-foreground">รหัสและรายละเอียดสเปกสำหรับค้นหา</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="part-code" className="text-sm font-semibold">
                    รหัสอะไหล่ (Part Code) <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="part-code"
                    value={addCode}
                    onChange={(e) => setAddCode(e.target.value)}
                    placeholder="เช่น PART-MTR-01, BRG-6204"
                    required
                    className="font-mono text-sm uppercase bg-muted/30 h-10 rounded-xl"
                  />
                  <p className="text-[11px] text-muted-foreground">ใช้ตัวอักษรภาษาอังกฤษ ตัวเลข และขีดกลาง</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="part-category" className="text-sm font-semibold">
                    หมวดหมู่งานซ่อมบำรุง
                  </Label>
                  <Select value={addCategory} onValueChange={setAddCategory}>
                    <SelectTrigger id="part-category" className="h-10 rounded-xl bg-muted/30">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ระบบไฟฟ้า">ระบบไฟฟ้า (Electrical)</SelectItem>
                      <SelectItem value="ระบบกลไก">ระบบกลไก (Mechanical)</SelectItem>
                      <SelectItem value="ระบบส่งกำลัง">ระบบส่งกำลัง (Power Transmission)</SelectItem>
                      <SelectItem value="สารหล่อลื่น">สารหล่อลื่น & สารเคมี (Fluid & Lubrication)</SelectItem>
                      <SelectItem value="อะไหล่ทั่วไป">อะไหล่ทั่วไป (General Consumables)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="part-name" className="text-sm font-semibold">
                  ชื่ออะไหล่ / รุ่น / สเปก <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="part-name"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="เช่น ตลับลูกปืน Deep Groove Bearing 6204, สายพานร่อง V-Belt Type B45"
                  required
                  className="h-10 rounded-xl bg-muted/30 text-sm"
                />
              </div>
            </div>

            {/* Card 2: Inventory & Storage */}
            <div className="bg-card rounded-2xl border p-5 sm:p-6 shadow-2xs space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b">
                <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 grid place-items-center">
                  <Warehouse className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground">การจัดเก็บและระดับสต็อก</h3>
                  <p className="text-xs text-muted-foreground">ตำแหน่งวางของและจำนวนแจ้งเตือนขั้นต่ำ</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="part-rack" className="text-sm font-semibold">
                    ตำแหน่งตู้ / ชั้นวาง (Location / Rack)
                  </Label>
                  <div className="relative">
                    <MapPin className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="part-rack"
                      value={addRack}
                      onChange={(e) => setAddRack(e.target.value)}
                      placeholder="เช่น Rack-A1, Zone-B2"
                      className="pl-9 h-10 rounded-xl bg-muted/30 font-mono text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="part-unit" className="text-sm font-semibold">
                    หน่วยนับ
                  </Label>
                  <Input
                    id="part-unit"
                    value={addUnit}
                    onChange={(e) => setAddUnit(e.target.value)}
                    placeholder="เช่น ชิ้น, ตัว, เส้น, ลิตร, ถัง"
                    className="h-10 rounded-xl bg-muted/30 text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="part-min" className="text-sm font-semibold">
                    แจ้งเตือนสต็อกขั้นต่ำ (Min Stock)
                  </Label>
                  <Input
                    id="part-min"
                    type="number"
                    min="1"
                    value={addMinQty}
                    onChange={(e) => setAddMinQty(e.target.value)}
                    placeholder="5"
                    className="h-10 rounded-xl bg-muted/30 font-mono text-sm"
                  />
                  <p className="text-[11px] text-muted-foreground">เมื่อเหลือต่ำกว่านี้จะขึ้นป้ายเตือนสีแดง</p>
                </div>
              </div>
            </div>

            {/* Card 3: Pricing & Quantity */}
            <div className="bg-card rounded-2xl border p-5 sm:p-6 shadow-2xs space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b">
                <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 grid place-items-center">
                  <DollarSign className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground">จำนวนตั้งต้นและราคาต่อหน่วย</h3>
                  <p className="text-xs text-muted-foreground">คำนวณมูลค่าสต็อกในระบบ</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="part-qty" className="text-sm font-semibold">
                    จำนวนสต็อกตั้งต้น
                  </Label>
                  <Input
                    id="part-qty"
                    type="number"
                    min="0"
                    value={addQty}
                    onChange={(e) => setAddQty(e.target.value)}
                    placeholder="0"
                    className="h-10 rounded-xl bg-muted/30 font-mono text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="part-price" className="text-sm font-semibold">
                    ราคาต่อหน่วย (฿)
                  </Label>
                  <Input
                    id="part-price"
                    type="number"
                    min="0"
                    step="0.5"
                    value={addPrice}
                    onChange={(e) => setAddPrice(e.target.value)}
                    placeholder="0.00"
                    className="h-10 rounded-xl bg-muted/30 font-mono text-sm"
                  />
                </div>
              </div>

              {Number(addPrice) > 0 && Number(addQty) > 0 && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 p-3.5 rounded-xl flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-300">
                  <span className="font-semibold">ประเมินมูลค่าสต็อกตั้งต้นรวม:</span>
                  <span className="font-bold font-mono text-base">
                    ฿{(Number(addPrice) * Number(addQty)).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </div>

            {/* Action Buttons Bar */}
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
                บันทึกรายการอะไหล่
              </Button>
            </div>
          </form>
        </div>
      </AppLayout>
    );
  }

  // ----------------------------------------------------
  // LIST VIEW: MAIN INVENTORY TABLE
  // ----------------------------------------------------
  return (
    <AppLayout
      title="คลังอะไหล่และการตัดสต็อก (Spare Parts & Inventory)"
      subtitle="ตรวจสอบรายการอะไหล่, ควบคุมระดับสต็อกขั้นต่ำ, รับเข้า และตัดเบิกสำหรับงานซ่อมบำรุง"
      actions={
        canManageInventory && (
          <Button
            onClick={() => {
              resetAddForm();
              setViewMode("create");
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 shadow-sm font-semibold rounded-xl"
          >
            <Plus className="h-4 w-4" /> เพิ่มอะไหล่ใหม่
          </Button>
        )
      }
    >
      <div className="space-y-6">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card p-4 md:p-5 rounded-2xl border shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">รายการอะไหล่ทั้งหมด</p>
              <h3 className="text-2xl font-bold font-mono text-foreground mt-1">{summary.total_items}</h3>
              <p className="text-[11px] text-muted-foreground/80 mt-0.5">ครอบคลุมทุกหมวดหมู่งานซ่อม</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 grid place-items-center">
              <Boxes className="h-6 w-6" />
            </div>
          </div>

          <div className={`bg-card p-4 md:p-5 rounded-2xl border shadow-2xs flex items-center justify-between ${summary.low_stock_count > 0 ? 'border-rose-500/40 bg-rose-500/5' : ''}`}>
            <div>
              <p className="text-xs text-muted-foreground font-medium">สต็อกวิกฤต (Low Stock)</p>
              <h3 className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-1">{summary.low_stock_count}</h3>
              <p className="text-[11px] text-rose-600/80 dark:text-rose-400/80 font-medium mt-0.5">ต่ำกว่าระดับแจ้งเตือนขั้นต่ำ</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 grid place-items-center">
              <AlertTriangle className="h-6 w-6" />
            </div>
          </div>

          <div className="bg-card p-4 md:p-5 rounded-2xl border shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">มูลค่าอะไหล่ในคลังรวม</p>
              <h3 className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                ฿{summary.total_inventory_value.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-[11px] text-muted-foreground/80 mt-0.5">ประเมินตามราคาต่อหน่วย</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 grid place-items-center">
              <DollarSign className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-card p-4 rounded-2xl border shadow-2xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหารหัสอะไหล่, ชื่ออะไหล่ หรือตำแหน่งชั้นวาง..."
              className="pl-9 bg-muted/40 h-10 rounded-xl"
            />
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[160px] h-10 rounded-xl">
                <SelectValue placeholder="หมวดหมู่" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกหมวดหมู่</SelectItem>
                <SelectItem value="ระบบไฟฟ้า">ระบบไฟฟ้า</SelectItem>
                <SelectItem value="ระบบกลไก">ระบบกลไก</SelectItem>
                <SelectItem value="ระบบส่งกำลัง">ระบบส่งกำลัง</SelectItem>
                <SelectItem value="สารหล่อลื่น">สารหล่อลื่น</SelectItem>
                <SelectItem value="อะไหล่ทั่วไป">อะไหล่ทั่วไป</SelectItem>
              </SelectContent>
            </Select>

            <Button
              type="button"
              variant={lowStockOnly ? "destructive" : "outline"}
              onClick={() => setLowStockOnly(!lowStockOnly)}
              className="h-10 rounded-xl gap-1.5 font-medium"
            >
              <AlertTriangle className="h-4 w-4" />
              {lowStockOnly ? "แสดงทั้งหมด" : "เฉพาะสต็อกต่ำ"}
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={fetchParts}
              disabled={loading}
              className="h-10 w-10 rounded-xl"
              title="รีเฟรชข้อมูล"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Inventory Table */}
        <div className="bg-card rounded-2xl border shadow-2xs overflow-hidden">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-sm font-medium">กำลังโหลดข้อมูลสต็อกอะไหล่...</p>
            </div>
          ) : parts.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
              <p className="font-semibold text-foreground">ไม่พบรายการอะไหล่ตามเงื่อนไข</p>
              <p className="text-xs text-muted-foreground mt-1">ลองเปลี่ยนคำค้นหาหรือตัวกรองหมวดหมู่</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/60 text-muted-foreground uppercase text-[11px] font-semibold border-b">
                  <tr>
                    <th className="py-3 px-4">รหัสอะไหล่</th>
                    <th className="py-3 px-4">ชื่ออะไหล่ / หมวดหมู่</th>
                    <th className="py-3 px-4">ตำแหน่งตู้/ชั้น</th>
                    <th className="py-3 px-4 text-right">ราคาต่อหน่วย</th>
                    <th className="py-3 px-4 text-center">คงเหลือ / ขั้นต่ำ</th>
                    <th className="py-3 px-4 text-center">สถานะสต็อก</th>
                    <th className="py-3 px-4 text-center">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {parts.map((part) => (
                    <tr key={part.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {part.part_code}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-foreground">{part.name}</p>
                        <p className="text-[11px] text-muted-foreground">{part.category}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md border">
                          <MapPin className="h-3 w-3 text-muted-foreground/70" />
                          {part.location_rack}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-medium">
                        ฿{part.unit_price.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono">
                        <span className={`font-bold ${part.is_low_stock ? 'text-rose-600 dark:text-rose-400' : 'text-foreground'}`}>
                          {part.stock_qty}
                        </span>
                        <span className="text-muted-foreground/70 text-xs"> / Min {part.min_stock_qty} {part.unit}</span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {part.is_low_stock ? (
                          <Badge variant="destructive" className="gap-1 font-semibold px-2 py-0.5 rounded-full shadow-2xs">
                            <AlertTriangle className="h-3 w-3" /> สต็อกต่ำ
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-emerald-500/50 text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 font-semibold gap-1 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="h-3 w-3" /> ปกติ
                          </Badge>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {canManageInventory && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedPart(part);
                              setAdjustType("in");
                              setAdjustQty("");
                              setAdjustReason("");
                              setIsAdjustOpen(true);
                            }}
                            className="h-8 gap-1 rounded-lg text-xs font-semibold"
                          >
                            <ArrowUpDown className="h-3.5 w-3.5 text-blue-600" /> ปรับยอด
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: STOCK ADJUSTMENT */}
      <Dialog open={isAdjustOpen} onOpenChange={setIsAdjustOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <ArrowUpDown className="h-5 w-5 text-blue-600" /> ปรับยอดสต็อกอะไหล่
            </DialogTitle>
          </DialogHeader>

          {selectedPart && (
            <form onSubmit={handleAdjustSubmit} className="space-y-4 py-2">
              <div className="bg-muted/40 p-3 rounded-xl border">
                <p className="font-semibold text-foreground">{selectedPart.name}</p>
                <p className="text-xs font-mono text-blue-600 dark:text-blue-400 mt-0.5">{selectedPart.part_code}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  ยอดคงเหลือปัจจุบัน: <span className="font-bold font-mono text-foreground">{selectedPart.stock_qty}</span> {selectedPart.unit}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>ประเภทการปรับยอด</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    variant={adjustType === "in" ? "default" : "outline"}
                    onClick={() => setAdjustType("in")}
                    className={adjustType === "in" ? "bg-emerald-600 text-white" : ""}
                  >
                    + รับเข้าคลัง
                  </Button>
                  <Button
                    type="button"
                    variant={adjustType === "out" ? "destructive" : "outline"}
                    onClick={() => setAdjustType("out")}
                  >
                    - ตัดจ่าย/ทิ้ง
                  </Button>
                  <Button
                    type="button"
                    variant={adjustType === "set" ? "default" : "outline"}
                    onClick={() => setAdjustType("set")}
                    className={adjustType === "set" ? "bg-blue-600 text-white" : ""}
                  >
                    ตั้งยอดใหม่
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="adjust-qty">จำนวน ({selectedPart.unit}) *</Label>
                <Input
                  id="adjust-qty"
                  type="number"
                  min="1"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  placeholder="เช่น 10"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="adjust-reason">เหตุผล / เลขที่ใบสั่งซื้อ</Label>
                <Input
                  id="adjust-reason"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="เช่น รับของตาม PO-2026-001, นับสต็อกประจำเดือน"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setIsAdjustOpen(false)}>
                  ยกเลิก
                </Button>
                <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "ยืนยันการปรับยอด"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default InventoryManagement;
