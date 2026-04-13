import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Landmark, Plus, Edit, Trash2, Check, Loader2 } from "lucide-react";
import { BankIcon } from "@/components/ui/bank-icon";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// MOCK: Aquí conectarías tu hook real ej: useBanks()
const MOCK_BANKS = [
  { id: 1, nombre: "BBVA", activo: true },
  { id: 2, nombre: "Banorte", activo: true },
  { id: 3, nombre: "Santander", activo: false },
];

export function BanksConfig() {
  const [banks, setBanks] = useState(MOCK_BANKS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<any>(null);
  const [formData, setFormData] = useState({ nombre: "", activo: true });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenNew = () => {
    setEditingBank(null);
    setFormData({ nombre: "", activo: true });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (bank: any) => {
    setEditingBank(bank);
    setFormData({ nombre: bank.nombre, activo: bank.activo });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Aquí iría tu lógica de API (axiosClient.post / put)
    setTimeout(() => {
      setIsSubmitting(false);
      setIsModalOpen(false);
    }, 500);
  };

  return (
    <div className="space-y-6">
      {/* TOOLBAR */}
      <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-slate-100/50 dark:bg-slate-950/40 border border-slate-200/60 dark:border-white/5 shadow-inner">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
          Instituciones Bancarias Soportadas
        </h3>
        <Button
          onClick={handleOpenNew}
          className="bg-brand-red hover:bg-brand-red/90 text-white shadow-lg shadow-brand-red/20 border-none haptic-press font-black uppercase tracking-widest text-[10px] h-10 px-5 rounded-xl"
        >
          <Plus className="h-4 w-4 mr-2" /> Agregar Banco
        </Button>
      </div>

      {/* TABLA GLASSMORPHISM */}
      <Card className="shadow-2xl border-slate-200/50 dark:border-white/10 overflow-hidden bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-2xl">
        <CardContent className="p-0">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full caption-bottom text-sm border-collapse table-staggered">
              <thead className="bg-brand-navy/95 dark:bg-black/60 backdrop-blur-md sticky top-0 border-b border-white/10">
                <tr>
                  <th className="h-12 px-6 text-left align-middle text-[10px] font-black uppercase tracking-[0.2em] text-white/60">
                    Logo
                  </th>
                  <th className="h-12 px-6 text-left align-middle text-[10px] font-black uppercase tracking-[0.2em] text-white/60">
                    Institución
                  </th>
                  <th className="h-12 px-6 text-left align-middle text-[10px] font-black uppercase tracking-[0.2em] text-white/60">
                    Estatus
                  </th>
                  <th className="h-12 px-6 text-right align-middle text-[10px] font-black uppercase tracking-[0.2em] text-white/60">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/50 dark:divide-white/5 bg-transparent">
                {banks.map((b) => (
                  <tr
                    key={b.id}
                    className="interactive-row transition-all hover:bg-slate-500/[0.05] dark:hover:bg-white/[0.03]"
                  >
                    <td className="p-4 px-6 align-middle">
                      <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm flex items-center justify-center p-2">
                        <BankIcon bankName={b.nombre} />
                      </div>
                    </td>
                    <td className="p-4 px-6 align-middle font-black text-brand-navy dark:text-white uppercase tracking-tight">
                      {b.nombre}
                    </td>
                    <td className="p-4 px-6 align-middle">
                      <StatusBadge status={b.activo ? "success" : "default"}>
                        {b.activo ? "Activo" : "Inactivo"}
                      </StatusBadge>
                    </td>
                    <td className="p-4 px-6 align-middle text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(b)}
                          className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all shadow-sm border border-slate-200/50 dark:border-white/10 bg-white/50 dark:bg-slate-900/50 haptic-press"
                        >
                          <Edit className="h-4 w-4 text-brand-green dark:text-emerald-400" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all shadow-sm border border-slate-200/50 dark:border-white/10 bg-white/50 dark:bg-slate-900/50 haptic-press"
                        >
                          <Trash2 className="h-4 w-4 text-rose-600 dark:text-rose-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* MODAL CRUD */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="w-[95vw] sm:max-w-md p-0 flex flex-col bg-card/95 backdrop-blur-xl border-border shadow-2xl rounded-2xl overflow-hidden">
          <DialogHeader className="p-6 bg-card border-b border-border shrink-0 relative z-10">
            <div className="absolute inset-0 bg-gradient-to-br from-black/5 dark:from-white/5 to-transparent pointer-events-none" />
            <div className="relative z-10 flex items-center gap-4">
              <div
                className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center shadow-inner shrink-0 icon-plate border",
                  editingBank
                    ? "bg-amber-100 dark:bg-amber-900/30 border-amber-200"
                    : "bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200",
                )}
              >
                <Landmark
                  className={cn(
                    "h-6 w-6 drop-shadow-md",
                    editingBank ? "text-amber-600" : "text-emerald-600",
                  )}
                />
              </div>
              <div className="flex flex-col gap-1">
                <DialogTitle className="text-xl font-black uppercase tracking-tighter text-foreground heading-crisp leading-none">
                  {editingBank ? "Editar Banco" : "Nuevo Banco"}
                </DialogTitle>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col">
            <div className="p-6 space-y-6">
              <div className="space-y-1.5">
                <Label variant="brand" required>
                  Nombre de la Institución
                </Label>
                <Input
                  value={formData.nombre}
                  onChange={(e) =>
                    setFormData({ ...formData, nombre: e.target.value })
                  }
                  placeholder="Ej: Banamex"
                  className="h-11 font-bold uppercase tracking-widest bg-card border-slate-200 dark:border-white/10"
                  required
                />
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/20">
                <div className="space-y-0.5">
                  <Label className="text-xs font-bold">Estatus Operativo</Label>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                    Habilitar en selectores
                  </p>
                </div>
                <Switch
                  checked={formData.activo}
                  onCheckedChange={(c) =>
                    setFormData({ ...formData, activo: c })
                  }
                  className="data-[state=checked]:bg-brand-red"
                />
              </div>
            </div>

            <DialogFooter className="p-6 bg-muted/50 border-t border-border shrink-0">
              <div className="flex justify-end gap-3 w-full">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="haptic-press text-[10px] font-black uppercase tracking-widest"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className={cn(
                    "haptic-press border-none text-white text-[10px] font-black uppercase tracking-widest",
                    editingBank
                      ? "bg-brand-green hover:bg-[hsl(152,100%,24%)]"
                      : "bg-brand-red hover:bg-brand-red/90",
                  )}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Guardar
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
