import { useEffect, useRef, useState } from "react";

/**
 * useCountUp — Anima um número de 0 até o valor alvo.
 *
 * Filosofia Emil Kowalski / Apple Design:
 * - Só anima no mount (ocasional, não repetido) — passa pelo Gate de frequência
 * - Duração: 800ms — maior que micro-interações porque é State Indication
 * - Easing: ease-out (começa rápido, desacelera no destino — natural como física)
 * - Se `value` é 0 ou null, retorna "—" sem animar (não há estado para mostrar)
 * - Compatível com `prefers-reduced-motion`: retorna o valor final imediatamente
 *
 * @param value - valor numérico final (ou null/undefined para "sem dados")
 * @param duration - duração total da animação em ms (padrão: 800ms)
 * @param formatter - função que converte number → string para exibição
 */
export function useCountUp(
  value: number | null | undefined,
  duration = 800,
  formatter?: (n: number) => string
): string {
  const [display, setDisplay] = useState<string>(() => {
    if (value == null || value === 0) return value == null ? "—" : formatter ? formatter(0) : "0";
    return formatter ? formatter(0) : "0";
  });

  const frameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (value == null) {
      setDisplay("—");
      return;
    }

    // Respeitar preferência do sistema: reduzido-motion = sem animação
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setDisplay(formatter ? formatter(value) : String(Math.round(value)));
      return;
    }

    // Cancelar animação anterior se o valor mudar antes de terminar
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
    }
    startTimeRef.current = null;

    // Easing ease-out: começa rápido, desacelera conforme se aproxima do destino
    // t é normalizado [0, 1], retorna [0, 1]
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOut(progress);
      const current = easedProgress * value;

      setDisplay(formatter ? formatter(current) : String(Math.round(current)));

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        // Garantir que o valor final seja exato (sem arredondamento residual)
        setDisplay(formatter ? formatter(value) : String(Math.round(value)));
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [value, duration, formatter]);

  return display;
}
