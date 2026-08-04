import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { WorkRequest, CATEGORY_LABEL, PRIORITY_LABEL, STATUS_LABEL } from "@/lib/mockData";
import { Printer, ShieldCheck, Wrench, Building, User, FileText, Package, AlertTriangle } from "lucide-react";

interface WorkOrderPrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: WorkRequest | null;
}

export function WorkOrderPrintDialog({ open, onOpenChange, request }: WorkOrderPrintDialogProps) {
  if (!request) return null;

  const handlePrint = () => {
    window.print();
  };

  const details = request.request_details;
  const assessment = request.assessment_report;
  const stock = request.stock_requisition;
  const dualSig = request.dual_approval;
  const recheck = request.recheck_data;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 print:p-0 print:max-w-none print:shadow-none print:border-none print:bg-white print:text-black" onOpenAutoFocus={(e) => e.preventDefault()}>
        {/* Screen Action Toolbar Header (Hidden in Print) */}
        <div className="flex items-center justify-between border-b pb-3 mb-4 print:hidden">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 [text-wrap:balance]">
                พรีวิวใบสั่งซ่อมบำรุง (Work Order A4)
              </DialogTitle>
              <DialogDescription className="sr-only">
                พรีวิวเอกสารใบสั่งซ่อมบำรุงมาตรฐานขนาด A4 สำหรับพิมพ์หรือบันทึกเป็น PDF
              </DialogDescription>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <Button onClick={handlePrint} size="sm" className="bg-sky-600 hover:bg-sky-700 text-white gap-2 font-bold h-9 px-3">
              <Printer className="h-4 w-4" /> พิมพ์เอกสาร / บันทึก PDF
            </Button>
          </div>
        </div>

        {/* Printable Document Container */}
        <div id="work-order-document" className="print-area bg-white dark:bg-slate-900 p-4 sm:p-8 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-sans space-y-6 text-sm">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b-2 border-slate-800 dark:border-slate-700 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-sky-600 text-white flex items-center justify-center font-bold text-lg shrink-0">
                  M
                </div>
                <h1 className="text-base sm:text-xl font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 leading-tight">
                  บริษัท เมนเทนแนนท์ ซิสเต็ม จำกัด (มหาชน)
                </h1>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                เอกสารใบสั่งซ่อมบำรุงและประเมินงาน (WORK ORDER & MAINTENANCE REPORT)
              </p>
            </div>
            <div className="w-full sm:w-auto text-left sm:text-right border border-slate-300 dark:border-slate-700 rounded p-2 bg-slate-50 dark:bg-slate-800/60">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">เลขที่เอกสาร / Work Order No.</p>
              <p className="text-base font-bold text-sky-700 dark:text-sky-400 font-mono">{request.request_id}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                วันที่พิมพ์: {new Date().toLocaleDateString("th-TH")} {new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>

          {/* Section 1: Asset & Requester Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/40 p-3.5 sm:p-4 rounded-md border border-slate-200 dark:border-slate-800">
            <div className="space-y-2">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 border-b border-slate-300 dark:border-slate-700 pb-1 flex items-center gap-1.5 text-xs sm:text-sm">
                <Building className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0" /> ข้อมูลเครื่องจักรและสถานที่
              </h3>
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                <span className="text-slate-500 dark:text-slate-400">รหัสทรัพย์สิน:</span>
                <span className="col-span-2 font-semibold font-mono text-slate-800 dark:text-slate-200">{details?.asset_id || request.asset_name}</span>

                <span className="text-slate-500 dark:text-slate-400">ชื่อเครื่องจักร:</span>
                <span className="col-span-2 font-semibold text-slate-800 dark:text-slate-200">{request.asset_name}</span>

                <span className="text-slate-500 dark:text-slate-400">ประเภทเครื่อง:</span>
                <span className="col-span-2 text-slate-700 dark:text-slate-300">{details?.asset_type || "-"}</span>

                <span className="text-slate-500 dark:text-slate-400">โซน/ไลน์ผลิต:</span>
                <span className="col-span-2 text-slate-700 dark:text-slate-300">{details?.machine_zone || "-"} / {details?.location_line || "-"}</span>

                <span className="text-slate-500 dark:text-slate-400">สถานที่ตั้ง:</span>
                <span className="col-span-2 text-slate-700 dark:text-slate-300">{request.asset_location}</span>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 border-b border-slate-300 dark:border-slate-700 pb-1 flex items-center gap-1.5 text-xs sm:text-sm">
                <User className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0" /> ข้อมูลผู้แจ้งและวันเวลา
              </h3>
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                <span className="text-slate-500 dark:text-slate-400">ผู้แจ้งซ่อม:</span>
                <span className="col-span-2 font-semibold text-slate-800 dark:text-slate-200">{request.reported_by}</span>

                <span className="text-slate-500 dark:text-slate-400">แผนก:</span>
                <span className="col-span-2 text-slate-700 dark:text-slate-300">{request.reported_by_department || details?.reporter_department || "ฝ่ายผลิต"}</span>

                <span className="text-slate-500 dark:text-slate-400">วันเวลาที่แจ้ง:</span>
                <span className="col-span-2 text-slate-700 dark:text-slate-300">{new Date(request.reported_time).toLocaleString("th-TH")}</span>

                <span className="text-slate-500 dark:text-slate-400">ความเร่งด่วน:</span>
                <span className="col-span-2 font-bold text-rose-600 dark:text-rose-400">{PRIORITY_LABEL[request.priority]}</span>

                <span className="text-slate-500 dark:text-slate-400">ประเภทงาน:</span>
                <span className="col-span-2 font-medium text-slate-800 dark:text-slate-200">{CATEGORY_LABEL[request.category]}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Problem Description */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-md p-3.5 sm:p-4 space-y-2">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800 pb-1 flex items-center gap-1.5 text-xs sm:text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" /> อาการเสียและรายละเอียดปัญหาที่แจ้ง
            </h3>
            <p className="text-slate-800 dark:text-slate-200 font-medium bg-amber-50/50 dark:bg-amber-950/30 p-2.5 rounded border border-amber-200 dark:border-amber-900/50 text-xs sm:text-sm leading-relaxed">
              {request.issue_summary}
            </p>
            {details && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-1 text-slate-600 dark:text-slate-300">
                <div><span className="text-slate-500 dark:text-slate-400">อาการปัญหา:</span> {details.issue_symptom}</div>
                <div><span className="text-slate-500 dark:text-slate-400">ความถี่:</span> {details.issue_frequency}</div>
                <div><span className="text-slate-500 dark:text-slate-400">สถานะเครื่อง:</span> {details.machine_operability}</div>
              </div>
            )}
          </div>

          {/* Section 3: Assessment Report (If available) */}
          {assessment && (
            <div className="border border-sky-200 dark:border-sky-900/50 rounded-md p-3.5 sm:p-4 bg-sky-50/30 dark:bg-sky-950/30 space-y-2">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 border-b border-sky-200 dark:border-sky-900/50 pb-1 flex items-center gap-1.5 text-xs sm:text-sm">
                <Wrench className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0" /> รายงานผลการประเมินหน้างาน (Assessment Summary)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <p><span className="text-slate-500 dark:text-slate-400">วันที่ประเมิน:</span> {assessment.visit_date}</p>
                  <p><span className="text-slate-500 dark:text-slate-400">ช่วงเวลาซ่อม:</span> {assessment.repair_date_range?.start} ถึง {assessment.repair_date_range?.end}</p>
                  <p><span className="text-slate-500 dark:text-slate-400">ระดับความสำคัญ:</span> <span className="font-bold text-sky-700 dark:text-sky-400">{assessment.priority_level?.toUpperCase()}</span></p>
                </div>
                <div>
                  <p><span className="text-slate-500 dark:text-slate-400">ผลกระทบระหว่างรอ:</span> {assessment.impact_while_waiting}</p>
                  <p><span className="text-slate-500 dark:text-slate-400">สถานะเครื่องขณะรอ:</span> {assessment.machine_status_while_waiting}</p>
                </div>
              </div>
              {assessment.result_text && (
                <div className="text-xs pt-1">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">ผลการประเมิน:</span> {assessment.result_text}
                </div>
              )}
              {assessment.temp_measure && (
                <div className="text-xs text-amber-800 dark:text-amber-300 bg-amber-100/60 dark:bg-amber-950/50 p-2 rounded">
                  <span className="font-semibold">มาตรการชั่วคราว:</span> {assessment.temp_measure}
                </div>
              )}
            </div>
          )}

          {/* Section 4: Stock Requisition Parts Table */}
          {stock && stock.requisitions && stock.requisitions.length > 0 && (
            <div className="space-y-2 overflow-x-auto">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800 pb-1 flex items-center gap-1.5 text-xs sm:text-sm">
                <Package className="h-4 w-4 text-slate-700 dark:text-slate-300 shrink-0" /> รายการอะไหล่ที่เบิกใช้งาน (Stock Requisitions)
              </h3>
              <table className="w-full text-left text-xs border border-slate-200 dark:border-slate-800 rounded min-w-[500px]">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-2 border-r border-slate-200 dark:border-slate-700">รหัสอะไหล่</th>
                    <th className="p-2 border-r border-slate-200 dark:border-slate-700">ชื่อรายการอะไหล่</th>
                    <th className="p-2 text-right border-r border-slate-200 dark:border-slate-700">จำนวน</th>
                    <th className="p-2 text-right border-r border-slate-200 dark:border-slate-700">ราคา/หน่วย (บาท)</th>
                    <th className="p-2 text-right">ราคารวม (บาท)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {stock.requisitions.map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-2 font-mono border-r border-slate-200 dark:border-slate-800">{item.part_id}</td>
                      <td className="p-2 border-r border-slate-200 dark:border-slate-800 font-medium">{item.part_name}</td>
                      <td className="p-2 text-right border-r border-slate-200 dark:border-slate-800">{item.quantity} {item.unit}</td>
                      <td className="p-2 text-right border-r border-slate-200 dark:border-slate-800">{item.unit_price?.toLocaleString()}</td>
                      <td className="p-2 text-right font-semibold">{item.total_price?.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 dark:bg-slate-800/60 font-bold border-t border-slate-300 dark:border-slate-700">
                  <tr>
                    <td colSpan={4} className="p-2 text-right border-r border-slate-200 dark:border-slate-700">รวมเป็นเงินทั้งสิ้น (บาท):</td>
                    <td className="p-2 text-right text-sky-700 dark:text-sky-400 text-sm">฿{stock.total_price?.toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Section 5: Dual Signatures (Sign-off 2 คน) */}
          <div className="border border-slate-300 dark:border-slate-800 rounded-md p-3.5 sm:p-4 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 border-b border-slate-300 dark:border-slate-700 pb-1 flex items-center gap-1.5 text-xs sm:text-sm">
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" /> ตรวจรับงานและอนุมัติปิดงาน (Dual Sign-off Approval)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              
              {/* Signer 1: Head / Supervisor */}
              <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 rounded text-center space-y-2">
                <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">1. หัวหน้างาน / ผู้ตรวจสอบ (Supervisor)</p>
                <div className="h-20 border-b border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center p-2">
                  {dualSig?.approver1?.signature_data_url ? (
                    <img src={dualSig.approver1.signature_data_url} alt="Signature 1" className="max-h-16 object-contain bg-white rounded p-0.5" />
                  ) : (
                    <span className="text-xs text-slate-400 dark:text-slate-500 italic">(ยังไม่ได้ลงนาม)</span>
                  )}
                </div>
                <div className="text-xs space-y-0.5">
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{dualSig?.approver1?.signer_name || "(....................................................)"}</p>
                  <p className="text-slate-500 dark:text-slate-400">{dualSig?.approver1?.signer_role || "หัวหน้าแผนกซ่อมบำรุง"}</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    วันที่: {dualSig?.approver1?.signed_at ? new Date(dualSig.approver1.signed_at).toLocaleDateString("th-TH") : "..... / ..... / .........."}
                  </p>
                </div>
              </div>

              {/* Signer 2: Repair Technician */}
              <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 rounded text-center space-y-2">
                <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">2. ช่างผู้ดำเนินการซ่อม (Repair Technician)</p>
                <div className="h-20 border-b border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center p-2">
                  {dualSig?.approver2?.signature_data_url ? (
                    <img src={dualSig.approver2.signature_data_url} alt="Signature 2" className="max-h-16 object-contain bg-white rounded p-0.5" />
                  ) : (
                    <span className="text-xs text-slate-400 dark:text-slate-500 italic">(ยังไม่ได้ลงนาม)</span>
                  )}
                </div>
                <div className="text-xs space-y-0.5">
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{dualSig?.approver2?.signer_name || "(....................................................)"}</p>
                  <p className="text-slate-500 dark:text-slate-400">{dualSig?.approver2?.signer_role || "เจ้าหน้าที่แผนกซ่อมบำรุง"}</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    วันที่: {dualSig?.approver2?.signed_at ? new Date(dualSig.approver2.signed_at).toLocaleDateString("th-TH") : "..... / ..... / .........."}
                  </p>
                </div>
              </div>

            </div>
          </div>

          {/* Section 6: Recheck Status Footer */}
          {recheck && (
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800 pt-3">
              <div>
                <span className="font-semibold text-slate-700 dark:text-slate-300">การติดตาม Re-check 2 สัปดาห์:</span>{" "}
                สัปดาห์ที่ 1 ({recheck.round1?.status === "completed" ? " ผ่าน" : " รอตรวจ"}),{" "}
                สัปดาห์ที่ 2 ({recheck.round2?.status === "completed" ? " ผ่าน" : " รอตรวจ"})
              </div>
              <div className="font-mono text-[11px]">
                Status: <span className="font-bold text-emerald-600 dark:text-emerald-400">{STATUS_LABEL[request.status]}</span>
              </div>
            </div>
          )}

        </div>

        {/* Screen Action Footer (Hidden in Print) */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-4 border-t print:hidden">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto h-11 sm:h-10 text-xs sm:text-sm font-semibold">
            ปิดหน้าต่าง
          </Button>
          <Button onClick={handlePrint} className="w-full sm:w-auto bg-sky-600 hover:bg-sky-700 text-white gap-2 font-bold h-11 sm:h-10 px-5 shadow-md">
            <Printer className="h-4 w-4" /> พิมพ์เอกสาร / บันทึก PDF
          </Button>
        </div>

        {/* Global Print Style overrides */}
        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            .print-area, .print-area * {
              visibility: visible;
            }
            .print-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              margin: 0;
              padding: 1.5cm;
              border: none !important;
              box-shadow: none !important;
            }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
