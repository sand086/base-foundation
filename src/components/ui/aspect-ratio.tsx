"use client";

import * as React from "react";
import * as AspectRatioPrimitive from "@radix-ui/react-aspect-ratio";
import { cn } from "@/lib/utils";
const AspectRatio = React.forwardRef<
  React.ElementRef<typeof AspectRatioPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AspectRatioPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AspectRatioPrimitive.Root
    ref={ref}
    // Añadimos overflow-hidden y bordes redondeados por defecto para mantener la consistencia
    className={cn(
      "overflow-hidden rounded-2xl border border-slate-200/60 dark:border-white/10 shadow-sm",
      className,
    )}
    {...props}
  />
));

AspectRatio.displayName = "AspectRatio";

export { AspectRatio };
