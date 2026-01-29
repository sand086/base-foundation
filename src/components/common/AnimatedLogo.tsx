import { cn } from "@/lib/utils";
import { logos_3t } from "@/assets/img";

interface AnimatedLogoProps {
  className?: string;
  collapsed?: boolean;
}

export function AnimatedLogo({ className, collapsed = false }: AnimatedLogoProps) {
  return (
    <div 
      className={cn(
        "relative flex items-center justify-center overflow-hidden",
        collapsed ? "h-8 w-8" : "h-10",
        className
      )}
    >
      {/* Logo completo - visible cuando está expandido */}
      <img
        src={logos_3t.logo_white_3t}
        alt="Rápidos 3T"
        className={cn(
          "absolute transition-all duration-300 ease-out h-full w-auto object-contain",
          collapsed 
            ? "opacity-0 scale-75 pointer-events-none" 
            : "opacity-100 scale-100"
        )}
      />
      
      {/* Favicon/Isotipo - visible cuando está colapsado */}
      <img
        src={logos_3t.favicon_3t}
        alt="3T"
        className={cn(
          "absolute transition-all duration-300 ease-out h-full w-auto object-contain",
          collapsed 
            ? "opacity-100 scale-100" 
            : "opacity-0 scale-125 pointer-events-none"
        )}
      />
      
      {/* Glow effect sutil */}
      <div 
        className={cn(
          "absolute inset-0 bg-brand-red/10 rounded-full blur-xl transition-opacity duration-500",
          collapsed ? "opacity-30" : "opacity-20"
        )}
        style={{ transform: 'scale(1.5)' }}
      />
    </div>
  );
}
