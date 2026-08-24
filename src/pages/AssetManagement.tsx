import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createAssetApi, AssetMachine, assetStore, useAssets } from "@/lib/assetStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Factory,
  Layers,
  MapPin,
  Plus,
  Printer,
  QrCode,
  Search,
  SlidersHorizontal,
  Trash2,
  Wrench,
  Zap,
  Save,
  Info,
  Edit,
  RefreshCw,
  AlertCircle,
  Eye,
  X,
  ShieldAlert,
} from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { AppLayout } from "@/components/AppLayout";
import { getCurrentUser } from "@/lib/auth";

type ViewMode = "list" | "add" | "edit";

const HOURS_24 = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES_60 = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

interface TimePicker24hProps {
  label: string;
  value: string;
  onChange: (time: string) => void;
  align?: "start" | "center" | "end";
}

function TimePicker24h({ label, value, onChange, align = "start" }: TimePicker24hProps) {
  const [open, setOpen] = useState(false);

  const sanitizeTime = (raw: string) => {
    if (!raw) return "08:00";
    const cleaned = raw.replace(/[^\d:]/g, "");
    const parts = cleaned.split(":");
    let h = parseInt(parts[0] || "0", 10);
    let m = parseInt(parts[1] || "0", 10);

    if (isNaN(h)) h = 0;
    if (isNaN(m)) m = 0;

    h = Math.min(Math.max(h, 0), 23);
    m = Math.min(Math.max(m, 0), 59);

    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  const parts = (value || "08:00").split(":");
  const currentHour = parts[0] || "08";
  const currentMin = parts[1] || "00";

  const handleSelectHour = (h: string) => {
    onChange(`${h}:${currentMin}`);
  };

  const handleSelectMin = (m: string) => {
    onChange(`${currentHour}:${m}`);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleBlur = () => {
    onChange(sanitizeTime(value));
  };

  return (
    <div className="space-y-1.5 w-full">
      <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
        {label} <span className="text-destructive">*</span>
      </Label>

      <Popover open={open} onOpenChange={setOpen}>
        <div className="relative flex items-center w-full">
          <Input
            type="text"
            placeholder="00:00"
            value={value}
            onChange={handleInputChange}
            onBlur={handleBlur}
            onFocus={() => setOpen(true)}
            className="h-10 text-xs font-mono font-bold pl-3.5 pr-10 rounded-xl bg-background border border-input focus:ring-2 focus:ring-primary/40 shadow-2xs"
          />

          <PopoverTrigger asChild>
            <button
              type="button"
              className="absolute right-2.5 text-muted-foreground hover:text-primary transition-colors p-1 rounded-md cursor-pointer"
              title="เปิดตัวเลือกเวลา 24 ชั่วโมง"
            >
              <Clock className="w-4 h-4" />
            </button>
          </PopoverTrigger>
        </div>

        <PopoverContent className="w-64 p-3 bg-card border shadow-lg rounded-xl" align={align}>
          <div className="text-[11px] font-bold text-muted-foreground border-b pb-2 mb-2 flex items-center justify-between">
            <span>เลื่อนเลือกเวลา (24 ชั่วโมง)</span>
            <span className="font-mono text-primary font-bold text-xs">{value || "00:00"} น.</span>
          </div>

          <div className="grid grid-cols-2 gap-2 h-48">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground block text-center pb-1 border-b">
                ชั่วโมง (00-23)
              </span>
              <div className="h-40 overflow-y-auto pr-1 space-y-1 scrollbar-thin">
                {HOURS_24.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => handleSelectHour(h)}
                    className={`w-full py-1 text-xs font-mono rounded-md text-center transition-colors cursor-pointer ${
                      currentHour === h
                        ? "bg-primary text-primary-foreground font-bold"
                        : "hover:bg-muted text-foreground"
                    }`}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground block text-center pb-1 border-b">
                นาที (00-59)
              </span>
              <div className="h-40 overflow-y-auto pr-1 space-y-1 scrollbar-thin">
                {MINUTES_60.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleSelectMin(m)}
                    className={`w-full py-1 text-xs font-mono rounded-md text-center transition-colors cursor-pointer ${
                      currentMin === m
                        ? "bg-primary text-primary-foreground font-bold"
                        : "hover:bg-muted text-foreground"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default function AssetManagement() {
  const navigate = useNavigate();
  const assets = useAssets();
  const isSupervisor = getCurrentUser()?.role === "supervisor";

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedZone, setSelectedZone] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [editingAsset, setEditingAsset] = useState<AssetMachine | null>(null);

  const [selectedViewAsset, setSelectedViewAsset] = useState<AssetMachine | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const [qrModalAsset, setQrModalAsset] = useState<AssetMachine | null>(null);

  const [formData, setFormData] = useState<Omit<AssetMachine, "created_at">>({
    asset_id: "",
    asset_name: "",
    asset_type: "เครื่องกล",
    machine_number: "",
    machine_zone: "ZONE-A",
    location_building: "อาคารผลิตหลัก",
    location_floor: "ชั้น 1",
    location_line: "Line 1",
    access_required: false,
    access_time_window: "08:00 - 17:00",
    suggested_job_type: "mechanical",
    status: "active",
  });

  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("17:00");
  const [submitting, setSubmitting] = useState(false);

  const printRef = useRef<HTMLDivElement | null>(null);

  const parseTimeWindow = (timeStr: string) => {
    if (!timeStr) return { start: "08:00", end: "17:00" };
    const parts = timeStr.split("-").map((s) => s.trim());
    return {
      start: parts[0] || "08:00",
      end: parts[1] || "17:00",
    };
  };

  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      const matchSearch =
        asset.asset_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.asset_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.machine_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.location_building.toLowerCase().includes(searchQuery.toLowerCase());

      const matchZone = selectedZone === "all" || asset.machine_zone === selectedZone;
      const matchCat = selectedCategory === "all" || asset.suggested_job_type === selectedCategory;

      return matchSearch && matchZone && matchCat;
    });
  }, [assets, searchQuery, selectedZone, selectedCategory]);

  const uniqueZones = useMemo(() => {
    return Array.from(new Set(assets.map((a) => a.machine_zone)));
  }, [assets]);

  const handleOpenDetails = (asset: AssetMachine) => {
    setSelectedViewAsset(asset);
    setIsDetailOpen(true);
  };

  const handleOpenAddForm = () => {
    setEditingAsset(null);
    setFormData({
      asset_id: `MCH-EQ-${Math.floor(1000 + Math.random() * 9000)}`,
      asset_name: "",
      asset_type: "เครื่องกล",
      machine_number: "",
      machine_zone: "ZONE-A",
      location_building: "อาคารผลิตหลัก",
      location_floor: "ชั้น 1",
      location_line: "Line 1",
      access_required: false,
      access_time_window: "08:00 - 17:00",
      suggested_job_type: "mechanical",
      status: "active",
    });
    setStartTime("08:00");
    setEndTime("17:00");
    setViewMode("add");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleOpenEditForm = (asset: AssetMachine) => {
    setEditingAsset(asset);
    setFormData({ ...asset });
    const { start, end } = parseTimeWindow(asset.access_time_window);
    setStartTime(start);
    setEndTime(end);
    setViewMode("edit");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBackToList = () => {
    setViewMode("list");
    setEditingAsset(null);
  };

  const handleSaveAssetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.asset_id.trim() || !formData.asset_name.trim()) {
      toast.error("กรุณากรอกรหัสทรัพย์สินและชื่อเครื่องจักร");
      return;
    }

    setSubmitting(true);
    const timeWindow = `${startTime} - ${endTime}`;

    try {
      if (editingAsset) {
        assetStore.updateAsset(editingAsset.asset_id, {
          ...formData,
          access_time_window: timeWindow,
        });
        toast.success(`อัปเดตข้อมูลเครื่องจักร ${formData.asset_name} เรียบร้อย`);
      } else {
        await createAssetApi({
          asset_code: formData.asset_id.trim(),
          name: formData.asset_name.trim(),
          location: `${formData.location_building} ${formData.location_floor} ${formData.location_line}`,
          category: formData.suggested_job_type,
          model: formData.machine_number,
        });

        assetStore.addAsset({
          ...formData,
          access_time_window: timeWindow,
        });
        toast.success("ลงทะเบียนเครื่องจักรใหม่ลงฐานข้อมูลเรียบร้อย");
      }
      handleBackToList();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการลงทะเบียนเครื่องจักร";
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAsset = (assetId: string, assetName: string) => {
    if (!confirm(`คุณแน่ใจหรือไม่ที่จะลบทรัพย์สิน "${assetName}" (${assetId})?`)) return;
    assetStore.deleteAsset(assetId);
    toast.success(`ลบเครื่องจักร ${assetName} เรียบร้อยแล้ว`);
  };

  const getQrDataUrl = (assetId: string) => {
    const targetUrl = `${window.location.origin}/request?asset_id=${assetId}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(targetUrl)}`;
  };

  const handleDownloadQrImage = (asset: AssetMachine) => {
    const qrUrl = getQrDataUrl(asset.asset_id);
    const link = document.createElement("a");
    link.href = qrUrl;
    link.download = `QR_${asset.asset_id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`ดาวน์โหลดไฟล์ QR Code ${asset.asset_id} สำเร็จ`);
  };

  const handlePrintQrBadge = () => {
    if (!printRef.current) return;
    const printContent = printRef.current.innerHTML;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("ไม่สามารถเปิดหน้าต่างพิมพ์ได้ (กรุณาอนุญาต Pop-up บนเบราว์เซอร์)");
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>พิมพ์ Tag เครื่องจักร - FixFlow CMMS</title>
          <style>
            body { font-family: sans-serif; padding: 20px; display: flex; justify-content: center; }
            .print-area { width: 320px; border: 2px solid #312e81; border-radius: 12px; padding: 16px; text-align: center; }
            img { width: 180px; height: 180px; margin: 10px 0; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="print-area">
            ${printContent}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "mechanical":
        return <Badge variant="outline" className="border-blue-500/50 text-blue-700 dark:text-blue-300 bg-blue-500/15 font-bold">⚙️ เครื่องกล</Badge>;
      case "electrical-control":
        return <Badge variant="outline" className="border-amber-500/50 text-amber-700 dark:text-amber-300 bg-amber-500/15 font-bold">⚡ ไฟฟ้า/ควบคุม</Badge>;
      case "pneumatic-hydraulic":
        return <Badge variant="outline" className="border-purple-500/50 text-purple-700 dark:text-purple-300 bg-purple-500/15 font-bold">💨 ลม/ไฮดรอลิก</Badge>;
      default:
        return <Badge variant="outline" className="font-semibold">{category}</Badge>;
    }
  };

  return (
    <AppLayout
      title="ทะเบียนเครื่องจักร & QR Tag (Asset Management)"
      subtitle="บริหารจัดการทรัพย์สิน Master Data ของโรงงาน และพิมพ์ QR Code ประจำเครื่องจักร"
      actions={
        viewMode === "list" ? (
          <div className="flex items-center gap-2">
            <Button
              variant="industrial"
              size="sm"
              onClick={handleOpenAddForm}
              className="gap-1.5 text-xs font-bold shadow-sm"
            >
              <Plus className="h-4 w-4" /> + ลงทะเบียนเครื่องจักรใหม่
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={handleBackToList} className="gap-1.5 text-xs">
            <ArrowLeft className="h-4 w-4" /> ย้อนกลับไปยังทะเบียนเครื่องจักร
          </Button>
        )
      }
    >
      <div className="space-y-6">
        {/* VIEW 1: ASSET TABLE & CARD VIEW */}
        {viewMode === "list" && (
          <>
            {/* Search & Filter Controls Bar */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-card/60 p-4 rounded-xl border border-border">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ค้นหารหัส, ชื่อเครื่องจักร หรืออาคาร..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs bg-background"
                />
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                <Select value={selectedZone} onValueChange={setSelectedZone}>
                  <SelectTrigger className="w-[140px] h-9 text-xs bg-background">
                    <SelectValue placeholder="โซนพื้นที่" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทุกโซนพื้นที่</SelectItem>
                    {uniqueZones.map((z) => (
                      <SelectItem key={z} value={z}>
                        {z}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-[160px] h-9 text-xs bg-background">
                    <SelectValue placeholder="ประเภทงาน" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทุกประเภทงาน</SelectItem>
                    <SelectItem value="mechanical">เครื่องกล (Mechanical)</SelectItem>
                    <SelectItem value="electrical-control">ไฟฟ้า/ควบคุม</SelectItem>
                    <SelectItem value="pneumatic-hydraulic">ระบบลม/ไฮดรอลิก</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Assets Container: Mobile Cards (< md) & Desktop Table (>= md) */}
            {filteredAssets.length === 0 ? (
              <div className="bg-card border border-border rounded-2xl p-12 text-center space-y-2 shadow-xs">
                <Factory className="h-10 w-10 text-muted-foreground/50 mx-auto" />
                <p className="text-sm font-semibold text-foreground">ไม่พบข้อมูลเครื่องจักรที่ค้นหา</p>
                <p className="text-xs text-muted-foreground">ลองเปลี่ยนคำค้นหาหรือกดเพิ่มเครื่องจักรใหม่</p>
              </div>
            ) : (
              <>
                {/* 1. MOBILE VIEW CARDS (< md) */}
                <div className="grid grid-cols-1 md:hidden gap-4">
                  {filteredAssets.map((asset) => (
                    <Card key={asset.asset_id} className="border shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between">
                      <div className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2 border-b pb-3">
                          <div>
                            <span className="font-mono text-xs font-bold text-primary block">{asset.asset_id}</span>
                            <h3 className="font-bold text-base text-foreground mt-0.5">{asset.asset_name}</h3>
                            <p className="text-xs text-muted-foreground">เลขเครื่อง: <span className="font-semibold text-foreground">{asset.machine_number || "-"}</span></p>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <Badge variant="outline" className="text-[10px] font-semibold bg-muted/60">
                              {asset.machine_zone}
                            </Badge>
                            {getCategoryBadge(asset.suggested_job_type)}
                          </div>
                        </div>

                        <div className="space-y-1.5 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span>{asset.location_building} • {asset.location_line}</span>
                          </div>
                          <div className="flex items-center justify-between pt-1">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              <span>เข้าทำงานได้: <strong className="text-foreground font-mono">{asset.access_time_window}</strong></span>
                            </div>
                            {asset.access_required && (
                              <Badge variant="destructive" className="text-[9px] py-0 px-1 font-semibold">
                                ขออนุมัติก่อนเข้า
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Mobile Card Footer Actions */}
                      <div className="p-3 border-t bg-muted/20 flex items-center justify-between gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setQrModalAsset(asset)}
                          className="h-8 text-xs font-bold gap-1 text-indigo-600 dark:text-indigo-300 bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-600 hover:text-white transition-colors px-2.5 flex-1"
                        >
                          <QrCode className="w-3.5 h-3.5" /> พิมพ์ QR
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDetails(asset)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
                          title="ดูรายละเอียด"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEditForm(asset)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
                          title="แก้ไขข้อมูล"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>

                        {isSupervisor && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteAsset(asset.asset_id, asset.asset_name)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title="ลบเครื่องจักร"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>

                {/* 2. DESKTOP TABLE VIEW (>= md) */}
                <div className="hidden md:block bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-muted/40">
                        <TableRow>
                          <TableHead className="py-2.5 w-[150px]">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-foreground">รหัสทรัพย์สิน</span>
                              <span className="text-[10px] text-muted-foreground/80 font-mono tracking-wider">ASSET ID</span>
                            </div>
                          </TableHead>
                          <TableHead className="py-2.5 w-[240px]">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-foreground">ชื่อเครื่องจักร</span>
                              <span className="text-[10px] text-muted-foreground/80 font-mono tracking-wider">MACHINE NAME</span>
                            </div>
                          </TableHead>
                          <TableHead className="py-2.5 w-[160px]">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-foreground">ประเภทงาน</span>
                              <span className="text-[10px] text-muted-foreground/80 font-mono tracking-wider">CATEGORY</span>
                            </div>
                          </TableHead>
                          <TableHead className="py-2.5">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-foreground">ตำแหน่งที่ตั้ง</span>
                              <span className="text-[10px] text-muted-foreground/80 font-mono tracking-wider">LOCATION</span>
                            </div>
                          </TableHead>
                          <TableHead className="py-2.5 w-[170px]">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-foreground">เวลาเข้าพื้นที่</span>
                              <span className="text-[10px] text-muted-foreground/80 font-mono tracking-wider">ACCESS WINDOW</span>
                            </div>
                          </TableHead>
                          <TableHead className="py-2.5 w-[240px]">
                            <div className="flex flex-col items-center">
                              <span className="text-xs font-bold text-foreground">การจัดการ</span>
                              <span className="text-[10px] text-muted-foreground/80 font-mono tracking-wider">ACTIONS</span>
                            </div>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y">
                        {filteredAssets.map((asset) => (
                          <TableRow key={asset.asset_id} className="hover:bg-muted/30 transition-colors">
                            <TableCell className="font-mono text-xs font-bold text-primary">
                              {asset.asset_id}
                            </TableCell>
                            <TableCell>
                              <div>
                                <span className="font-bold text-xs text-foreground block">{asset.asset_name}</span>
                                <span className="text-[11px] text-muted-foreground">เลขเครื่อง: <span className="font-semibold text-foreground">{asset.machine_number || "-"}</span></span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {getCategoryBadge(asset.suggested_job_type)}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              <div className="flex items-center gap-1.5">
                                <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                                <span>{asset.location_building} • {asset.location_line}</span>
                                <Badge variant="outline" className="text-[10px] py-0 px-1 font-semibold ml-1">
                                  {asset.machine_zone}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs">
                              <div className="space-y-0.5">
                                <span className="font-mono font-bold text-foreground block flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-amber-500" /> {asset.access_time_window}
                                </span>
                                {asset.access_required && (
                                  <Badge variant="destructive" className="text-[9px] py-0 px-1 font-semibold">
                                    ขออนุมัติก่อนเข้า
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1 mx-auto">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setQrModalAsset(asset)}
                                  className="h-8 text-xs font-bold gap-1 text-indigo-600 dark:text-indigo-300 bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 dark:hover:text-white transition-colors px-2.5 shadow-2xs"
                                  title="ดู & พิมพ์ QR Code Tag"
                                >
                                  <QrCode className="h-3.5 w-3.5" /> พิมพ์ QR
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleOpenDetails(asset)}
                                  className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                  title="ดูรายละเอียดเครื่องจักร"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleOpenEditForm(asset)}
                                  className="h-8 w-8 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
                                  title="แก้ไขข้อมูลเครื่องจักร"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                {isSupervisor && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteAsset(asset.asset_id, asset.asset_name)}
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                    title="ลบเครื่องจักร"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* RIGHT SLIDE-OVER SHEET (DRAWER) FOR VIEW MACHINE DETAILS - Occupies ~1/3 Screen Width (35vw / 540px) */}
        <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <SheetContent side="right" className="w-full sm:max-w-md md:max-w-lg lg:w-[35vw] max-w-[540px] p-0 flex flex-col">
            <SheetHeader className="p-6 border-b bg-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Factory className="w-6 h-6 text-primary" />
                  <SheetTitle className="text-lg font-bold text-foreground">
                    รายละเอียดเครื่องจักร
                  </SheetTitle>
                </div>
              </div>
              <SheetDescription className="text-xs text-muted-foreground mt-1">
                รหัสทรัพย์สิน: <span className="font-mono font-bold text-primary">{selectedViewAsset?.asset_id}</span>
              </SheetDescription>
            </SheetHeader>

            {selectedViewAsset && (
              <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                <div className="bg-muted/40 p-4 rounded-xl border space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-base font-bold text-foreground">{selectedViewAsset.asset_name}</h3>
                      <p className="text-xs text-muted-foreground">เลขประจำเครื่อง: <span className="font-semibold text-foreground">{selectedViewAsset.machine_number || "-"}</span></p>
                    </div>
                    <Badge variant="outline" className="font-bold bg-background">
                      {selectedViewAsset.machine_zone}
                    </Badge>
                  </div>
                  <div>
                    {getCategoryBadge(selectedViewAsset.suggested_job_type)}
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-foreground border-b pb-2 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-emerald-500" /> ตำแหน่งที่ตั้งและข้อจำกัดการเข้าพื้นที่
                  </h4>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-card p-3 rounded-lg border space-y-1">
                      <span className="text-muted-foreground block text-[10px]">อาคารที่ตั้ง</span>
                      <span className="font-bold text-foreground">{selectedViewAsset.location_building}</span>
                    </div>
                    <div className="bg-card p-3 rounded-lg border space-y-1">
                      <span className="text-muted-foreground block text-[10px]">ชั้น / สายการผลิต</span>
                      <span className="font-bold text-foreground">{selectedViewAsset.location_floor} {selectedViewAsset.location_line}</span>
                    </div>
                  </div>

                  <div className="bg-card p-3 rounded-lg border space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground font-semibold flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-500" /> ช่วงเวลาเข้าปฏิบัติงาน:
                      </span>
                      <strong className="font-mono text-foreground">{selectedViewAsset.access_time_window} น.</strong>
                    </div>

                    <div className="flex justify-between items-center border-t pt-2">
                      <span className="text-muted-foreground">ข้อจำกัดการเข้าพื้นที่:</span>
                      {selectedViewAsset.access_required ? (
                        <Badge variant="destructive" className="text-[10px] font-bold">
                          ต้องขออนุมัติก่อนเข้า
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950 font-bold">
                          เข้าได้โดยไม่ต้องขออนุญาต
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-foreground border-b pb-2 flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-indigo-500" /> ตัวอย่าง QR Code Tag ประจำเครื่อง
                  </h4>

                  <div className="bg-card p-4 rounded-xl border text-center space-y-3">
                    <img
                      src={getQrDataUrl(selectedViewAsset.asset_id)}
                      alt={`QR ${selectedViewAsset.asset_id}`}
                      className="w-40 h-40 mx-auto border-4 border-slate-900 dark:border-slate-200 rounded-lg p-1 bg-white"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setQrModalAsset(selectedViewAsset)}
                      className="w-full text-xs font-bold gap-1 text-indigo-600 border-indigo-200"
                    >
                      <Printer className="w-3.5 h-3.5" /> เปิดหน้าต่างพิมพ์สติ๊กเกอร์ Tag
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="p-4 border-t bg-muted/20 flex items-center justify-between">
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  setIsDetailOpen(false);
                  if (selectedViewAsset) handleOpenEditForm(selectedViewAsset);
                }}
                className="w-full text-xs font-bold"
              >
                <Edit className="w-3.5 h-3.5 mr-1.5" /> แก้ไขข้อมูลเครื่องจักรนี้
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        {/* VIEW 2 & 3: FULL-PAGE ADD / EDIT MACHINE FORM */}
        {(viewMode === "add" || viewMode === "edit") && (
          <form onSubmit={handleSaveAssetSubmit} className="space-y-6">
            <div className="bg-card p-4 md:p-6 rounded-2xl border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Button type="button" variant="outline" size="icon" onClick={handleBackToList} className="h-9 w-9 shrink-0">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                    {viewMode === "add" ? (
                      <>
                        <Plus className="w-5 h-5 text-primary" /> ลงทะเบียนเครื่องจักรใหม่ (New Machine Registration)
                      </>
                    ) : (
                      <>
                        <Edit className="w-5 h-5 text-blue-500" /> แก้ไขข้อมูลเครื่องจักร: <span className="text-primary">{editingAsset?.asset_name}</span>
                      </>
                    )}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    กรอกข้อมูลเพื่อบันทึกลงใน Master Database และสร้าง QR Code Tag สำหรับติดตามงานซ่อม
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" onClick={handleBackToList} disabled={submitting}>
                  ยกเลิก
                </Button>
                <Button type="submit" variant="industrial" disabled={submitting} className="font-bold gap-2">
                  {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {viewMode === "add" ? "บันทึกสร้างเครื่องจักรใหม่" : "บันทึกการแก้ไขข้อมูล"}
                </Button>
              </div>
            </div>

            <Card className="border shadow-xs">
              <CardHeader className="pb-3 border-b bg-card/60">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Info className="w-4 h-4 text-primary" /> ข้อมูลระบุตัวตนเครื่องจักร (Machine Identity)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      รหัสทรัพย์สิน (Asset ID) <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      placeholder="เช่น MCH-EQ-3445"
                      value={formData.asset_id}
                      onChange={(e) => setFormData({ ...formData, asset_id: e.target.value })}
                      disabled={viewMode === "edit"}
                      className={`h-9 text-xs font-mono ${viewMode === "edit" ? "bg-muted" : ""}`}
                      required
                    />
                    <p className="text-[11px] text-muted-foreground">รหัสทรัพย์สินประจำเครื่องจักร ห้ามซ้ำกัน</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">เลขประจำเครื่อง (Machine No.)</Label>
                    <Input
                      placeholder="เช่น HP-2041"
                      value={formData.machine_number}
                      onChange={(e) => setFormData({ ...formData, machine_number: e.target.value })}
                      className="h-9 text-xs"
                    />
                    <p className="text-[11px] text-muted-foreground">โมเดล หรือ รหัส Serial Number ประจำเครื่อง</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    ชื่อเครื่องจักร / ทรัพย์สิน (Asset Name) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder="เช่น Hydraulic Press Line 3 หรือ ปั๊มน้ำหล่อเย็น Main Pump 1"
                    value={formData.asset_name}
                    onChange={(e) => setFormData({ ...formData, asset_name: e.target.value })}
                    className="h-9 text-xs"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">ประเภทเครื่องจักร</Label>
                    <Input
                      placeholder="เช่น เครื่องกล, Hydraulic Press, ตู้ไฟฟ้า"
                      value={formData.asset_type}
                      onChange={(e) => setFormData({ ...formData, asset_type: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">ประเภทงานซ่อมที่แนะนำ</Label>
                    <Select
                      value={formData.suggested_job_type}
                      onValueChange={(val: AssetMachine["suggested_job_type"]) => setFormData({ ...formData, suggested_job_type: val })}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="เลือกประเภทงานซ่อม" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mechanical">เครื่องกล (Mechanical)</SelectItem>
                        <SelectItem value="electrical-control">ไฟฟ้า/ระบบควบคุม (Electrical)</SelectItem>
                        <SelectItem value="pneumatic-hydraulic">ระบบลม/ไฮดรอลิก (Pneumatic)</SelectItem>
                        <SelectItem value="other">อื่น ๆ (Other)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border shadow-xs">
              <CardHeader className="pb-3 border-b bg-card/60">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-500" /> ตำแหน่งที่ตั้งในโรงงาน (Plant Location)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">โซนพื้นที่ (Zone)</Label>
                    <Input
                      placeholder="เช่น ZONE-A หรือ ZONE-B2"
                      value={formData.machine_zone}
                      onChange={(e) => setFormData({ ...formData, machine_zone: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">อาคาร (Building)</Label>
                    <Input
                      placeholder="เช่น อาคารผลิตหลัก หรือ อาคาร B"
                      value={formData.location_building}
                      onChange={(e) => setFormData({ ...formData, location_building: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">ชั้น / สายการผลิต (Floor / Line)</Label>
                    <Input
                      placeholder="เช่น ชั้น 1 Line 3"
                      value={formData.location_line}
                      onChange={(e) => setFormData({ ...formData, location_line: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border shadow-xs">
              <CardHeader className="pb-3 border-b bg-card/60">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" /> ข้อจำกัดการเข้าพื้นที่และเวลาทำงาน (24-Hour Access Schedule)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/40 border">
                  <div>
                    <span className="text-xs font-bold text-foreground block">ข้อจำกัดการเข้าปฏิบัติงาน</span>
                    <span className="text-[11px] text-muted-foreground">ต้องขออนุมัติจากหัวหน้าแผนกก่อนเข้าหน้างานซ่อม</span>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={formData.access_required}
                      onCheckedChange={(chk) => setFormData({ ...formData, access_required: Boolean(chk) })}
                    />
                    <span className="text-xs font-semibold">ต้องขออนุมัติก่อนเข้า</span>
                  </label>
                </div>

                <div className="space-y-2 pt-2">
                  <Label className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground block mb-2">
                    SCHEDULE / ช่วงเวลาที่อนุญาตให้เข้าปฏิบัติงาน (24 ชั่วโมง)
                  </Label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <TimePicker24h
                      label="Start Time (เวลาเริ่มต้น)"
                      value={startTime}
                      onChange={setStartTime}
                      align="end"
                    />

                    <TimePicker24h
                      label="End Time (เวลาสิ้นสุด)"
                      value={endTime}
                      onChange={setEndTime}
                      align="end"
                    />
                  </div>

                  <p className="text-[11px] text-muted-foreground flex items-center gap-1 pt-1">
                    <AlertCircle className="w-3.5 h-3.5 text-emerald-500" />
                    ช่วงเวลาที่เลือก: <strong className="text-foreground font-mono text-xs">{startTime} - {endTime} น.</strong>
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-end gap-3 bg-card p-4 rounded-xl border shadow-sm">
              <Button type="button" variant="ghost" onClick={handleBackToList} disabled={submitting}>
                ยกเลิก
              </Button>
              <Button type="submit" variant="industrial" disabled={submitting} className="font-bold gap-2">
                {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {viewMode === "add" ? "บันทึกสร้างเครื่องจักรใหม่" : "บันทึกการแก้ไขข้อมูล"}
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* QR Code Tag Modal */}
      {qrModalAsset && (
        <Dialog open={!!qrModalAsset} onOpenChange={() => setQrModalAsset(null)}>
          <DialogContent className="max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Printer className="h-5 w-5 text-indigo-600" />
                พิมพ์ QR Code Tag ติดเครื่องจักร
              </DialogTitle>
              <DialogDescription className="text-xs">
                สแกน Tag นี้เพื่อเปิดหน้าแจ้งซ่อมด่วนผ่านมือถือได้ทันที
              </DialogDescription>
            </DialogHeader>

            <div
              ref={printRef}
              className="p-5 border-2 border-indigo-600 dark:border-indigo-500 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 space-y-4 shadow-sm text-center relative overflow-hidden"
            >
              <div className="border-b border-indigo-200 dark:border-indigo-900/50 pb-2">
                <div className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                  FIXFLOW MAINTENANCE SYSTEM
                </div>
                <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-100 mt-0.5">
                  {qrModalAsset.asset_name}
                </h2>
                <span className="inline-block mt-1 font-mono text-xs font-bold px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300">
                  ID: {qrModalAsset.asset_id}
                </span>
              </div>

              <div className="flex justify-center my-2">
                <img
                  src={getQrDataUrl(qrModalAsset.asset_id)}
                  alt={`QR ${qrModalAsset.asset_id}`}
                  className="w-44 h-44 border-4 border-slate-900 dark:border-slate-200 rounded-lg p-1 bg-white shadow-inner"
                />
              </div>

              <div className="grid grid-cols-2 gap-1 text-[11px] text-left bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[9px] uppercase font-bold">โซน / อาคาร</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{qrModalAsset.machine_zone} ({qrModalAsset.location_building})</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[9px] uppercase font-bold">เลขเครื่อง</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{qrModalAsset.machine_number}</span>
                </div>
                <div className="col-span-2 pt-1 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400 text-[10px]">เวลาเข้าพื้นที่: {qrModalAsset.access_time_window}</span>
                  {qrModalAsset.access_required && (
                    <span className="text-rose-600 dark:text-rose-400 font-bold text-[9px] px-1 bg-rose-50 dark:bg-rose-950/50 rounded">
                      [ ต้องขออนุญาต ]
                    </span>
                  )}
                </div>
              </div>

              <div className="text-[10px] text-slate-400 dark:text-slate-500 italic">
                * สแกน QR Code เพื่อเข้าสู่หน้าแจ้งซ่อมและประเมินงานทันที
              </div>
            </div>

            <DialogFooter className="flex-row justify-between sm:justify-between gap-2 border-t pt-3">
              <Button
                variant="outline"
                size="sm"
                className="gap-1 text-xs"
                onClick={() => handleDownloadQrImage(qrModalAsset)}
              >
                <Download className="h-3.5 w-3.5" />
                ดาวน์โหลด PNG
              </Button>
              <Button
                size="sm"
                variant="industrial"
                className="gap-1 text-xs"
                onClick={handlePrintQrBadge}
              >
                <Printer className="h-3.5 w-3.5" />
                พิมพ์สติ๊กเกอร์ (Print Tag)
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </AppLayout>
  );
}
