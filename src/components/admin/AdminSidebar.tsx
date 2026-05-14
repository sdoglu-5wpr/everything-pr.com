import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, FileText, FilePlus2, Image, FolderTree, Tag, Users,
  ArrowRightLeft, Menu as MenuIcon, Search, Zap, Settings, History, Download, CloudDownload, Copy, Columns3,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, useSidebar,
} from "@/components/ui/sidebar";

type Item = { title: string; url: string; icon: any };

const CONTENT: Item[] = [
  { title: "Dashboard", url: "/admin-everything", icon: LayoutDashboard },
  { title: "Posts", url: "/admin-everything/posts", icon: FileText },
  { title: "New post", url: "/admin-everything/posts/new", icon: FilePlus2 },
  { title: "Media", url: "/admin-everything/media", icon: Image },
];

const TAXONOMY: Item[] = [
  { title: "Categories", url: "/admin-everything/categories", icon: FolderTree },
  { title: "Duplicate categories", url: "/admin-everything/categories/duplicates", icon: Copy },
  { title: "Tags", url: "/admin-everything/tags", icon: Tag },
  { title: "Authors", url: "/admin-everything/authors", icon: Users },
  { title: "Pillars", url: "/admin-everything/pillars", icon: Columns3 },
];

const STRUCTURE: Item[] = [
  { title: "Menus", url: "/admin-everything/menus", icon: MenuIcon },
  { title: "Redirects", url: "/admin-everything/redirects", icon: ArrowRightLeft },
  { title: "SEO defaults", url: "/admin-everything/seo", icon: Search },
];

const SYSTEM: Item[] = [
  { title: "Automations", url: "/admin-everything/automations", icon: Zap },
  { title: "Import (WP)", url: "/admin-everything/import", icon: Download },
  { title: "Media backfill", url: "/admin-everything/media-backfill", icon: CloudDownload },
  { title: "Settings", url: "/admin-everything/settings", icon: Settings },
  { title: "Activity", url: "/admin-everything/activity", icon: History },
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
            const active = it.url === "/admin-everything"
              ? currentPath === "/admin-everything"
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
        <Link to="/admin-everything" className="flex items-center gap-2 px-2 py-1.5">
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
