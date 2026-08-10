import Swal, { SweetAlertOptions } from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";

// SweetAlert2 Toast Mixin for general status notifications (มุมบนขวา)
const SwalToast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3500,
  timerProgressBar: true,
  didOpen: (toastEl) => {
    toastEl.addEventListener("mouseenter", Swal.stopTimer);
    toastEl.addEventListener("mouseleave", Swal.resumeTimer);
  },
});

type ToastOptions = {
  description?: string;
  duration?: number;
  mode?: "toast" | "modal";
  [key: string]: any;
};

const createSwalToast = (icon: SweetAlertOptions["icon"], message: any, options?: ToastOptions) => {
  const title = typeof message === "string" ? message : String(message || "");
  const text = options?.description;
  return SwalToast.fire({
    icon,
    title,
    text,
    timer: options?.duration || 3500,
  });
};

const createSwalModal = (icon: SweetAlertOptions["icon"], message: any, options?: ToastOptions) => {
  const rawMsg = typeof message === "string" ? message : String(message || "");
  let modalTitle = icon === "error" ? "ข้อผิดพลาด / แจ้งเตือน" : "แจ้งเตือน";
  let modalText = options?.description ? `${rawMsg}\n${options.description}` : rawMsg;

  if (rawMsg.includes("ถูกระงับ")) {
    modalTitle = "บัญชีถูกระงับการใช้งาน";
    if (rawMsg.includes("กรุณาติดต่อ")) {
      modalText = "บัญชีผู้ใช้นี้อยู่ในสถานะถูกระงับชั่วคราว\nกรุณาติดต่อหัวหน้าช่าง หรือผู้ดูแลระบบ";
    }
  } else if (rawMsg.includes("รหัสผ่านไม่ถูกต้อง") || rawMsg.includes("ไม่ถูกต้อง")) {
    modalTitle = "เข้าสู่ระบบไม่สำเร็จ";
  } else if (rawMsg.includes("ไม่มีสิทธิ์") || rawMsg.includes("ปฏิเสธ")) {
    modalTitle = "ปฏิเสธการเข้าถึง";
  }

  return Swal.fire({
    icon,
    title: modalTitle,
    text: modalText,
    confirmButtonText: "ตกลง",
    confirmButtonColor: icon === "error" ? "#dc2626" : "#2563eb",
    customClass: {
      popup: "rounded-2xl p-6 shadow-2xl dark:bg-slate-900 dark:text-slate-100",
      title: "text-lg font-bold text-slate-800 dark:text-slate-100",
      htmlContainer: "text-sm text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed mt-2",
    },
  });
};

const toastHandler = (message: any, options?: ToastOptions) => {
  return createSwalToast("info", message, options);
};

// แจ้งเตือนสถานะทั่วไป -> SweetAlert2 Toast Mode (มุมบนขวา)
toastHandler.success = (message: any, options?: ToastOptions) => createSwalToast("success", message, options);
toastHandler.info = (message: any, options?: ToastOptions) => createSwalToast("info", message, options);
toastHandler.warning = (message: any, options?: ToastOptions) => createSwalToast("warning", message, options);

// ข้อผิดพลาดสำคัญ -> SweetAlert2 Modal Pop-up (กลางจอ พร้อมปุ่มกดรับทราบ)
toastHandler.error = (message: any, options?: ToastOptions) => {
  if (options?.mode === "toast") {
    return createSwalToast("error", message, options);
  }
  return createSwalModal("error", message, options);
};

toastHandler.dismiss = () => Swal.close();

// สำหรับเรียก Modal Alert / Confirm โดยตรง
toastHandler.alert = (title: string, text?: string, icon: SweetAlertOptions["icon"] = "error") => {
  return Swal.fire({
    title,
    text,
    icon,
    confirmButtonText: "ตกลง",
    confirmButtonColor: icon === "error" ? "#dc2626" : "#2563eb",
  });
};

toastHandler.confirm = (title: string, text: string, onConfirm: () => void) => {
  return Swal.fire({
    title,
    text,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "ยืนยัน",
    cancelButtonText: "ยกเลิก",
    confirmButtonColor: "#dc2626",
    cancelButtonColor: "#64748b",
  }).then((result) => {
    if (result.isConfirmed) {
      onConfirm();
    }
  });
};

export const toast = toastHandler;
export const Toaster = () => null;


