import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WorkRequest, CATEGORY_LABEL, PRIORITY_LABEL, STATUS_LABEL } from "@/lib/mockData";
import { Download, FileSpreadsheet, Filter } from "lucide-react";
import { toast } from "sonner";

interface ExportDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requests: WorkRequest[];
}

export function ExportDataDialog({ open, onOpenChange, requests }: ExportDataDialogProps) {
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const handleExportCSV = () => {
    let filtered = [...requests];

    if (startDate) {
      filtered = filtered.filter((r) => new Date(r.reported_time) >= new Date(startDate));
    }
    if (endDate) {
      filtered = filtered.filter((r) => new Date(r.reported_time) <= new Date(endDate + "T23:59:59"));
    }
    if (statusFilter !== "all") {
      filtered = filtered.filter((r) => r.status === statusFilter);
    }
    if (categoryFilter !== "all") {
      filtered = filtered.filter((r) => r.category === categoryFilter);
    }

    if (filtered.length === 0) {
      toast.error("ไม่พบข้อมูลตามเงื่อนไขที่เลือก");
      return;
    }

    // Prepare CSV header and rows with UTF-8 BOM
    const headers = [
      "รหัสใบแจ้งซ่อม",
      "วันที่แจ้ง",
      "ชื่อเครื่องจักร",
      "สถานที่ตั้ง",
      "ผู้แจ้งซ่อม",
      "แผนก",
      "ประเภทงาน",
      "ระดับความเร่งด่วน",
      "สถานะ",
      "อาการปัญหาที่แจ้ง",
      "วันที่เข้าประเมิน",
      "ราคารวมอะไหล่เบิก (บาท)",
    ];

    const rows = filtered.map((r) => [
      `"${r.request_id}"`,
      `"${new Date(r.reported_time).toLocaleDateString("th-TH")}"`,
      `"${r.asset_name.replace(/"/g, '""')}"`,
      `"${r.asset_location.replace(/"/g, '""')}"`,
      `"${r.reported_by.replace(/"/g, '""')}"`,
      `"${(r.reported_by_department || r.request_details?.reporter_department || "ฝ่ายผลิต").replace(/"/g, '""')}"`,
      `"${CATEGORY_LABEL[r.category] || r.category}"`,
      `"${PRIORITY_LABEL[r.priority] || r.priority}"`,
      `"${STATUS_LABEL[r.status] || r.status}"`,
      `"${r.issue_summary.replace(/"/g, '""')}"`,
      `"${r.assessment_report?.visit_date || "-"}"`,
      `"${r.stock_requisition?.total_price || 0}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");

    link.setAttribute("href", url);
    link.setAttribute("download", `maintenance_export_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`ส่งออกข้อมูลเรียบร้อยแล้ว (${filtered.length} รายการ)`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-800">
            <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
            ส่งออกข้อมูลใบแจ้งซ่อม (Export Excel / CSV)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold text-slate-600">ตั้งแต่วันที่</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-600">ถึงวันที่</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-600">กรองตามสถานะงาน</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="ทั้งหมด" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด (All Statuses)</SelectItem>
                <SelectItem value="open">เปิดงาน (Open)</SelectItem>
                <SelectItem value="assess">เข้าประเมิน (Assess)</SelectItem>
                <SelectItem value="waiting">รออะไหล่ (Waiting)</SelectItem>
                <SelectItem value="doing">กำลังซ่อม (Doing)</SelectItem>
                <SelectItem value="done">ปิดงาน (Done)</SelectItem>
                <SelectItem value="complete">เสร็จสิ้น (Completed)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-600">กรองตามประเภทงานซ่อม</Label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="ทั้งหมด" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด (All Categories)</SelectItem>
                <SelectItem value="electrical-control">ไฟฟ้า / ระบบควบคุม</SelectItem>
                <SelectItem value="mechanical">เครื่องกล</SelectItem>
                <SelectItem value="pneumatic-hydraulic">ระบบลม / ไฮดรอลิก</SelectItem>
                <SelectItem value="lubrication-fluid">ระบบหล่อลื่น / ของไหล</SelectItem>
                <SelectItem value="other">อื่น ๆ</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded text-xs text-emerald-800">
            💡 ไฟล์ที่ส่งออกจะเป็นรูปแบบ UTF-8 CSV รองรับการเปิดอ่านภาษาไทยใน Microsoft Excel และ Google Sheets ได้ 100%
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            ยกเลิก
          </Button>
          <Button onClick={handleExportCSV} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
            <Download className="h-4 w-4" /> ดาวน์โหลดไฟล์ Excel (.csv)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
