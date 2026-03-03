// src/features/despacho/TripDetailsModal.tsx
import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Truck,
  User,
  DollarSign,
  MapPin,
  Navigation,
  Wallet,
  CalendarClock,
  Link as LinkIcon,
  AlertCircle,
  Edit2,
  Save,
  X,
} from "lucide-react";
import { Trip, TripLeg } from "@/types/api.types";
import { useTrips } from "@/hooks/useTrips";
import axiosClient from "@/api/axiosClient";

interface TripDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trip: Trip | null;
}

export function TripDetailsModal({
  open,
  onOpenChange,
  trip,
}: TripDetailsModalProps) {
  const { editTrip } = useTrips();

  // Estados para modo edición
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Datos editables
  const [tarifaBase, setTarifaBase] = useState(0);
  const [costoCasetas, setCostoCasetas] = useState(0);

  // El Checkbox para mantener precios
  const [mantenerPreciosManuales, setMantenerPreciosManuales] = useState(true);

  // Inicializar datos cuando se abre el modal
  useEffect(() => {
    if (trip && open) {
      setTarifaBase(trip.tarifa_base || 0);
      setCostoCasetas(trip.costo_casetas || 0);
      setIsEditing(false);
      setMantenerPreciosManuales(true);
    }
  }, [trip, open]);

  const handlePrintPDF = async () => {
    if (!trip) return;
    try {
      const response = await axiosClient.get(
        `/trips/${trip.id}/carta-porte-ciega`,
        {
          responseType: "blob", // Importantísimo para recibir PDFs
        },
      );
      const fileURL = window.URL.createObjectURL(
        new Blob([response.data], { type: "application/pdf" }),
      );

      // Abrir el PDF en una nueva pestaña
      window.open(fileURL, "_blank");
    } catch (error) {
      toast.error("Error al generar la Carta Porte");
    }
  };

  const handleSave = async () => {
    if (!trip) return;
    setSaving(true);

    // Aquí preparamos el payload.
    const payload: Partial<Trip> = {
      tarifa_base: Number(tarifaBase),
      costo_casetas: Number(costoCasetas),
    };

    // Usamos la función editTrip de tu hook
    const success = await editTrip(String(trip.id), payload);

    setSaving(false);
    if (success) {
      setIsEditing(false);
      toast.success("Finanzas actualizadas correctamente.");
    }
  };

  if (!trip) return null;

  const totalAnticiposGlobales =
    trip.legs?.reduce(
      (acc, leg) =>
        acc +
        (leg.anticipo_casetas +
          leg.anticipo_combustible +
          leg.anticipo_viaticos +
          leg.otros_anticipos),
      0,
    ) || 0;

  // Calculamos la utilidad basada en si estamos editando o solo viendo
  const utilidadEstimada = isEditing
    ? tarifaBase - totalAnticiposGlobales
    : trip.tarifa_base - totalAnticiposGlobales;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-slate-50 h-[85vh] flex flex-col p-0 overflow-hidden">
        {/* HEADER DEL EXPEDIENTE */}
        <DialogHeader className="p-6 pb-4 bg-white border-b shadow-sm shrink-0">
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle className="text-2xl font-black text-brand-navy flex items-center gap-2">
                <Navigation className="h-6 w-6" />
                Expediente de Servicio #{trip.public_id || trip.id}
              </DialogTitle>
              <DialogDescription className="text-sm font-medium mt-1">
                Cliente:{" "}
                <span className="text-slate-800 font-bold">
                  {trip.client?.razon_social}
                </span>
              </DialogDescription>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge
                variant="outline"
                className="uppercase px-3 py-1 font-bold bg-slate-100 text-slate-600"
              >
                {trip.status.replace("_", " ")}
              </Badge>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs border-indigo-200 text-indigo-700 bg-indigo-50"
                  onClick={handlePrintPDF}
                >
                  Imprimir C. Porte
                </Button>
                {!isEditing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-brand-navy"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit2 className="h-3 w-3 mr-1" /> Editar Finanzas
                  </Button>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* COLUMNA IZQUIERDA: Info General y Finanzas Globales */}
            <div className="md:col-span-1 space-y-6">
              <Card className="shadow-sm border-slate-200">
                <CardHeader className="p-4 pb-2 bg-slate-100/50">
                  <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-emerald-600" /> Ruta
                    Completa
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-2 text-sm space-y-3">
                  <div>
                    <p className="text-xs text-slate-400 font-bold uppercase">
                      Origen
                    </p>
                    <p className="font-semibold text-slate-800">
                      {trip.origin}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-bold uppercase">
                      Destino
                    </p>
                    <p className="font-semibold text-slate-800">
                      {trip.destination}
                    </p>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-xs text-slate-400 font-bold uppercase mb-1">
                      Equipos (No cambian)
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {trip.remolque_1_id ? (
                        <Badge variant="secondary" className="text-xs border">
                          R1: Eco {trip.remolque_1_id}
                        </Badge>
                      ) : null}
                      {trip.dolly_id ? (
                        <Badge variant="secondary" className="text-xs border">
                          Dolly: Eco {trip.dolly_id}
                        </Badge>
                      ) : null}
                      {trip.remolque_2_id ? (
                        <Badge variant="secondary" className="text-xs border">
                          R2: Eco {trip.remolque_2_id}
                        </Badge>
                      ) : null}
                      {!trip.remolque_1_id && (
                        <span className="text-xs text-slate-400 italic">
                          Sin remolques asignados
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* TARJETA FINANCIERA (MODO VISTA O EDICIÓN) */}
              <Card
                className={`shadow-sm border-2 transition-colors ${isEditing ? "border-amber-200 bg-amber-50/10" : "border-emerald-100 bg-emerald-50/30"}`}
              >
                <CardHeader className="p-4 pb-2">
                  <CardTitle
                    className={`text-sm font-bold flex items-center gap-2 ${isEditing ? "text-amber-800" : "text-emerald-800"}`}
                  >
                    <DollarSign className="h-4 w-4" />
                    {isEditing ? "Editando Finanzas" : "Finanzas del Servicio"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-2 text-sm space-y-3">
                  {isEditing ? (
                    // MODO EDICIÓN
                    <div className="space-y-4">
                      <div className="flex items-center justify-between space-x-2 bg-white p-2 rounded-lg border border-amber-100 shadow-sm">
                        <Label
                          htmlFor="manual-prices"
                          className="flex flex-col space-y-1 cursor-pointer text-xs"
                        >
                          <span className="font-bold text-slate-700">
                            Fijar Precios Manuales
                          </span>
                          <span className="font-normal text-slate-500 leading-snug">
                            No re-calcular basado en la tarifa.
                          </span>
                        </Label>
                        <Switch
                          id="manual-prices"
                          checked={mantenerPreciosManuales}
                          onCheckedChange={setMantenerPreciosManuales}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-500">
                          Ingreso (Flete Base)
                        </Label>
                        <Input
                          type="number"
                          value={tarifaBase}
                          onChange={(e) =>
                            setTarifaBase(Number(e.target.value))
                          }
                          className="font-mono"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-500">
                          Cobro Casetas (Al Cliente)
                        </Label>
                        <Input
                          type="number"
                          value={costoCasetas}
                          onChange={(e) =>
                            setCostoCasetas(Number(e.target.value))
                          }
                          className="font-mono"
                        />
                      </div>
                    </div>
                  ) : (
                    // MODO LECTURA
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600 font-medium">
                          Ingreso (Flete):
                        </span>
                        <span className="font-bold text-slate-800">
                          ${trip.tarifa_base.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600 font-medium">
                          Casetas (Cobro):
                        </span>
                        <span className="font-bold text-slate-800">
                          ${(trip.costo_casetas || 0).toLocaleString()}
                        </span>
                      </div>
                    </>
                  )}

                  <Separator
                    className={
                      isEditing ? "bg-amber-200 my-3" : "bg-emerald-200 my-2"
                    }
                  />

                  <div className="flex justify-between items-center text-rose-600">
                    <span className="font-medium">
                      Total Anticipos (Egresos):
                    </span>
                    <span className="font-bold">
                      -${totalAnticiposGlobales.toLocaleString()}
                    </span>
                  </div>

                  <div
                    className={`flex justify-between items-center text-base mt-2 ${isEditing ? "text-amber-700" : "text-emerald-700"}`}
                  >
                    <span className="font-black">Utilidad Bruta Est.:</span>
                    <span className="font-black">
                      ${utilidadEstimada.toLocaleString()}
                    </span>
                  </div>

                  {isEditing && (
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setIsEditing(false)}
                      >
                        <X className="h-4 w-4 mr-1" /> Cancelar
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 bg-brand-navy hover:bg-brand-navy/90 text-white"
                        onClick={handleSave}
                        disabled={saving}
                      >
                        <Save className="h-4 w-4 mr-1" /> Guardar
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* COLUMNA DERECHA: Los Tramos (Legs) */}
            <div className="md:col-span-2 space-y-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  <LinkIcon className="h-5 w-5 text-brand-navy" />
                  Desglose Operativo (Tramos / Desenganches)
                </h3>
              </div>

              {!trip.legs || trip.legs.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-xl border border-dashed text-slate-400 flex flex-col items-center">
                  <AlertCircle className="h-8 w-8 mb-2 opacity-50" />
                  <p>Este viaje no tiene tramos registrados.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {trip.legs.map((leg: TripLeg, index: number) => (
                    <Card
                      key={leg.id}
                      className={`shadow-sm border-l-4 ${leg.status === "entregado" ? "border-l-emerald-500 opacity-80" : "border-l-brand-navy"}`}
                    >
                      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${leg.status === "entregado" ? "bg-emerald-500" : "bg-brand-navy"}`}
                          >
                            {index + 1}
                          </div>
                          <CardTitle className="text-base font-bold uppercase text-slate-800">
                            {leg.leg_type.replace("_", " ")}
                          </CardTitle>
                        </div>
                        <Badge
                          variant="outline"
                          className={`uppercase ${leg.status === "entregado" ? "text-emerald-600 bg-emerald-50 border-emerald-200" : "text-blue-600 bg-blue-50 border-blue-200"}`}
                        >
                          {leg.status}
                        </Badge>
                      </CardHeader>

                      <CardContent className="p-4 pt-2">
                        <div className="grid grid-cols-2 gap-4">
                          {/* Recursos del Tramo */}
                          <div className="space-y-3 bg-slate-50 p-3 rounded-lg border">
                            <div className="flex items-center gap-2">
                              <Truck className="h-4 w-4 text-slate-400" />
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] text-slate-500 font-bold uppercase leading-none">
                                  Tractocamión
                                </p>
                                <p className="text-sm font-bold text-slate-700 truncate">
                                  {leg.unit?.numero_economico || "N/A"}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-slate-400" />
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] text-slate-500 font-bold uppercase leading-none">
                                  Operador
                                </p>
                                <p className="text-sm font-bold text-slate-700 truncate">
                                  {leg.operator?.name || "N/A"}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <CalendarClock className="h-4 w-4 text-slate-400" />
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] text-slate-500 font-bold uppercase leading-none">
                                  Inicio
                                </p>
                                <p className="text-xs font-medium text-slate-600 truncate">
                                  {leg.start_date
                                    ? format(
                                        new Date(leg.start_date),
                                        "dd MMM yyyy HH:mm",
                                        { locale: es },
                                      )
                                    : "N/A"}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Finanzas del Tramo */}
                          <div className="space-y-2 bg-rose-50/50 p-3 rounded-lg border border-rose-100 relative">
                            <p className="text-[10px] text-rose-600 font-bold uppercase flex items-center gap-1 mb-2">
                              <Wallet className="h-3 w-3" /> Anticipos
                              Entregados
                            </p>
                            <div className="flex justify-between text-xs text-slate-600">
                              <span>Casetas:</span>
                              <span className="font-semibold">
                                ${leg.anticipo_casetas.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between text-xs text-slate-600">
                              <span>Diésel:</span>
                              <span className="font-semibold">
                                ${leg.anticipo_combustible.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between text-xs text-slate-600">
                              <span>Viáticos:</span>
                              <span className="font-semibold">
                                ${leg.anticipo_viaticos.toLocaleString()}
                              </span>
                            </div>
                            <Separator className="bg-rose-200 my-1" />
                            <div className="flex justify-between text-sm text-rose-700 font-bold">
                              <span>Total Tramo:</span>
                              <span>
                                $
                                {(
                                  leg.anticipo_casetas +
                                  leg.anticipo_combustible +
                                  leg.anticipo_viaticos
                                ).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
