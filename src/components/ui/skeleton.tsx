import { cn } from "@/lib/utils";

/**
 * Skeleton UI - macOS Tahoe / Industrial Edition
 * * Cambios clave:
 * 1. Fondo: Cambiamos bg-muted por una mezcla traslúcida que permite ver el fondo.
 * 2. Bordes: Añadimos un borde HD casi invisible para dar forma industrial.
 * 3. Animación: Mantenemos el pulso pero con una opacidad más elegante.
 */

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse",
        "bg-slate-200/50 dark:bg-white/5",
        "border border-slate-300/10 dark:border-white/5",
        "rounded-lg",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
