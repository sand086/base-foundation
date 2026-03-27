"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/**
 * Toaster UI - macOS Tahoe / Industrial Edition
 * Refactorización:
 * 1. Estética: Cápsula flotante de cristal (Glassmorphism HD).
 * 2. Reactividad: Fondos dinámicos adaptados al tema Light/Dark.
 * 3. Status: Anillos de luz (Rings) tipo LED para éxito, error y alertas.
 * 4. Tipografía: Estilo técnico con tracking de precisión.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="bottom-center"
      hotkey={["alt", "t"]}
      toastOptions={{
        classNames: {
          toast: cn(
            "group toast font-sans",
            // 💎 ESTRUCTURA: Cápsula de cristal tipo macOS
            "group-[.toaster]:rounded-full group-[.toaster]:px-6 group-[.toaster]:py-3",
            "group-[.toaster]:backdrop-blur-2xl group-[.toaster]:shadow-[0_20px_50px_rgba(0,0,0,0.3)]",
            "group-[.toaster]:transition-all group-[.toaster]:duration-500",

            // 🌓 COLORES REACTIVOS:
            "group-[.toaster]:bg-white/80 group-[.toaster]:text-slate-900 group-[.toaster]:border-slate-200",
            "dark:group-[.toaster]:bg-brand-navy/90 dark:group-[.toaster]:text-white dark:group-[.toaster]:border-white/10",

            // Animación de entrada técnica
            "animate-in slide-in-from-bottom-5 fade-in-0 duration-500",
          ),

          // DETALLES INTERNOS
          title: "text-[13px] font-black uppercase tracking-[0.1em]",
          description: "text-[12px] opacity-70 font-medium",

          // BOTONES (Heredan el estilo de hardware)
          actionButton: cn(
            "group-[.toast]:rounded-full group-[.toast]:px-4 group-[.toast]:text-[11px] group-[.toast]:font-black group-[.toast]:uppercase group-[.toast]:tracking-widest",
            "group-[.toast]:bg-brand-red group-[.toast]:text-white hover:group-[.toast]:bg-brand-red/90 transition-all active:scale-95",
          ),
          cancelButton: cn(
            "group-[.toast]:rounded-full group-[.toast]:px-4 group-[.toast]:text-[11px] group-[.toast]:font-black group-[.toast]:uppercase",
            "group-[.toast]:bg-slate-100 dark:group-[.toast]:bg-white/5 text-current hover:group-[.toast]:bg-slate-200 dark:hover:group-[.toast]:bg-white/10",
          ),

          // 🔴 ESTADOS LED (Anillos de luz nítidos)
          success:
            "group-[.toaster]:ring-2 group-[.toaster]:ring-emerald-500/40 group-[.toaster]:ring-offset-0",
          error:
            "group-[.toaster]:ring-2 group-[.toaster]:ring-brand-red/40 group-[.toaster]:ring-offset-0",
          warning:
            "group-[.toaster]:ring-2 group-[.toaster]:ring-amber-500/40 group-[.toaster]:ring-offset-0",
          info: "group-[.toaster]:ring-2 group-[.toaster]:ring-sky-500/40 group-[.toaster]:ring-offset-0",
        },
      }}
      {...props}
    />
  );
};

// Utility para inyectar Tailwind en componentes de JS si es necesario
function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}

export { Toaster, toast };
