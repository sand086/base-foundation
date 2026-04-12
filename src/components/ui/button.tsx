// eslint-disable-next-line react-refresh/only-export-components
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// 👉 1. IMPORTAMOS TU HOOK DE SEGURIDAD
import { usePermissions } from "@/hooks/use-permissions";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-bold ring-offset-background transition-all duration-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.96] haptic-press outline-none",
  {
    variants: {
      variant: {
        default:
          "bg-brand-red hover:bg-brand-red/90 dark:bg-brand-red dark:hover:bg-brand-red/90 text-white shadow-[0_4px_15px_rgba(190,8,17,0.3)] border-none",
        secondary:
          "bg-brand-navy hover:bg-brand-navy/90 text-white shadow-lg border-none dark:border-white/10",
        tertiary:
          "bg-slate-100/80 dark:bg-white/5 text-slate-700 dark:text-white/70 border border-slate-200 dark:border-white/10 backdrop-blur-sm hover:bg-white dark:hover:bg-white/10",
        success:
          "bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white shadow-[0_4px_15px_rgba(0,151,64,0.2)] border-none",
        info: "bg-cyan-600 dark:bg-cyan-700 text-white shadow-[0_4px_15px_rgba(8,145,178,0.2)] border-none hover:bg-cyan-700 dark:hover:bg-cyan-800",
        warning:
          "bg-amber-500 dark:bg-amber-600 text-white shadow-[0_4px_15px_rgba(245,158,11,0.2)] border-none hover:bg-amber-600 dark:hover:bg-amber-700",
        destructive:
          "bg-slate-900 dark:bg-slate-950 text-rose-500 border border-rose-500/30 shadow-[0_4px_12px_rgba(0,0,0,0.3)] hover:bg-rose-600 hover:text-white hover:border-rose-600 hover:shadow-[0_0_20px_rgba(225,29,72,0.4)]",
        outline:
          "border-2 border-slate-200 dark:border-white/10 bg-transparent hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-brand-navy dark:hover:text-white",
        ghost:
          "hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white",
        link: "text-brand-red underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-6 py-2",
        sm: "h-9 rounded-lg px-3 text-xs",
        lg: "h-12 rounded-xl px-8 text-[11px] font-black uppercase tracking-[0.2em]",
        xl: "h-14 rounded-2xl px-10 text-[13px] font-black uppercase tracking-[0.25em]",
        icon: "h-10 w-10 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

// 👉 2. AGREGAMOS LAS PROPS DE PERMISOS
export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  module?: string; // Ej: "clients", "fleet"
  actionType?: "read" | "create" | "update" | "delete";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, asChild = false, module, actionType, ...props },
    ref,
  ) => {
    // 👉 3. OBTENEMOS LOS PERMISOS (Si no se pasa module, evalúa como true automáticamente)
    const { canRead, canCreate, canUpdate, canDelete, isAdmin } =
      usePermissions(module);

    // 👉 4. LÓGICA DE INTERCEPCIÓN
    // Si el botón exige permisos y el usuario no es admin, evaluamos:
    if (module && actionType && !isAdmin) {
      if (actionType === "read" && !canRead) return null;
      if (actionType === "create" && !canCreate) return null;
      if (actionType === "update" && !canUpdate) return null;
      if (actionType === "delete" && !canDelete) return null;
    }

    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
