// eslint-disable-next-line react-refresh/only-export-components
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Kemper UI: Card Component
 * Estética: macOS Tahoe / Premium Design System
 */

const cardVariants = cva(
  "relative overflow-hidden transition-all duration-300 ease-out outline-none",
  {
    variants: {
      variant: {
        default: [
          "bg-white/90 backdrop-blur-xl",
          "border border-slate-200/60 dark:border-white/10",
          "shadow-[0_8px_32px_rgba(0,0,0,0.06)]",
          "hover:shadow-[0_12px_48px_rgba(0,0,0,0.1)] hover:-translate-y-1",
        ],
        glass: [
          "bg-white/70 backdrop-blur-2xl dark:bg-slate-950/70",
          "border border-white/40 dark:border-white/10",
          "shadow-[0_20px_50px_rgba(0,0,0,0.1)]",
          "before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/20 before:to-transparent before:pointer-events-none",
        ],
        interactive: [
          "bg-card shadow-sm border-slate-200",
          "active:scale-[0.96] transition-transform duration-200", // haptic-press
          "hover:border-primary/30 hover:shadow-md",
          "focus-visible:ring-4 focus-visible:ring-[#be0811]/10 focus-visible:border-[#be0811]",
        ],
        flat: "bg-slate-50/50 border-transparent shadow-none",
      },
      padding: {
        none: "p-0",
        sm: "p-4",
        default: "p-6",
        lg: "p-8",
      },
      radius: {
        xl: "rounded-xl",
        "2xl": "rounded-2xl",
        "3xl": "rounded-3xl",
      },
    },
    defaultVariants: {
      variant: "default",
      padding: "none",
      radius: "2xl",
    },
  },
);

export interface CardProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, radius, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, padding, radius }), className)}
      {...props}
    />
  ),
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-xl font-bold leading-none tracking-tight text-slate-900 dark:text-white", // Apple Crisp Typography
      className,
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn(
      "text-sm font-medium text-slate-500/90 leading-relaxed",
      className,
    )}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center p-6 pt-0 border-t border-slate-100/50 dark:border-white/5 mt-2",
      className,
    )}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  cardVariants,
};
