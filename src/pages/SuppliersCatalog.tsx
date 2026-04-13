import { useMemo, useState } from "react";
import {
  Search,
  Plus,
  Eye,
  Edit,
  MoreHorizontal,
  Trash2,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";
import { ActionButton } from "@/components/ui/action-button";
import { StatusBadge } from "@/components/ui/status-badge";
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

const safeLower = (v: unknown) =>
  typeof v === "string" ? v.toLowerCase() : "";

export default function SuppliersCatalog() {
  const { valueAsNumber: defaultCredito } = useSystemConfig(
    "dias_credito_default",
  );

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

      <Card className="shadow-sm border-slate-200">
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
              <Input
                placeholder="Buscar por razón social o RFC..."
                value={searchCatalog}
                onChange={(e) => setSearchCatalog(e.target.value)}
                className="pl-10 h-11"
              />
            </div>
            <ActionButton
              className="w-full sm:w-auto"
              onClick={() => {
                setEditingSupplier(null);
                setIsSupplierModalOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" /> Nuevo Proveedor
            </ActionButton>
          </div>

          {isLoadingSuppliers ? (
            <div className="text-sm text-muted-foreground p-8 text-center">
              Cargando proveedores...
            </div>
          ) : (
            <div className="rounded-xl border overflow-hidden">
              <DataTable>
                <DataTableHeader>
                  <DataTableRow className="bg-slate-50">
                    <DataTableHead>ID</DataTableHead>
                    <DataTableHead>Razón Social</DataTableHead>
                    <DataTableHead>RFC</DataTableHead>
                    <DataTableHead>Contacto</DataTableHead>
                    <DataTableHead>Teléfono</DataTableHead>
                    <DataTableHead>Estatus</DataTableHead>
                  </DataTableRow>
                </DataTableHeader>
                <DataTableBody>
                  {filteredSuppliers.map((supplier) => (
                    <DataTableRow key={supplier.id}>
                      <DataTableCell className="font-mono text-xs">
                        {supplier.id}
                      </DataTableCell>
                      <DataTableCell className="font-medium text-brand-navy">
                        {supplier.razon_social}
                      </DataTableCell>
                      <DataTableCell className="font-mono text-xs">
                        {supplier.rfc}
                      </DataTableCell>
                      <DataTableCell>
                        {supplier.contacto_principal || "—"}
                      </DataTableCell>
                      <DataTableCell>{supplier.telefono || "—"}</DataTableCell>
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

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 ml-auto"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="bg-card"
                            >
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedSupplier(supplier);
                                  setIsSupplierDetailOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4 mr-2 text-blue-600" />{" "}
                                Ver Detalle
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingSupplier(supplier);
                                  setIsSupplierModalOpen(true);
                                }}
                              >
                                <Edit className="h-4 w-4 mr-2 text-emerald-600" />{" "}
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setSupplierToDelete(supplier);
                                  setIsDeleteDialogOpen(true);
                                }}
                                className="text-status-danger focus:text-status-danger"
                              >
                                <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </DataTableCell>
                    </DataTableRow>
                  ))}
                </DataTableBody>
              </DataTable>
            </div>
          )}
        </CardContent>
      </Card>

      {/* MODALES */}
      <SupplierModal
        open={isSupplierModalOpen}
        onOpenChange={setIsSupplierModalOpen}
        supplier={editingSupplier}
        defaultCredito={!editingSupplier ? defaultCredito : undefined}
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
            <AlertDialogDescription className="text-slate-600 dark:text-slate-300 block space-y-6">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Estás a punto de eliminar al proveedor{" "}
                <b className="text-slate-900 dark:text-white text-lg font-black tracking-tight uppercase">
                  {supplierToDelete?.razon_social}
                </b>.
              </p>
              <div className="p-5 sm:p-6 bg-rose-50 dark:bg-rose-950/20 border-l-4 border-rose-500 rounded-r-2xl shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  <h4 className="text-[10px] sm:text-[11px] font-black text-rose-800 dark:text-rose-400 uppercase tracking-widest">
                    Pérdida de Datos
                  </h4>
                </div>
                <p className="text-xs sm:text-sm leading-relaxed text-rose-900 dark:text-rose-200/80">
                  Esta acción <b className="font-black">no se puede deshacer</b>. Los registros históricos asociados se mantendrán intactos.
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
