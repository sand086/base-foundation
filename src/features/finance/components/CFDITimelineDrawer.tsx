import React from "react";
import { format } from "date-fns";
import { FileText, Download, Clock, User, Activity } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useCfdiTimeline,
  CFDIHistoryRecord,
} from "@/features/finance/hooks/useCfdiVault";

interface CFDITimelineDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  record: CFDIHistoryRecord | null;
}

export function CFDITimelineDrawer({
  isOpen,
  onClose,
  record,
}: CFDITimelineDrawerProps) {
  // Disparamos la búsqueda de la línea de tiempo solo si hay un documento seleccionado
  const { timeline, isLoading } = useCfdiTimeline(
    record?.tipo_documento || "",
    record?.id || null,
  );

  if (!record) return null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md md:max-w-lg border-l shadow-2xl flex flex-col p-0">
        <SheetHeader className="p-6 border-b bg-muted/30">
          <div className="flex justify-between items-start">
            <div>
              <SheetTitle className="text-2xl font-bold flex items-center gap-2">
                <FileText className="h-6 w-6 text-primary" />
                {record.folio || "Sin Folio"}
              </SheetTitle>
              <SheetDescription className="mt-1 text-base">
                {record.cliente_proveedor_nombre}
              </SheetDescription>
            </div>
            <Badge
              variant={
                record.estatus === "CANCELADO" ? "destructive" : "default"
              }
              className="text-sm px-3 py-1"
            >
              {record.estatus}
            </Badge>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 p-6">
          <div className="space-y-8">
            {/* SECCIÓN 1: ARCHIVOS Y VERSIONES */}
            <section>
              <h3 className="text-lg font-semibold border-b pb-2 mb-4 flex items-center gap-2">
                <Download className="h-5 w-5" />
                Archivos del Documento
              </h3>

              {record.versiones_archivos?.length > 0 ? (
                <div className="space-y-3">
                  {record.versiones_archivos.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 border rounded-lg bg-card/50 hover:bg-card transition-colors"
                    >
                      <div>
                        <p className="font-medium text-sm flex items-center gap-2">
                          <Badge
                            variant={file.is_active ? "default" : "secondary"}
                          >
                            V{file.version}
                          </Badge>
                          {file.document_type}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(
                            new Date(file.created_at || new Date()),
                            "dd/MM/yyyy HH:mm",
                          )}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(file.file_url, "_blank")}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Descargar
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No hay archivos adjuntos en este registro.
                </p>
              )}
            </section>

            {/* SECCIÓN 2: LÍNEA DE TIEMPO DE AUDITORÍA */}
            <section>
              <h3 className="text-lg font-semibold border-b pb-2 mb-4 flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Línea de Tiempo
              </h3>

              {isLoading ? (
                <p className="text-sm text-muted-foreground animate-pulse">
                  Cargando historial de eventos...
                </p>
              ) : timeline.length > 0 ? (
                <div className="relative border-l-2 border-muted ml-3 space-y-6">
                  {timeline.map((event, index) => (
                    <div key={index} className="relative pl-6">
                      {/* Punto de la línea de tiempo */}
                      <span className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-primary ring-4 ring-background" />

                      <div className="flex flex-col space-y-1">
                        <div className="flex items-center text-xs text-muted-foreground gap-2">
                          <Clock className="h-3 w-3" />
                          {format(
                            new Date(event.fecha),
                            "dd/MMM/yyyy HH:mm:ss",
                          )}
                          <span className="mx-1">•</span>
                          <User className="h-3 w-3" />
                          {event.usuario}
                        </div>
                        <p className="text-sm font-semibold">{event.accion}</p>
                        {event.detalles && (
                          <div className="mt-2 text-xs bg-muted/50 p-2 rounded border font-mono whitespace-pre-wrap break-all text-muted-foreground">
                            {event.detalles}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No hay eventos de auditoría registrados para este documento.
                </p>
              )}
            </section>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
