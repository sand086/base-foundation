import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  AlertTriangle,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Upload,
  Package,
  Truck,
  Box,
  Container,
  MapPin,
  FileText,
  Scale,
  Database,
  FileSpreadsheet,
  ClipboardList,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Solo importamos el hook (ya no importamos SatProduct para que sea 100% dinámico)
import { useSatCatalogs } from "@/features/settings/hooks/useSatCatalogs";

// ==========================================
// INTERFACES ESTRICTAS (Para evitar errores TS)
// ==========================================
type CatalogField = {
  key: string;
  label: string;
};

type CatalogDef = {
  id: string;
  endpoint: string;
  name: string;
  icon: React.ElementType; // Tipado correcto para los iconos de Lucide
  fields: CatalogField[];
};

// ==========================================
// DEFINICIÓN DINÁMICA DE LOS 13 CATÁLOGOS
// ==========================================
const SAT_CATALOGS: CatalogDef[] = [
  {
    id: "sat-products",
    endpoint: "sat-products",
    name: "Productos y Servicios",
    icon: Package,
    fields: [
      { key: "clave", label: "Clave" },
      { key: "descripcion", label: "Descripción" },
      { key: "es_material_peligroso", label: "Mat. Peligroso" },
    ],
  },
  {
    id: "sat-services",
    endpoint: "sat-services",
    name: "Tipos de Servicio",
    icon: Truck,
    fields: [
      { key: "clave", label: "Clave" },
      { key: "descripcion", label: "Descripción" },
    ],
  },
  {
    id: "sat-cargo-types",
    endpoint: "sat-cargo-types",
    name: "Tipos de Carga",
    icon: Box,
    fields: [
      { key: "clave", label: "Clave" },
      { key: "descripcion", label: "Descripción" },
    ],
  },
  {
    id: "sat-trailer-subtypes",
    endpoint: "sat-trailer-subtypes",
    name: "Subtipos de Remolque",
    icon: Container,
    fields: [
      { key: "clave", label: "Clave" },
      { key: "descripcion", label: "Descripción" },
    ],
  },
  {
    id: "sat-truck-configs",
    endpoint: "sat-truck-configs",
    name: "Config. Autotransporte",
    icon: Truck,
    fields: [
      { key: "clave", label: "Clave" },
      { key: "descripcion", label: "Descripción" },
      { key: "ejes", label: "Ejes" },
      { key: "llantas", label: "Llantas" },
    ],
  },
  {
    id: "sat-municipalities",
    endpoint: "sat-municipalities",
    name: "Municipios",
    icon: MapPin,
    fields: [
      { key: "clave", label: "Clave" },
      { key: "estado_clave", label: "Estado" },
      { key: "descripcion", label: "Descripción" },
    ],
  },
  {
    id: "sat-localities",
    endpoint: "sat-localities",
    name: "Localidades",
    icon: MapPin,
    fields: [
      { key: "clave", label: "Clave" },
      { key: "estado_clave", label: "Estado" },
      { key: "descripcion", label: "Descripción" },
    ],
  },
  {
    id: "sat-neighborhoods",
    endpoint: "sat-neighborhoods",
    name: "Colonias",
    icon: MapPin,
    fields: [
      { key: "clave", label: "Clave" },
      { key: "codigo_postal", label: "C.P." },
      { key: "nombre", label: "Nombre" },
    ],
  },
  {
    id: "sat-permit-types",
    endpoint: "sat-permit-types",
    name: "Tipos de Permiso",
    icon: FileText,
    fields: [
      { key: "clave", label: "Clave" },
      { key: "descripcion", label: "Descripción" },
      { key: "clave_transporte", label: "Transporte" },
    ],
  },
  {
    id: "sat-packaging-types",
    endpoint: "sat-packaging-types",
    name: "Tipos de Embalaje",
    icon: Box,
    fields: [
      { key: "clave", label: "Clave" },
      { key: "descripcion", label: "Descripción" },
    ],
  },
  {
    id: "sat-hazardous-materials",
    endpoint: "sat-hazardous-materials",
    name: "Materiales Peligrosos",
    icon: AlertTriangle,
    fields: [
      { key: "clave", label: "Clave" },
      { key: "descripcion", label: "Descripción" },
      { key: "clase_div", label: "Clase Div" },
    ],
  },
  {
    id: "sat-stations",
    endpoint: "sat-stations",
    name: "Estaciones y Puertos",
    icon: MapPin,
    fields: [
      { key: "clave_identificacion", label: "Clave Ident." },
      { key: "descripcion", label: "Descripción" },
      { key: "clave_transporte", label: "Transporte" },
      { key: "nacionalidad", label: "Nacionalidad" },
    ],
  },
  {
    id: "sat-unit-weights",
    endpoint: "sat-unit-weights",
    name: "Unidades de Medida",
    icon: Scale,
    fields: [
      { key: "clave", label: "Clave" },
      { key: "nombre", label: "Nombre" },
      { key: "descripcion", label: "Descripción" },
      { key: "simbolo", label: "Símbolo" },
    ],
  },
];

export function SatCatalogsConfig() {
  const { fetchCatalog, saveItem, deleteItem } = useSatCatalogs();

  const [activeCatalogId, setActiveCatalogId] = useState<string>(
    SAT_CATALOGS[0].id,
  );
  const activeCatalog = useMemo(
    () => SAT_CATALOGS.find((c) => c.id === activeCatalogId)!,
    [activeCatalogId],
  );

  // Usamos Record<string, any> para no amarrarnos a un tipo estricto y permitir dinamismo
  const [localData, setLocalData] = useState<Record<string, any>[]>([]);
  const [isFetching, setIsFetching] = useState(false);

  // Estados Tabla y Multi-select
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);

  // Estados Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Record<string, any> | null>(
    null,
  );
  const [deleteIdsConfig, setDeleteIdsConfig] = useState<number[] | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ==========================================
  // CARGAR DATOS DEL CATÁLOGO ACTIVO
  // ==========================================
  const loadData = async () => {
    setIsFetching(true);
    setSelectedIds([]);
    try {
      const data = await fetchCatalog(activeCatalog.endpoint);
      setLocalData(data || []);
    } catch (e) {
      setLocalData([]);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    loadData();
    setSearchTerm("");
    setCurrentPage(1);
    setSortConfig(null);
  }, [activeCatalogId]);

  // ==========================================
  // FILTRADO Y PAGINACIÓN
  // ==========================================
  const processedData = useMemo(() => {
    let result = [...localData];

    if (searchTerm) {
      const lowercasedTerm = searchTerm.toLowerCase();
      result = result.filter((item) =>
        activeCatalog.fields.some((f) =>
          String(item[f.key] || "")
            .toLowerCase()
            .includes(lowercasedTerm),
        ),
      );
    }

    if (sortConfig !== null) {
      result.sort((a, b) => {
        const aValue = String(a[sortConfig.key] || "").toLowerCase();
        const bValue = String(b[sortConfig.key] || "").toLowerCase();
        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [localData, searchTerm, sortConfig, activeCatalog]);

  const totalPages =
    pageSize === 0 ? 1 : Math.ceil(processedData.length / pageSize);
  const paginatedData = useMemo(() => {
    if (pageSize === 0) return processedData;
    const startIndex = (currentPage - 1) * pageSize;
    return processedData.slice(startIndex, startIndex + pageSize);
  }, [processedData, currentPage, pageSize]);

  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "asc"
    ) {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  // ==========================================
  // MULTI-SELECT
  // ==========================================
  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedData.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedData.map((item) => item.id));
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  // ==========================================
  // EXPORTAR Y DESCARGAR PLANTILLAS CSV
  // ==========================================

  // Descarga los datos que se están viendo actualmente en la tabla
  const handleExportCSV = () => {
    if (processedData.length === 0)
      return toast.info("No hay datos para exportar");

    const headers = activeCatalog.fields.map((f) => f.label).join(",");
    const rows = processedData
      .map((item) =>
        activeCatalog.fields
          .map((f) => `"${String(item[f.key] || "").replace(/"/g, '""')}"`)
          .join(","),
      )
      .join("\n");

    const csvContent = headers + "\n" + rows;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${activeCatalog.id}_exportado.csv`;
    link.click();

    toast.success("Archivo Excel/CSV descargado");
  };

  // Descarga una plantilla vacía con los encabezados correspondientes al catálogo activo
  const handleDownloadTemplate = () => {
    const headers = activeCatalog.fields.map((f) => f.label).join(",");
    const blob = new Blob([headers + "\n"], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Plantilla_${activeCatalog.name.replace(/ /g, "_")}.csv`;
    link.click();

    toast.success(`Plantilla descargada para ${activeCatalog.name}`);
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    toast.info("Procesando archivo CSV...");
    const text = await file.text();
    const rows = text.split("\n").filter((row) => row.trim().length > 0);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 1; i < rows.length; i++) {
      const columns = rows[i].split(",");
      const payload: Record<string, any> = {};

      activeCatalog.fields.forEach((field, index) => {
        const val = columns[index]?.replace(/"/g, "").trim() || "";
        // Si el campo espera un número (ejes, llantas), lo parseamos
        if (field.key === "ejes" || field.key === "llantas") {
          payload[field.key] = val ? parseInt(val) : null;
        } else {
          payload[field.key] = val;
        }
      });

      if (payload[activeCatalog.fields[0].key]) {
        try {
          await saveItem(activeCatalog.endpoint, payload);
          successCount++;
        } catch (err) {
          errorCount++;
        }
      }
    }

    toast.success(
      `Carga masiva finalizada. Éxitos: ${successCount}. Errores/Duplicados: ${errorCount}`,
    );
    loadData();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ==========================================
  // HANDLERS CRUD
  // ==========================================
  const handleOpenNew = () => {
    setEditingItem(null);
    const initialData: Record<string, any> = { id: 0 };
    activeCatalog.fields.forEach((f) => (initialData[f.key] = ""));
    setFormData(initialData);
    setIsModalOpen(true);
  };

  const handleEdit = (item: Record<string, any>) => {
    setEditingItem(item);
    setFormData({ ...item });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    const primaryKey = activeCatalog.fields[0].key;
    if (!formData[primaryKey]?.toString().trim()) {
      toast.error(`El campo ${activeCatalog.fields[0].label} es obligatorio`);
      return;
    }

    try {
      await saveItem(activeCatalog.endpoint, formData);
      toast.success(
        editingItem ? "Registro actualizado" : "Registro agregado con éxito",
      );
      setIsModalOpen(false);
      loadData();
    } catch (error: any) {
      toast.error(
        error.response?.data?.detail || "Error al guardar el registro",
      );
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteIdsConfig) return;
    try {
      for (const id of deleteIdsConfig) {
        await deleteItem(activeCatalog.endpoint, id);
      }
      toast.success(
        `Se eliminaron ${deleteIdsConfig.length} registros exitosamente.`,
      );
      setSelectedIds([]);
      loadData();
    } catch (error: any) {
      toast.error(
        error.response?.data?.detail || "Error al eliminar algunos registros",
      );
    } finally {
      setDeleteIdsConfig(null);
    }
  };

  const ActiveIcon = activeCatalog.icon;

  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-8 animate-in fade-in">
        {/* ================================
            PANEL IZQUIERDO (MENÚ CATÁLOGOS)
        ================================= */}
        <Card className="lg:col-span-3 border-slate-200 shadow-sm rounded-2xl h-fit">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
            <CardTitle className="flex items-center gap-2 text-brand-navy text-sm font-black uppercase tracking-widest">
              <Database className="h-4 w-4 text-emerald-600" /> Catálogos SAT
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <ScrollArea className="h-[60vh]">
              <div className="flex flex-col gap-1 pr-3 pt-2">
                {SAT_CATALOGS.map((catalog) => {
                  const Icon = catalog.icon;
                  const isActive = activeCatalogId === catalog.id;
                  return (
                    <button
                      key={catalog.id}
                      onClick={() => setActiveCatalogId(catalog.id)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all font-bold text-xs uppercase tracking-wider",
                        isActive
                          ? "bg-brand-navy text-white shadow-md scale-[1.02]"
                          : "text-slate-600 hover:bg-slate-100 hover:text-brand-navy",
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          isActive ? "text-emerald-400" : "text-slate-400",
                        )}
                      />
                      <span className="truncate">{catalog.name}</span>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* ================================
            PANEL DERECHO (TABLA INTERACTIVA)
        ================================= */}
        <Card className="lg:col-span-9 border-slate-200 shadow-sm rounded-2xl overflow-hidden flex flex-col h-[75vh]">
          <CardHeader className="bg-white border-b border-slate-100 pb-4 shrink-0">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-black text-brand-navy flex items-center gap-2 uppercase tracking-tighter">
                  <ActiveIcon className="h-6 w-6 text-emerald-500" />{" "}
                  {activeCatalog.name}
                </CardTitle>
                <CardDescription className="font-medium mt-1 uppercase text-[10px] tracking-widest">
                  Administra y configura los datos para facturación y carta
                  porte.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                />
                <Button
                  variant="outline"
                  onClick={handleDownloadTemplate}
                  className="rounded-xl border-amber-200 text-amber-700 bg-amber-50/50 hover:bg-amber-100 h-10 font-bold uppercase tracking-widest text-[10px] haptic-press"
                  title="Descargar Layout (Plantilla) vacío"
                >
                  <ClipboardList className="h-4 w-4 mr-2" /> Plantilla
                </Button>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-xl border-blue-200 text-blue-700 bg-blue-50/50 hover:bg-blue-100 h-10 font-bold uppercase tracking-widest text-[10px] haptic-press"
                >
                  <Upload className="h-4 w-4 mr-2" /> Importar CSV
                </Button>
                <Button
                  variant="outline"
                  onClick={handleExportCSV}
                  className="rounded-xl border-emerald-200 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100 h-10 font-bold uppercase tracking-widest text-[10px] haptic-press"
                  disabled={processedData.length === 0}
                >
                  <Download className="h-4 w-4 mr-2" /> Exportar
                </Button>
                <Button
                  onClick={handleOpenNew}
                  className="bg-brand-navy hover:bg-brand-navy/90 text-white rounded-xl h-10 font-black uppercase tracking-widest text-[10px] shadow-md haptic-press"
                >
                  <Plus className="h-4 w-4 mr-2" /> Nuevo Registro
                </Button>
              </div>
            </div>

            {/* Barra de Búsqueda y Acciones Multi-select */}
            <div className="flex items-center justify-between pt-4">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar en este catálogo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-11 rounded-xl bg-slate-50 border-slate-200 font-medium"
                />
              </div>

              {selectedIds.length > 0 && (
                <Button
                  variant="destructive"
                  onClick={() => setDeleteIdsConfig(selectedIds)}
                  className="rounded-xl font-black uppercase text-[10px] tracking-widest h-11 px-6 shadow-rose-600/20 bg-rose-600 hover:bg-rose-700 animate-in fade-in zoom-in-95 haptic-press"
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Eliminar (
                  {selectedIds.length})
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-0 flex-1 overflow-hidden flex flex-col bg-slate-50/30">
            {isFetching ? (
              <div className="flex-1 flex justify-center items-center text-emerald-600">
                <Loader2 className="h-10 w-10 animate-spin" />
              </div>
            ) : processedData.length === 0 ? (
              // ESTADO VACÍO
              <div className="flex-1 flex flex-col justify-center items-center text-slate-400 p-8 text-center animate-in fade-in">
                <FileSpreadsheet className="h-16 w-16 mb-4 opacity-20 text-blue-500" />
                <p className="font-bold text-lg uppercase tracking-tighter text-slate-600">
                  Catálogo Vacío
                </p>
                <p className="text-xs mt-1 uppercase tracking-widest mb-6">
                  No hay registros. Descarga la plantilla para importar en masa.
                </p>
              </div>
            ) : (
              <ScrollArea className="flex-1">
                <Table>
                  <TableHeader className="bg-white sticky top-0 z-10 shadow-sm border-b border-slate-200">
                    <TableRow>
                      <TableHead className="w-[50px] text-center">
                        <Checkbox
                          checked={
                            selectedIds.length === paginatedData.length &&
                            paginatedData.length > 0
                          }
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      {activeCatalog.fields.map((field) => (
                        <TableHead
                          key={field.key}
                          className="font-black text-[10px] uppercase tracking-widest text-slate-500 cursor-pointer hover:text-brand-navy"
                          onClick={() => handleSort(field.key)}
                        >
                          <div className="flex items-center gap-1">
                            {field.label}{" "}
                            <ArrowUpDown className="h-3 w-3 opacity-50" />
                          </div>
                        </TableHead>
                      ))}
                      <TableHead className="w-[100px] text-right font-black text-[10px] uppercase tracking-widest text-slate-500">
                        Acciones
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.map((item) => (
                      <TableRow
                        key={item.id}
                        className={cn(
                          "hover:bg-slate-50/80 transition-colors",
                          selectedIds.includes(item.id) && "bg-emerald-50/50",
                        )}
                      >
                        <TableCell className="text-center">
                          <Checkbox
                            checked={selectedIds.includes(item.id)}
                            onCheckedChange={() => toggleSelect(item.id)}
                          />
                        </TableCell>
                        {activeCatalog.fields.map((field, idx) => (
                          <TableCell
                            key={field.key}
                            className={cn(
                              "text-xs py-3",
                              idx === 0
                                ? "font-mono font-bold text-emerald-700"
                                : "text-slate-600 font-medium",
                            )}
                          >
                            {item[field.key] || "—"}
                          </TableCell>
                        ))}
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-400 hover:text-blue-600 haptic-press"
                              onClick={() => handleEdit(item)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 haptic-press"
                              onClick={() => setDeleteIdsConfig([item.id])}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>

          {/* FOOTER DE PAGINACIÓN */}
          {processedData.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-slate-100 bg-white gap-4 shrink-0">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
                <span>Mostrar</span>
                <select
                  className="border border-slate-200 rounded-lg p-1.5 bg-slate-50 text-brand-navy outline-none cursor-pointer"
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                >
                  <option value={10}>10</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={0}>Todas</option>
                </select>
              </div>
              <div className="text-[10px] uppercase font-black tracking-widest text-slate-400">
                Mostrando {paginatedData.length} de {processedData.length}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-lg haptic-press"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1 || pageSize === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs font-black text-brand-navy min-w-[3rem] text-center">
                  {pageSize === 0 ? 1 : currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-lg haptic-press"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages || pageSize === 0}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md border-none shadow-2xl bg-card/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tighter text-brand-navy">
              {editingItem ? "Editar Registro" : "Nuevo Registro"}
            </DialogTitle>
            <DialogDescription className="text-xs font-bold uppercase tracking-widest">
              Catálogo:{" "}
              <span className="text-emerald-600">{activeCatalog.name}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            {activeCatalog.fields.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  {field.label}{" "}
                  {field.key === activeCatalog.fields[0].key && "*"}
                </Label>
                <Input
                  value={formData[field.key] || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, [field.key]: e.target.value })
                  }
                  className={cn(
                    "h-11 shadow-sm font-medium border-slate-200 focus-visible:ring-emerald-500",
                    field.key === activeCatalog.fields[0].key &&
                      "font-mono uppercase",
                  )}
                  placeholder={`Ej: Ingresar ${field.label.toLowerCase()}`}
                  // Soporte numérico
                  type={
                    field.key === "ejes" || field.key === "llantas"
                      ? "number"
                      : "text"
                  }
                />
              </div>
            ))}
          </div>

          <DialogFooter className="pt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsModalOpen(false)}
              className="rounded-xl font-bold uppercase tracking-widest text-[10px] haptic-press"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              className="bg-brand-navy hover:bg-brand-navy/90 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-md haptic-press"
            >
              {editingItem ? "Guardar Cambios" : "Agregar Registro"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteIdsConfig}
        onOpenChange={() => setDeleteIdsConfig(null)}
      >
        <AlertDialogContent className="rounded-2xl sm:max-w-md border-none shadow-2xl bg-white/95 backdrop-blur-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black uppercase tracking-tighter text-rose-600 flex items-center gap-2">
              <AlertTriangle className="h-6 w-6" /> ¿Eliminar Registros?
            </AlertDialogTitle>
            <AlertDialogDescription className="font-medium text-slate-600 mt-2">
              Estás a punto de eliminar{" "}
              <b className="text-rose-600 font-black">
                {deleteIdsConfig?.length}
              </b>{" "}
              registro(s) del catálogo <b>{activeCatalog.name}</b>.
              <br />
              <br />
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="rounded-xl font-bold uppercase tracking-widest text-[10px] h-11 haptic-press">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black uppercase tracking-widest text-[10px] h-11 px-6 border-none shadow-md haptic-press"
            >
              Sí, Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
