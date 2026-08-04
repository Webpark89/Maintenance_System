import React, { ReactNode, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Wrench,
  LayoutDashboard,
  ClipboardList,
  Building,
  Bell,
  LogOut,
  ArrowLeft,
  Menu,
} from "lucide-react";
import { useRequests } from "@/lib/requestStore";
import { getUserDefaultRoute } from "@/lib/auth";

interface NavbarProps {
  title?: string;
  subtitle?: string;
  backUrl?: string;
  actions?: ReactNode;
}

const FALLBACK_REQUESTER_NAME = "นภดล ฝ่ายผลิต";
const normalizeName = (name: string) => name.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

export function Navbar({ title, subtitle, backUrl, actions }: NavbarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const allRequests = useRequests();

  const sessionUser = useMemo(() => {
    try {
      return JSON.parse(sessionStorage.getItem("fixflow_user") ?? "{}") as {
        name?: string;
        emp_id?: string;
        role?: "technician" | "requester" | "supervisor";
        department?: string;
      };
    } catch {
      return {};
    }
  }, []);

  const currentUserName = sessionUser.name || FALLBACK_REQUESTER_NAME;
  const currentUserId = sessionUser.emp_id || "REQ042";
  const userRole = sessionUser.role || "technician";

  const unreadNotificationCount = useMemo(() => {
    const myRequests = allRequests.filter((request) =>
      request.reported_by_id
        ? request.reported_by_id === currentUserId
        : normalizeName(request.reported_by).includes(normalizeName(currentUserName))
    );

    let count = 0;
    myRequests.forEach((req) => {
      req.requester_notifications.forEach((n) => {
        if (!n.read) count++;
      });
    });
    return count;
  }, [allRequests, currentUserId, currentUserName]);

  const allNavItems = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["supervisor"] },
    { to: "/board", label: "บอร์ดงานซ่อม", icon: Wrench, roles: ["technician", "supervisor"] },
    { to: "/request", label: "แจ้งซ่อมใหม่", icon: ClipboardList, roles: ["requester", "technician", "supervisor"] },
    { to: "/assets", label: "ทรัพย์สิน & QR", icon: Building, roles: ["technician", "supervisor"] },
  ];

  const navItems = useMemo(
    () => allNavItems.filter((item) => item.roles.includes(userRole)),
    [userRole]
  );

  return (
    <header className="sticky top-0 z-30 w-full border-b border-border/80 bg-card/95 backdrop-blur-md shadow-xs transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left Section: Brand / Title / Back */}
        <div className="flex items-center gap-3 min-w-0">
          {backUrl && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted shrink-0"
              onClick={() => navigate(backUrl)}
              title="ย้อนกลับ"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}

          <div
            onClick={() => navigate(getUserDefaultRoute(userRole))}
            className="flex items-center gap-2.5 cursor-pointer group min-w-0 shrink-0"
          >
            <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground font-bold grid place-items-center shadow-xs group-hover:scale-105 transition-transform shrink-0">
              <Wrench className="h-5 w-5" />
            </div>
            <div className="hidden sm:block leading-tight max-w-[180px] md:max-w-[240px] lg:max-w-[280px] xl:max-w-[360px]">
              <div className="font-bold text-sm tracking-tight text-foreground truncate">
                {title || "CMMS MAINTENANCE"}
              </div>
              {subtitle ? (
                <div className="text-xs text-muted-foreground truncate" title={subtitle}>{subtitle}</div>
              ) : (
                <div className="text-[11px] text-muted-foreground truncate">ระบบบริหารจัดการงานซ่อมบำรุง</div>
              )}
            </div>
          </div>

          {/* Title for mobile if backUrl is present */}
          {title && (
            <div className="sm:hidden min-w-0">
              <div className="font-bold text-sm text-foreground truncate">{title}</div>
              {subtitle && <div className="text-xs text-muted-foreground truncate">{subtitle}</div>}
            </div>
          )}
        </div>

        {/* Center Section: Global Navigation Links (Desktop) */}
        <nav className="hidden lg:flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border/50 shrink-0">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground transition-all duration-150 whitespace-nowrap shrink-0"
                activeClassName="bg-card text-foreground font-semibold shadow-xs border border-border/50"
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="whitespace-nowrap">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Right Section: Actions, Theme, Notifications & Profile */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Custom Page Actions */}
          {actions && <div className="hidden sm:flex items-center gap-2">{actions}</div>}

          {/* Notifications Link */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:inline-flex h-8 w-8 relative text-muted-foreground hover:text-foreground hover:bg-muted"
            onClick={() => navigate("/notifications")}
            title="ศูนย์แจ้งเตือน"
          >
            <Bell className="h-4 w-4" />
            {unreadNotificationCount > 0 && (
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive animate-pulse" />
            )}
          </Button>

          {/* Dark / Light Mode Toggle */}
          <ThemeToggle className="h-8 px-2.5" />

          {/* Logout */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:inline-flex h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            onClick={() => navigate("/")}
            title="ออกจากระบบ"
          >
            <LogOut className="h-4 w-4" />
          </Button>

          {/* Mobile Navigation Drawer */}
          <div className="lg:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-card text-card-foreground border-border p-6 flex flex-col justify-between">
                <div className="space-y-6">
                  <SheetHeader className="text-left border-b border-border pb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground font-bold grid place-items-center">
                        <Wrench className="h-5 w-5" />
                      </div>
                      <div>
                        <SheetTitle className="text-base font-bold">CMMS Maintenance</SheetTitle>
                        <SheetDescription className="text-xs text-muted-foreground">เมนูนำทางระบบ</SheetDescription>
                      </div>
                    </div>
                  </SheetHeader>

                  {/* Mobile Actions */}
                  {actions && <div className="sm:hidden pb-2">{actions}</div>}

                  {/* Navigation Links List */}
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
                      เมนูหลัก
                    </p>
                    {navItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = location.pathname === item.to;
                      return (
                        <Button
                          key={item.to}
                          variant={isActive ? "secondary" : "ghost"}
                          className={`w-full justify-start gap-3 h-10 text-sm font-medium ${
                            isActive ? "bg-primary/10 text-primary font-semibold" : ""
                          }`}
                          onClick={() => navigate(item.to)}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </Button>
                      );
                    })}
                  </div>
                </div>

                {/* Footer User Info */}
                <div className="border-t border-border pt-4 flex items-center justify-between">
                  <div className="text-xs">
                    <div className="font-semibold text-foreground">{currentUserName}</div>
                    <div className="text-muted-foreground">{currentUserId}</div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={() => navigate("/")}
                  >
                    <LogOut className="h-3.5 w-3.5 mr-1" /> ออกจากระบบ
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
