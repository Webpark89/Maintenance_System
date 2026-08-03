import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AssetMachine, assetStore, useAssets } from "@/lib/assetStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AppLayout } from "@/components/AppLayout";
import { getCurrentUser } from "@/lib/auth";

export default function AssetManagement() {
  const navigate = useNavigate();
  const assets = useAssets();
  const isSupervisor = getCurrentUser()?.role === "supervisor";

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedZone, setSelectedZone] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<AssetMachine | null>(null);
  const [qrModalAsset, setQrModalAsset] = useState<AssetMachine | null>(null);

  // Form State
  const [formData, setFormData] = useState<Omit<AssetMachine, "created_at">>({
    asset_id: "",
    asset_name: "",
    asset_type: "",
    machine_number: "",
    machine_zone: "",
    location_building: "",
    location_floor: "",
    location_line: "",
    access_required: false,
    access_time_window: "08:00-17:00",
    suggested_job_type: "mechanical",
    status: "active",
  });

  const printRef = useRef<HTMLDivElement | null>(null);

  // Filtered Assets
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
      access_time_window: "08:00-17:00",
      suggested_job_type: "mechanical",
      status: "active",
    });
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (asset: AssetMachine) => {
    setEditingAsset(asset);
    setFormData({ ...asset });
    setIsFormOpen(true);
  };

  const handleSaveAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.asset_id.trim() || !formData.asset_name.trim()) {
      toast.error("กรุณากรอกรหัสทรัพย์สินและชื่อเครื่องจักร");
      return;
    }

    if (editingAsset) {
      assetStore.update(editingAsset.asset_id, formData);
      toast.success("อัปเดตข้อมูลเครื่องจักรเรียบร้อย");
    } else {
      assetStore.add(formData);
      toast.success("เพิ่มเครื่องจักรใหม่เรียบร้อย");
    }
    setIsFormOpen(false);
  };

  const handleDeleteAsset = (assetId: string) => {
    if (confirm(`คุณต้องการลบทรัพย์สิน ${assetId} ใช่หรือไม่?`)) {
      assetStore.delete(assetId);
      toast.success("ลบทรัพย์สินเรียบร้อย");
    }
  };

  // Generate QR Canvas SVG Helper URL
  const getQrDataUrl = (assetId: string) => {
    const qrText = encodeURIComponent(`QR://${assetId}`);
    return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${qrText}&format=png`;
  };

  const handleDownloadQrImage = async (asset: AssetMachine | null) => {
    if (!asset) return;
    try {
      const qrUrl = getQrDataUrl(asset.asset_id);
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `QR-${asset.asset_id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("ดาวน์โหลด QR Code เรียบร้อยแล้ว");
    } catch (error) {
      console.error("Failed to download QR image:", error);
      toast.error("ไม่สามารถดาวน์โหลดรูปภาพ QR Code ได้");
    }
  };

  const handlePrintQrBadge = () => {
    window.print();
  };

  return (
    <AppLayout
      title="จัดการทรัพย์สิน & QR CODE"
      subtitle="จัดการและพิมพ์ QR Code เครื่องจักร"
      actions={
        isSupervisor ? (
          <Button
            onClick={handleOpenAddForm}
            size="sm"
            className="gap-1.5 h-8 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-3.5 w-3.5" />
            ลงทะเบียนเครื่องจักรใหม่
          </Button>
        ) : null
      }
    >
      <div className="space-y-6">
        {/* Filters & Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border shadow-card">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ค้นหาชื่อ, รหัส, โซน, เลขเครื่อง..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
              <Select value={selectedZone} onValueChange={setSelectedZone}>
                <SelectTrigger className="w-[140px] text-xs">
                  <SelectValue placeholder="โซนทั้งหมด" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">ทุกโซนพื้นที่</SelectItem>
                  {uniqueZones.map((zone) => (
                    <SelectItem key={zone} value={zone} className="text-xs">
                      {zone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Badge variant="secondary" className="text-xs py-1.5 shrink-0">
              รวม {filteredAssets.length} รายการ
            </Badge>
          </div>
        </div>

        {/* Asset Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAssets.map((asset) => {
            const qrUrl = getQrDataUrl(asset.asset_id);
            return (
              <Card key={asset.asset_id} className="p-4 flex flex-col justify-between hover:shadow-elevated transition-shadow relative overflow-hidden group shadow-card">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2 border-b border-border pb-2">
                    <div>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                        {asset.asset_id}
                      </span>
                      <h3 className="font-bold text-sm text-foreground mt-1 line-clamp-1">
                        {asset.asset_name}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {asset.asset_type} ({asset.machine_number})
                      </p>
                    </div>
                    <Badge variant={asset.status === "active" ? "default" : "outline"} className={asset.status === "active" ? "bg-success text-success-foreground" : ""}>
                      {asset.status === "active" ? "ใช้งานปกติ" : "ซ่อมบำรุง"}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="space-y-1">
                      <span className="text-muted-foreground text-2xs flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-accent" /> โซน / อาคาร:
                      </span>
                      <p className="font-medium">{asset.machine_zone} - {asset.location_building}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-muted-foreground text-2xs flex items-center gap-1">
                        <Layers className="h-3 w-3 text-accent" /> ชั้น / สายผลิต:
                      </span>
                      <p className="font-medium">{asset.location_floor} {asset.location_line}</p>
                    </div>
                  </div>

                  <div className="p-2 rounded bg-muted/40 text-2xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" /> ช่วงเวลาเข้าพื้นที่:
                      </span>
                      <span className="font-semibold text-foreground">
                        {asset.access_time_window}
                      </span>
                    </div>
                    {asset.access_required && (
                      <div className="text-warning font-medium">
                        ⚠️ ต้องยื่นขออนุมัติก่อนเข้าพื้นที่
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 mt-3 border-t border-border flex items-center justify-between gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs text-primary border-primary/30 cursor-pointer hover:bg-primary/10 hover:text-primary"
                    onClick={() => setQrModalAsset(asset)}
                  >
                    <QrCode className="h-3.5 w-3.5" />
                    ดู / พิมพ์ QR Code Tag
                  </Button>

                  {isSupervisor && (
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleOpenEditForm(asset)}>
                        <Wrench className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50" onClick={() => handleDeleteAsset(asset.asset_id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Dialog 1: Form Add/Edit Asset */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingAsset ? "แก้ไขข้อมูลทรัพย์สิน" : "ลงทะเบียนเครื่องจักรใหม่"}</DialogTitle>
            <DialogDescription>
              กรอกข้อมูลเพื่อบันทึกลงใน Master Database และสร้าง QR Code สำหรับเครื่องจักร
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveAsset} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">รหัสทรัพย์สิน (Asset ID)</Label>
                <Input
                  value={formData.asset_id}
                  onChange={(e) => setFormData({ ...formData, asset_id: e.target.value })}
                  placeholder="เช่น MCH-PR-2041"
                  required
                />
              </div>
              <div>
                <Label className="text-xs">เลขประจำเครื่อง (Machine No.)</Label>
                <Input
                  value={formData.machine_number}
                  onChange={(e) => setFormData({ ...formData, machine_number: e.target.value })}
                  placeholder="เช่น HP-2041"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">ชื่อเครื่องจักร / ทรัพย์สิน</Label>
              <Input
                value={formData.asset_name}
                onChange={(e) => setFormData({ ...formData, asset_name: e.target.value })}
                placeholder="เช่น Hydraulic Press Line 3"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">ประเภทเครื่องจักร</Label>
                <Input
                  value={formData.asset_type}
                  onChange={(e) => setFormData({ ...formData, asset_type: e.target.value })}
                  placeholder="เช่น Hydraulic Press, ตู้ไฟฟ้า"
                />
              </div>
              <div>
                <Label className="text-xs">ประเภทงานซ่อมที่แนะนำ</Label>
                <Select
                  value={formData.suggested_job_type}
                  onValueChange={(val: any) => setFormData({ ...formData, suggested_job_type: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mechanical">เครื่องกล (Mechanical)</SelectItem>
                    <SelectItem value="electrical-control">ไฟฟ้า/ควบคุม (Electrical)</SelectItem>
                    <SelectItem value="pneumatic-hydraulic">ระบบลม/ไฮดรอลิก</SelectItem>
                    <SelectItem value="other">อื่น ๆ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">โซนพื้นที่</Label>
                <Input
                  value={formData.machine_zone}
                  onChange={(e) => setFormData({ ...formData, machine_zone: e.target.value })}
                  placeholder="เช่น ZONE-B2"
                />
              </div>
              <div>
                <Label className="text-xs">อาคาร</Label>
                <Input
                  value={formData.location_building}
                  onChange={(e) => setFormData({ ...formData, location_building: e.target.value })}
                  placeholder="เช่น อาคาร B"
                />
              </div>
              <div>
                <Label className="text-xs">ชั้น / Line</Label>
                <Input
                  value={formData.location_line}
                  onChange={(e) => setFormData({ ...formData, location_line: e.target.value })}
                  placeholder="เช่น Line 3"
                />
              </div>
            </div>

            <div className="p-3 rounded bg-muted/40 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">ข้อจำกัดการเข้าพื้นที่</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="access_req"
                    checked={formData.access_required}
                    onChange={(e) => setFormData({ ...formData, access_required: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <label htmlFor="access_req" className="text-xs">ต้องขออนุมัติก่อนเข้า</label>
                </div>
              </div>
              <div>
                <Label className="text-[11px] text-muted-foreground">ช่วงเวลาที่เข้าทำงานได้</Label>
                <Input
                  value={formData.access_time_window}
                  onChange={(e) => setFormData({ ...formData, access_time_window: e.target.value })}
                  placeholder="เช่น 08:00-17:00 หรือ เข้าได้ตลอดเวลา"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                ยกเลิก
              </Button>
              <Button type="submit">บันทึกข้อมูล</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog 2: Print & QR Code Badge Modal */}
      {qrModalAsset && (
        <Dialog open={!!qrModalAsset} onOpenChange={() => setQrModalAsset(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Printer className="h-5 w-5 text-indigo-600" />
                พิมพ์ QR Code Tag ติดเครื่องจักร
              </DialogTitle>
              <DialogDescription>
                สแกน Tag นี้เพื่อเปิดหน้าแจ้งซ่อมด่วนผ่านมือถือได้ทันที
              </DialogDescription>
            </DialogHeader>

            {/* Printable Badge Container */}
            <div
              ref={printRef}
              className="p-5 border-2 border-indigo-600 rounded-xl bg-white text-slate-900 space-y-4 shadow-sm text-center relative overflow-hidden"
            >
              <div className="border-b border-indigo-200 pb-2">
                <div className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600">
                  FIXFLOW MAINTENANCE SYSTEM
                </div>
                <h2 className="text-lg font-black tracking-tight text-slate-900 mt-0.5">
                  {qrModalAsset.asset_name}
                </h2>
                <span className="inline-block mt-1 font-mono text-xs font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                  ID: {qrModalAsset.asset_id}
                </span>
              </div>

              {/* QR Image */}
              <div className="flex justify-center my-2">
                <img
                  src={getQrDataUrl(qrModalAsset.asset_id)}
                  alt={`QR ${qrModalAsset.asset_id}`}
                  className="w-44 h-44 border-4 border-slate-900 rounded-lg p-1 bg-white shadow-inner"
                />
              </div>

              <div className="grid grid-cols-2 gap-1 text-[11px] text-left bg-slate-50 p-2.5 rounded border border-slate-200">
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase font-bold">โซน / อาคาร</span>
                  <span className="font-bold">{qrModalAsset.machine_zone} ({qrModalAsset.location_building})</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase font-bold">เลขเครื่อง</span>
                  <span className="font-bold">{qrModalAsset.machine_number}</span>
                </div>
                <div className="col-span-2 pt-1 border-t border-slate-200 flex justify-between items-center">
                  <span className="text-slate-500 text-[10px]">เวลาเข้าพื้นที่: {qrModalAsset.access_time_window}</span>
                  {qrModalAsset.access_required && (
                    <span className="text-rose-600 font-bold text-[9px] px-1 bg-rose-50 rounded">
                      [ ต้องขออนุญาต ]
                    </span>
                  )}
                </div>
              </div>

              <div className="text-[10px] text-slate-400 italic">
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
