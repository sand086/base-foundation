"use client";

import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn } from "@/lib/utils";

// Imagen por defecto del sistema
import AvatarDefault from "@/assets/img/usuarios/avatar3.png";

const DEFAULT_AVATAR_SRC = AvatarDefault;

/**
 * Avatar UI - macOS Tahoe / Industrial Edition
 * Refactorización:
 * 1. Estética: Glassmorphism HD con bordes de luz.
 * 2. Feedback: Efecto háptico al presionar (haptic-press).
 * 3. Fallback: Tipografía industrial de alta precisión.
 */

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
      "bg-white/50 dark:bg-white/5 backdrop-blur-md",
      "border border-slate-200 dark:border-white/10 shadow-sm",
      "transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer",
      className,
    )}
    {...props}
  />
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

type AvatarImageProps = React.ComponentPropsWithoutRef<
  typeof AvatarPrimitive.Image
>;

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  AvatarImageProps
>(({ className, src, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    src={src ?? DEFAULT_AVATAR_SRC}
    // 🎞️ ANIMACIÓN: Entrada fluida de datos
    className={cn(
      "aspect-square h-full w-full object-cover animate-data-loaded transition-opacity duration-500",
      className,
    )}
    {...props}
  />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full uppercase",
      "text-[11px] font-black tracking-[0.15em]",
      "bg-gradient-to-br from-slate-100 to-slate-200 dark:from-brand-navy dark:to-black",
      "text-slate-500 dark:text-white/60",
      "animate-pulse-slow",
      className,
    )}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

export { Avatar, AvatarImage, AvatarFallback };
