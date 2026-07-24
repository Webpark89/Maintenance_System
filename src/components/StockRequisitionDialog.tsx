import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MOCK_SPARE_PARTS, WorkRequest } from "@/lib/mockData";
import { requestStore } from "@/lib/requestStore";
import { PackageCheck, PackagePlus, History, Link, Unlink, DollarSign, CheckCircle2, AlertCircle, ShoppingCart } from "lucide-react";
import { toast } from "sonner";

interface Props {
  request: WorkRequest;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StockRequisitionDialog({ request, open, onOpenChange }: Props) {
  const stock = request.stock_requisition ?? {
    is_system_connected: false,
    parts_ready: false,
    total_price: 0,
    requisitions: [],
    logs: [],
  };

  const [selectedPartId, setSelectedPartId] = useState<string>("");
  const [customPartName, setCustomPartName] = useState("");
  const [quantity, setQuantity] = useState<number>(1);
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [unit, setUnit] = useState("ชิ้น");

  const handleSelectPart = (partId: string) => {
    setSelectedPartId(partId);
    if (partId === "custom") {
      setCustomPartName("");
      setUnitPrice(0);
      setUnit("ชิ้น");
    } else {
      const found = MOCK_SPARE_PARTS.find((p) => p.part_id === partId);
      if (found) {
        setCustomPartName(found.name);
        setUnitPrice(found.unit_price ?? 0);
        setUnit(found.unit);
      }
    }
  };

  const handleAddRequisition = (e: React.FormEvent) => {
    e.preventDefault();
    const nameToUse = selectedPartId === "custom" ? customPartName : MOCK_SPARE_PARTS.find((p) => p.part_id === selectedPartId)?.name || customPartName;
    if (!nameToUse.trim()) {
      toast.error("กรุณาระบุชื่ออะไหล่");
      return;
    }
    if (quantity <= 0) {
      toast.error("จำนวนต้องมากกว่า 0");
      return;
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
      "ช่างซ่อมบำรุง",
    );

    toast.success(`เพิ่มรายการเบิก ${nameToUse} เรียบร้อยแล้ว`);
    // Reset form
    setSelectedPartId("");
    setCustomPartName("");
    setQuantity(1);
    setUnitPrice(0);
  };

  const handleTogglePartsReady = (checked: boolean) => {
    requestStore.togglePartsReady(request.request_id, checked, "ช่างซ่อมบำรุง");
    if (checked) {
      toast.success("อัปเดตสถานะ: อะไหล่พร้อมแล้ว! ระบบส่งแจ้งเตือนเรียบร้อย");
    } else {
      toast.info("ยกเลิกสถานะอะไหล่พร้อมแล้ว");
    }
  };

  const handleToggleConnected = (checked: boolean) => {
    requestStore.toggleSystemConnected(request.request_id, checked, "ระบบคลังสินค้า");
    toast.info(checked ? "เปิดการเชื่อมต่อระบบ Stock คลังสินค้า" : "สลับเป็นโหมด Manual ไม่เชื่อมต่อ Stock");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <ShoppingCart className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">ระบบเบิกอะไหล่ & คลังสินค้า (Stock Requisition)</DialogTitle>
                <DialogDescription className="text-xs">
                  ใบแจ้งซ่อม: <span className="font-semibold text-primary">{request.request_id}</span> ({request.asset_name})
                </DialogDescription>
              </div>
            </div>
            <Badge variant={stock.parts_ready ? "default" : "outline"} className={stock.parts_ready ? "bg-emerald-600 text-white" : ""}>
              {stock.parts_ready ? "อะไหล่พร้อมแล้ว" : "รออะไหล่"}
            </Badge>
          </div>
        </DialogHeader>

        {/* System Connection Switch */}
        <Card className="p-3 bg-muted/40 border-dashed space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {stock.is_system_connected ? (
                <Link className="h-4 w-4 text-emerald-600" />
              ) : (
                <Unlink className="h-4 w-4 text-amber-600" />
              )}
              <span className="text-xs font-semibold">
                สถานะการเชื่อมระบบ Stock:{" "}
                <span className={stock.is_system_connected ? "text-emerald-600 font-bold" : "text-amber-600 font-bold"}>
                  {stock.is_system_connected ? "เชื่อมต่อกับระบบคลังสินค้าแล้ว (Online)" : "ไม่ได้เชื่อมต่อระบบ (Manual Checkbox Mode)"}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="stock-switch" className="text-xs text-muted-foreground cursor-pointer">
                จำลองการเชื่อมต่อ
              </Label>
              <Switch id="stock-switch" checked={stock.is_system_connected} onCheckedChange={handleToggleConnected} />
            </div>
          </div>

          {/* Parts Ready Checkbox */}
          <div className="pt-2 border-t flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox
                id="parts-ready"
                checked={stock.parts_ready}
                onCheckedChange={(c) => handleTogglePartsReady(!!c)}
                className="h-5 w-5 border-2 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
              />
              <Label htmlFor="parts-ready" className="text-sm font-bold text-foreground cursor-pointer flex items-center gap-1.5">
                <CheckCircle2 className={`h-4 w-4 ${stock.parts_ready ? "text-emerald-600" : "text-muted-foreground"}`} />
                ปุ่ม Checkbox ✅ "อะไหล่พร้อมแล้ว"
              </Label>
            </div>
            <div className="text-xs text-muted-foreground font-mono">
              ราคารวมทั้งหมด: <span className="font-bold text-primary text-sm">฿{stock.total_price.toLocaleString()}</span>
            </div>
          </div>
        </Card>

        {/* Main Tabs */}
        <Tabs defaultValue="requisitions" className="w-full mt-2">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="requisitions" className="flex items-center gap-1.5 text-xs">
              <PackagePlus className="h-4 w-4" />
              รายการเบิกอะไหล่ ({stock.requisitions.length})
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-1.5 text-xs">
              <History className="h-4 w-4" />
              ประวัติการเบิก Log ({stock.logs.length})
            </TabsTrigger>
          </TabsList>

          {/* Requisition Tab Content */}
          <TabsContent value="requisitions" className="space-y-4 pt-3">
            {/* Form */}
            <form onSubmit={handleAddRequisition} className="p-3 border rounded-lg bg-card space-y-3">
              <div className="text-xs font-semibold text-primary flex items-center gap-1">
                <PackagePlus className="h-3.5 w-3.5" />
                เพิ่มรายการเบิกอะไหล่ใหม่
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">เลือกอะไหล่ในสต็อก / กรอกเอง</Label>
                  <Select value={selectedPartId} onValueChange={handleSelectPart}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="-- เลือกรายการอะไหล่ --" />
                    </SelectTrigger>
                    <SelectContent>
                      {MOCK_SPARE_PARTS.map((part) => (
                        <SelectItem key={part.part_id} value={part.part_id} className="text-xs">
                          {part.name} (คงเหลือ: {part.stock} {part.unit} @฿{part.unit_price})
                        </SelectItem>
                      ))}
                      <SelectItem value="custom" className="text-xs font-semibold text-primary">
                        + ระบุรายการอะไหล่นอกคลัง (Custom)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {selectedPartId === "custom" && (
                  <div className="space-y-1">
                    <Label className="text-xs">ชื่ออะไหล่ / อุปกรณ์</Label>
                    <Input
                      className="h-9 text-xs"
                      placeholder="เช่น ซีลยางพิเศษ 45mm"
                      value={customPartName}
                      onChange={(e) => setCustomPartName(e.target.value)}
                    />
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">จำนวน</Label>
                    <Input
                      type="number"
                      min={1}
                      className="h-9 text-xs"
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">หน่วย</Label>
                    <Input
                      className="h-9 text-xs"
                      placeholder="ชิ้น/ชุด"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">ราคา/หน่วย (บาท)</Label>
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

              <div className="flex items-center justify-between pt-1">
                <div className="text-xs text-muted-foreground">
                  ราคารวมรายการนี้: <span className="font-bold text-foreground font-mono">฿{(quantity * unitPrice).toLocaleString()}</span>
                </div>
                <Button type="submit" size="sm" variant="industrial" className="h-8 text-xs gap-1">
                  <PackagePlus className="h-3.5 w-3.5" />
                  บันทึกการเบิก
                </Button>
              </div>
            </form>

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
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted text-muted-foreground font-semibold border-b">
                      <tr>
                        <th className="p-2">รายการอะไหล่</th>
                        <th className="p-2 text-center">จำนวน</th>
                        <th className="p-2 text-right">ราคา/หน่วย</th>
                        <th className="p-2 text-right">รวมเป็นเงิน</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {stock.requisitions.map((req) => (
                        <tr key={req.requisition_id} className="hover:bg-muted/30">
                          <td className="p-2 font-medium">
                            {req.part_name}
                            <div className="text-[10px] text-muted-foreground font-mono">{req.part_id}</div>
                          </td>
                          <td className="p-2 text-center">
                            {req.quantity} {req.unit}
                          </td>
                          <td className="p-2 text-right font-mono">฿{req.unit_price.toLocaleString()}</td>
                          <td className="p-2 text-right font-bold text-primary font-mono">฿{req.total_price.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-muted/50 border-t font-semibold">
                      <tr>
                        <td colSpan={3} className="p-2 text-right">รวมงบประมาณอะไหล่ทั้งหมด:</td>
                        <td className="p-2 text-right text-emerald-600 font-bold font-mono">฿{stock.total_price.toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Logs Tab Content */}
          <TabsContent value="logs" className="space-y-2 pt-3">
            <div className="text-xs font-semibold text-muted-foreground">ประวัติบันทึกกิจกรรมสต็อก (Stock Audit Trail Logs)</div>
            {stock.logs.length === 0 ? (
              <div className="text-center py-6 border border-dashed rounded-lg text-xs text-muted-foreground">
                ยังไม่มีประวัติกิจกรรมสต็อก
              </div>
            ) : (
              <div className="space-y-2">
                {stock.logs.map((log) => (
                  <div key={log.log_id} className="p-2.5 border rounded-md bg-card space-y-1 text-xs">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-primary">{log.action}</span>
                      <span className="text-muted-foreground font-mono">{new Date(log.timestamp).toLocaleString("th-TH")}</span>
                    </div>
                    <p className="text-muted-foreground text-[11px] leading-snug">{log.details}</p>
                    <div className="text-[10px] text-muted-foreground">ผู้ทำรายการ: <span className="font-medium text-foreground">{log.actor}</span></div>
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
