import { NavLink } from "@/components/NavLink";
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
    <Sidebar collapsible="icon" className="border-r border-white/[0.06] bg-[#0a0a0d]">
      <SidebarContent className="bg-[#0a0a0d] flex flex-col justify-between">
        {/* Logo / Brand */}
        <div>
          <div
            className={cn(
              "px-[18px] py-5 border-b border-white/[0.06] transition-[padding] duration-[120ms]",
              collapsed && "px-3 py-4 flex justify-center"
            )}
          >
            {collapsed ? (
              // Logo compacto — âncora espacial que permanece no mesmo ponto ao colapsar
              <div className="w-8 h-8 rounded-xl bg-white/[0.06] border border-white/[0.10] flex items-center justify-center font-mono font-bold text-sm text-white shadow-sm">
                T
              </div>
            ) : (
              <>
                <div className="text-[11px] font-medium font-mono uppercase tracking-wider text-zinc-500">
                  Dashboard
                </div>
                {/* Tipografia do produto: bold, tracking tight — SF Pro Display */}
                <div className="text-lg font-bold font-sans text-white leading-tight mt-1 tracking-[-0.02em]">
                  TAURUN MKT
                </div>
                <div className="text-[10px] text-zinc-600 font-mono mt-0.5">
                  marketing.taurun.com
                </div>
              </>
            )}
          </div>

          {/* Nav items */}
          <SidebarGroup className="mt-2">
            {!collapsed && (
              <SidebarGroupLabel className="text-[11px] font-medium font-mono uppercase tracking-wider text-zinc-500 px-3 pt-2 pb-1">
                Navegação
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent className="mt-1">
              <SidebarMenu>
                {items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild className="h-auto p-0">
                      <NavLink
                        to={item.url}
                        end={item.url === "/"}
                        title={collapsed ? item.title : undefined}
                        className={cn(
                          // Base: glass leve + press physics
                          "apple-press-sm flex items-center gap-3 rounded-xl mx-2 px-3 py-2.5",
                          "text-xs font-medium text-zinc-400 border border-transparent",
                          // Hover: resposta em 80ms — mais rápido que o padrão de 150ms
                          "hover:bg-white/[0.05] hover:text-white",
                          "transition-[background-color,color,border-color] duration-[80ms]",
                          "group",
                          collapsed && "justify-center px-2 mx-1.5"
                        )}
                        activeClassName={cn(
                          // Ativo: não apenas cor — borda lateral como âncora espacial física
                          "bg-white/[0.07] !text-white font-semibold",
                          "border-white/[0.10]",
                          // Nota: o indicador lateral está no ::before via box-shadow esquerdo
                          "shadow-[-2px_0_0_0_rgba(96,165,250,0.7),inset_0_1px_0_rgba(255,255,255,0.04)]"
                        )}
                      >
                        <item.icon
                          className="w-4 h-4 shrink-0 transition-[color,transform] duration-[80ms] text-zinc-500 group-hover:text-zinc-200 group-[.active]:text-blue-400"
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
            "px-[18px] py-4 border-t border-white/[0.06] mt-auto transition-[padding] duration-[120ms]",
            collapsed && "px-2 py-3 flex flex-col items-center"
          )}
        >
          {/* Botão de saída: press imediato — feedback em pointer-down */}
          <button
            onClick={handleSignOut}
            title="Sair"
            className={cn(
              "apple-press-sm flex items-center gap-2 text-xs font-sans font-medium",
              "text-zinc-500 hover:text-zinc-200 w-full rounded-xl py-1.5",
              "transition-colors duration-[80ms]",
              collapsed ? "justify-center px-0" : "px-2 hover:bg-white/[0.04]"
            )}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Sair</span>}
          </button>
          {!collapsed && (
            <div className="mt-2.5 px-2 text-[10px] font-mono text-zinc-700">
              Atualizado agora · v1.0.1
            </div>
          )}
        </div>
      </SidebarContent>
    </Sidebar>
  );
}