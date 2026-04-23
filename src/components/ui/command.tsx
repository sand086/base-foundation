"use client";

import * as React from "react";
import { type DialogProps } from "@radix-ui/react-dialog";
//  ️ CORRECCIÓN: Importamos el hook por separado según la definición de tipos
import { Command as CommandPrimitive, useCommandState } from "cmdk";
import { Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

/**
 * Command UI - macOS Tahoe / Industrial Edition
 */

const Command = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, ref) => (
  <CommandPrimitive
    ref={ref}
    className={cn(
      "flex h-full w-full flex-col overflow-hidden rounded-2xl bg-transparent text-foreground",
      className,
    )}
    {...props}
  />
));
Command.displayName = CommandPrimitive.displayName;

//  FIX: Extendemos DialogProps para que acepte className sin que TypeScript se queje
interface CommandDialogProps extends DialogProps {
  className?: string;
}

const CommandDialog = ({
  children,
  className,
  ...props
}: CommandDialogProps) => {
  return (
    <Dialog {...props}>
      <DialogContent
        className={cn(
          "overflow-hidden p-0 max-w-2xl border-none bg-white/90 dark:bg-brand-navy/95 backdrop-blur-2xl shadow-[0_30px_60px_rgba(0,0,0,0.2)] dark:shadow-[0_30px_60px_rgba(0,0,0,0.5)] animate-modal-show rounded-2xl",
          className,
        )}
      >
        <DialogTitle className="sr-only">Buscador de Comandos</DialogTitle>

        <Command
          className={cn(
            "bg-transparent",
            "[&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:py-3 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-black [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.2em] [&_[cmdk-group-heading]]:text-brand-red",
            "[&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2",
            "[&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input-wrapper]_svg]:text-slate-400 dark:text-white/20",
            "[&_[cmdk-input]]:h-16 [&_[cmdk-input]]:text-[15px] [&_[cmdk-input]]:font-medium [&_[cmdk-input]]:placeholder:text-slate-400 dark:[&_[cmdk-input]]:placeholder:text-white/20",
            "[&_[cmdk-item]]:px-4 [&_[cmdk-item]]:py-3.5 [&_[cmdk-item]]:rounded-xl [&_[cmdk-item]]:transition-all [&_[cmdk-item]]:duration-200",
            "[&_[cmdk-item][data-selected=true]]:bg-brand-red [&_[cmdk-item][data-selected=true]]:text-white [&_[cmdk-item][data-selected=true]]:shadow-lg [&_[cmdk-item][data-selected=true]]:scale-[1.01]",
            "[&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5 [&_[cmdk-item]_svg]:mr-3 [&_[cmdk-item]_svg]:opacity-60 [&_[cmdk-item][data-selected=true]_svg]:opacity-100 [&_[cmdk-item][data-selected=true]_svg]:drop-shadow-md",
          )}
        >
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  );
};

const CommandInput = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Input>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>
>(({ className, ...props }, ref) => (
  <div
    className="flex items-center border-b border-slate-200 dark:border-white/10 px-6"
    cmdk-input-wrapper=""
  >
    <Search className="mr-3 h-5 w-5 shrink-0 opacity-50 text-slate-400 dark:text-white/20" />
    <CommandPrimitive.Input
      ref={ref}
      className={cn(
        "flex h-16 w-full rounded-md bg-transparent py-4 text-[14px] outline-none placeholder:text-slate-400 dark:placeholder:text-white/20 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  </div>
));
CommandInput.displayName = CommandPrimitive.Input.displayName;

const CommandList = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.List
    ref={ref}
    className={cn(
      "max-h-[400px] overflow-y-auto overflow-x-hidden p-2 custom-scrollbar",
      className,
    )}
    {...props}
  />
));
CommandList.displayName = CommandPrimitive.List.displayName;

/**
 *  ️ MEJORA: CommandEmpty
 * Solo se renderiza si hay una búsqueda activa y no hay resultados.
 */
const CommandEmpty = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Empty>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>((props, ref) => {
  //  Usamos el hook useCommandState directamente
  const search = useCommandState((state) => state.search);

  // Si no hay texto de búsqueda, no mostramos el estado vacío
  if (!search) return null;

  return (
    <CommandPrimitive.Empty
      ref={ref}
      className="py-12 text-center animate-in fade-in zoom-in-95 duration-300"
      {...props}
    >
      <div className="flex flex-col items-center gap-3">
        <Search className="h-10 w-10 text-slate-200 dark:text-white/5" />
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
          Sin resultados en la flota
        </p>
      </div>
    </CommandPrimitive.Empty>
  );
});
CommandEmpty.displayName = CommandPrimitive.Empty.displayName;

const CommandGroup = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Group>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Group
    ref={ref}
    className={cn("overflow-hidden text-foreground", className)}
    {...props}
  />
));
CommandGroup.displayName = CommandPrimitive.Group.displayName;

const CommandSeparator = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Separator
    ref={ref}
    className={cn("h-px bg-slate-200 dark:bg-white/5 my-2 mx-4", className)}
    {...props}
  />
));
CommandSeparator.displayName = CommandPrimitive.Separator.displayName;

const CommandItem = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-pointer select-none items-center rounded-xl px-4 py-3.5 text-[13px] font-medium outline-none tracking-tight",
      "data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-30",
      className,
    )}
    {...props}
  />
));
CommandItem.displayName = CommandPrimitive.Item.displayName;

const CommandShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn(
        "ml-auto text-[10px] font-black tracking-widest text-slate-400 uppercase",
        className,
      )}
      {...props}
    />
  );
};
CommandShortcut.displayName = "CommandShortcut";

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
};
