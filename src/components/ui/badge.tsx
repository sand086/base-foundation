import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",

        success:
          "border-transparent bg-emerald-600 text-white hover:bg-emerald-600/90",
        warning:
          "border-transparent bg-amber-500 text-white hover:bg-amber-500/90",
        info: "border-transparent bg-blue-600 text-white hover:bg-blue-600/90",
        neutral:
          "border-transparent bg-slate-700 text-white hover:bg-slate-700/90",

        successSoft:
          "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
        warningSoft:
          "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100",
        infoSoft: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
        neutralSoft:
          "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200",

        destructiveSoft:
          "bg-red-50 text-red-700 border-red-200 hover:bg-red-100",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
