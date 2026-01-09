import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

export interface ActionButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  size?: "sm" | "md" | "lg";
}

const ActionButton = React.forwardRef<HTMLButtonElement, ActionButtonProps>(
  ({ className, asChild = false, size = "md", ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    
    const sizeStyles = {
      sm: "h-8 px-3 text-xs",
      md: "h-9 px-4 text-sm",
      lg: "h-10 px-6 text-sm",
    };
    
    return (
      <Comp
        className={cn(
          "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-colors",
          "bg-emerald-600 text-white hover:bg-emerald-700",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50",
          sizeStyles[size],
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
ActionButton.displayName = "ActionButton";

export { ActionButton };
