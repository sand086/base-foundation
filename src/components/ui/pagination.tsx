import * as React from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";
import { ButtonProps, buttonVariants } from "@/components/ui/button";

/**
 * Pagination - macOS Tahoe / Industrial Premium
 * Refactorización:
 * 1. Control Strip: El contenido se agrupa en una barra de cristal unificada.
 * 2. Active State: La página activa usa Brand Red con un glow industrial.
 * 3. Tipografía: "Anterior" y "Siguiente" escalados a la regla de oro 10px Black.
 */

const Pagination = ({ className, ...props }: React.ComponentProps<"nav">) => (
  <nav
    role="navigation"
    aria-label="pagination"
    className={cn("mx-auto flex w-full justify-center", className)}
    {...props}
  />
);
Pagination.displayName = "Pagination";

const PaginationContent = React.forwardRef<
  HTMLUListElement,
  React.ComponentProps<"ul">
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    className={cn(
      "flex flex-row items-center gap-1.5 p-1.5 rounded-2xl",
      "bg-white/40 dark:bg-black/20 backdrop-blur-xl",
      "border border-slate-200/80 dark:border-white/10 shadow-sm",
      className,
    )}
    {...props}
  />
));
PaginationContent.displayName = "PaginationContent";

const PaginationItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentProps<"li">
>(({ className, ...props }, ref) => (
  <li ref={ref} className={cn("", className)} {...props} />
));
PaginationItem.displayName = "PaginationItem";

type PaginationLinkProps = {
  isActive?: boolean;
} & Pick<ButtonProps, "size"> &
  React.ComponentProps<"a">;

const PaginationLink = ({
  className,
  isActive,
  size = "icon",
  ...props
}: PaginationLinkProps) => (
  <a
    aria-current={isActive ? "page" : undefined}
    className={cn(
      buttonVariants({
        variant: isActive ? "default" : "ghost",
        size,
      }),
      "transition-all duration-300 rounded-xl",
      // REGLA: Estado Activo (Brand Red + Glow)
      isActive
        ? "bg-brand-red text-white shadow-lg shadow-brand-red/20 hover:bg-brand-red/90 hover:scale-105"
        : "hover:bg-slate-100 dark:hover:bg-white/5 dark:text-slate-400 dark:hover:text-white",
      // REGLA: Tipografía de datos para números
      "font-black tracking-tighter text-[13px]",
      "haptic-press",
      className,
    )}
    {...props}
  />
);
PaginationLink.displayName = "PaginationLink";

const PaginationPrevious = ({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink
    aria-label="Ir a página anterior"
    size="default"
    className={cn(
      "gap-2 px-3 transition-all",
      // REGLA: Tipografía Industrial para el label
      "text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400",
      className,
    )}
    {...props}
  >
    <ChevronLeft className="h-4 w-4 stroke-[3px]" />
    <span className="hidden sm:inline">Anterior</span>
  </PaginationLink>
);
PaginationPrevious.displayName = "PaginationPrevious";

const PaginationNext = ({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink
    aria-label="Ir a página siguiente"
    size="default"
    className={cn(
      "gap-2 px-3 transition-all",
      // REGLA: Tipografía Industrial para el label
      "text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400",
      className,
    )}
    {...props}
  >
    <span className="hidden sm:inline">Siguiente</span>
    <ChevronRight className="h-4 w-4 stroke-[3px]" />
  </PaginationLink>
);
PaginationNext.displayName = "PaginationNext";

const PaginationEllipsis = ({
  className,
  ...props
}: React.ComponentProps<"span">) => (
  <span
    aria-hidden
    className={cn(
      "flex h-9 w-9 items-center justify-center text-slate-300 dark:text-white/20",
      className,
    )}
    {...props}
  >
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">Más páginas</span>
  </span>
);
PaginationEllipsis.displayName = "PaginationEllipsis";

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
};
