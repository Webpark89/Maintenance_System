import React, { ReactNode, useMemo } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Bell, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useRequests } from "@/lib/requestStore";
import { getCurrentUser } from "@/lib/auth";

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
  const allRequests = useRequests();
  const user = useMemo(() => getCurrentUser(), []);
  const currentUserName = user?.name || FALLBACK_REQUESTER_NAME;
  const currentUserId = user?.emp_id || "REQ042";

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
