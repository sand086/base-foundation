// src/features/cxp/SuppliersCatalog.tsx
import { useMemo, useState } from "react";
import {
  Search,
  Plus,
  Eye,
  Edit,
  MoreHorizontal,
  Trash2,
  AlertTriangle,
} from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
// 👇 Importamos el componente Badge que nos compartiste
import { Badge } from "@/components/ui/badge";
import {
  DataTable,
  DataTableHeader,
  DataTableBody,
  DataTableRow,
  DataTableHead,
  DataTableCell,
} from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

import { SupplierModal } from "@/features/suppliers/components/SupplierModal";
import { SupplierDetailSheet } from "@/features/suppliers/components/SupplierDetailSheet";
import { useSuppliers } from "@/features/suppliers/hooks/useSuppliers";
import { Supplier } from "@/features/suppliers/types";
import { useSystemConfig } from "@/features/settings/hooks/useSystemConfig";
import { useCostCenters } from "@/features/costCenters/hooks/useCostCenters";
import { cn } from "@/lib/utils";

const safeLower = (v: unknown) =>
  typeof v === "string" ? v.toLowerCase() : "";

// 👇 FUNCIÓN AUXILIAR PARA MAPEAR EL COLOR SEGÚN EL CÓDIGO DEL CECO
const getCecoBadgeVariant = (codigo?: string) => {
  if (!codigo) return "neutral";

  const code = codigo.toUpperCase();

  // Agrupamos los códigos de CECO por la familia de color que mejor los represente
  if (["ADMIN", "COMBAN"].includes(code)) return "info";
  if (["MTTO", "LLANTAS", "ADQ"].includes(code)) return "warning";
  if (["DIESEL", "CASETAS"].includes(code)) return "neutral";
  if (["PERSONAL", "SEG", "SEGUROS"].includes(code)) return "success";

  return "default"; // Fallback por defecto
};

export default function SuppliersCatalog() {
  const { valueAsNumber: defaultCredito } = useSystemConfig(
    "dias_credito_default",
  );

  const { costCenters } = useCostCenters();

  const {
    suppliers,
    isLoadingSuppliers,
    createSupplier,
    updateSupplier,
    deleteSupplier,
  } = useSuppliers();

  const [searchCatalog, setSearchCatalog] = useState("");

  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isSupplierDetailOpen, setIsSupplierDetailOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(
    null,
  );
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(
    null,
  );

  const filteredSuppliers = useMemo(() => {
    const q = safeLower(searchCatalog);
    return suppliers.filter(
      (s) =>
        safeLower(s.razon_social).includes(q) || safeLower(s.rfc).includes(q),
    );
  }, [suppliers, searchCatalog]);

  const handleConfirmDeleteSupplier = async () => {
    if (!supplierToDelete) return;
    const ok = await deleteSupplier(supplierToDelete.id);
    if (ok) {
      setIsDeleteDialogOpen(false);
      setSupplierToDelete(null);
    }
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      <PageHeader
        title="Catálogo de Proveedores"
        description="Directorio centralizado de proveedores de servicios y refacciones."
      />

      {/* TOOLBAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-slate-100/50 dark:bg-slate-950/40 border border-slate-200/60 dark:border-white/5 shadow-inner mb-6">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-white/60 pointer-events-none" />
          <Input
            placeholder="Buscar por razón social o RFC..."
            value={searchCatalog}
            onChange={(e) => setSearchCatalog(e.target.value)}
            className="pl-10 h-11 border-slate-200 dark:border-white/10 shadow-sm focus:ring-brand-red/20 bg-card"
          />
        </div>
        <Button
          variant="default"
          onClick={() => {
            setEditingSupplier(null);
            setIsSupplierModalOpen(true);
          }}
          className="bg-brand-red hover:bg-brand-red/90 text-white shadow-lg shadow-brand-red/20 border-none haptic-press font-black uppercase tracking-widest text-[10px] sm:text-xs h-11 px-6 rounded-xl w-full sm:w-auto"
        >
          <Plus className="h-4 w-4 mr-2" /> Nuevo Proveedor
        </Button>
      </div>

      {/* TABLA DE PROVEEDORES */}
      <Card className="shadow-2xl border-slate-200/50 dark:border-white/10 overflow-hidden bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-2xl">
        <CardContent className="p-0 bg-white dark:bg-slate-950 [&_thead]:bg-slate-50/80 dark:[&_thead]:bg-slate-900/80 [&_thead]:backdrop-blur-xl [&_th]:bg-transparent [&_th]:border-b [&_th]:border-slate-200 dark:[&_th]:border-white/10 [&_th]:text-[10px] [&_th]:font-black [&_th]:uppercase [&_th]:tracking-[0.2em] [&_th]:text-slate-500 dark:[&_th]:text-slate-400">
          {isLoadingSuppliers ? (
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 p-16 text-center animate-pulse">
              Cargando proveedores...
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <DataTable className="w-full caption-bottom text-sm border-collapse table-staggered">
                <DataTableHeader className="bg-brand-navy/95 dark:bg-black/60 backdrop-blur-md sticky top-0 border-b border-white/10">
                  <DataTableRow className="hover:bg-transparent border-none">
                    <DataTableHead>ID</DataTableHead>
                    <DataTableHead>Razón Social</DataTableHead>
                    <DataTableHead>RFC</DataTableHead>
                    <DataTableHead>CECO</DataTableHead>
                    <DataTableHead>Crédito</DataTableHead>
                    <DataTableHead>Contacto</DataTableHead>
                    <DataTableHead>Teléfono</DataTableHead>
                    <DataTableHead>Estatus</DataTableHead>
                    <DataTableHead className="text-right pr-6">
                      Acciones
                    </DataTableHead>
                  </DataTableRow>
                </DataTableHeader>
                <DataTableBody className="divide-y divide-slate-200/50 dark:divide-white/5 bg-transparent">
                  {filteredSuppliers.length === 0 ? (
                    <DataTableRow>
                      <DataTableCell
                        colSpan={9}
                        className="p-16 text-center text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500"
                      >
                        No se encontraron proveedores.
                      </DataTableCell>
                    </DataTableRow>
                  ) : (
                    filteredSuppliers.map((supplier) => (
                      <DataTableRow
                        key={supplier.id}
                        className="interactive-row transition-all duration-300 outline-none group hover:bg-slate-500/[0.05] dark:hover:bg-white/[0.03]"
                      >
                        <DataTableCell className="font-mono text-sm font-bold text-slate-700 dark:text-slate-300 uppercase">
                          {supplier.id}
                        </DataTableCell>
                        <DataTableCell className="font-black text-brand-navy dark:text-white uppercase tracking-tight">
                          {supplier.razon_social}
                        </DataTableCell>
                        <DataTableCell className="font-mono text-sm font-bold text-slate-700 dark:text-slate-300 uppercase">
                          {supplier.rfc}
                        </DataTableCell>

                        {/* 👇 COLUMNA CECO: Implementación del nuevo Badge */}
                        <DataTableCell>
                          {supplier.cost_center ? (
                            <Badge
                              variant={getCecoBadgeVariant(
                                supplier.cost_center.codigo,
                              )}
                              title={`Código: ${supplier.cost_center.codigo}`}
                            >
                              {supplier.cost_center.nombre}
                            </Badge>
                          ) : (
                            <span className="text-[10px] uppercase tracking-[0.2em] opacity-40 font-bold italic">
                              Sin Asignar
                            </span>
                          )}
                        </DataTableCell>

                        <DataTableCell className="text-[13px] font-medium text-slate-700 dark:text-white/70 tracking-tight">
                          {supplier.dias_credito
                            ? `${supplier.dias_credito} Días`
                            : "Contado"}
                        </DataTableCell>

                        <DataTableCell className="text-[13px] font-medium text-slate-700 dark:text-white/70 tracking-tight">
                          {supplier.contacto_principal || "—"}
                        </DataTableCell>
                        <DataTableCell className="text-[13px] font-medium text-slate-700 dark:text-white/70 tracking-tight">
                          {supplier.telefono || "—"}
                        </DataTableCell>
                        <DataTableCell>
                          <div className="flex items-center gap-2">
                            <StatusBadge
                              status={
                                supplier.estatus === "activo"
                                  ? "success"
                                  : "warning"
                              }
                            >
                              {supplier.estatus === "activo"
                                ? "Activo"
                                : "Inactivo"}
                            </StatusBadge>
                          </div>
                        </DataTableCell>
                        <DataTableCell className="text-right pr-6">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all shadow-sm border border-slate-200/50 dark:border-white/10 bg-white/50 dark:bg-slate-900/50 haptic-press ml-auto"
                              >
                                <MoreHorizontal className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="glass-panel border-white/20 min-w-[160px] z-50 dark:bg-slate-900/90"
                            >
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedSupplier(supplier);
                                  setIsSupplierDetailOpen(true);
                                }}
                                className="gap-2 font-bold text-xs uppercase tracking-tight cursor-pointer dark:text-slate-300 dark:focus:bg-slate-800"
                              >
                                <Eye className="h-4 w-4 mr-2 text-blue-500 dark:text-blue-400" />{" "}
                                Ver Detalle
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingSupplier(supplier);
                                  setIsSupplierModalOpen(true);
                                }}
                                className="gap-2 font-bold text-xs uppercase tracking-tight cursor-pointer dark:text-slate-300 dark:focus:bg-slate-800"
                              >
                                <Edit className="h-4 w-4 mr-2 text-brand-green dark:text-[#009740]" />{" "}
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="dark:bg-white/10" />
                              <DropdownMenuItem
                                onClick={() => {
                                  setSupplierToDelete(supplier);
                                  setIsDeleteDialogOpen(true);
                                }}
                                className="gap-2 font-bold text-xs uppercase tracking-tight text-rose-600 dark:text-rose-500 cursor-pointer dark:focus:bg-rose-950/30"
                              >
                                <Trash2 className="h-4 w-4 mr-2 text-rose-600 dark:text-rose-500" />{" "}
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </DataTableCell>
                      </DataTableRow>
                    ))
                  )}
                </DataTableBody>
              </DataTable>
            </div>
          )}
        </CardContent>
      </Card>

      <SupplierModal
        open={isSupplierModalOpen}
        onOpenChange={setIsSupplierModalOpen}
        supplier={editingSupplier}
        defaultCredito={!editingSupplier ? defaultCredito : undefined}
        costCenters={costCenters}
        onSubmit={async (payload) => {
          if (editingSupplier) {
            await updateSupplier(editingSupplier.id, payload);
          } else {
            await createSupplier(payload);
          }
        }}
      />

      <SupplierDetailSheet
        open={isSupplierDetailOpen}
        onOpenChange={setIsSupplierDetailOpen}
        supplier={selectedSupplier}
      />

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent className="w-[95vw] sm:max-w-2xl flex-col max-h-[90vh] overflow-hidden p-0 border-none shadow-2xl animate-modal-show bg-white/90 dark:bg-brand-navy/95 backdrop-blur-xl rounded-2xl">
          <AlertDialogHeader className="p-6 sm:p-8 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/10 shrink-0 relative overflow-hidden z-10">
            <div className="absolute inset-0 bg-gradient-to-br from-black/5 dark:from-white/5 to-transparent pointer-events-none" />
            <div className="relative z-10 flex items-center gap-4 sm:gap-5">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center shadow-inner shrink-0 icon-plate border border-rose-200 dark:border-rose-500/20">
                <AlertTriangle className="h-7 w-7 sm:h-8 sm:w-8 text-rose-600 dark:text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.4)]" />
              </div>
              <div className="flex flex-col gap-1 text-left">
                <AlertDialogTitle className="text-2xl font-black uppercase tracking-tighter text-rose-600 dark:text-rose-500 heading-crisp leading-none">
                  ¿Eliminar Proveedor?
                </AlertDialogTitle>
                <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 mt-1">
                  Acción Irreversible • Catálogo Proveedores
                </p>
              </div>
            </div>
          </AlertDialogHeader>

          <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar bg-slate-50/50 dark:bg-transparent">
            <AlertDialogDescription className="text-sm font-medium text-slate-700 dark:text-slate-300 block space-y-6">
              <p>
                Estás a punto de eliminar al proveedor{" "}
                <b className="text-slate-900 dark:text-white text-lg font-black tracking-tight uppercase">
                  {supplierToDelete?.razon_social}
                </b>
                .
              </p>
              <div className="p-5 sm:p-6 bg-rose-50 dark:bg-rose-950/20 border-l-4 border-rose-500 rounded-r-2xl shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  <h4 className="text-[10px] sm:text-[11px] font-black text-rose-800 dark:text-rose-400 uppercase tracking-widest">
                    Pérdida de Datos
                  </h4>
                </div>
                <p className="text-xs sm:text-sm leading-relaxed text-rose-900 dark:text-rose-200/80">
                  Esta acción <b className="font-black">no se puede deshacer</b>
                  . Los registros históricos asociados se mantendrán intactos.
                </p>
              </div>
            </AlertDialogDescription>
          </div>

          <AlertDialogFooter className="p-6 sm:p-8 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 shrink-0 z-10">
            <div className="flex flex-col-reverse sm:flex-row sm:flex-wrap justify-end items-stretch sm:items-center gap-3 w-full">
              <AlertDialogCancel
                variant="outline"
                size="lg"
                onClick={() => setSupplierToDelete(null)}
                className="w-full sm:w-auto haptic-press flex-shrink-0 font-black uppercase tracking-widest text-[10px]"
              >
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                size="lg"
                onClick={handleConfirmDeleteSupplier}
                className="w-full sm:w-auto haptic-press shadow-rose-600/10 flex-shrink-0 border-none bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-widest text-[10px]"
              >
                <Trash2 className="h-4 w-4 mr-2" /> Sí, Eliminar
              </AlertDialogAction>
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
