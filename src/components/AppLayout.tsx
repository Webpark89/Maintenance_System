import React, { ReactNode, useMemo } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, ArrowLeft, Wrench, ClipboardList, LogOut, User } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useRequests } from "@/lib/requestStore";
import { getCurrentUser, getUserDefaultRoute } from "@/lib/auth";

const FALLBACK_REQUESTER_NAME = "นภดล ฝ่ายผลิต";
const normalizeName = (name: string) => name.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  backUrl?: string;
  actions?: ReactNode;
}

export function AppLayout({
  children,
  title,
  subtitle,
  backUrl,
  actions,
}: AppLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const allRequests = useRequests();
  const user = useMemo(() => getCurrentUser(), []);
  const userRole = user?.role || "technician";
  const isRequester = userRole === "requester";
  const currentUserName = user?.name || FALLBACK_REQUESTER_NAME;
  const currentUserId = user?.emp_id || "REQ042";
  const userDepartment = user?.department || "ฝ่ายผลิต";

  const unreadCount = useMemo(() => {
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

  // Special full-width layout for Requester Role (No Sidebar)
  if (isRequester) {
    return (
      <div className="min-h-screen flex flex-col w-full bg-background text-foreground">
        {/* Top Navigation Bar for Requester */}
        <header className="sticky top-0 z-20 h-14 border-b border-border/80 bg-card/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-3 shadow-xs">
          {/* Left: App Brand Logo & Title */}
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="flex items-center gap-2 cursor-pointer shrink-0"
              onClick={() => navigate("/request")}
              title="FixFlow CMMS"
            >
              <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground font-bold grid place-items-center shrink-0 shadow-xs">
                <Wrench className="h-4 w-4" />
              </div>
              <span className="font-bold text-sm tracking-tight text-foreground hidden sm:inline-block">
                FixFlow CMMS
              </span>
            </div>

            {backUrl && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
                onClick={() => navigate(backUrl)}
                title="ย้อนกลับ"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}

            {title && (
              <div className="min-w-0 leading-tight border-l border-border/60 pl-3">
                <h1 className="font-bold text-sm sm:text-base text-foreground tracking-tight truncate">
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-xs text-muted-foreground truncate hidden sm:block">
                    {subtitle}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Right: Actions, Notifications, User Profile & Logout */}
          <div className="flex items-center gap-2 shrink-0">
            {actions && <div className="flex items-center gap-2">{actions}</div>}

            <Button
              variant="ghost"
              size="icon"
              className="hidden lg:inline-flex h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted relative"
              onClick={() => navigate("/notifications")}
              title="ศูนย์แจ้งเตือน"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-card animate-pulse" />
              )}
            </Button>

            <ThemeToggle className="h-8 px-2" />

            {/* User Profile Badge */}
            <div className="hidden md:flex items-center gap-2 pl-2 border-l border-border/60">
              <div className="h-7 w-7 rounded-full bg-primary/10 text-primary grid place-items-center shrink-0">
                <User className="h-3.5 w-3.5" />
              </div>
              <div className="flex flex-col leading-none min-w-0">
                <span className="font-semibold text-xs text-foreground truncate">{currentUserName}</span>
                <span className="text-[10px] text-muted-foreground truncate">{userDepartment}</span>
              </div>
            </div>

            {/* Logout Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="hidden lg:inline-flex h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 ml-1"
              title="ออกจากระบบ"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto pb-20 lg:pb-6 max-w-7xl w-full mx-auto">
          {children}
        </main>

        {/* Mobile & Tablet Bottom Navigation Bar */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 h-16 border-t border-border bg-card/95 backdrop-blur-md flex items-center justify-around px-2 shadow-lg">
          <button
            onClick={() => navigate("/request")}
            className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-colors ${
              location.pathname === "/request"
                ? "text-primary font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ClipboardList className="h-5 w-5" />
            <span className="text-[10px]">แจ้งซ่อม / QR</span>
          </button>

          <button
            onClick={() => navigate("/notifications")}
            className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 relative transition-colors ${
              location.pathname === "/notifications"
                ? "text-primary font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <div className="relative">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-card animate-pulse" />
              )}
            </div>
            <span className="text-[10px]">การแจ้งเตือน</span>
          </button>

          <button
            onClick={() => navigate("/")}
            className="flex flex-col items-center justify-center gap-1 flex-1 py-1 text-muted-foreground hover:text-destructive transition-colors"
          >
            <LogOut className="h-5 w-5 text-destructive" />
            <span className="text-[10px]">ออกจากระบบ</span>
          </button>
        </nav>
      </div>
    );
  }

  // Standard Sidebar Layout for Technician & Supervisor Roles
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-background text-foreground">
        {/* Left Collapsible Sidebar */}
        <AppSidebar />

        {/* Main Section */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Mini Header Bar */}
          <header className="sticky top-0 z-20 h-14 border-b border-border/80 bg-card/95 backdrop-blur-md px-4 flex items-center justify-between gap-3 shadow-xs">
            {/* Left: Trigger & Title */}
            <div className="flex items-center gap-3 min-w-0">
              <SidebarTrigger className="h-8 w-8 text-muted-foreground hover:text-foreground" />

              {backUrl && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
                  onClick={() => navigate(backUrl)}
                  title="ย้อนกลับ"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}

              {title && (
                <div className="min-w-0 leading-tight">
                  <h1 className="font-bold text-sm sm:text-base text-foreground tracking-tight truncate">
                    {title}
                  </h1>
                  {subtitle && (
                    <p className="text-xs text-muted-foreground truncate hidden sm:block">
                      {subtitle}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Right: Actions, ThemeToggle */}
            <div className="flex items-center gap-2 shrink-0">
              {actions && <div className="flex items-center gap-2">{actions}</div>}

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted relative"
                onClick={() => navigate("/notifications")}
                title="ศูนย์แจ้งเตือน"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-card animate-pulse" />
                )}
              </Button>

              <ThemeToggle className="h-8 px-2" />
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 p-4 sm:p-6 overflow-y-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
