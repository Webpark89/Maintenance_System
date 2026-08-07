import React, { useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Wrench,
  LayoutDashboard,
  ClipboardList,
  Building,
  Bell,
  LogOut,
  User,
  Users,
} from "lucide-react";
import { useRequests } from "@/lib/requestStore";
import { getCurrentUser, getUserDefaultRoute, refreshCurrentUserFromApi, UserPayload } from "@/lib/auth";

const FALLBACK_REQUESTER_NAME = "นภดล ฝ่ายผลิต";
const normalizeName = (name: string) => name.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const allRequests = useRequests();
  const { isMobile, setOpenMobile } = useSidebar();

  const [user, setUser] = React.useState<UserPayload | null>(() => getCurrentUser());

  React.useEffect(() => {
    refreshCurrentUserFromApi().then((updated) => {
      if (updated) setUser(updated);
    });
  }, [location.pathname]);

  const userRole = user?.role || "technician";
  const currentUserName = user?.name || FALLBACK_REQUESTER_NAME;
  const currentUserId = user?.emp_id || "REQ042";
  const userDepartment = user?.department || "แผนกซ่อมบำรุง";

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

  const handleNavigate = (path: string) => {
    navigate(path);
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  // Nav Items
  const navItems = [
    {
      to: "/dashboard",
      label: "Dashboard สถิติ",
      icon: LayoutDashboard,
      roles: ["supervisor"],
    },
    {
      to: "/board",
      label: "บอร์ดจัดการงานซ่อม",
      icon: Wrench,
      roles: ["technician", "supervisor"],
    },
    {
      to: "/request",
      label: "แจ้งซ่อมใหม่ / QR",
      icon: ClipboardList,
      roles: ["requester", "technician", "supervisor"],
    },
    {
      to: "/assets",
      label: "ทรัพย์สิน & QR Tag",
      icon: Building,
      roles: ["technician", "supervisor"],
    },
    {
      to: "/users",
      label: "จัดการผู้ใช้งาน",
      icon: Users,
      roles: ["supervisor"],
    },
  ];

  const filteredNavItems = navItems.filter((item) => item.roles.includes(userRole));

  return (
    <Sidebar variant="inset" collapsible="icon" className="border-r border-border bg-sidebar text-sidebar-foreground">
      {/* Header: App Logo (Centered when collapsed) */}
      <SidebarHeader className="border-b border-sidebar-border px-3 py-3 group-data-[collapsible=icon]:px-0">
        <div
          className="flex items-center gap-2.5 cursor-pointer group-data-[collapsible=icon]:justify-center w-full overflow-hidden"
          onClick={() => handleNavigate(getUserDefaultRoute(userRole))}
          title="FixFlow CMMS"
        >
          <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground font-bold grid place-items-center shrink-0 shadow-xs">
            <Wrench className="h-5 w-5" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden leading-tight truncate">
            <span className="font-bold text-sm tracking-tight text-sidebar-foreground">FixFlow CMMS</span>
            <span className="text-[11px] text-muted-foreground truncate">Maintenance System</span>
          </div>
        </div>
      </SidebarHeader>

      {/* Content: Main Nav Items */}
      <SidebarContent className="px-2 py-3 group-data-[collapsible=icon]:px-0">
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1 group-data-[collapsible=icon]:items-center">
              {filteredNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.to;
                return (
                  <SidebarMenuItem key={item.to} className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-full">
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => handleNavigate(item.to)}
                      tooltip={item.label}
                      className={`h-9 rounded-md transition-colors group-data-[collapsible=icon]:justify-center ${
                        isActive
                          ? "bg-primary text-primary-foreground font-semibold shadow-xs hover:bg-primary/90 hover:text-primary-foreground"
                          : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate flex-1 group-data-[collapsible=icon]:hidden">{item.label}</span>
                      {item.badge && (
                        <Badge variant="destructive" className="h-4 px-1.5 text-[10px] rounded-full shrink-0 group-data-[collapsible=icon]:hidden">
                          {item.badge}
                        </Badge>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer: User Profile & Logout */}
      <SidebarFooter className="border-t border-sidebar-border p-2 group-data-[collapsible=icon]:p-1">
        <div className="flex flex-col gap-1.5">
          <div
            className="flex items-center gap-2.5 p-2 rounded-lg bg-sidebar-accent/60 group-data-[collapsible=icon]:p-1.5 group-data-[collapsible=icon]:justify-center"
            title={`${currentUserName} (${currentUserId})`}
          >
            <div className="h-8 w-8 rounded-md bg-primary/10 text-primary grid place-items-center shrink-0">
              <User className="h-4 w-4" />
            </div>
            <div className="flex flex-col group-data-[collapsible=icon]:hidden min-w-0 leading-tight">
              <span className="font-semibold text-xs text-sidebar-foreground truncate">{currentUserName}</span>
              <span className="text-[10px] text-muted-foreground truncate">{currentUserId} · {userDepartment}</span>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="w-full justify-start gap-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
            title="ออกจากระบบ"
          >
            <LogOut className="h-4 w-4 shrink-0 text-destructive" />
            <span className="group-data-[collapsible=icon]:hidden">ออกจากระบบ</span>
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
