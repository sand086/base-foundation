"use client";

import * as React from "react";
import * as MenubarPrimitive from "@radix-ui/react-menubar";
import { Check, ChevronRight, Circle } from "lucide-react";

import { cn } from "@/lib/utils";

const MenubarMenu = MenubarPrimitive.Menu;
const MenubarGroup = MenubarPrimitive.Group;
const MenubarPortal = MenubarPrimitive.Portal;
const MenubarSub = MenubarPrimitive.Sub;
const MenubarRadioGroup = MenubarPrimitive.RadioGroup;

/**
 * Menubar Root - macOS Tahoe Style
 * Barra de cristal líquido superior.
 */
const Menubar = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <MenubarPrimitive.Root
    ref={ref}
    className={cn(
      "flex h-12 items-center space-x-1 p-1.5 transition-all duration-300",
      "bg-white/80 dark:bg-brand-navy/90 backdrop-blur-xl",
      "border border-slate-200/80 dark:border-white/10 rounded-2xl shadow-sm",
      className,
    )}
    {...props}
  />
));
Menubar.displayName = MenubarPrimitive.Root.displayName;

/**
 * MenubarTrigger - Interacción de precisión
 */
const MenubarTrigger = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <MenubarPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex cursor-default select-none items-center rounded-xl px-4 py-2 text-sm font-bold tracking-tight outline-none transition-all duration-200",
      "text-slate-700 dark:text-slate-300",
      "hover:bg-slate-100 dark:hover:bg-white/5",
      "data-[state=open]:bg-slate-100 dark:data-[state=open]:bg-white/10 data-[state=open]:text-brand-red",
      "focus:bg-slate-100 dark:focus:bg-white/5",
      className,
    )}
    {...props}
  />
));
MenubarTrigger.displayName = MenubarPrimitive.Trigger.displayName;

/**
 * MenubarContent & SubContent - Paneles de Cristal HD
 */
const menubarContentStyles = cn(
  "z-50 min-w-[14rem] overflow-hidden p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-300",
  "bg-white/95 dark:bg-brand-navy/98 backdrop-blur-2xl",
  "border border-slate-200/80 dark:border-white/10 rounded-2xl",
  "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
);

const MenubarSubTrigger = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.SubTrigger> & {
    inset?: boolean;
  }
>(({ className, inset, children, ...props }, ref) => (
  <MenubarPrimitive.SubTrigger
    ref={ref}
    className={cn(
      "flex cursor-default select-none items-center rounded-xl px-3 py-2 text-[13px] font-medium outline-none transition-colors",
      "text-slate-600 dark:text-slate-300",
      "data-[state=open]:bg-brand-red data-[state=open]:text-white",
      "focus:bg-brand-red focus:text-white",
      inset && "pl-8",
      className,
    )}
    {...props}
  >
    {children}
    <ChevronRight className="ml-auto h-4 w-4 stroke-[3px]" />
  </MenubarPrimitive.SubTrigger>
));
MenubarSubTrigger.displayName = MenubarPrimitive.SubTrigger.displayName;

const MenubarSubContent = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.SubContent>
>(({ className, ...props }, ref) => (
  <MenubarPrimitive.SubContent
    ref={ref}
    className={cn(menubarContentStyles, className)}
    {...props}
  />
));
MenubarSubContent.displayName = MenubarPrimitive.SubContent.displayName;

const MenubarContent = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Content>
>(
  (
    { className, align = "start", alignOffset = -4, sideOffset = 8, ...props },
    ref,
  ) => (
    <MenubarPrimitive.Portal>
      <MenubarPrimitive.Content
        ref={ref}
        align={align}
        alignOffset={alignOffset}
        sideOffset={sideOffset}
        className={cn(menubarContentStyles, className)}
        {...props}
      >
        {/* Brillo interno Spotlight Apple-style */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-white/10 dark:from-white/5 to-transparent z-0" />
        <div className="relative z-10">{props.children}</div>
      </MenubarPrimitive.Content>
    </MenubarPrimitive.Portal>
  ),
);
MenubarContent.displayName = MenubarPrimitive.Content.displayName;

/**
 * MenubarItem - Elemento interactivo Tahoe
 */
const MenubarItem = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Item> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <MenubarPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-xl px-3 py-2.5 text-[13px] font-medium outline-none transition-all duration-200 haptic-press",
      "text-slate-700 dark:text-slate-200",
      "focus:bg-brand-red focus:text-white focus:shadow-lg focus:shadow-brand-red/20 focus:scale-[1.02]",
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
      inset && "pl-8",
      className,
    )}
    {...props}
  />
));
MenubarItem.displayName = MenubarPrimitive.Item.displayName;

const MenubarCheckboxItem = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <MenubarPrimitive.CheckboxItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-xl py-2 pl-10 pr-3 text-[13px] font-medium outline-none transition-colors",
      "text-slate-700 dark:text-slate-200",
      "focus:bg-brand-red focus:text-white",
      className,
    )}
    checked={checked}
    {...props}
  >
    <span className="absolute left-3.5 flex h-4 w-4 items-center justify-center">
      <MenubarPrimitive.ItemIndicator>
        <Check className="h-4 w-4 stroke-[4px]" />
      </MenubarPrimitive.ItemIndicator>
    </span>
    {children}
  </MenubarPrimitive.CheckboxItem>
));
MenubarCheckboxItem.displayName = MenubarPrimitive.CheckboxItem.displayName;

const MenubarRadioItem = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <MenubarPrimitive.RadioItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-xl py-2 pl-10 pr-3 text-[13px] font-medium outline-none transition-colors",
      "text-slate-700 dark:text-slate-200",
      "focus:bg-brand-red focus:text-white",
      className,
    )}
    {...props}
  >
    <span className="absolute left-3.5 flex h-4 w-4 items-center justify-center">
      <MenubarPrimitive.ItemIndicator>
        <Circle className="h-2.5 w-2.5 fill-current shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
      </MenubarPrimitive.ItemIndicator>
    </span>
    {children}
  </MenubarPrimitive.RadioItem>
));
MenubarRadioItem.displayName = MenubarPrimitive.RadioItem.displayName;

/**
 * MenubarLabel - REGLA DE ORO: Tipografía Industrial
 */
const MenubarLabel = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Label> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <MenubarPrimitive.Label
    ref={ref}
    className={cn(
      "px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400",
      inset && "pl-8",
      className,
    )}
    {...props}
  />
));
MenubarLabel.displayName = MenubarPrimitive.Label.displayName;

const MenubarSeparator = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <MenubarPrimitive.Separator
    ref={ref}
    className={cn(
      "-mx-1.5 my-1.5 h-px bg-slate-200/80 dark:bg-white/10",
      className,
    )}
    {...props}
  />
));
MenubarSeparator.displayName = MenubarPrimitive.Separator.displayName;

/**
 * MenubarShortcut - Micro-tipografía Industrial
 */
const MenubarShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn(
        "ml-auto text-[9px] font-black tracking-[0.15em] uppercase text-slate-400 dark:text-slate-500",
        className,
      )}
      {...props}
    />
  );
};
MenubarShortcut.displayName = "MenubarShortcut";

export {
  Menubar,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarItem,
  MenubarSeparator,
  MenubarLabel,
  MenubarCheckboxItem,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarPortal,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarGroup,
  MenubarSub,
  MenubarShortcut,
};
