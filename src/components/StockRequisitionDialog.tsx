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
import { getCurrentUser } from "@/lib/auth";
import { PackagePlus, History, Link, Unlink, CheckCircle2, ShoppingCart, Lock, ShieldCheck } from "lucide-react";
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
    is_system_connected: rawStock?.is_system_connected ?? false,
    parts_ready: rawStock?.parts_ready ?? false,
    total_price: rawStock?.total_price ?? 0,
    requisitions: rawStock?.requisitions || [],
    logs: rawStock?.logs || [],
  };

  const isHighCost = stock.total_price >= 10000;
  const isApprovalPending = isHighCost && request.requisition_approval?.status !== "approved";

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
    if (isCompleted) {
      toast.error("งานซ่อมเสร็จสิ้นสมบูรณ์แล้ว ไม่สามารถแก้ไขหรือเบิกอะไหล่เพิ่มได้");
      return;
    }

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
      user?.name || "ช่างซ่อมบำรุง",
    );

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

  const handleToggleConnected = (checked: boolean) => {
    if (isCompleted) return;
    requestStore.toggleSystemConnected(request.request_id, checked, "ระบบคลังสินค้า");
    toast.info(checked ? "เปิดการเชื่อมต่อระบบ Stock คลังสินค้า" : "สลับเป็นโหมด Manual ไม่เชื่อมต่อ Stock");
  };

  const handleApproveHighCost = () => {
    if (!isSupervisor) {
      toast.error("ปฏิเสธการอนุมัติ: เฉพาะ Supervisor เท่านั้นที่มีสิทธิ์อนุมัติการเบิกอะไหล่มูลค่าสูง");
      return;
    }
    requestStore.approveRequisition(request.request_id, user?.name || "Supervisor", true);
    toast.success("อนุมัติการเบิกอะไหล่มูลค่าสูงเรียบร้อยแล้ว");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader className="border-b pb-3">
          {/* Mobile, Tablet & iPad Layout (< 1024px) */}
          <div className="flex lg:hidden flex-col items-center text-center space-y-1.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary w-fit mx-auto">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <DialogTitle className="text-base sm:text-lg font-bold text-foreground [text-wrap:balance]">
              ระบบเบิกอะไหล่ & คลังสินค้า (Stock Requisition)
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed [text-wrap:balance]">
              ใบแจ้งซ่อม: <span className="font-semibold text-primary">{request.request_id}</span> ({request.asset_name})
            </DialogDescription>
            <Badge variant={stock.parts_ready ? "default" : "outline"} className={stock.parts_ready ? "bg-emerald-600 text-white w-fit mx-auto mt-1" : "w-fit mx-auto mt-1"}>
              {stock.parts_ready ? "อะไหล่พร้อมแล้ว" : "รออะไหล่"}
            </Badge>
          </div>

          {/* Desktop & Laptop Layout (>= 1024px) */}
          <div className="hidden lg:flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                <ShoppingCart className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">ระบบเบิกอะไหล่ & คลังสินค้า (Stock Requisition)</DialogTitle>
                <DialogDescription className="text-xs">
                  ใบแจ้งซ่อม: <span className="font-semibold text-primary">{request.request_id}</span> ({request.asset_name})
                </DialogDescription>
              </div>
            </div>
            <Badge variant={stock.parts_ready ? "default" : "outline"} className={stock.parts_ready ? "bg-emerald-600 text-white shrink-0" : "shrink-0"}>
              {stock.parts_ready ? "อะไหล่พร้อมแล้ว" : "รออะไหล่"}
            </Badge>
          </div>
        </DialogHeader>

        {/* Lock Banner if Completed */}
        {isCompleted && (
          <div className="p-3 rounded-lg bg-slate-900 text-slate-100 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 font-semibold">
              <Lock className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>งานซ่อมนี้เสร็จสิ้นสมบูรณ์แล้ว — ล็อกการแก้ไขรายการเบิกอะไหล่เพื่อป้องกันการแก้ไขย้อนหลัง</span>
            </div>
            <Badge variant="outline" className="border-slate-700 text-emerald-400 bg-slate-800 text-[10px] shrink-0">
              Read Only Mode
            </Badge>
          </div>
        )}

        {/* High Cost Approval Warning Banner */}
        {isHighCost && (
          <div className={`p-3 rounded-lg border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs ${
            request.requisition_approval?.status === "approved"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200"
              : "bg-blue-500/10 border-blue-500/30 text-blue-900 dark:text-blue-200"
          }`}>
            <div className="flex items-center gap-2 font-semibold">
              <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>
                มูลค่าเบิกอะไหล่รวม: <strong className="font-mono text-sm">฿{stock.total_price.toLocaleString()}</strong> (เกินเกณฑ์ ฿10,000) —{" "}
                {request.requisition_approval?.status === "approved"
                  ? `อนุมัติแล้ว โดย ${request.requisition_approval.approved_by}`
                  : "รอการอนุมัติจาก Supervisor"}
              </span>
            </div>
            {isSupervisor && request.requisition_approval?.status !== "approved" && !isCompleted && (
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-8 shrink-0" onClick={handleApproveHighCost}>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> กดอนุมัติการเบิก
              </Button>
            )}
          </div>
        )}

        {/* System Connection Switch Card */}
        <Card className="p-3.5 bg-muted/40 border-dashed space-y-3">
          {/* Top Row: Connection Status & Toggle */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
            <div className="flex items-start gap-2 min-w-0">
              {stock.is_system_connected ? (
                <Link className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <Unlink className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div className="text-xs leading-tight">
                <span className="text-muted-foreground block font-medium">สถานะเชื่อมต่อคลังสินค้า:</span>
                <span className={`font-bold ${stock.is_system_connected ? "text-emerald-600" : "text-amber-600"}`}>
                  {stock.is_system_connected ? "เชื่อมต่อระบบแล้ว (Online)" : "ไม่ได้เชื่อมต่อระบบ (Manual Mode)"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 bg-background/80 px-2.5 py-1 rounded-md border text-xs">
              <Label htmlFor="stock-switch" className="text-[11px] font-medium text-muted-foreground cursor-pointer whitespace-nowrap">
                จำลองการเชื่อมต่อ
              </Label>
              <Switch id="stock-switch" disabled={isCompleted} checked={stock.is_system_connected} onCheckedChange={handleToggleConnected} />
            </div>
          </div>

          {/* Bottom Row: Parts Ready Checkbox & Total Price */}
          <div className="pt-2.5 border-t border-border/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <Checkbox
                id="parts-ready"
                disabled={isCompleted}
                checked={stock.parts_ready}
                onCheckedChange={(c) => handleTogglePartsReady(!!c)}
                className="h-5 w-5 border-2 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600 shrink-0"
              />
              <Label htmlFor="parts-ready" className="text-xs sm:text-sm font-bold text-foreground cursor-pointer flex items-center gap-1.5 select-none">
                <span>อะไหล่พร้อมใช้งานแล้ว</span>
                <Badge variant={stock.parts_ready ? "default" : "outline"} className={`text-[10px] py-0 px-1.5 ${stock.parts_ready ? "bg-emerald-600 text-white" : "text-amber-600 border-amber-400"}`}>
                  {stock.parts_ready ? "พร้อมเบิก" : "รอเตรียมของ"}
                </Badge>
              </Label>
            </div>
            <div className="text-xs text-muted-foreground font-mono self-end sm:self-auto bg-background/60 px-2 py-0.5 rounded border">
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
            {!isCompleted && (
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

