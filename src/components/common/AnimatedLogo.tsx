import { cn } from "@/lib/utils";
import { logos_3t } from "@/assets/img";

interface AnimatedLogoProps {
  className?: string;
  collapsed?: boolean;
}

export function AnimatedLogo({
  className,
  collapsed = false,
}: AnimatedLogoProps) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden",
        collapsed ? "h-8 w-8" : "h-10",
        className,
      )}
    >
      {/* --- LOGO COMPLETO (Cuando está expandido) --- */}
      <div
        className={cn(
          "transition-all duration-300 ease-out h-full flex items-center justify-center",
          collapsed
            ? "opacity-0 scale-75 pointer-events-none"
            : "opacity-100 scale-100",
        )}
      >
        {/* Versión BLANCA (Visible en Dark Mode) */}
        <img
          src={logos_3t.logo_white_3t}
          alt="Rápidos 3T"
          className="hidden dark:block h-full w-auto object-contain"
        />
        {/* Versión NEGRA (Visible en Light Mode) */}
        <img
          src={logos_3t.logo_black_3t || logos_3t.logo_white_3t} // Fallback si no tienes el negro aún
          alt="Rápidos 3T"
          className="block dark:hidden h-full w-auto object-contain"
        />
      </div>

      {/* --- FAVICON / ISOTIPO (Cuando está colapsado) --- */}
      <div
        className={cn(
          "absolute transition-all duration-300 ease-out h-full flex items-center justify-center",
          collapsed
            ? "opacity-100 scale-100"
            : "opacity-0 scale-125 pointer-events-none",
        )}
      >
        {/* Favicon Blanco (Dark Mode) */}
        <img
          src={logos_3t.favicon_3t}
          alt="3T"
          className="hidden dark:block h-full w-auto object-contain"
        />
        {/* Favicon Negro (Light Mode) - Si es el mismo, Tailwind lo manejará */}
        <img
          src={logos_3t.favicon_3t}
          alt="3T"
          className="block dark:hidden h-full w-auto object-contain brightness-0" // Forzamos negro si solo tienes uno
        />
      </div>

      {/* Glow effect sutil - Se adapta al tema */}
      <div
        className={cn(
          "absolute inset-0 rounded-full blur-xl transition-opacity duration-500",
          "bg-brand-red/20 dark:bg-brand-red/10", // Más intenso en light mode para que se note
          collapsed ? "opacity-30" : "opacity-20",
        )}
        style={{ transform: "scale(1.5)" }}
      />
    </div>
  );
}
