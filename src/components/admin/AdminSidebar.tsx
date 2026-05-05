import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, FileText, FilePlus2, Image, FolderTree, Tag, Users,
  ArrowRightLeft, Menu as MenuIcon, Search, Zap, Settings, History, Download,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, useSidebar,
} from "@/components/ui/sidebar";

type Item = { title: string; url: string; icon: any };

const CONTENT: Item[] = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Posts", url: "/admin/posts", icon: FileText },
  { title: "New post", url: "/admin/posts/new", icon: FilePlus2 },
  { title: "Media", url: "/admin/media", icon: Image },
];

const TAXONOMY: Item[] = [
  { title: "Categories", url: "/admin/categories", icon: FolderTree },
  { title: "Tags", url: "/admin/tags", icon: Tag },
  { title: "Authors", url: "/admin/authors", icon: Users },
];

const STRUCTURE: Item[] = [
  { title: "Menus", url: "/admin/menus", icon: MenuIcon },
  { title: "Redirects", url: "/admin/redirects", icon: ArrowRightLeft },
  { title: "SEO defaults", url: "/admin/seo", icon: Search },
];

const SYSTEM: Item[] = [
  { title: "Automations", url: "/admin/automations", icon: Zap },
  { title: "Import (WP)", url: "/admin/import", icon: Download },
  { title: "Settings", url: "/admin/settings", icon: Settings },
  { title: "Activity", url: "/admin/activity", icon: History },
];

function Group({ label, items, currentPath }: { label: string; items: Item[]; currentPath: string }) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  return (
    <SidebarGroup>
      {!collapsed && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((it) => {
            const active = it.url === "/admin"
              ? currentPath === "/admin"
              : currentPath === it.url || currentPath.startsWith(it.url + "/");
            return (
              <SidebarMenuItem key={it.url}>
                <SidebarMenuButton asChild isActive={active} tooltip={it.title}>
                  <Link to={it.url} className="flex items-center gap-2">
                    <it.icon className="h-4 w-4 shrink-0" />
                    <span>{it.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AdminSidebar() {
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b">
        <Link to="/admin" className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground font-serif text-sm font-bold">
            E
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="font-serif text-sm font-bold">Everything-PR</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Admin</span>
            </div>
          )}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <Group label="Content" items={CONTENT} currentPath={currentPath} />
        <Group label="Taxonomy" items={TAXONOMY} currentPath={currentPath} />
        <Group label="Structure" items={STRUCTURE} currentPath={currentPath} />
        <Group label="System" items={SYSTEM} currentPath={currentPath} />
      </SidebarContent>
    </Sidebar>
  );
}
