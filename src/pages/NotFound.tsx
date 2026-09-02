import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="text-center space-y-4">
        <h1 className="text-5xl font-extrabold font-sans text-white tracking-tight">404</h1>
        <p className="text-sm font-mono text-zinc-400">Página não encontrada</p>
        <div>
          <Button asChild variant="outline" className="rounded-xl border-white/[0.08] hover:border-white/20 hover:bg-white/[0.04] text-white">
            <Link to="/">Voltar ao Início</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
