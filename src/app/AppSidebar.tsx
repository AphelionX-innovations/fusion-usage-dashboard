import { LogOutIcon, MoonIcon, SunIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { formatCount } from "@/shared/format";
import { NAV } from "./navigation";
import { useTheme } from "./theme";
import type { DashboardTab } from "./useDashboardParams";

type AppSidebarProps = {
  tab: DashboardTab;
  tabCounts: Record<DashboardTab, number | null>;
  onTab: (tab: DashboardTab) => void;
  sessionName: string;
  onSignOut: () => void;
};

function initials(name: string) {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "");
  return letters.join("") || "F";
}

export function AppSidebar({ tab, tabCounts, onTab, sessionName, onSignOut }: AppSidebarProps) {
  const { theme, toggle } = useTheme();
  const themeLabel = theme === "dark" ? "Mode clair" : "Mode sombre";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" tooltip="Fusion Usage">
              <span className="grid size-8 place-items-center rounded-md bg-sidebar-primary text-sm font-bold text-sidebar-primary-foreground">
                F
              </span>
              <span className="grid text-left leading-tight">
                <span className="truncate font-semibold">Fusion</span>
                <span className="truncate text-xs tracking-wide text-muted-foreground uppercase">Usage des traces</span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Console télémétrie</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map((option) => (
                <SidebarMenuItem key={option.value}>
                  <SidebarMenuButton
                    isActive={tab === option.value}
                    tooltip={option.label}
                    onClick={() => onTab(option.value)}
                  >
                    <option.icon />
                    <span>{option.label}</span>
                  </SidebarMenuButton>
                  {tabCounts[option.value] !== null ? (
                    <SidebarMenuBadge>{formatCount(tabCounts[option.value] ?? 0)}</SidebarMenuBadge>
                  ) : null}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="pointer-events-none" tooltip={sessionName}>
              <Avatar className="size-8">
                <AvatarFallback>{initials(sessionName)}</AvatarFallback>
              </Avatar>
              <span className="truncate">{sessionName}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip={themeLabel} onClick={toggle}>
              {theme === "dark" ? <SunIcon /> : <MoonIcon />}
              <span>{themeLabel}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Se déconnecter" onClick={onSignOut}>
              <LogOutIcon />
              <span>Se déconnecter</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
