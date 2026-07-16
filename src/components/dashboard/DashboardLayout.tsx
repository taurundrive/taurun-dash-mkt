import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { PeriodFilters } from "./PeriodFilters";
import { PeriodFilterProvider, usePeriodFilter } from "@/context/PeriodFilterContext";

/**
 * HeaderInner — Header translúcido com material Apple.
 *
 * Princípios aplicados:
 * - backdrop-blur-2xl (24px): blur denso para separar a camada do header do conteúdo
 * - bg-black/60: não completamente opaco — o conteúdo por baixo deve ser ligeiramente visível
 * - Borda inferior sutil: separa a camada sem peso visual excessivo
 * - SidebarTrigger: `apple-press-sm` para resposta imediata no press
 * - Sticky + z-30: sempre acima do conteúdo scrollável
 */
function HeaderInner({ title }: { title: string }) {
  const { label } = usePeriodFilter();
  return (
    <header
      className="sticky top-0 z-30
                 border-b border-white/[0.06]
                 bg-black/60 backdrop-blur-2xl
                 -webkit-backdrop-filter: blur(24px)
                 transition-[background-color,border-color] duration-[200ms]"
    >
      <div className="flex items-center gap-3.5 px-4 md:px-6 py-4">
        {/* Trigger: press imediato — responde em pointer-down */}
        <SidebarTrigger className="apple-press-sm text-zinc-500 hover:text-white transition-colors duration-[80ms]" />

        <div className="flex-1 min-w-0">
          {/* Título da página: tracking tight — SF Pro Display style */}
          <h1 className="text-xl sm:text-2xl font-bold font-sans text-white tracking-[-0.025em] truncate leading-none">
            {title}
          </h1>
          {/* Sublabel: label de período em mono uppercase — hierarquia de informação Apple */}
          <p className="text-[11px] font-medium font-mono uppercase tracking-wider text-zinc-500 mt-1">
            {label}
          </p>
        </div>

        <div className="hidden md:block">
          <PeriodFilters />
        </div>
      </div>

      {/* Filtros em mobile — abaixo do título */}
      <div className="md:hidden px-4 pb-3">
        <PeriodFilters />
      </div>
    </header>
  );
}

interface Props {
  title: string;
  children: ReactNode;
}

export function DashboardLayout({ title, children }: Props) {
  return (
    <div className="min-h-screen flex w-full bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <HeaderInner title={title} />
        {/* main: padding generoso, espaçamento vertical consistente */}
        <main className="flex-1 p-4 md:p-6 space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
}