import { sidebarIcons, type SidebarIconKey } from "@/assets/img/icons/sidebar";
import { cn } from "@/lib/utils";

type Props = {
  name: SidebarIconKey;
  className?: string;
  alt?: string;
  variant?: "white" | "black" | "original";
};

export function SidebarSvgIcon({
  name,
  className = "h-4 w-4",
  alt,
  variant = "white",
}: Props) {
  const src = sidebarIcons[name];

  return (
    <img
      src={src}
      alt={alt ?? name}
      className={cn(
        className,
        // Filtro para forzar el SVG a blanco puro
        variant === "white" && "brightness-0 invert",
        // Filtro para forzar el SVG a negro puro
        variant === "black" && "brightness-0",
        // Sin filtros, se queda con su color de diseño
        variant === "original" && "",
      )}
      loading="lazy"
      draggable={false}
    />
  );
}
