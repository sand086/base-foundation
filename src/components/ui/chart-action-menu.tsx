import React, { useRef } from "react";
import {
  Download,
  FileSpreadsheet,
  Image as ImageIcon,
  FileText,
  MoreVertical,
} from "lucide-react";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { exportToExcel } from "@/features/dashboard/utils/exportUtils";

interface ChartActionMenuProps {
  title: string;
  data: any[]; // Datos para el Excel
  containerRef: React.RefObject<HTMLDivElement>; // Ref de la Card para la imagen
  onViewDetail?: () => void;
}

export function ChartActionMenu({
  title,
  data,
  containerRef,
  onViewDetail,
}: ChartActionMenuProps) {
  // 🖼️ Exportar como Imagen PNG
  const downloadImage = async () => {
    if (!containerRef.current) return;

    try {
      // Definimos opciones para mejorar la calidad y compatibilidad
      const options = {
        quality: 0.95,
        backgroundColor: "#ffffff",
        cacheBust: true, // Limpia caché para evitar imágenes en blanco
        style: {
          borderRadius: "0px", // Evita artefactos visuales en los bordes al exportar
        },
      };

      // Recharts a veces necesita un segundo intento para serializar los filtros SVG
      await toPng(containerRef.current, options); // Primer intento "fantasma"
      const dataUrl = await toPng(containerRef.current, options); // Captura real

      const link = document.createElement("a");
      link.download = `${title.replace(/\s+/g, "-").toLowerCase()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Error capturando imagen:", err);
    }
  };

  // 📄 Exportar como PDF (Básico)
  const downloadPDF = async () => {
    if (!containerRef.current) return;
    const dataUrl = await toPng(containerRef.current, {
      quality: 0.95,
      backgroundColor: "#fff",
    });
    const pdf = new jsPDF("l", "mm", "a4");
    pdf.addImage(dataUrl, "PNG", 10, 10, 280, 150);
    pdf.save(`${title}.pdf`);
  };

  return (
    <div className="flex items-center justify-between w-full">
      <span className="text-sm font-semibold text-brand-dark dark:text-white uppercase tracking-wider">
        {title}
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVertical className="h-4 w-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => exportToExcel(data, title)}>
            <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" />
            Descargar Excel
          </DropdownMenuItem>
          <DropdownMenuItem onClick={downloadImage}>
            <ImageIcon className="mr-2 h-4 w-4 text-blue-600" />
            Guardar Imagen
          </DropdownMenuItem>
          <DropdownMenuItem onClick={downloadPDF}>
            <FileText className="mr-2 h-4 w-4 text-red-600" />
            Exportar PDF
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onViewDetail}>
            <Download className="mr-2 h-4 w-4" />
            Ver Detalle
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
