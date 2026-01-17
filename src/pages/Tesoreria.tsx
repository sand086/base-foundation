import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Landmark,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  DollarSign,
  Wallet,
} from 'lucide-react';
import { mockBankAccounts, BankAccount, bancos, bankLogos } from '@/data/tesoreriaData';
import { EnhancedDataTable, ColumnDef } from '@/components/ui/enhanced-data-table';
import { toast } from 'sonner';

export default function Tesoreria() {
  const [accounts, setAccounts] = useState<BankAccount[]>(mockBankAccounts);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showBalances, setShowBalances] = useState(true);
  const [formData, setFormData] = useState({
    banco: '',
    numeroCuenta: '',
    clabe: '',
    moneda: 'MXN' as 'MXN' | 'USD',
    alias: '',
  });

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
    };

    setAccounts([...accounts, newAccount]);
    setFormData({ banco: '', numeroCuenta: '', clabe: '', moneda: 'MXN', alias: '' });
    setIsAddModalOpen(false);
    toast.success('Cuenta bancaria agregada', {
      description: `${formData.alias} - ${formData.banco}`,
    });
  };

  const totalMXN = accounts
    .filter(a => a.moneda === 'MXN' && a.estatus === 'activo')
    .reduce((sum, a) => sum + (a.saldo || 0), 0);

  const totalUSD = accounts
    .filter(a => a.moneda === 'USD' && a.estatus === 'activo')
    .reduce((sum, a) => sum + (a.saldo || 0), 0);

  const maskAccountNumber = (num: string) => {
    return `****${num.slice(-4)}`;
  };

  // Define columns for EnhancedDataTable
  const columns: ColumnDef<BankAccount>[] = useMemo(() => [
    {
      key: 'banco',
      header: 'Banco',
      render: (value, row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-xl">
            {row.bancoLogo}
          </div>
          <span className="font-medium text-brand-dark">{value}</span>
        </div>
      ),
    },
    {
      key: 'numeroCuenta',
      header: 'No. Cuenta',
      render: (value) => (
        <span className="font-mono text-sm text-muted-foreground">
          {maskAccountNumber(value)}
        </span>
      ),
    },
    {
      key: 'clabe',
      header: 'CLABE',
      render: (value) => (
        <span className="font-mono text-xs text-muted-foreground">
          {value.slice(0, 6)}...{value.slice(-4)}
        </span>
      ),
    },
    {
      key: 'moneda',
      header: 'Moneda',
      type: 'status',
      statusOptions: ['MXN', 'USD'],
      render: (value) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
            value === 'MXN'
              ? 'bg-brand-green/10 text-brand-green'
              : 'bg-status-info/10 text-status-info'
          }`}
        >
          {value}
        </span>
      ),
    },
    {
      key: 'alias',
      header: 'Alias',
      render: (value) => <span className="font-medium text-brand-dark">{value}</span>,
    },
    {
      key: 'saldo',
      header: 'Saldo',
      type: 'number',
      render: (value, row) => (
        showBalances ? (
          <span className={row.moneda === 'USD' ? 'text-status-info' : 'text-brand-dark'}>
            ${(value || 0).toLocaleString(row.moneda === 'MXN' ? 'es-MX' : 'en-US')}
          </span>
        ) : (
          <span className="text-muted-foreground">••••••</span>
        )
      ),
    },
    {
      key: 'estatus',
      header: 'Estatus',
      type: 'status',
      statusOptions: ['activo', 'inactivo'],
      render: (value) => (
        <StatusBadge status={value === 'activo' ? 'success' : 'warning'}>
          {value === 'activo' ? 'Activo' : 'Inactivo'}
        </StatusBadge>
      ),
    },
    {
      key: 'id',
      header: 'Acciones',
      sortable: false,
      render: () => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-card">
            <DropdownMenuItem className="text-sm gap-2">
              <Pencil className="h-3 w-3" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem className="text-sm gap-2 text-status-danger">
              <Trash2 className="h-3 w-3" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], [showBalances]);

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Tesorería"
        description="Configuración de cuentas bancarias y gestión de fondos"
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-brand-green/20 bg-status-success-bg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-status-success flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Saldo Total MXN
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-status-success">
              {showBalances
                ? `$${totalMXN.toLocaleString('es-MX')}`
                : '••••••••'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-status-info/20 bg-status-info-bg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-status-info flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Saldo Total USD
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-status-info">
              {showBalances
                ? `$${totalUSD.toLocaleString('en-US')} USD`
                : '••••••••'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Landmark className="h-4 w-4" />
              Cuentas Activas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-brand-dark">
              {accounts.filter(a => a.estatus === 'activo').length}
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

      {/* Enhanced Data Table */}
      <Card>
        <CardContent className="pt-6">
          <EnhancedDataTable
            data={accounts}
            columns={columns}
            exportFileName="cuentas_bancarias"
          />
        </CardContent>
      </Card>

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
