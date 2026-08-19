import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MOCK_SPARE_PARTS, WorkRequest } from "@/lib/mockData";
import { requestStore } from "@/lib/requestStore";
import { getCurrentUser } from "@/lib/auth";
import { api } from "@/lib/api";
import {
  PackagePlus,
  History,
  CheckCircle2,
  ShoppingCart,
  Lock,
  ShieldCheck,
  Search,
  ChevronsUpDown,
  Check,
  Plus,
  Box,
  MapPin,
  Trash2,
} from "lucide-react";
import { toast } from "@/components/ui/sonner";

interface Props {
  request: WorkRequest;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StockRequisitionDialog({ request, open, onOpenChange }: Props) {
  const user = getCurrentUser();
  const isSupervisor = user?.role === "supervisor";
  const isCompleted = request.status === "complete";

  const rawStock = request.stock_requisition;
  const stock = {
    is_system_connected: rawStock?.is_system_connected ?? true,
    parts_ready: rawStock?.parts_ready ?? false,
    total_price: rawStock?.total_price ?? 0,
    requisitions: rawStock?.requisitions || [],
    logs: rawStock?.logs || [],
  };

  // Filter logs to only show genuine requisition events
  const genuineLogs = stock.logs.filter((log) => {
    const action = log.action || "";
    return !action.includes("เชื่อมต่อ") && !action.includes("ตัดการเชื่อมต่อ");
  });

  const isHighCost = stock.total_price >= 10000;

  const [partsCatalog, setPartsCatalog] = useState(MOCK_SPARE_PARTS);
  const [selectedPartId, setSelectedPartId] = useState<string>("");
  const [customPartName, setCustomPartName] = useState("");
  const [quantity, setQuantity] = useState<number>(1);
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [unit, setUnit] = useState("ชิ้น");
  const [availableStock, setAvailableStock] = useState<number | null>(null);

  // Search & Combobox State
  const [isComboboxOpen, setIsComboboxOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Helper to calculate real-time available stock (On-hand minus reserved in this work order)
  const getPartEffectiveStock = (part: any) => {
    const reservedInThisOrder = stock.requisitions
      .filter((r) => String(r.part_id) === String(part.part_id))
      .reduce((sum, r) => sum + Number(r.quantity || 0), 0);
    return Math.max(0, (part.stock ?? 0) - reservedInThisOrder);
  };

  // Fetch live spare parts catalog from Backend Database
  useEffect(() => {
    let isMounted = true;
    api
      .get("/parts")
      .then((res) => {
        if (isMounted && res.data?.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
          const liveList = res.data.data.map((p: any) => ({
            part_id: String(p.id || p.part_code),
            name: p.name,
            stock: p.stock_qty ?? 0,
            min_stock: p.min_stock_qty ?? 5,
            unit: p.unit || "ชิ้น",
            unit_price: Number(p.unit_price) || 0,
            category: p.category,
            location: p.location_rack || "คลังหลัก",
          }));
          setPartsCatalog(liveList);
        }
      })
      .catch(() => {
        // Fallback to local catalog
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSelectPart = (partId: string) => {
    setSelectedPartId(partId);
    setIsComboboxOpen(false);
    setSearchQuery("");

    if (partId === "custom") {
      setCustomPartName("");
      setUnitPrice(0);
      setUnit("ชิ้น");
      setAvailableStock(null);
    } else {
      const found = partsCatalog.find((p) => String(p.part_id) === String(partId));
      if (found) {
        const effective = getPartEffectiveStock(found);
        setCustomPartName(found.name);
        setUnitPrice(found.unit_price ?? 0);
        setUnit(found.unit || "ชิ้น");
        setAvailableStock(effective);
      }
    }
  };

  const handleAddRequisition = (e: React.FormEvent) => {
    e.preventDefault();
    if (isCompleted) {
      toast.error("งานซ่อมเสร็จสิ้นสมบูรณ์แล้ว ไม่สามารถแก้ไขหรือเบิกอะไหล่เพิ่มได้");
      return;
    }

    const selectedItem = partsCatalog.find((p) => String(p.part_id) === String(selectedPartId));
    const nameToUse = selectedPartId === "custom" ? customPartName : selectedItem?.name || customPartName;

    if (!nameToUse.trim()) {
      toast.error("กรุณาเลือกหรือระบุชื่ออะไหล่");
      return;
    }
    if (quantity <= 0) {
      toast.error("จำนวนต้องมากกว่า 0");
      return;
    }

    if (selectedPartId !== "custom" && selectedItem) {
      const currentEffective = getPartEffectiveStock(selectedItem);
      if (currentEffective <= 0) {
        toast.error(
          `ไม่สามารถเบิกได้: "${selectedItem.name}" สินค้าหมดในคลัง (คงเหลือ 0 ${unit}) — กรุณาระบุเป็นรายการอะไหล่นอกคลังเพื่อจัดซื้อ`,
        );
        return;
      }
      if (quantity > currentEffective) {
        toast.error(
          `ไม่สามารถเบิกได้: จำนวนที่ขอเบิก (${quantity} ${unit}) เกินกว่าสต็อกคงเหลือในคลัง (${currentEffective} ${unit})`,
        );
        return;
      }
    }

    requestStore.addRequisitionItem(
      request.request_id,
      {
        part_id: selectedPartId === "custom" ? `PART-${Date.now()}` : selectedPartId,
        part_name: nameToUse,
        quantity,
        unit,
        unit_price: Number(unitPrice),
      },
      user?.name || "ช่างซ่อมบำรุง",
    );

    // Auto transition to 'waiting' (waiting-parts) if request is currently open or assess
    if (request.status === "open" || request.status === "assess") {
      requestStore.setStatus(request.request_id, "waiting");
      toast.info("ปรับสถานะใบงานเป็น: 'รออะไหล่ (Waiting)' อัตโนมัติ");
    }

    // Auto set requisition approval if price exceeds threshold
    const newTotal = stock.total_price + quantity * unitPrice;
    if (newTotal >= 10000 && request.requisition_approval?.status !== "approved") {
      requestStore.update(request.request_id, {
        requisition_approval: {
          required: true,
          threshold_amount: 10000,
          total_amount: newTotal,
          status: "pending",
        },
      });
      toast.warning(`ยอดรวมเบิกอะไหล่ ฿${newTotal.toLocaleString()} เกิน 10,000 บาท — ต้องรอ Supervisor อนุมัติ`);
    } else {
      toast.success(`เพิ่มรายการเบิก ${nameToUse} เรียบร้อยแล้ว`);
    }

    // Reset form
    setSelectedPartId("");
    setCustomPartName("");
    setQuantity(1);
    setUnitPrice(0);
    setAvailableStock(null);
  };

  const handleRemoveRequisition = (reqId: string, partName: string) => {
    if (isCompleted) {
      toast.error("งานเสร็จสิ้นแล้ว ไม่สามารถลบรายการได้");
      return;
    }
    requestStore.removeRequisitionItem(request.request_id, reqId, user?.name || "ช่างซ่อมบำรุง");
    toast.success(`ยกเลิกรายการเบิก ${partName} และคืนสต็อกสำเร็จ`);
  };

  const handleTogglePartsReady = (checked: boolean) => {
    if (isCompleted) {
      toast.error("งานเสร็จสิ้นแล้ว ไม่สามารถเปลี่ยนสถานะอะไหล่ได้");
      return;
    }
    requestStore.togglePartsReady(request.request_id, checked, user?.name || "ช่างซ่อมบำรุง");
    if (checked) {
      toast.success("อัปเดตสถานะ: อะไหล่พร้อมแล้ว! ระบบส่งแจ้งเตือนเรียบร้อย");
    } else {
      toast.info("ยกเลิกสถานะอะไหล่พร้อมแล้ว");
    }
  };

  const handleApproveHighCost = () => {
    if (!isSupervisor) {
      toast.error("ปฏิเสธการอนุมัติ: เฉพาะ Supervisor เท่านั้นที่มีสิทธิ์อนุมัติการเบิกอะไหล่มูลค่าสูง");
      return;
    }
    requestStore.approveRequisition(request.request_id, user?.name || "Supervisor", true);
    toast.success("อนุมัติการเบิกอะไหล่มูลค่าสูงเรียบร้อยแล้ว");
  };

  // Filter parts for search
  const filteredParts = partsCatalog.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      String(p.part_id).toLowerCase().includes(q) ||
      (p.category && p.category.toLowerCase().includes(q)) ||
      (p.location && p.location.toLowerCase().includes(q))
    );
  });

  const selectedPartObject = partsCatalog.find((p) => String(p.part_id) === String(selectedPartId));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                <ShoppingCart className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold">ระบบเบิกอะไหล่ (Stock Requisition)</DialogTitle>
                <DialogDescription className="text-xs">
                  ใบแจ้งซ่อม: <span className="font-semibold text-primary">{request.request_id}</span> ({request.asset_name})
                </DialogDescription>
              </div>
            </div>
            <Badge
              variant={stock.parts_ready ? "default" : "outline"}
              className={stock.parts_ready ? "bg-emerald-600 text-white shrink-0 text-xs" : "shrink-0 text-xs"}
            >
              {stock.parts_ready ? "อะไหล่พร้อมแล้ว" : "รออะไหล่"}
            </Badge>
          </div>
        </DialogHeader>

        {/* Lock Banner if Completed */}
        {isCompleted && (
          <div className="p-3 rounded-lg bg-slate-900 text-slate-100 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 font-semibold">
              <Lock className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>งานซ่อมนี้เสร็จสิ้นสมบูรณ์แล้ว — ล็อกการแก้ไขรายการเบิกอะไหล่</span>
            </div>
            <Badge variant="outline" className="border-slate-700 text-emerald-400 bg-slate-800 text-[10px] shrink-0">
              Read Only Mode
            </Badge>
          </div>
        )}

        {/* High Cost Approval Warning Banner */}
        {isHighCost && (
          <div
            className={`p-3 rounded-lg border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs ${
              request.requisition_approval?.status === "approved"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200"
                : "bg-blue-500/10 border-blue-500/30 text-blue-900 dark:text-blue-200"
            }`}
          >
            <div className="flex items-center gap-2 font-semibold">
              <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>
                มูลค่าเบิกอะไหล่รวม: <strong className="font-mono text-sm">฿{stock.total_price.toLocaleString()}</strong>{" "}
                (เกินเกณฑ์ ฿10,000) —{" "}
                {request.requisition_approval?.status === "approved"
                  ? `อนุมัติแล้ว โดย ${request.requisition_approval.approved_by}`
                  : "รอการอนุมัติจาก Supervisor"}
              </span>
            </div>
            {isSupervisor && request.requisition_approval?.status !== "approved" && !isCompleted && (
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-8 shrink-0"
                onClick={handleApproveHighCost}
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> กดอนุมัติการเบิก
              </Button>
            )}
          </div>
        )}

        {/* Clean Status & Readiness Summary Card */}
        <Card className="p-3 bg-muted/40 border space-y-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <Checkbox
                id="parts-ready"
                disabled={isCompleted}
                checked={stock.parts_ready}
                onCheckedChange={(c) => handleTogglePartsReady(!!c)}
                className="h-5 w-5 border-2 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600 shrink-0"
              />
              <Label
                htmlFor="parts-ready"
                className="text-xs sm:text-sm font-bold text-foreground cursor-pointer flex items-center gap-1.5 select-none"
              >
                <span>อะไหล่พร้อมใช้งานแล้ว</span>
                <Badge
                  variant={stock.parts_ready ? "default" : "outline"}
                  className={`text-[10px] py-0 px-1.5 ${
                    stock.parts_ready ? "bg-emerald-600 text-white" : "text-amber-600 border-amber-400"
                  }`}
                >
                  {stock.parts_ready ? "พร้อมเบิก" : "รอเตรียมของ"}
                </Badge>
              </Label>
            </div>
            <div className="text-xs text-muted-foreground font-mono self-end sm:self-auto bg-background px-2.5 py-1 rounded border shadow-sm">
              ราคารวมทั้งหมด: <span className="font-bold text-primary text-sm">฿{stock.total_price.toLocaleString()}</span>{" "}
              <span className="text-[11px]">({stock.requisitions.length} รายการ)</span>
            </div>
          </div>
        </Card>

        {/* Main Tabs */}
        <Tabs defaultValue="requisitions" className="w-full mt-1">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="requisitions" className="flex items-center gap-1.5 text-xs">
              <PackagePlus className="h-4 w-4" />
              รายการเบิกอะไหล่ ({stock.requisitions.length})
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-1.5 text-xs">
              <History className="h-4 w-4" />
              ประวัติการเบิก Log ({genuineLogs.length})
            </TabsTrigger>
          </TabsList>

          {/* Requisition Tab Content */}
          <TabsContent value="requisitions" className="space-y-4 pt-3">
            {/* Form */}
            {!isCompleted && (
              <form onSubmit={handleAddRequisition} className="p-3.5 border rounded-lg bg-card space-y-3 shadow-sm">
                <div className="text-xs font-semibold text-primary flex items-center gap-1">
                  <PackagePlus className="h-3.5 w-3.5" />
                  เพิ่มรายการเบิกอะไหล่ใหม่
                </div>

                <div className="space-y-3">
                  {/* Searchable Combobox Selector */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <Label className="text-xs font-medium">ค้นหาและเลือกอะไหล่ในสต็อก</Label>
                      {availableStock !== null && (
                        <span className="text-[11px] text-muted-foreground font-medium">
                          คงเหลือพร้อมเบิก:{" "}
                          <strong className={availableStock > 0 ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"}>
                            {availableStock} {unit}
                          </strong>
                        </span>
                      )}
                    </div>

                    <Popover open={isComboboxOpen} onOpenChange={setIsComboboxOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={isComboboxOpen}
                          className="w-full justify-between h-9 text-xs font-normal px-3"
                        >
                          {selectedPartId === "custom" ? (
                            <span className="font-semibold text-primary flex items-center gap-1.5">
                              <Plus className="h-3.5 w-3.5 shrink-0" /> ระบุรายการอะไหล่นอกคลัง (Custom Part)
                            </span>
                          ) : selectedPartObject ? (
                            <span className="flex items-center gap-2 truncate">
                              <Box className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="font-medium text-foreground truncate">{selectedPartObject.name}</span>
                              <span className="text-[10px] text-muted-foreground font-mono">
                                (คงเหลือ: {getPartEffectiveStock(selectedPartObject)} {selectedPartObject.unit} @฿
                                {selectedPartObject.unit_price.toLocaleString()})
                              </span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground flex items-center gap-2">
                              <Search className="h-3.5 w-3.5" />
                              -- ค้นหาหรือเลือกรายการอะไหล่ --
                            </span>
                          )}
                          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[480px] p-0 shadow-lg" align="start">
                        <div className="p-2 border-b">
                          <div className="flex items-center px-2 py-1.5 rounded-md border bg-muted/30">
                            <Search className="h-3.5 w-3.5 text-muted-foreground mr-2 shrink-0" />
                            <input
                              className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground"
                              placeholder="พิมพ์ชื่ออะไหล่, รหัส, ตำแหน่งตู้..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              autoFocus
                            />
                          </div>
                        </div>
                        <div className="max-h-60 overflow-y-auto p-1.5 space-y-1">
                          <div
                            onClick={() => handleSelectPart("custom")}
                            className={`p-2 text-xs font-semibold text-primary hover:bg-primary/10 rounded-md cursor-pointer flex items-center justify-between transition-colors ${
                              selectedPartId === "custom" ? "bg-primary/15" : "bg-primary/5"
                            }`}
                          >
                            <span className="flex items-center gap-1.5">
                              <Plus className="h-3.5 w-3.5 shrink-0" />
                              <span>ระบุรายการอะไหล่นอกคลัง (Custom Part)</span>
                            </span>
                            {selectedPartId === "custom" && <Check className="h-3.5 w-3.5" />}
                          </div>

                          {filteredParts.length === 0 ? (
                            <div className="text-center py-4 text-xs text-muted-foreground">
                              ไม่พบรายการอะไหล่ที่ค้นหา
                            </div>
                          ) : (
                            filteredParts.map((part) => {
                              const isSelected = String(part.part_id) === String(selectedPartId);
                              const effectiveStock = getPartEffectiveStock(part);
                              const isLow = effectiveStock <= (part.min_stock || 5) && effectiveStock > 0;
                              const isOutOfStock = effectiveStock === 0;
                              return (
                                <div
                                  key={part.part_id}
                                  onClick={() => handleSelectPart(String(part.part_id))}
                                  className={`p-2 text-xs hover:bg-muted cursor-pointer rounded flex items-center justify-between gap-2 ${
                                    isSelected ? "bg-muted font-medium" : ""
                                  }`}
                                >
                                  <div className="min-w-0">
                                    <div className="font-medium text-foreground truncate">{part.name}</div>
                                    <div className="text-[10px] text-muted-foreground flex items-center gap-2 mt-0.5">
                                      <span className="font-mono">{part.part_id}</span>
                                      {part.location && (
                                        <span className="flex items-center gap-0.5 text-muted-foreground">
                                          <MapPin className="h-2.5 w-2.5" /> {part.location}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <div className="font-mono font-bold text-primary">฿{part.unit_price.toLocaleString()}</div>
                                    <Badge
                                      variant={isOutOfStock ? "destructive" : isLow ? "outline" : "secondary"}
                                      className={`text-[9px] px-1.5 py-0 ${
                                        isOutOfStock
                                          ? "bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-400 font-bold"
                                          : isLow
                                          ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-400 font-semibold"
                                          : "text-muted-foreground"
                                      }`}
                                    >
                                      {isOutOfStock ? `หมด (0 ${part.unit})` : `คงเหลือ: ${effectiveStock} ${part.unit}`}
                                    </Badge>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {selectedPartId === "custom" && (
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">ชื่ออะไหล่ / อุปกรณ์นอกคลัง</Label>
                      <Input
                        className="h-9 text-xs"
                        placeholder="เช่น ซีลยางพิเศษ 45mm หรือ สกรู M8"
                        value={customPartName}
                        onChange={(e) => setCustomPartName(e.target.value)}
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">จำนวน</Label>
                      <Input
                        type="number"
                        min={1}
                        max={selectedPartId !== "custom" && availableStock !== null ? availableStock : undefined}
                        disabled={selectedPartId !== "custom" && availableStock === 0}
                        className="h-9 text-xs"
                        value={quantity}
                        onChange={(e) => setQuantity(Number(e.target.value))}
                      />
                      {selectedPartId !== "custom" && availableStock === 0 && (
                        <p className="text-[10px] text-rose-500 font-semibold leading-tight">
                          สินค้าหมดในคลัง (0 {unit})
                        </p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-medium">หน่วย</Label>
                      <Input
                        className="h-9 text-xs"
                        placeholder="ชิ้น/ชุด"
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-medium">ราคา/หน่วย (บาท)</Label>
                      <Input
                        type="number"
                        min={0}
                        className="h-9 text-xs font-mono"
                        value={unitPrice}
                        onChange={(e) => setUnitPrice(Number(e.target.value))}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t">
                  <div className="text-xs text-muted-foreground">
                    ราคารวมรายการนี้:{" "}
                    <span className="font-bold text-foreground font-mono text-sm">
                      ฿{(quantity * unitPrice).toLocaleString()}
                    </span>
                  </div>
                  <Button
                    type="submit"
                    size="sm"
                    variant="industrial"
                    disabled={selectedPartId !== "custom" && availableStock === 0}
                    className="h-8 text-xs gap-1"
                  >
                    <PackagePlus className="h-3.5 w-3.5" />
                    บันทึกการเบิก
                  </Button>
                </div>
              </form>
            )}

            {/* List Table */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                <span>ตารางอะไหล่ที่ขอเบิก</span>
                <span>รวม {stock.requisitions.length} รายการ</span>
              </div>
              {stock.requisitions.length === 0 ? (
                <div className="text-center py-6 border border-dashed rounded-lg text-xs text-muted-foreground">
                  ยังไม่มีรายการเบิกอะไหล่
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden shadow-sm">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted text-muted-foreground font-semibold border-b">
                      <tr>
                        <th className="p-2.5">รายการอะไหล่</th>
                        <th className="p-2.5 text-center">จำนวน</th>
                        <th className="p-2.5 text-right">ราคา/หน่วย</th>
                        <th className="p-2.5 text-right">รวมเป็นเงิน</th>
                        <th className="p-2.5 text-right w-16">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {stock.requisitions.map((req) => (
                        <tr key={req.requisition_id} className="hover:bg-muted/30">
                          <td className="p-2.5 font-medium">
                            {req.part_name}
                            <div className="text-[10px] text-muted-foreground font-mono">{req.part_id}</div>
                          </td>
                          <td className="p-2.5 text-center">
                            {req.quantity} {req.unit}
                          </td>
                          <td className="p-2.5 text-right font-mono">฿{req.unit_price.toLocaleString()}</td>
                          <td className="p-2.5 text-right font-bold text-primary font-mono">
                            ฿{req.total_price.toLocaleString()}
                          </td>
                          <td className="p-2.5 text-right">
                            {!isCompleted && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                onClick={() => handleRemoveRequisition(req.requisition_id, req.part_name)}
                                title="ลบรายการเบิกและคืนสต็อก"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-muted/50 border-t font-semibold">
                      <tr>
                        <td colSpan={3} className="p-2.5 text-right">
                          รวมงบประมาณอะไหล่ทั้งหมด:
                        </td>
                        <td className="p-2.5 text-right text-emerald-600 font-bold font-mono text-sm">
                          ฿{stock.total_price.toLocaleString()}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Logs Tab Content */}
          <TabsContent value="logs" className="space-y-2 pt-3">
            <div className="text-xs font-semibold text-muted-foreground">
              ประวัติการเบิกอะไหล่ (Requisition Transaction Logs)
            </div>
            {genuineLogs.length === 0 ? (
              <div className="text-center py-6 border border-dashed rounded-lg text-xs text-muted-foreground">
                ยังไม่มีประวัติกิจกรรมการเบิกอะไหล่
              </div>
            ) : (
              <div className="space-y-2">
                {genuineLogs.map((log) => (
                  <div key={log.log_id} className="p-2.5 border rounded-md bg-card space-y-1 text-xs shadow-sm">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-primary">{log.action}</span>
                      <span className="text-muted-foreground font-mono">
                        {new Date(log.timestamp).toLocaleString("th-TH")}
                      </span>
                    </div>
                    <p className="text-muted-foreground text-[11px] leading-snug">{log.details}</p>
                    <div className="text-[10px] text-muted-foreground">
                      ผู้ทำรายการ: <span className="font-medium text-foreground">{log.actor}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
