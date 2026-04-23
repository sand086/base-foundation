import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { ChevronRight, MoreHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Breadcrumb UI - macOS Tahoe / Industrial Edition
 * Refactorización:
 * 1. Tipografía: Estilo etiquetas de maquinaria (Uppercase + Tracking).
 * 2. Reactividad: Soporte total para Dark Mode.
 * 3. Interactividad: Hover con Brand Red y transiciones fluidas.
 */

const Breadcrumb = React.forwardRef<
  HTMLElement,
  React.ComponentPropsWithoutRef<"nav"> & {
    separator?: React.ReactNode;
  }
>(({ ...props }, ref) => (
  <nav
    ref={ref}
    aria-label="breadcrumb"
    className="py-2" // Espaciado extra para respiro visual
    {...props}
  />
));
Breadcrumb.displayName = "Breadcrumb";

const BreadcrumbList = React.forwardRef<
  HTMLOListElement,
  React.ComponentPropsWithoutRef<"ol">
>(({ className, ...props }, ref) => (
  <ol
    ref={ref}
    className={cn(
      "flex flex-wrap items-center gap-1.5 break-words sm:gap-2.5",
      //   TIPOGRAFÍA INDUSTRIAL: Pequeña, negrita y espaciada
      "text-[10px] font-bold uppercase tracking-[0.15em]",
      "text-slate-500 dark:text-white/40",
      className,
    )}
    {...props}
  />
));
BreadcrumbList.displayName = "BreadcrumbList";

const BreadcrumbItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentPropsWithoutRef<"li">
>(({ className, ...props }, ref) => (
  <li
    ref={ref}
    className={cn("inline-flex items-center gap-1.5", className)}
    {...props}
  />
));
BreadcrumbItem.displayName = "BreadcrumbItem";

const BreadcrumbLink = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentPropsWithoutRef<"a"> & {
    asChild?: boolean;
  }
>(({ asChild, className, ...props }, ref) => {
  const Comp = asChild ? Slot : "a";

  return (
    <Comp
      ref={ref}
      className={cn(
        "transition-all duration-300",
        // ✨ INTERACTIVIDAD: Se ilumina en Rojo de Marca al pasar el mouse
        "hover:text-brand-red dark:hover:text-brand-red hover:translate-y-[-1px]",
        className,
      )}
      {...props}
    />
  );
});
BreadcrumbLink.displayName = "BreadcrumbLink";

const BreadcrumbPage = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<"span">
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    role="link"
    aria-disabled="true"
    aria-current="page"
    className={cn(
      // 💎 ESTADO ACTIVO: Más pesado y con color de énfasis
      "font-black text-slate-900 dark:text-white tracking-[0.2em]",
      className,
    )}
    {...props}
  />
));
BreadcrumbPage.displayName = "BreadcrumbPage";

const BreadcrumbSeparator = ({
  children,
  className,
  ...props
}: React.ComponentProps<"li">) => (
  <li
    role="presentation"
    aria-hidden="true"
    className={cn(
      "[&>svg]:size-3 text-slate-300 dark:text-white/10", // Separadores HD ultra sutiles
      className,
    )}
    {...props}
  >
    {children ?? <ChevronRight />}
  </li>
);
BreadcrumbSeparator.displayName = "BreadcrumbSeparator";

const BreadcrumbEllipsis = ({
  className,
  ...props
}: React.ComponentProps<"span">) => (
  <span
    role="presentation"
    aria-hidden="true"
    className={cn(
      "flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 dark:bg-white/5",
      className,
    )}
    {...props}
  >
    <MoreHorizontal className="h-4 w-4 opacity-50" />
    <span className="sr-only">Más opciones</span>
  </span>
);
BreadcrumbEllipsis.displayName = "BreadcrumbElipssis";

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
};
