import { useState } from "react";
import {
  Truck,
  AlertTriangle,
  FileText,
  Calendar,
  Shield,
  ChevronLeft,
  Wrench,
  Edit,
  X,
  Save,
  Upload,
  Check,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate, useParams } from "react-router-dom";
import { mockUnit } from "@/data/mockData";
import { TruckChassisSVG } from "@/features/flota/TruckChassisSVG";
import { toast } from "@/hooks/use-toast";

const getDocumentStatusBadge = (estatus: string, vencimiento: string) => {
  const today = new Date();
  const expDate = new Date(vencimiento);
  const daysUntil = Math.ceil(
    (expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (estatus === "vencido" || daysUntil < 0) {
    return <Badge className="bg-status-danger text-white">VENCIDO</Badge>;
  }
  if (estatus === "próximo" || daysUntil <= 30) {
    return (
      <Badge className="bg-status-warning text-black">
        POR VENCER ({daysUntil}d)
      </Badge>
    );
  }
  return <Badge className="bg-status-success text-white">VIGENTE</Badge>;
};

export default function FlotaUnidadDetalle() {
  const navigate = useNavigate();
  const { id } = useParams();

  // Editing state
  const [isEditing, setIsEditing] = useState(false);

  // Form state (pre-filled with mock data)
  const [formData, setFormData] = useState({
    numeroEconomico: mockUnit.numeroEconomico,
    placas: mockUnit.placas,
    vin: mockUnit.vin,
    marca: mockUnit.marca,
    modelo: mockUnit.modelo,
    year: mockUnit.year.toString(),
  });

  // In production, fetch by ID. For now, use mock data
  const unit = mockUnit;

  const expiredDocs = unit.documents.filter((d) => d.estatus === "vencido");
  const hasBlocks = expiredDocs.length > 0;

  const handleSaveChanges = () => {
    toast({
      title: "✓ Cambios guardados",
      description: `Los datos de la unidad ${formData.numeroEconomico} han sido actualizados correctamente.`,
    });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    // Reset form to original values
    setFormData({
      numeroEconomico: mockUnit.numeroEconomico,
      placas: mockUnit.placas,
      vin: mockUnit.vin,
      marca: mockUnit.marca,
      modelo: mockUnit.modelo,
      year: mockUnit.year.toString(),
    });
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/flota")}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Volver
          </Button>
          <Separator orientation="vertical" className="h-8" />
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Truck className="h-6 w-6" /> Unidad {unit.numeroEconomico}
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

      {/* Tabs Container */}
      <Tabs defaultValue="expediente" className="w-full">
        <TabsList className="backdrop-blur-xl bg-white/10 dark:bg-black/40 border border-white/20 p-1 rounded-xl">
          <TabsTrigger
            value="expediente"
            className="data-[state=active]:bg-white/20 data-[state=active]:backdrop-blur-xl rounded-lg px-6"
          >
            <FileText className="h-4 w-4 mr-2" />
            Expediente Digital
          </TabsTrigger>
          <TabsTrigger
            value="llantas"
            className="data-[state=active]:bg-white/20 data-[state=active]:backdrop-blur-xl rounded-lg px-6"
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Estado de Llantas (3D)
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Expediente Digital */}
        <TabsContent value="expediente" className="mt-6 space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Technical Information Card */}
            <Card className="backdrop-blur-xl bg-white/10 dark:bg-black/40 border-white/20 shadow-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5" /> Información Técnica
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="numeroEconomico">No. Económico</Label>
                      <Input
                        id="numeroEconomico"
                        value={formData.numeroEconomico}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            numeroEconomico: e.target.value,
                          })
                        }
                        className="backdrop-blur-xl bg-white/5 border-white/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="placas">Placas</Label>
                      <Input
                        id="placas"
                        value={formData.placas}
                        onChange={(e) =>
                          setFormData({ ...formData, placas: e.target.value })
                        }
                        className="backdrop-blur-xl bg-white/5 border-white/20 font-mono"
                      />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="vin">VIN</Label>
                      <Input
                        id="vin"
                        value={formData.vin}
                        onChange={(e) =>
                          setFormData({ ...formData, vin: e.target.value })
                        }
                        className="backdrop-blur-xl bg-white/5 border-white/20 font-mono"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="marca">Marca</Label>
                      <Select
                        value={formData.marca}
                        onValueChange={(value) =>
                          setFormData({ ...formData, marca: value })
                        }
                      >
                        <SelectTrigger className="backdrop-blur-xl bg-white/5 border-white/20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Freightliner">
                            Freightliner
                          </SelectItem>
                          <SelectItem value="Kenworth">Kenworth</SelectItem>
                          <SelectItem value="International">
                            International
                          </SelectItem>
                          <SelectItem value="Volvo">Volvo</SelectItem>
                          <SelectItem value="Peterbilt">Peterbilt</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="year">Año</Label>
                      <Input
                        id="year"
                        type="number"
                        value={formData.year}
                        onChange={(e) =>
                          setFormData({ ...formData, year: e.target.value })
                        }
                        className="backdrop-blur-xl bg-white/5 border-white/20"
                      />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="modelo">Modelo</Label>
                      <Input
                        id="modelo"
                        value={formData.modelo}
                        onChange={(e) =>
                          setFormData({ ...formData, modelo: e.target.value })
                        }
                        className="backdrop-blur-xl bg-white/5 border-white/20"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        No. Económico
                      </p>
                      <p className="font-bold text-lg text-foreground/90">
                        {unit.numeroEconomico}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Placas</p>
                      <p className="font-mono font-bold text-lg text-foreground/90">
                        {unit.placas}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">VIN</p>
                      <p className="font-mono text-sm text-foreground/90">
                        {unit.vin}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Año</p>
                      <p className="font-bold text-foreground/90">
                        {unit.year}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">Modelo</p>
                      <p className="font-bold text-foreground/90">
                        {unit.marca} {unit.modelo}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Document Status Card */}
            <Card
              className={`backdrop-blur-xl bg-white/10 dark:bg-black/40 shadow-2xl ${
                hasBlocks
                  ? "border-status-danger border-2"
                  : "border-white/20"
              }`}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" /> Estatus de Documentos
                  {hasBlocks && (
                    <Badge className="bg-status-danger text-white ml-auto">
                      {expiredDocs.length} VENCIDO(S)
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {unit.documents.map((doc, idx) => (
                    <div
                      key={idx}
                      className={`group relative flex items-center justify-between p-4 rounded-xl backdrop-blur-xl border transition-all duration-200 hover:scale-[1.01] ${
                        doc.estatus === "vencido"
                          ? "bg-status-danger/10 border-status-danger/50"
                          : "bg-white/5 border-white/10 hover:bg-white/10"
                      }`}
                    >
                      {/* Status indicator dot */}
                      <div
                        className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full ${
                          doc.estatus === "vencido"
                            ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"
                            : doc.estatus === "próximo"
                            ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                            : "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                        }`}
                      />

                      <div className="flex items-center gap-3 ml-3">
                        {doc.obligatorio && (
                          <Shield
                            className={`h-4 w-4 ${
                              doc.estatus === "vencido"
                                ? "text-status-danger"
                                : "text-muted-foreground"
                            }`}
                          />
                        )}
                        <div>
                          <p className="font-medium">{doc.name}</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Vence:{" "}
                            {new Date(doc.vencimiento).toLocaleDateString(
                              "es-MX"
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isEditing && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity gap-1"
                          >
                            <Upload className="h-3 w-3" /> Reemplazar
                          </Button>
                        )}
                        {getDocumentStatusBadge(doc.estatus, doc.vencimiento)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tire Details Table */}
          <Card className="backdrop-blur-xl bg-white/10 dark:bg-black/40 border-white/20 shadow-2xl">
            <CardHeader>
              <CardTitle>Detalle de Llantas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-xl">
                <table className="w-full">
                  <thead className="sticky top-0 z-10 backdrop-blur-xl bg-white/20 dark:bg-black/40">
                    <tr className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      <th className="py-4 px-4">Posición</th>
                      <th className="py-4 px-4">ID Llanta</th>
                      <th className="py-4 px-4">Marca</th>
                      <th className="py-4 px-4">Profundidad</th>
                      <th className="py-4 px-4">Semáforo</th>
                      <th className="py-4 px-4">Estado</th>
                      <th className="py-4 px-4">Renovados</th>
                      <th className="py-4 px-4">Marcaje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unit.tires.map((tire) => {
                      const isCritical = tire.profundidad < 3;
                      const isWarning =
                        tire.profundidad >= 3 && tire.profundidad <= 6;
                      return (
                        <tr
                          key={tire.id}
                          className={`border-b border-white/5 hover:bg-white/5 transition-colors ${
                            isCritical ? "bg-red-500/5" : ""
                          }`}
                        >
                          <td className="py-4 px-4 font-medium">
                            {tire.position}
                          </td>
                          <td className="py-4 px-4 font-mono text-sm">
                            {tire.id}
                          </td>
                          <td className="py-4 px-4">{tire.marca}</td>
                          <td className="py-4 px-4 font-bold">
                            {tire.profundidad} mm
                          </td>
                          <td className="py-4 px-4">
                            <Badge
                              className={
                                isCritical
                                  ? "bg-red-500/20 text-red-400 border border-red-500/50"
                                  : isWarning
                                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/50"
                                  : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50"
                              }
                            >
                              {isCritical
                                ? "Crítico"
                                : isWarning
                                ? "Alerta"
                                : "OK"}
                            </Badge>
                          </td>
                          <td className="py-4 px-4 capitalize">{tire.estado}</td>
                          <td className="py-4 px-4">
                            {tire.renovado > 0 ? `${tire.renovado}x` : "—"}
                          </td>
                          <td className="py-4 px-4 font-mono text-xs">
                            {tire.marcajeInterno}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Estado de Llantas 3D */}
        <TabsContent value="llantas" className="mt-6">
          <Card className="backdrop-blur-xl bg-white/10 dark:bg-black/40 border-white/20 shadow-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Visualización de Llantas - Vista Inferior (Worm's-Eye)
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Pasa el cursor sobre cada llanta para ver detalles. Los colores
                indican el nivel de desgaste.
              </p>
            </CardHeader>
            <CardContent className="py-8">
              <TruckChassisSVG tires={unit.tires} unitType="sencillo" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Floating Action Bar (only visible when editing) */}
      {isEditing && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="backdrop-blur-xl bg-black/80 border border-white/20 rounded-2xl shadow-2xl p-4 flex items-center gap-4">
            <p className="text-sm text-muted-foreground px-4">
              Editando unidad {formData.numeroEconomico}
            </p>
            <Separator orientation="vertical" className="h-8" />
            <Button
              variant="ghost"
              onClick={handleCancelEdit}
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
