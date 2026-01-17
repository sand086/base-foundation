import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { StatusBadge } from '@/components/ui/status-badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Landmark,
  Plus,
  MoreHorizontal,
  Trash2,
  Eye,
  EyeOff,
  DollarSign,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  Clock,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { 
  mockBankAccounts, 
  mockMovimientos,
  BankAccount, 
  MovimientoBancario,
  bancos, 
  bankLogos 
} from '@/data/tesoreriaData';
import { MovementDetailModal } from '@/features/tesoreria/MovementDetailModal';
import { toast } from 'sonner';

export default function Tesoreria() {
  const [accounts, setAccounts] = useState<BankAccount[]>(mockBankAccounts);
  const [movimientos, setMovimientos] = useState<MovimientoBancario[]>(mockMovimientos);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showBalances, setShowBalances] = useState(true);
  const [selectedMovement, setSelectedMovement] = useState<MovimientoBancario | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [movementToDelete, setMovementToDelete] = useState<MovimientoBancario | null>(null);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  
  const [formData, setFormData] = useState({
    banco: '',
    numeroCuenta: '',
    clabe: '',
    moneda: 'MXN' as 'MXN' | 'USD',
    alias: '',
    tipo: 'operativa' as 'operativa' | 'cobranza',
  });

  // Accounts by type
  const operativaAccounts = accounts.filter(a => a.tipo === 'operativa' && a.estatus === 'activo');
  const cobranzaAccounts = accounts.filter(a => a.tipo === 'cobranza' && a.estatus === 'activo');

  // Calculate balances by account type
  const saldoOperativa = useMemo(() => {
    const accountIds = operativaAccounts.map(a => a.id);
    const ingresos = movimientos
      .filter(m => accountIds.includes(m.cuentaBancariaId) && m.tipo === 'ingreso')
      .reduce((sum, m) => sum + m.monto, 0);
    const egresos = movimientos
      .filter(m => accountIds.includes(m.cuentaBancariaId) && m.tipo === 'egreso')
      .reduce((sum, m) => sum + m.monto, 0);
    return operativaAccounts.reduce((sum, a) => sum + (a.saldo || 0), 0);
  }, [operativaAccounts, movimientos]);

  const saldoCobranza = useMemo(() => {
    return cobranzaAccounts.reduce((sum, a) => sum + (a.saldo || 0), 0);
  }, [cobranzaAccounts]);

  // Filter movements by account type
  const getMovimientosByTipo = (tipo: 'operativa' | 'cobranza' | 'all') => {
    if (tipo === 'all') return movimientos;
    const accountIds = tipo === 'operativa' 
      ? operativaAccounts.map(a => a.id)
      : cobranzaAccounts.map(a => a.id);
    return movimientos.filter(m => accountIds.includes(m.cuentaBancariaId));
  };

  // Stats
  const stats = useMemo(() => {
    const conciliados = movimientos.filter(m => m.conciliado).length;
    const pendientes = movimientos.filter(m => !m.conciliado).length;
    const totalIngresos = movimientos.filter(m => m.tipo === 'ingreso').reduce((sum, m) => sum + m.monto, 0);
    const totalEgresos = movimientos.filter(m => m.tipo === 'egreso').reduce((sum, m) => sum + m.monto, 0);
    return { conciliados, pendientes, totalIngresos, totalEgresos };
  }, [movimientos]);

  const handleAddAccount = () => {
    const newAccount: BankAccount = {
      id: `BANK-${String(accounts.length + 1).padStart(3, '0')}`,
      banco: formData.banco,
      bancoLogo: bankLogos[formData.banco] || '🏦',
      numeroCuenta: formData.numeroCuenta,
      clabe: formData.clabe,
      moneda: formData.moneda,
      alias: formData.alias,
      saldo: 0,
      estatus: 'activo',
      tipo: formData.tipo,
    };

    setAccounts([...accounts, newAccount]);
    setFormData({ banco: '', numeroCuenta: '', clabe: '', moneda: 'MXN', alias: '', tipo: 'operativa' });
    setIsAddModalOpen(false);
    toast.success('Cuenta bancaria agregada', {
      description: `${formData.alias} - ${formData.banco}`,
    });
  };

  const handleToggleConciliacion = (movementId: string) => {
    setMovimientos(movimientos.map(m => {
      if (m.id === movementId) {
        const newConciliado = !m.conciliado;
        return {
          ...m,
          conciliado: newConciliado,
          fechaConciliacion: newConciliado ? new Date().toISOString().split('T')[0] : undefined,
        };
      }
      return m;
    }));
  };

  const handleViewMovement = (movement: MovimientoBancario) => {
    setSelectedMovement(movement);
    setIsDetailModalOpen(true);
  };

  const handleDeleteClick = (movement: MovimientoBancario) => {
    setMovementToDelete(movement);
    setDeleteStep(movement.conciliado ? 1 : 2);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteMovement = () => {
    if (!movementToDelete) return;
    
    if (movementToDelete.conciliado && deleteStep === 1) {
      setDeleteStep(2);
      return;
    }
    
    setMovimientos(movimientos.filter(m => m.id !== movementToDelete.id));
    toast.success('Movimiento eliminado', {
      description: `${movementToDelete.concepto}`,
    });
    setIsDeleteDialogOpen(false);
    setMovementToDelete(null);
    setDeleteStep(1);
  };

  const renderMovimientosTable = (tipo: 'operativa' | 'cobranza' | 'all') => {
    const filteredMovimientos = getMovimientosByTipo(tipo);
    
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-xs uppercase tracking-wide text-muted-foreground w-12">
                Conc.
              </th>
              <th className="px-3 py-2 text-left font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                Fecha
              </th>
              <th className="px-3 py-2 text-left font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                Concepto
              </th>
              <th className="px-3 py-2 text-left font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                Origen/Módulo
              </th>
              <th className="px-3 py-2 text-left font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                Banco
              </th>
              <th className="px-3 py-2 text-right font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                Monto
              </th>
              <th className="px-3 py-2 text-center font-semibold text-xs uppercase tracking-wide text-muted-foreground w-20">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredMovimientos.map((mov) => (
              <tr 
                key={mov.id} 
                className={`hover:bg-muted/30 transition-colors ${
                  mov.tipo === 'egreso' ? 'bg-red-50/30' : 'bg-emerald-50/30'
                }`}
              >
                <td className="px-3 py-2">
                  <Checkbox
                    checked={mov.conciliado}
                    onCheckedChange={() => handleToggleConciliacion(mov.id)}
                    className={mov.conciliado ? 'data-[state=checked]:bg-emerald-600' : ''}
                  />
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {mov.fecha}
                </td>
                <td className="px-3 py-2 max-w-[250px]">
                  <p className="font-medium text-brand-dark truncate">{mov.concepto}</p>
                  <p className="text-xs text-muted-foreground font-mono">{mov.referenciaBancaria}</p>
                </td>
                <td className="px-3 py-2">
                  <StatusBadge 
                    status={
                      mov.origenModulo === 'CxC' ? 'success' : 
                      mov.origenModulo === 'CxP' ? 'danger' : 
                      'info'
                    }
                  >
                    {mov.origenModulo}
                  </StatusBadge>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{bankLogos[mov.banco]}</span>
                    <span className="text-sm text-muted-foreground">{mov.banco}</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-right">
                  <span className={`font-bold ${mov.tipo === 'ingreso' ? 'text-emerald-700' : 'text-red-700'}`}>
                    {mov.tipo === 'ingreso' ? '+' : '-'}${mov.monto.toLocaleString('es-MX')}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-card">
                      <DropdownMenuItem onClick={() => handleViewMovement(mov)} className="gap-2">
                        <Eye className="h-3 w-3" />
                        Ver Detalle
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => handleDeleteClick(mov)} 
                        className="gap-2 text-status-danger"
                      >
                        <Trash2 className="h-3 w-3" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredMovimientos.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            No hay movimientos registrados
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Tesorería"
        description="Auditoría financiera y conciliación bancaria"
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-emerald-200 bg-emerald-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-700 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Total Ingresos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-700">
              {showBalances ? `+$${stats.totalIngresos.toLocaleString('es-MX')}` : '••••••••'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-700 flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Total Egresos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-700">
              {showBalances ? `-$${stats.totalEgresos.toLocaleString('es-MX')}` : '••••••••'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-emerald-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-600 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Conciliados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600">
              {stats.conciliados}
            </p>
          </CardContent>
        </Card>

        <Card className="border-amber-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-600 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600">
              {stats.pendientes}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowBalances(!showBalances)}
          className="h-8 gap-2 text-xs"
        >
          {showBalances ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          {showBalances ? 'Ocultar' : 'Mostrar'} Saldos
        </Button>
        <Button
          onClick={() => setIsAddModalOpen(true)}
          className="h-8 gap-2 text-xs bg-brand-green hover:bg-brand-green/90 text-white"
        >
          <Plus className="h-3 w-3" />
          Agregar Cuenta
        </Button>
      </div>

      {/* Tabs by Bank Type */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="bg-slate-100">
          <TabsTrigger value="all" className="data-[state=active]:bg-white gap-2">
            <Landmark className="h-4 w-4" />
            Todos los Movimientos
          </TabsTrigger>
          <TabsTrigger value="operativa" className="data-[state=active]:bg-white gap-2">
            <ArrowDownLeft className="h-4 w-4 text-red-600" />
            Banamex (Operativa)
            <span className="ml-1 text-xs bg-slate-200 px-1.5 py-0.5 rounded">
              {showBalances ? `$${saldoOperativa.toLocaleString('es-MX')}` : '•••'}
            </span>
          </TabsTrigger>
          <TabsTrigger value="cobranza" className="data-[state=active]:bg-white gap-2">
            <ArrowUpRight className="h-4 w-4 text-emerald-600" />
            Santander/Banorte (Cobranza)
            <span className="ml-1 text-xs bg-slate-200 px-1.5 py-0.5 rounded">
              {showBalances ? `$${saldoCobranza.toLocaleString('es-MX')}` : '•••'}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <Card>
            <CardContent className="pt-6">
              {renderMovimientosTable('all')}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="operativa">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                🏦 Cuentas Operativas (Egresos/Pagos a Proveedores)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {renderMovimientosTable('operativa')}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cobranza">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                🔥 Cuentas de Cobranza (Ingresos/Cobros de Clientes)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {renderMovimientosTable('cobranza')}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Legend */}
      <Card>
        <CardContent className="pt-6">
          <h4 className="font-semibold text-slate-700 mb-3">Leyenda</h4>
          <div className="flex flex-wrap gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-emerald-100 border border-emerald-300"></div>
              <span>Ingreso (CxC)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-100 border border-red-300"></div>
              <span>Egreso (CxP)</span>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked disabled className="data-[state=checked]:bg-emerald-600" />
              <span>Conciliado</span>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox disabled />
              <span>Pendiente</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Movement Detail Modal */}
      <MovementDetailModal
        open={isDetailModalOpen}
        onOpenChange={setIsDetailModalOpen}
        movement={selectedMovement}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={(open) => {
        setIsDeleteDialogOpen(open);
        if (!open) {
          setDeleteStep(1);
          setMovementToDelete(null);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {movementToDelete?.conciliado && deleteStep === 1 
                ? '⚠️ Movimiento Conciliado' 
                : '¿Eliminar movimiento?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {movementToDelete?.conciliado && deleteStep === 1 ? (
                <span className="text-amber-700 font-medium">
                  Este movimiento ya fue conciliado. Eliminarlo afectará el saldo auditado. 
                  ¿Estás seguro de continuar?
                </span>
              ) : deleteStep === 2 ? (
                <span className="text-red-700 font-medium">
                  ⚠️ CONFIRMACIÓN FINAL: Esta acción no se puede deshacer y afectará 
                  los registros financieros auditados.
                </span>
              ) : (
                <>
                  Se eliminará el movimiento:{' '}
                  <strong>{movementToDelete?.concepto}</strong>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMovement}
              className={deleteStep === 2 ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'}
            >
              {movementToDelete?.conciliado && deleteStep === 1 
                ? 'Sí, continuar' 
                : 'Eliminar definitivamente'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Account Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-brand-dark">
              <Landmark className="h-5 w-5" />
              Agregar Cuenta Bancaria
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Banco
                </Label>
                <Select
                  value={formData.banco}
                  onValueChange={(value) => setFormData({ ...formData, banco: value })}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Seleccionar banco" />
                  </SelectTrigger>
                  <SelectContent className="bg-card">
                    {bancos.map((banco) => (
                      <SelectItem key={banco} value={banco} className="text-sm">
                        <div className="flex items-center gap-2">
                          <span>{bankLogos[banco]}</span>
                          {banco}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Tipo de Cuenta
                </Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value: 'operativa' | 'cobranza') => setFormData({ ...formData, tipo: value })}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card">
                    <SelectItem value="operativa" className="text-sm">Operativa (Pagos)</SelectItem>
                    <SelectItem value="cobranza" className="text-sm">Cobranza (Ingresos)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Número de Cuenta
                </Label>
                <Input
                  placeholder="Ej: 0123456789"
                  value={formData.numeroCuenta}
                  onChange={(e) => setFormData({ ...formData, numeroCuenta: e.target.value })}
                  className="h-9 text-sm font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Moneda
                </Label>
                <Select
                  value={formData.moneda}
                  onValueChange={(value: 'MXN' | 'USD') => setFormData({ ...formData, moneda: value })}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card">
                    <SelectItem value="MXN" className="text-sm">MXN - Peso Mexicano</SelectItem>
                    <SelectItem value="USD" className="text-sm">USD - Dólar Americano</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                CLABE Interbancaria
              </Label>
              <Input
                placeholder="18 dígitos"
                value={formData.clabe}
                onChange={(e) => setFormData({ ...formData, clabe: e.target.value })}
                maxLength={18}
                className="h-9 text-sm font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Alias (Nombre Interno)
              </Label>
              <Input
                placeholder="Ej: Fiscal Banamex, Operaciones"
                value={formData.alias}
                onChange={(e) => setFormData({ ...formData, alias: e.target.value })}
                className="h-9 text-sm"
              />
            </div>
          </div>

          <DialogFooter className="pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setIsAddModalOpen(false)}
              className="h-9 text-sm"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAddAccount}
              className="h-9 text-sm bg-brand-green hover:bg-brand-green/90 text-white"
              disabled={!formData.banco || !formData.numeroCuenta || !formData.alias}
            >
              Guardar Cuenta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
