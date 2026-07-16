import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
const MAX_ATTEMPTS = 6;
const LOCKOUT_MS = 10 * 60 * 1000; // 10 minutos
const STORAGE_KEY = "auth_attempts_v1";

type AttemptState = { count: number; lockedUntil: number | null };

function readAttempts(): AttemptState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { count: 0, lockedUntil: null };
    return JSON.parse(raw) as AttemptState;
  } catch {
    return { count: 0, lockedUntil: null };
  }
}

function writeAttempts(s: AttemptState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

export default function Auth() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const s = readAttempts();
    if (s.lockedUntil && s.lockedUntil > Date.now()) {
      setLockedUntil(s.lockedUntil);
    } else if (s.lockedUntil && s.lockedUntil <= Date.now()) {
      writeAttempts({ count: 0, lockedUntil: null });
    }
  }, []);

  useEffect(() => {
    if (!lockedUntil) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [lockedUntil]);

  useEffect(() => {
    if (lockedUntil && now >= lockedUntil) {
      setLockedUntil(null);
      writeAttempts({ count: 0, lockedUntil: null });
    }
  }, [now, lockedUntil]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate("/", { replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate("/", { replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (lockedUntil && lockedUntil > Date.now()) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      writeAttempts({ count: 0, lockedUntil: null });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao autenticar";
      const prev = readAttempts();
      const nextCount = prev.count + 1;
      if (nextCount >= MAX_ATTEMPTS) {
        const lock = Date.now() + LOCKOUT_MS;
        writeAttempts({ count: nextCount, lockedUntil: lock });
        setLockedUntil(lock);
        toast({
          title: "Acesso bloqueado",
          description: "Muitas tentativas. Tente novamente em 10 minutos.",
          variant: "destructive",
        });
      } else {
        writeAttempts({ count: nextCount, lockedUntil: null });
        toast({
          title: "Erro",
          description: `${message} (${MAX_ATTEMPTS - nextCount} tentativa(s) restante(s))`,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  }

  const remainingMs = lockedUntil ? Math.max(0, lockedUntil - now) : 0;
  const remainingMin = Math.floor(remainingMs / 60000);
  const remainingSec = Math.floor((remainingMs % 60000) / 1000);
  const isLocked = !!lockedUntil && remainingMs > 0;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm p-6 space-y-5">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Entrar</h1>
          <p className="text-sm text-muted-foreground">
            Acesso restrito ao dashboard.
          </p>
        </div>
        {isLocked && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            Acesso bloqueado por excesso de tentativas. Aguarde{" "}
            <strong>
              {String(remainingMin).padStart(2, "0")}:{String(remainingSec).padStart(2, "0")}
            </strong>
            .
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              disabled={isLocked}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={isLocked}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading || isLocked}>
            {loading ? "Aguarde..." : "Entrar"}
          </Button>
        </form>
      </Card>
    </div>
  );
}