import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { LayoutDashboard, BarChart2, Target, MessageSquare, LogOut } from "lucide-react";

const items = [
  { title: "Performance Geral", url: "/", icon: LayoutDashboard },
  { title: "Métricas", url: "/metricas", icon: BarChart2 },
  { title: "CAC", url: "/cac", icon: Target },
  { title: "Leads", url: "/leads", icon: MessageSquare },
];

/**
 * AppSidebar — Navegação lateral com física Apple.
 *
 * Princípios aplicados:
 * - Nav items: `active:scale-[0.97]` via `.apple-press-sm` no pointer-down
 * - Hover: responde em 80ms (não 200ms) — latência perceptível quebra a ilusão de directness
 * - Item ativo: indicador lateral `border-l-2` como âncora espacial, não só cor de fundo
 * - Glass material no container: backdrop-blur + borda translúcida
 * - SignOut: feedback físico de press imediato
 */
export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  }

  return (
    <Sidebar collapsible="icon" className="border-r border-border bg-[#09090b]">
      <SidebarContent className="bg-[#09090b] flex flex-col justify-between">
        {/* Logo / Brand */}
        <div>
          <div
            className={cn(
              "px-4 py-4 border-b border-border transition-[padding] duration-150",
              collapsed && "px-0 py-4 flex justify-center"
            )}
          >
            {collapsed ? (
              <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-border flex items-center justify-center font-bold text-sm text-white shadow-sm">
                T
              </div>
            ) : (
              <div>
                <div className="text-base font-semibold text-zinc-100 tracking-tight">
                  Taurun Dashboard
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Marketing & Performance
                </div>
              </div>
            )}
          </div>

          {/* Nav items */}
          <SidebarGroup className="mt-2">
            {!collapsed && (
              <SidebarGroupLabel className="text-xs font-medium text-muted-foreground px-3 pt-2 pb-1">
                Navegação
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent className="mt-1">
              <SidebarMenu>
                {items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      className="h-9 px-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-zinc-800/60 hover:text-zinc-100 transition-colors duration-150"
                    >
                      <NavLink
                        to={item.url}
                        end={item.url === "/"}
                        title={collapsed ? item.title : undefined}
                        className={cn(
                          "flex w-full items-center gap-3",
                          collapsed && "justify-center p-0 w-8 h-8"
                        )}
                        activeClassName="bg-zinc-800 !text-white font-medium shadow-sm"
                      >
                        <item.icon
                          className="w-4 h-4 shrink-0 text-muted-foreground group-hover:text-zinc-100 group-[.active]:text-white transition-colors"
                        />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </div>

        {/* Footer: Sign out */}
        <div
          className={cn(
            "p-2 border-t border-border mt-auto",
            collapsed && "p-2 flex flex-col items-center"
          )}
        >
          <Button
            variant="ghost"
            onClick={handleSignOut}
            title="Sair"
            className={cn(
              "flex items-center gap-3 text-sm font-medium h-9 w-full",
              "text-muted-foreground hover:text-zinc-100 hover:bg-zinc-800/60 rounded-lg px-3",
              "transition-colors duration-150",
              collapsed && "justify-center px-0 w-8 h-8"
            )}
          >
            <LogOut className="w-4 h-4 shrink-0 text-muted-foreground" />
            {!collapsed && <span>Sair</span>}
          </Button>
          {!collapsed && (
            <div className="mt-2.5 px-4 text-xs text-zinc-600">
              v1.0.1
            </div>
          )}
        </div>
      </SidebarContent>
    </Sidebar>
  );
}