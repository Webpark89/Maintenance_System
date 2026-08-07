import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Wrench, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Loader2, 
  CloudRain, 
  ArrowLeft,
  CheckCircle2,
  ShieldCheck
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { connectSocket } from "@/lib/socket";
import RainBackground from "@/components/RainBackground";

type Role = "technician" | "requester" | "supervisor";

export const RainLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("TECH001");
  const [password, setPassword] = useState("demo1234");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Clear stale session on login page load
  useEffect(() => {
    sessionStorage.removeItem("fixflow_user");
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.error("กรุณากรอกรหัสพนักงาน/อีเมลและรหัสผ่าน");
      return;
    }

    setLoading(true);
    try {
      // API Attempt
      const res = await api.post("/auth/login", {
        username: username.trim(),
        password: password.trim(),
      });

      const { token, user } = res.data.data;
      const userPayload = {
        emp_id: user.emp_id,
        name: user.name,
        role: user.role as Role,
        department: user.department,
        skills: user.skills || [],
        token: token,
      };

      sessionStorage.setItem("fixflow_user", JSON.stringify(userPayload));
      connectSocket(token);

      toast.success(res.data.message || `เข้าสู่ระบบสำเร็จ: ${user.name}`);

      if (user.role === "requester") {
        navigate("/request");
      } else if (user.role === "supervisor") {
        navigate("/dashboard");
      } else {
        navigate("/board");
      }
    } catch (err: any) {
      console.warn("Backend API login response fallback:", err);

      const isConnError =
        err.isNetworkError ||
        err.code === "ERR_NETWORK" ||
        err.code === "ECONNREFUSED" ||
        (err.message &&
          (err.message.includes("ERR_CONNECTION_REFUSED") ||
            err.message.includes("Network Error") ||
            err.message.includes("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์")));

      if (!isConnError) {
        toast.error(err.message || "รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง");
        setLoading(false);
        return;
      }

      // Fallback mode for demo
      const upperUser = username.trim().toUpperCase();
      let detectedRole: Role = "technician";
      let name = "บอส";
      let department = "แผนกซ่อมบำรุงโรงงาน";
      let skills = ["Electrical", "PLC", "Control Systems"];

      if (upperUser === "TECH002") {
        detectedRole = "technician";
        name = "ตะวัน";
        department = "แผนกซ่อมบำรุงโรงงาน";
        skills = ["Mechanical", "Pneumatics", "Hydraulics"];
      } else if (upperUser.startsWith("SUP") || upperUser.includes("SUPERVISOR")) {
        detectedRole = "supervisor";
        name = "อาร์ม";
        department = "แผนกบริหารซ่อมบำรุง";
        skills = ["Management", "QC", "Safety"];
      } else if (upperUser.startsWith("REQ") || upperUser.includes("REQUESTER")) {
        detectedRole = "requester";
        name = "โฟล์ค";
        department = "ฝ่ายผลิตและประกอบ";
        skills = ["Production Line 1"];
      }

      const fallbackPayload = {
        emp_id: upperUser || "TECH001",
        name,
        role: detectedRole,
        department,
        skills,
        token: `demo-token-${Date.now()}`,
      };

      sessionStorage.setItem("fixflow_user", JSON.stringify(fallbackPayload));
      toast.info("เซิร์ฟเวอร์หลักยังไม่ได้เชื่อมต่อ เข้าสู่ระบบในโหมดสาธิต (Demo)");
      toast.success(`เข้าสู่ระบบสำเร็จ: ${name}`);

      if (detectedRole === "requester") {
        navigate("/request");
      } else if (detectedRole === "supervisor") {
        navigate("/dashboard");
      } else {
        navigate("/board");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (demoUser: string) => {
    setUsername(demoUser);
    setPassword("demo1234");
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between items-center p-4 sm:p-6 lg:p-8 overflow-x-hidden font-sans">
      {/* Background Rain Effect */}
      <RainBackground dropCount={75} />

      {/* Top Header / Switcher */}
      <header className="relative z-10 w-full max-w-5xl flex justify-between items-center py-2">
        <div className="flex items-center gap-2 text-slate-100">
          <div className="h-9 w-9 rounded-xl bg-blue-500/20 border border-blue-400/30 backdrop-blur-md grid place-items-center text-blue-400 shadow-lg">
            <Wrench className="h-5 w-5" />
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight block leading-none">FixFlow</span>
            <span className="text-[10px] text-blue-300/80 tracking-widest uppercase font-mono">CMMS Portal</span>
          </div>
        </div>

        <Link
          to="/"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-sm transition-all duration-200"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">สลับไป</span>หน้า Login ปกติ
        </Link>
      </header>

      {/* Main Glassmorphic Login Card */}
      <main className="relative z-10 my-auto w-full max-w-md">
        <div className="w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6">
          
          {/* Card Header */}
          <div className="space-y-2 text-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-400/30 text-blue-300 text-xs font-medium mb-1">
              <CloudRain className="h-3.5 w-3.5 animate-pulse text-blue-400" />
              <span>Rainy Night Theme</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              เข้าสู่ระบบงานซ่อมบำรุง
            </h1>
            <p className="text-xs sm:text-sm text-slate-300/80">
              กรอกรหัสพนักงานหรืออีเมลองค์กรเพื่อเริ่มต้นใช้งาน
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Email / Employee ID Field */}
            <div className="space-y-2">
              <Label 
                htmlFor="rain-username" 
                className="text-xs font-medium text-slate-200 flex items-center gap-1.5"
              >
                <Mail className="h-3.5 w-3.5 text-blue-400" />
                รหัสพนักงาน / อีเมลองค์กร
              </Label>
              <div className="relative p-[1.5px] rounded-xl overflow-hidden">
                <div 
                  className="absolute inset-[-500%] animate-[spin_4s_linear_infinite]" 
                  style={{
                    background: 'conic-gradient(from 0deg, #2563eb, #4f46e5, #3b82f6, #60a5fa, #2563eb)'
                  }}
                />
                <div className="relative rounded-[10px] bg-slate-950/80 backdrop-blur-md">
                  <Input
                    id="rain-username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="เช่น TECH001 หรือ email@factory.com"
                    required
                    className="h-11 pl-4 pr-4 bg-transparent border-0 focus-visible:ring-1 focus-visible:ring-blue-400/50 text-white placeholder:text-slate-400/70 rounded-[10px] transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Password Field with Eye Toggle */}
            <div className="space-y-2">
              <Label 
                htmlFor="rain-password" 
                className="text-xs font-medium text-slate-200 flex items-center gap-1.5"
              >
                <Lock className="h-3.5 w-3.5 text-blue-400" />
                รหัสผ่าน
              </Label>
              <div className="relative p-[1.5px] rounded-xl overflow-hidden">
                <div 
                  className="absolute inset-[-500%] animate-[spin_4s_linear_infinite]" 
                  style={{
                    background: 'conic-gradient(from 0deg, #2563eb, #4f46e5, #3b82f6, #60a5fa, #2563eb)'
                  }}
                />
                <div className="relative rounded-[10px] bg-slate-950/80 backdrop-blur-md">
                  <Input
                    id="rain-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="h-11 pl-4 pr-11 bg-transparent border-0 focus-visible:ring-1 focus-visible:ring-blue-400/50 text-white placeholder:text-slate-400/70 rounded-[10px] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 rounded-md transition-colors z-10"
                    aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 mt-2 bg-[linear-gradient(90deg,#2563eb,#4f46e5,#3b82f6,#2563eb)] bg-[length:200%_100%] hover:animate-gradient-slide text-white font-semibold text-sm rounded-xl shadow-lg shadow-blue-500/25 border border-blue-400/30 transition-all duration-300 active:scale-[0.99]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  กำลังตรวจสอบสิทธิ์...
                </span>
              ) : (
                "เข้าสู่ระบบ SSO"
              )}
            </Button>
          </form>

          {/* Demo Account Quick Select */}
          <div className="pt-3 border-t border-white/10 space-y-2.5">
            <div className="flex items-center justify-between text-[11px] text-slate-300">
              <span className="flex items-center gap-1 font-medium text-slate-200">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                บัญชีสาธิต (Quick Select):
              </span>
              <span className="text-[10px] text-slate-400">คลิกเพื่อเลือก</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill("TECH001")}
                className={`p-2 rounded-xl text-left border transition-all ${
                  username === "TECH001" 
                    ? "bg-blue-500/20 border-blue-400/60 text-white" 
                    : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                }`}
              >
                <div className="text-[11px] font-bold">TECH001</div>
                <div className="text-[9px] text-slate-400 truncate">ช่างซ่อมบำรุง</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill("SUP001")}
                className={`p-2 rounded-xl text-left border transition-all ${
                  username === "SUP001" 
                    ? "bg-amber-500/20 border-amber-400/60 text-white" 
                    : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                }`}
              >
                <div className="text-[11px] font-bold">SUP001</div>
                <div className="text-[9px] text-slate-400 truncate">หัวหน้างาน</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill("REQ042")}
                className={`p-2 rounded-xl text-left border transition-all ${
                  username === "REQ042" 
                    ? "bg-emerald-500/20 border-emerald-400/60 text-white" 
                    : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                }`}
              >
                <div className="text-[11px] font-bold">REQ042</div>
                <div className="text-[9px] text-slate-400 truncate">ผู้แจ้งซ่อม</div>
              </button>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-3 text-[11px] text-slate-400/70">
        © 2026 FixFlow CMMS · Industrial Maintenance System
      </footer>
    </div>
  );
};

export default RainLoginPage;
