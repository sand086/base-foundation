import { useState, useEffect } from "react";
import {
  Truck,
  AlertTriangle,
  FileText,
  ChevronLeft,
  Wrench,
  Edit,
  X,
  Save,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate, useParams } from "react-router-dom";
import { TruckChassisSVG } from "@/features/flota/TruckChassisSVG";
import { toast } from "@/hooks/use-toast";
import { unitService, UnidadDetalle } from "@/services/unitService";
import { DocumentUploadManager } from "@/features/flota/DocumentUploadManager";

// Helper Functions

// Helper para badges de fecha
const getDateBadge = (dateStr: string | null | undefined) => {
  if (!dateStr)
    return (
      <Badge variant="outline" className="text-muted-foreground border-dashed">
        Sin Fecha
      </Badge>
    );
  const today = new Date();
  const expDate = new Date(dateStr);
  expDate.setMinutes(expDate.getMinutes() + expDate.getTimezoneOffset());

  const days = Math.ceil(
    (expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (days < 0)
    return (
      <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-200">
        VENCIDO ({days * -1} días)
      </Badge>
    );
  if (days <= 30)
    return (
      <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200">
        POR VENCER ({days} días)
      </Badge>
    );
  return (
    <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-200">
      VIGENTE
    </Badge>
  );
};
// Helper formateo fecha input
const getEstatusFecha = (
  fecha: string | null | undefined,
): "vigente" | "próximo" | "vencido" => {
  if (!fecha) return "vencido";
  const today = new Date();
  const vencimiento = new Date(fecha);
  const days = Math.ceil(
    (vencimiento.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (days < 0) return "vencido";
  if (days <= 30) return "próximo";
  return "vigente";
};

// Convierte cualquier fecha (YYYY-MM-DD o ISO) a formato input date (YYYY-MM-DD)
// Sin alterar estilos ni lógica; solo normaliza el valor.
const toInputDate = (value: string | null | undefined) => {
  if (!value) return "";
  // Si ya viene YYYY-MM-DD...
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  // Formato local YYYY-MM-DD (evita brincos por timezone)
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

export default function FlotaUnidadDetalle() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [unit, setUnit] = useState<UnidadDetalle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  // Form state (se mantiene igual, solo agregamos vigencias)
  const [formData, setFormData] = useState({
    numero_economico: "",
    placas: "",
    vin: "",
    marca: "",
    modelo: "",
    year: "",
    seguro_vence: "",
    verificacion_humo_vence: "",
    verificacion_fisico_mecanica_vence: "",
    caat_vence: "",
    permiso_sct_folio: "",
    caat_folio: "",
  });

  // --- CARGA DE DATOS ---
  useEffect(() => {
    const loadUnit = async () => {
      if (!id) return;
      setIsLoading(true);
      try {
        const apiData = await unitService.getBynumero_economico(id);

        // Construir documentos mapeando snake_case a la estructura UI
        const constructedDocuments = [
          {
            name: "Póliza de Seguro",
            key: "poliza_seguro",
            url: apiData.poliza_seguro_url,
            estatus: getEstatusFecha(apiData.seguro_vence),
            vencimiento: apiData.seguro_vence || "",
            obligatorio: true,
          },
          {
            name: "Verificación de Humo",
            key: "verificacion_humo",
            url: apiData.verificacion_humo_url,
            estatus: getEstatusFecha(apiData.verificacion_humo_vence),
            vencimiento: apiData.verificacion_humo_vence || "",
            obligatorio: true,
          },
          {
            name: "Verificación Físico-Mecánica",
            key: "verificacion_fisico_mecanica",
            url: apiData.verificacion_fisico_mecanica_url,
            estatus: getEstatusFecha(
              apiData.verificacion_fisico_mecanica_vence,
            ),
            vencimiento: apiData.verificacion_fisico_mecanica_vence || "",
            obligatorio: true,
          },
          {
            name: "Tarjeta de Circulación",
            key: "tarjeta_circulacion_folio",
            url: apiData.tarjeta_circulacion_url,
            estatus: "vigente" as const,
            vencimiento: new Date().toISOString(), // Normalmente no vence anual igual que otros
            obligatorio: true,
          },
          {
            name: "Registro CAAT",
            key: "caat",
            url: apiData.caat_url,
            estatus: getEstatusFecha(apiData.caat_vence),
            vencimiento: apiData.caat_vence || "",
            obligatorio: false,
          },
          {
            name: "Permiso SCT",
            key: "permiso_sct",
            url: apiData.permiso_sct_url,
            estatus: "vigente" as const, // Permiso SCT is often permanent or just a folio
            vencimiento: "",
            obligatorio: false,
          },
        ];

        const enrichedUnit: UnidadDetalle = {
          ...apiData,
          documents: constructedDocuments,
          tires: apiData.tires || [],
        };

        setUnit(enrichedUnit);

        // Inicializar formulario con snake_case
        setFormData({
          numero_economico: apiData.numero_economico,
          placas: apiData.placas,
          vin: apiData.vin || "",
          marca: apiData.marca,
          modelo: apiData.modelo,
          year: apiData.year?.toString() || "",
          // ✅ NUEVO: fechas de documentos a formato input date
          seguro_vence: toInputDate(apiData.seguro_vence),
          verificacion_humo_vence: toInputDate(apiData.verificacion_humo_vence),
          verificacion_fisico_mecanica_vence: toInputDate(
            apiData.verificacion_fisico_mecanica_vence,
          ),
          caat_vence: toInputDate(apiData.caat_vence),
        });
      } catch (error) {
        console.error("Error cargando unidad:", error);
        toast({
          title: "Error",
          description: "No se pudo cargar la información de la unidad",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    loadUnit();
  }, [id, navigate]);

  // ✅ Helper: actualiza vencimientos/estatus dentro de unit.documents (para bloqueo/badges)
  const syncUnitDocumentsWithFormDates = (
    currentUnit: UnidadDetalle,
    fd: typeof formData,
  ) => {
    const mapVence: Record<string, string> = {
      poliza_seguro: fd.seguro_vence || "",
      verificacion_humo: fd.verificacion_humo_vence || "",
      verificacion_fisico_mecanica: fd.verificacion_fisico_mecanica_vence || "",
      caat: fd.caat_vence || "",
    };

    const updatedDocs = currentUnit.documents.map((d) => {
      if (!mapVence.hasOwnProperty(d.key)) return d;
      const newVenc = mapVence[d.key];
      return {
        ...d,
        vencimiento: newVenc,
        estatus: getEstatusFecha(newVenc),
      };
    });

    return { ...currentUnit, documents: updatedDocs };
  };

  const handleSaveChanges = async () => {
    if (!unit) return;
    try {
      // Enviar snake_case al backend (igual que antes, solo agregando vigencias)
      await unitService.update(unit.id, {
        numero_economico: formData.numero_economico,
        placas: formData.placas,
        vin: formData.vin,
        marca: formData.marca,
        modelo: formData.modelo,
        year: parseInt(formData.year),

        // ✅ NUEVO: vigencias (si se dejan vacías -> null)
        seguro_vence: formData.seguro_vence ? formData.seguro_vence : null,
        verificacion_humo_vence: formData.verificacion_humo_vence
          ? formData.verificacion_humo_vence
          : null,
        verificacion_fisico_mecanica_vence:
          formData.verificacion_fisico_mecanica_vence
            ? formData.verificacion_fisico_mecanica_vence
            : null,
        caat_vence: formData.caat_vence ? formData.caat_vence : null,
      });

      toast({
        title: "Cambios guardados",
        description: "Datos actualizados correctamente.",
      });

      // Actualizar vista local (igual, pero ahora también sincroniza documentos)
      const updatedUnit: UnidadDetalle = {
        ...unit,
        ...formData,
        year: parseInt(formData.year),
        // Si tu UnidadDetalle NO trae estas props tipadas, puedes removerlas;
        // pero normalmente vienen del backend.
        seguro_vence: formData.seguro_vence || null,
        verificacion_humo_vence: formData.verificacion_humo_vence || null,
        verificacion_fisico_mecanica_vence:
          formData.verificacion_fisico_mecanica_vence || null,
        caat_vence: formData.caat_vence || null,
      } as any;

      setUnit(syncUnitDocumentsWithFormDates(updatedUnit, formData));
      setIsEditing(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron guardar los cambios.",
        variant: "destructive",
      });
    }
  };

  if (isLoading || !unit) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  const expiredDocs = unit.documents.filter((d) => d.estatus === "vencido");
  const hasBlocks = expiredDocs.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/flota")}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Volver
          </Button>
          <Separator orientation="vertical" className="h-8" />
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Truck className="h-6 w-6" /> Unidad {unit.numero_economico}
            </h1>
            <p className="text-muted-foreground">
              {unit.marca} {unit.modelo} - {unit.year}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {hasBlocks && (
            <Badge className="bg-status-danger text-white text-sm py-1 px-3 gap-2">
              <AlertTriangle className="h-4 w-4" /> UNIDAD BLOQUEADA
            </Badge>
          )}
          {!isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="gap-2"
            >
              <Edit className="h-4 w-4" /> Editar
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="expediente" className="w-full">
        <TabsList className="backdrop-blur-xl bg-white/10 dark:bg-black/40 border border-white/20 p-1 rounded-xl grid grid-cols-4">
          <TabsTrigger
            value="expediente"
            className="data-[state=active]:bg-white/20 rounded-lg px-6"
          >
            <FileText className="h-4 w-4 mr-2" /> Expediente Digital
          </TabsTrigger>
          <TabsTrigger
            value="llantas"
            className="data-[state=active]:bg-white/20 rounded-lg px-6"
          >
            <AlertTriangle className="h-4 w-4 mr-2" /> Estado de Llantas (3D)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="expediente" className="mt-6 space-y-6">
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Info Técnica */}
            <Card className="backdrop-blur-xl bg-white/10 dark:bg-black/40 border-white/20 shadow-2xl lg:col-span-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5" /> Información Técnica
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>No. Económico</Label>
                      <Input
                        value={formData.numero_economico}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            numero_economico: e.target.value,
                          })
                        }
                        className="bg-white/5"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Placas</Label>
                      <Input
                        value={formData.placas}
                        onChange={(e) =>
                          setFormData({ ...formData, placas: e.target.value })
                        }
                        className="bg-white/5"
                      />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label>VIN</Label>
                      <Input
                        value={formData.vin}
                        onChange={(e) =>
                          setFormData({ ...formData, vin: e.target.value })
                        }
                        className="bg-white/5"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Marca</Label>
                      <Input
                        list="marcas-list"
                        value={formData.marca}
                        onChange={(e) =>
                          setFormData({ ...formData, marca: e.target.value })
                        }
                        className="bg-white/5"
                        placeholder="Seleccione o escriba"
                      />
                      <datalist id="marcas-list">
                        <option value="Freightliner" />
                        <option value="Kenworth" />
                        <option value="International" />
                        <option value="Volvo" />
                      </datalist>
                    </div>
                    <div className="space-y-2">
                      <Label>Año</Label>
                      <Input
                        type="number"
                        value={formData.year}
                        onChange={(e) =>
                          setFormData({ ...formData, year: e.target.value })
                        }
                        className="bg-white/5"
                      />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label>Modelo</Label>
                      <Input
                        value={formData.modelo}
                        onChange={(e) =>
                          setFormData({ ...formData, modelo: e.target.value })
                        }
                        className="bg-white/5"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        No. Económico
                      </p>
                      <p className="font-bold text-lg">
                        {unit.numero_economico}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Placas</p>
                      <p className="font-bold text-lg">{unit.placas}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">VIN</p>
                      <p className="text-sm">{unit.vin || "---"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Año</p>
                      <p className="font-bold">{unit.year}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">Modelo</p>
                      <p className="font-bold">
                        {unit.marca} {unit.modelo}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Documentos */}

            <Card
              className={`backdrop-blur-xl bg-white/10 dark:bg-black/40 shadow-2xl lg:col-span-8 ${hasBlocks ? "border-status-danger border-2" : "border-white/50"}`}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" /> Estatus de Documentos
                </CardTitle>
              </CardHeader>

              <CardContent className="grid gap-6 md:grid-cols-2">
                {/* Póliza */}
                <DocumentUploadManager
                  unitId={unit.id}
                  unitEconomico={unit.numero_economico}
                  docType="poliza_seguro"
                  docLabel="Póliza de Seguro"
                  currentUrl={unit.poliza_seguro_url}
                  onUploadSuccess={(url) =>
                    setUnit({ ...unit, poliza_seguro_url: url })
                  }
                  statusBadge={getDateBadge(formData.seguro_vence)}
                  dateInput={
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground uppercase font-bold">
                        Vigencia
                      </Label>
                      <Input
                        type="date"
                        className="h-9 text-xs bg-background"
                        value={formData.seguro_vence}
                        disabled={!isEditing}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            seguro_vence: e.target.value,
                          })
                        }
                      />
                    </div>
                  }
                />

                {/* Verificación Humo */}
                <DocumentUploadManager
                  unitId={unit.id}
                  unitEconomico={unit.numero_economico}
                  docType="verificacion_humo"
                  docLabel="Verificación de Emisiones"
                  currentUrl={unit.verificacion_humo_url}
                  onUploadSuccess={(url) =>
                    setUnit({ ...unit, verificacion_humo_url: url })
                  }
                  statusBadge={getDateBadge(formData.verificacion_humo_vence)}
                  dateInput={
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground uppercase font-bold">
                        Vigencia
                      </Label>
                      <Input
                        type="date"
                        className="h-9 text-xs bg-background"
                        value={formData.verificacion_humo_vence}
                        disabled={!isEditing}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            verificacion_humo_vence: e.target.value,
                          })
                        }
                      />
                    </div>
                  }
                />

                {/* Físico Mecánica */}
                <DocumentUploadManager
                  unitId={unit.id}
                  unitEconomico={unit.numero_economico}
                  docType="verificacion_fisico_mecanica"
                  docLabel="Verif. Físico-Mecánica"
                  currentUrl={unit.verificacion_fisico_mecanica_url}
                  onUploadSuccess={(url) =>
                    setUnit({ ...unit, verificacion_fisico_mecanica_url: url })
                  }
                  statusBadge={getDateBadge(
                    formData.verificacion_fisico_mecanica_vence,
                  )}
                  dateInput={
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground uppercase font-bold">
                        Vigencia
                      </Label>
                      <Input
                        type="date"
                        className="h-9 text-xs bg-background"
                        value={formData.verificacion_fisico_mecanica_vence}
                        disabled={!isEditing}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            verificacion_fisico_mecanica_vence: e.target.value,
                          })
                        }
                      />
                    </div>
                  }
                />

                {/* CAAT */}
                <div className="col-span-1">
                  <DocumentUploadManager
                    unitId={unit.id}
                    unitEconomico={unit.numero_economico}
                    docType="caat"
                    docLabel="Registro CAAT"
                    currentUrl={unit.caat_url}
                    onUploadSuccess={(url) =>
                      setUnit({ ...unit, caat_url: url })
                    }
                    statusBadge={getDateBadge(formData.caat_vence)}
                    dateInput={
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground uppercase font-bold">
                          Vigencia
                        </Label>
                        <Input
                          type="date"
                          className="h-9 text-xs bg-background"
                          value={formData.caat_vence}
                          disabled={!isEditing}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              caat_vence: e.target.value,
                            })
                          }
                        />
                      </div>
                    }
                  />
                  {/* Campo Extra para Folio CAAT justo debajo */}
                  <div className="mt-2 flex items-center gap-2 px-1">
                    <Label className="text-xs w-auto whitespace-nowrap text-muted-foreground">
                      Folio CAAT:
                    </Label>
                    <Input
                      className="h-8 text-xs w-full bg-white/5"
                      value={formData.caat_folio}
                      disabled={!isEditing}
                      onChange={(e) =>
                        setFormData({ ...formData, caat_folio: e.target.value })
                      }
                      placeholder="Ingrese folio..."
                    />
                  </div>
                </div>

                {/* Tarjeta Circulación */}
                <DocumentUploadManager
                  unitId={unit.id}
                  unitEconomico={unit.numero_economico}
                  docType="tarjeta_circulacion_folio"
                  docLabel="Tarjeta de Circulación"
                  currentUrl={unit.tarjeta_circulacion_url}
                  onUploadSuccess={(url) =>
                    setUnit({ ...unit, tarjeta_circulacion_url: url })
                  }
                  statusBadge={
                    <Badge
                      variant="outline"
                      className="text-green-600 bg-green-50 border-green-200"
                    >
                      PERMANENTE
                    </Badge>
                  }
                />

                {/* Permiso SCT */}
                <div className="col-span-1">
                  <DocumentUploadManager
                    unitId={unit.id}
                    unitEconomico={unit.numero_economico}
                    docType="permiso_sct"
                    docLabel="Permiso SCT"
                    currentUrl={unit.permiso_sct_url}
                    onUploadSuccess={(url) =>
                      setUnit({ ...unit, permiso_sct_url: url })
                    }
                    statusBadge={
                      <Badge
                        variant="outline"
                        className="text-green-600 bg-green-50 border-green-200"
                      >
                        PERMANENTE
                      </Badge>
                    }
                  />
                  <div className="mt-2 flex items-center gap-2 px-1">
                    <Label className="text-xs w-auto whitespace-nowrap text-muted-foreground">
                      Folio SCT:
                    </Label>
                    <Input
                      className="h-8 text-xs w-full bg-white/5"
                      value={formData.permiso_sct_folio}
                      disabled={!isEditing}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          permiso_sct_folio: e.target.value,
                        })
                      }
                      placeholder="Ingrese folio..."
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabla de Llantas */}
          <Card className="backdrop-blur-xl bg-white/10 dark:bg-black/40 border-white/20 shadow-2xl">
            <CardHeader>
              <CardTitle>Detalle de Llantas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-xl">
                <table className="w-full text-sm">
                  <thead className="bg-white/10">
                    <tr className="text-left">
                      <th className="p-3">Posición</th>
                      <th className="p-3">Marca</th>
                      <th className="p-3">Profundidad</th>
                      <th className="p-3">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unit.tires.length > 0 ? (
                      unit.tires.map((tire, i) => (
                        <tr key={i} className="border-b border-white/5">
                          <td className="p-3">{tire.position}</td>
                          <td className="p-3">{tire.marca || "-"}</td>
                          <td className="p-3">{tire.profundidad} mm</td>
                          <td className="p-3 capitalize">{tire.estado}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={4}
                          className="p-4 text-center text-muted-foreground"
                        >
                          Sin información de llantas
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="llantas" className="mt-6">
          <Card className="backdrop-blur-xl bg-white/10 dark:bg-black/40 border-white/20 shadow-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" /> Visualización 3D
              </CardTitle>
            </CardHeader>
            <CardContent className="py-8">
              <TruckChassisSVG tires={unit.tires} unitType="sencillo" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Barra flotante de guardado */}
      {isEditing && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="backdrop-blur-xl bg-black/80 border border-white/20 rounded-2xl shadow-2xl p-4 flex items-center gap-4">
            <p className="text-sm text-muted-foreground px-4">
              Editando unidad {formData.numero_economico}
            </p>
            <Separator orientation="vertical" className="h-8" />
            <Button
              variant="ghost"
              onClick={() => {
                // ✅ Cancelar: revierte fechas a lo que tiene unit (sin recargar)
                setFormData({
                  numero_economico: unit.numero_economico,
                  placas: unit.placas,
                  vin: unit.vin || "",
                  marca: unit.marca,
                  modelo: unit.modelo,
                  year: unit.year?.toString() || "",
                  seguro_vence: toInputDate((unit as any).seguro_vence),
                  verificacion_humo_vence: toInputDate(
                    (unit as any).verificacion_humo_vence,
                  ),
                  verificacion_fisico_mecanica_vence: toInputDate(
                    (unit as any).verificacion_fisico_mecanica_vence,
                  ),
                  caat_vence: toInputDate((unit as any).caat_vence),
                });
                setIsEditing(false);
              }}
              className="gap-2"
            >
              <X className="h-4 w-4" /> Cancelar
            </Button>
            <Button onClick={handleSaveChanges} className="gap-2">
              <Save className="h-4 w-4" /> Guardar Cambios
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
