import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Wrench, ClipboardList, HardHat, ShieldCheck, UserCheck, Crown } from "lucide-react";
import { toast } from "sonner";

type Role = "technician" | "requester" | "supervisor";

const Login = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>("technician");
  const [username, setUsername] = useState("somsak.t");
  const [password, setPassword] = useState("demo1234");

  const handleRoleSelect = (selectedRole: Role) => {
    setRole(selectedRole);
    if (selectedRole === "technician") {
      setUsername("tech.somsak");
    } else if (selectedRole === "supervisor") {
      setUsername("sup.somsak");
    } else {
      setUsername("req.nopadol");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error("กรุณากรอกชื่อผู้ใช้และรหัสผ่าน");
      return;
    }

    let userPayload = {
      emp_id: "TECH001",
      name: "สมศักดิ์ ช่างไฟ",
      role: role as Role,
      department: "Maintenance",
      skills: ["electrical", "facility"],
    };

    if (role === "supervisor") {
      userPayload = {
        emp_id: "SUP001",
        name: "สมศักดิ์ (หัวหน้าซ่อมบำรุง)",
        role: "supervisor",
        department: "แผนกซ่อมบำรุง",
        skills: ["management", "qc", "approval"],
      };
    } else if (role === "requester") {
      userPayload = {
        emp_id: "REQ042",
        name: "นภดล ฝ่ายผลิต",
        role: "requester",
        department: "ฝ่ายผลิต",
        skills: [],
      };
    }

    sessionStorage.setItem("fixflow_user", JSON.stringify(userPayload));

    const roleTitleMap: Record<Role, string> = {
      technician: "ช่างซ่อมบำรุง",
      supervisor: "หัวหน้าซ่อมบำรุง / ผู้จัดการ",
      requester: "ผู้แจ้งซ่อม (หน้างาน)",
    };

    toast.success(`ยินดีต้อนรับเข้าสู่ระบบ: ${roleTitleMap[role]}`);

    if (role === "requester") {
      navigate("/request");
    } else {
      navigate("/board");
    }
  };

  return (
    <main className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Hero side */}
      <section className="relative hidden lg:flex bg-gradient-hero text-primary-foreground p-12 flex-col justify-between overflow-hidden">
        <div className="absolute inset-0 industrial-stripe opacity-30" />
        <div className="absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-secondary/20 blur-3xl" />

        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-secondary grid place-items-center shadow-glow">
              <Wrench className="h-6 w-6 text-secondary-foreground" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">FixFlow CMMS</h1>
              <p className="text-xs uppercase tracking-[0.25em] text-primary-foreground/70">
                Maintenance Operations System
              </p>
            </div>
          </div>
        </div>

        <div className="relative space-y-6">
          <h2 className="text-5xl font-bold leading-tight">
            ดึงงาน.<br />
            ซ่อมเสร็จ.<br />
            <span className="text-secondary">ไลน์เดิน.</span>
          </h2>
          <p className="text-lg text-primary-foreground/80 max-w-md">
            ระบบบริหารจัดการงานซ่อมบำรุงแบบครบวงจร รองรับสแกน QR Code, ประเมินงาน,
            เบิกอะไหล่ สรุปวันทำงานจริง และอนุมัติปิดงานด้วย Dual Signatures
          </p>
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-secondary" />
              <span>Dual Signature QC</span>
            </div>
            <div className="flex items-center gap-2">
              <HardHat className="h-4 w-4 text-secondary" />
              <span>Mobile-first QR Tag</span>
            </div>
          </div>
        </div>

        <div className="relative text-xs text-primary-foreground/50">
          © 2026 FixFlow CMMS · Designed for Industrial Maintenance Operations
        </div>
      </section>

      {/* Form side */}
      <section className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-6">
          <div className="lg:hidden flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-lg bg-gradient-primary grid place-items-center">
              <Wrench className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold">FixFlow CMMS</h1>
          </div>

          <header>
            <h2 className="text-3xl font-bold">เข้าสู่ระบบ</h2>
            <p className="text-muted-foreground mt-1">เลือกบทบาทผู้ใช้งานเพื่อทดสอบระบบเดโม</p>
          </header>

          {/* Role selector (3 Roles) */}
          <div className="grid grid-cols-3 gap-2">
            <RoleCard
              active={role === "technician"}
              onClick={() => handleRoleSelect("technician")}
              icon={<Wrench className="h-5 w-5" />}
              title="ช่างซ่อม"
              subtitle="Technician"
            />
            <RoleCard
              active={role === "supervisor"}
              onClick={() => handleRoleSelect("supervisor")}
              icon={<Crown className="h-5 w-5" />}
              title="หัวหน้าช่าง"
              subtitle="Supervisor"
            />
            <RoleCard
              active={role === "requester"}
              onClick={() => handleRoleSelect("requester")}
              icon={<ClipboardList className="h-5 w-5" />}
              title="ผู้แจ้งซ่อม"
              subtitle="Requester"
            />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">รหัสพนักงาน / ชื่อผู้ใช้</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="เช่น TECH001 หรือ SUP001"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">รหัสผ่าน</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-11"
              />
            </div>

            <Button type="submit" variant="hero" size="lg" className="w-full">
              เข้าสู่ระบบในฐานะ {role === "supervisor" ? "หัวหน้าช่าง" : role === "technician" ? "ช่างซ่อม" : "ผู้แจ้งซ่อม"}
            </Button>

            <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">💡 หมายเหตุสำหรับการทดสอบระบบ (Demo Mode):</p>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                <li><strong>ผู้แจ้งซ่อม</strong>: เข้าสแกน QR และส่งใบแจ้งซ่อม</li>
                <li><strong>ช่างซ่อม</strong>: เข้าประเมินงาน เบิกอะไหล่ และอัปเดตงาน</li>
                <li><strong>หัวหน้าช่าง</strong>: ลงนามอนุมัติ Dual Signature, ตรวจซ้ำ และพิมพ์ QR Code</li>
              </ul>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
};

function RoleCard({
  active,
  onClick,
  icon,
  title,
  subtitle,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <Card
      onClick={onClick}
      className={`p-3 cursor-pointer transition-all border-2 text-center flex flex-col items-center justify-center ${
        active
          ? "border-primary bg-primary/5 shadow-card"
          : "border-border hover:border-primary/40"
      }`}
    >
      <div
        className={`h-9 w-9 rounded-md grid place-items-center mb-1.5 ${
          active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
        }`}
      >
        {icon}
      </div>
      <div className="font-bold text-xs line-clamp-1">{title}</div>
      <div className="text-[10px] text-muted-foreground truncate">{subtitle}</div>
    </Card>
  );
}

export default Login;
