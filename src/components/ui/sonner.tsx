import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="bottom-center"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-brand-black group-[.toaster]:text-white group-[.toaster]:border group-[.toaster]:border-white/10 group-[.toaster]:shadow-2xl group-[.toaster]:rounded-full group-[.toaster]:px-6 group-[.toaster]:py-3 group-[.toaster]:backdrop-blur-xl group-[.toaster]:animate-in group-[.toaster]:slide-in-from-bottom-4 group-[.toaster]:fade-in-0 group-[.toaster]:duration-300",
          description: "group-[.toast]:text-white/70",
          actionButton: "group-[.toast]:bg-white group-[.toast]:text-brand-black group-[.toast]:rounded-full group-[.toast]:font-medium",
          cancelButton: "group-[.toast]:bg-white/10 group-[.toast]:text-white group-[.toast]:rounded-full",
          success: "group-[.toaster]:!bg-brand-black group-[.toaster]:ring-1 group-[.toaster]:ring-emerald-500/30",
          error: "group-[.toaster]:!bg-brand-black group-[.toaster]:ring-1 group-[.toaster]:ring-rose-500/30",
          warning: "group-[.toaster]:!bg-brand-black group-[.toaster]:ring-1 group-[.toaster]:ring-amber-500/30",
          info: "group-[.toaster]:!bg-brand-black group-[.toaster]:ring-1 group-[.toaster]:ring-blue-500/30",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
