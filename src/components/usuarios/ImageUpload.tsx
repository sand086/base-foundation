// src/components/usuarios/ImageUpload.tsx
import { useState, useRef, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Camera, Trash2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import AvatarDefault from "@/assets/img/usuarios/avatar3.png";

interface ImageUploadProps {
  value?: string;
  onChange: (file: File | undefined) => void;
  fallback?: string;
  className?: string;
  disabled?: boolean;
}

// 🚀 HELPER AGREGADO: Asegura que la imagen siempre encuentre el servidor backend
const getFullImageUrl = (path?: string) => {
  if (!path) return undefined;
  // Si ya es un blob local (vista previa) o una URL completa, la dejamos intacta
  if (
    path.startsWith("blob:") ||
    path.startsWith("http") ||
    path.startsWith("data:")
  ) {
    return path;
  }

  // Tomamos la URL del backend desde tus variables de entorno
  const apiBase = import.meta.env.VITE_API_BASE_URL || "/api";
  const serverBase = apiBase.replace(/\/api$/, ""); // Le quitamos el /api del final

  return `${serverBase}${path}`;
};

export function ImageUpload({
  value,
  onChange,
  fallback = "US",
  className,
  disabled = false,
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string | undefined>(value);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPreview(value);
  }, [value]);

  useEffect(() => {
    return () => {
      if (preview && preview.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const handleFileChange = (file: File | null) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Solo se permiten archivos de imagen");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen no puede superar 5MB");
      return;
    }

    // NUEVA LÓGICA RÁPIDA (Sin Base64)
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    onChange(file); // Pasamos el archivo físico
    toast.success("Imagen lista para subir");
  };

  const handleDrop = (e: React.DragEvent) => {
    if (disabled) return;
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleFileChange(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (disabled) return;
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleRemove = () => {
    if (preview && preview.startsWith("blob:")) {
      URL.revokeObjectURL(preview);
    }
    setPreview(undefined);
    onChange(undefined);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <div
        className={cn(
          "relative rounded-full transition-all duration-300",
          isDragging && "ring-4 ring-primary/20 scale-105",
          !disabled && "cursor-pointer",
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !disabled && inputRef.current?.click()}
      >
        <Avatar className="h-28 w-28 border-4 border-white shadow-xl">
          <AvatarImage
            src={getFullImageUrl(preview?.trim()) || AvatarDefault} // 🚀 HELPER APLICADO AQUÍ
            alt="Profile Preview"
            className="object-cover"
          />
          <AvatarFallback className="text-2xl bg-slate-100 text-slate-600 font-bold uppercase">
            {fallback}
          </AvatarFallback>
        </Avatar>

        {!disabled && (
          <div className="absolute -bottom-1 -right-1 bg-primary text-white h-9 w-9 rounded-full shadow-lg flex items-center justify-center border-2 border-white hover:scale-110 transition-transform">
            <Camera className="h-5 w-5" />
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        disabled={disabled}
        onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
      />

      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 gap-2 font-semibold shadow-sm"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            {preview ? "Cambiar foto" : "Subir foto"}
          </Button>

          {preview && !disabled && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 font-semibold"
              onClick={(e) => {
                e.stopPropagation();
                handleRemove();
              }}
            >
              <Trash2 className="h-4 w-4" />
              Quitar
            </Button>
          )}
        </div>

        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
          JPG, PNG o GIF • Máximo 5MB
        </p>
      </div>
    </div>
  );
}
