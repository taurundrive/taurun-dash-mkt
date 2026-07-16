import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PeriodFilterProvider } from "@/context/PeriodFilterContext";
import { SidebarProvider } from "@/components/ui/sidebar";
import Index from "./pages/Index.tsx";
import Cac from "./pages/Cac.tsx";
import Metricas from "./pages/Metricas.tsx";
import Leads from "./pages/Leads.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <PeriodFilterProvider>
          <SidebarProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/metricas" element={<Metricas />} />
              <Route path="/cac" element={<Cac />} />
              <Route path="/leads" element={<Leads />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </SidebarProvider>
        </PeriodFilterProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
