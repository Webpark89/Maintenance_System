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
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 print:p-0 print:max-w-none print:shadow-none print:border-none print:bg-white print:text-black">
        {/* Screen Action Toolbar (Hidden in Print) */}
        <div className="flex items-center justify-between border-b pb-4 mb-4 print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-sky-600" />
            <div>
              <DialogTitle className="text-lg font-bold text-slate-800">
                พรีวิวใบสั่งซ่อมบำรุง (Work Order A4)
              </DialogTitle>
              <DialogDescription className="sr-only">
                พรีวิวเอกสารใบสั่งซ่อมบำรุงมาตรฐานขนาด A4 สำหรับพิมพ์หรือบันทึกเป็น PDF
              </DialogDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handlePrint} className="bg-sky-600 hover:bg-sky-700 text-white gap-2">
              <Printer className="h-4 w-4" /> พิมพ์เอกสาร / บันทึก PDF
            </Button>
          </div>
        </div>

        {/* Printable Document Container */}
        <div id="work-order-document" className="print-area bg-white p-6 sm:p-8 rounded-lg border border-slate-200 text-slate-900 font-sans space-y-6 text-sm">
          
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-sky-600 text-white flex items-center justify-center font-bold text-lg">
                  M
                </div>
                <h1 className="text-xl font-bold uppercase tracking-wider text-slate-900">
                  บริษัท เมนเทนแนนท์ ซิสเต็ม จำกัด (มหาชน)
                </h1>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                เอกสารใบสั่งซ่อมบำรุงและประเมินงาน (WORK ORDER & MAINTENANCE REPORT)
              </p>
            </div>
            <div className="text-right border border-slate-300 rounded p-2 bg-slate-50">
              <p className="text-xs font-semibold text-slate-500">เลขที่เอกสาร / Work Order No.</p>
              <p className="text-base font-bold text-sky-700 font-mono">{request.request_id}</p>
              <p className="text-[11px] text-slate-500">
                วันที่พิมพ์: {new Date().toLocaleDateString("th-TH")} {new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>

          {/* Section 1: Asset & Requester Information */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-md border border-slate-200">
            <div className="space-y-2">
              <h3 className="font-bold text-slate-800 border-b border-slate-300 pb-1 flex items-center gap-1.5">
                <Building className="h-4 w-4 text-sky-600" /> ข้อมูลเครื่องจักรและสถานที่
              </h3>
              <div className="grid grid-cols-3 gap-1 text-xs">
                <span className="text-slate-500">รหัสทรัพย์สิน:</span>
                <span className="col-span-2 font-semibold font-mono">{details?.asset_id || request.asset_name}</span>

                <span className="text-slate-500">ชื่อเครื่องจักร:</span>
                <span className="col-span-2 font-semibold">{request.asset_name}</span>

                <span className="text-slate-500">ประเภทเครื่อง:</span>
                <span className="col-span-2">{details?.asset_type || "-"}</span>

                <span className="text-slate-500">โซน/ไลน์ผลิต:</span>
                <span className="col-span-2">{details?.machine_zone || "-"} / {details?.location_line || "-"}</span>

                <span className="text-slate-500">สถานที่ตั้ง:</span>
                <span className="col-span-2">{request.asset_location}</span>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-bold text-slate-800 border-b border-slate-300 pb-1 flex items-center gap-1.5">
                <User className="h-4 w-4 text-sky-600" /> ข้อมูลผู้แจ้งและวันเวลา
              </h3>
              <div className="grid grid-cols-3 gap-1 text-xs">
                <span className="text-slate-500">ผู้แจ้งซ่อม:</span>
                <span className="col-span-2 font-semibold">{request.reported_by}</span>

                <span className="text-slate-500">แผนก:</span>
                <span className="col-span-2">{request.reported_by_department || details?.reporter_department || "ฝ่ายผลิต"}</span>

                <span className="text-slate-500">วันเวลาที่แจ้ง:</span>
                <span className="col-span-2">{new Date(request.reported_time).toLocaleString("th-TH")}</span>

                <span className="text-slate-500">ความเร่งด่วน:</span>
                <span className="col-span-2 font-bold text-rose-600">{PRIORITY_LABEL[request.priority]}</span>

                <span className="text-slate-500">ประเภทงาน:</span>
                <span className="col-span-2 font-medium">{CATEGORY_LABEL[request.category]}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Problem Description */}
          <div className="border border-slate-200 rounded-md p-4 space-y-2">
            <h3 className="font-bold text-slate-800 border-b border-slate-200 pb-1 flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-amber-600" /> อาการเสียและรายละเอียดปัญหาที่แจ้ง
            </h3>
            <p className="text-slate-800 font-medium bg-amber-50/50 p-2.5 rounded border border-amber-200">
              {request.issue_summary}
            </p>
            {details && (
              <div className="grid grid-cols-3 gap-2 text-xs pt-1 text-slate-600">
                <div><span className="text-slate-500">อาการปัญหา:</span> {details.issue_symptom}</div>
                <div><span className="text-slate-500">ความถี่:</span> {details.issue_frequency}</div>
                <div><span className="text-slate-500">สถานะเครื่อง:</span> {details.machine_operability}</div>
              </div>
            )}
          </div>

          {/* Section 3: Assessment Report (If available) */}
          {assessment && (
            <div className="border border-sky-200 rounded-md p-4 bg-sky-50/30 space-y-2">
              <h3 className="font-bold text-slate-800 border-b border-sky-200 pb-1 flex items-center gap-1.5">
                <Wrench className="h-4 w-4 text-sky-600" /> รายงานผลการประเมินหน้างาน (Assessment Summary)
              </h3>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p><span className="text-slate-500">วันที่ประเมิน:</span> {assessment.visit_date}</p>
                  <p><span className="text-slate-500">ช่วงเวลาซ่อม:</span> {assessment.repair_date_range?.start} ถึง {assessment.repair_date_range?.end}</p>
                  <p><span className="text-slate-500">ระดับความสำคัญ:</span> <span className="font-bold text-sky-700">{assessment.priority_level?.toUpperCase()}</span></p>
                </div>
                <div>
                  <p><span className="text-slate-500">ผลกระทบระหว่างรอ:</span> {assessment.impact_while_waiting}</p>
                  <p><span className="text-slate-500">สถานะเครื่องขณะรอ:</span> {assessment.machine_status_while_waiting}</p>
                </div>
              </div>
              {assessment.result_text && (
                <div className="text-xs pt-1">
                  <span className="font-semibold text-slate-700">ผลการประเมิน:</span> {assessment.result_text}
                </div>
              )}
              {assessment.temp_measure && (
                <div className="text-xs text-amber-800 bg-amber-100/60 p-2 rounded">
                  <span className="font-semibold">มาตรการชั่วคราว:</span> {assessment.temp_measure}
                </div>
              )}
            </div>
          )}

          {/* Section 4: Stock Requisition Parts Table */}
          {stock && stock.requisitions && stock.requisitions.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-bold text-slate-800 border-b border-slate-200 pb-1 flex items-center gap-1.5">
                <Package className="h-4 w-4 text-slate-700" /> รายการอะไหล่ที่เบิกใช้งาน (Stock Requisitions)
              </h3>
              <table className="w-full text-left text-xs border border-slate-200 rounded">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b">
                  <tr>
                    <th className="p-2 border-r">รหัสอะไหล่</th>
                    <th className="p-2 border-r">ชื่อรายการอะไหล่</th>
                    <th className="p-2 text-right border-r">จำนวน</th>
                    <th className="p-2 text-right border-r">ราคา/หน่วย (บาท)</th>
                    <th className="p-2 text-right">ราคารวม (บาท)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {stock.requisitions.map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-2 font-mono border-r">{item.part_id}</td>
                      <td className="p-2 border-r font-medium">{item.part_name}</td>
                      <td className="p-2 text-right border-r">{item.quantity} {item.unit}</td>
                      <td className="p-2 text-right border-r">{item.unit_price?.toLocaleString()}</td>
                      <td className="p-2 text-right font-semibold">{item.total_price?.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 font-bold border-t border-slate-300">
                  <tr>
                    <td colSpan={4} className="p-2 text-right border-r">รวมเป็นเงินทั้งสิ้น (บาท):</td>
                    <td className="p-2 text-right text-sky-700 text-sm">฿{stock.total_price?.toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Section 5: Dual Signatures (Sign-off 2 คน) */}
          <div className="border border-slate-300 rounded-md p-4 bg-slate-50/50 space-y-3">
            <h3 className="font-bold text-slate-800 border-b border-slate-300 pb-1 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600" /> ตรวจรับงานและอนุมัติปิดงาน (Dual Sign-off Approval)
            </h3>
            <div className="grid grid-cols-2 gap-6 pt-2">
              
              {/* Signer 1: Head / Supervisor */}
              <div className="border border-slate-200 bg-white p-3 rounded text-center space-y-2">
                <p className="text-xs font-bold text-slate-600 uppercase">1. หัวหน้างาน / ผู้ตรวจสอบ (Supervisor)</p>
                <div className="h-20 border-b border-dashed border-slate-300 flex items-center justify-center p-2">
                  {dualSig?.approver1?.signature_data_url ? (
                    <img src={dualSig.approver1.signature_data_url} alt="Signature 1" className="max-h-16 object-contain" />
                  ) : (
                    <span className="text-xs text-slate-400 italic">(ยังไม่ได้ลงนาม)</span>
                  )}
                </div>
                <div className="text-xs space-y-0.5">
                  <p className="font-semibold text-slate-800">{dualSig?.approver1?.signer_name || "(....................................................)"}</p>
                  <p className="text-slate-500">{dualSig?.approver1?.signer_role || "หัวหน้าแผนกซ่อมบำรุง"}</p>
                  <p className="text-[11px] text-slate-400">
                    วันที่: {dualSig?.approver1?.signed_at ? new Date(dualSig.approver1.signed_at).toLocaleDateString("th-TH") : "..... / ..... / .........."}
                  </p>
                </div>
              </div>

              {/* Signer 2: Repair Technician */}
              <div className="border border-slate-200 bg-white p-3 rounded text-center space-y-2">
                <p className="text-xs font-bold text-slate-600 uppercase">2. ช่างผู้ดำเนินการซ่อม (Repair Technician)</p>
                <div className="h-20 border-b border-dashed border-slate-300 flex items-center justify-center p-2">
                  {dualSig?.approver2?.signature_data_url ? (
                    <img src={dualSig.approver2.signature_data_url} alt="Signature 2" className="max-h-16 object-contain" />
                  ) : (
                    <span className="text-xs text-slate-400 italic">(ยังไม่ได้ลงนาม)</span>
                  )}
                </div>
                <div className="text-xs space-y-0.5">
                  <p className="font-semibold text-slate-800">{dualSig?.approver2?.signer_name || "(....................................................)"}</p>
                  <p className="text-slate-500">{dualSig?.approver2?.signer_role || "เจ้าหน้าที่แผนกซ่อมบำรุง"}</p>
                  <p className="text-[11px] text-slate-400">
                    วันที่: {dualSig?.approver2?.signed_at ? new Date(dualSig.approver2.signed_at).toLocaleDateString("th-TH") : "..... / ..... / .........."}
                  </p>
                </div>
              </div>

            </div>
          </div>

          {/* Section 6: Recheck Status Footer */}
          {recheck && (
            <div className="flex justify-between items-center text-xs text-slate-500 border-t pt-3">
              <div>
                <span className="font-semibold text-slate-700">การติดตาม Re-check 2 สัปดาห์:</span>{" "}
                สัปดาห์ที่ 1 ({recheck.round1?.status === "completed" ? " ผ่าน" : " รอตรวจ"}),{" "}
                สัปดาห์ที่ 2 ({recheck.round2?.status === "completed" ? " ผ่าน" : " รอตรวจ"})
              </div>
              <div className="font-mono text-[11px]">
                Status: <span className="font-bold text-emerald-600">{STATUS_LABEL[request.status]}</span>
              </div>
            </div>
          )}

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
