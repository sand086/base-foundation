import { useState, useMemo } from "react";
import { format, subMonths, addDays, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { es } from "date-fns/locale";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ArrowDown, 
  ArrowUp, 
  Minus,
  Calendar,
  Wallet,
  PiggyBank,
  AlertTriangle,
  Building2,
  Fuel,
  Wrench,
  Users,
  ReceiptText,
  Truck
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";

// Mock data generators
const generateMonthlyData = (year: number, month: number) => {
  // Base multipliers for variability
  const baseRevenue = 2800000 + Math.random() * 400000;
  
  return {
    // Income Statement
    facturacionTotal: baseRevenue,
    costosDirectos: {
      diesel: baseRevenue * 0.18 + Math.random() * 50000,
      casetas: baseRevenue * 0.08 + Math.random() * 20000,
      pagosOperadores: baseRevenue * 0.15 + Math.random() * 30000,
      gastosViaje: baseRevenue * 0.05 + Math.random() * 15000,
    },
    gastosMantenimiento: {
      refacciones: 85000 + Math.random() * 30000,
      manoObra: 45000 + Math.random() * 15000,
    },
    gastosIndirectos: {
      renta: 75000,
      nominaAdmin: 180000 + Math.random() * 20000,
      serviciosPublicos: 25000 + Math.random() * 8000,
      segurosOficina: 35000,
      papeleria: 8000 + Math.random() * 3000,
      suscripcionesSoftware: 15000,
      limpieza: 12000,
      otros: 18000 + Math.random() * 10000,
    },
  };
};

// Cash flow projection data
const generateCashFlowProjection = () => {
  const today = new Date();
  const days = eachDayOfInterval({
    start: today,
    end: addDays(today, 30),
  });

  let cobrosAcumulados = 0;
  let pagosAcumulados = 0;

  return days.map((day, idx) => {
    // Simulate expected collections (higher on certain days)
    const isWeekday = day.getDay() > 0 && day.getDay() < 6;
    const cobrosHoy = isWeekday ? (50000 + Math.random() * 80000) : (10000 + Math.random() * 20000);
    
    // Simulate committed payments (concentrated on specific days)
    const dayOfMonth = day.getDate();
    let pagosHoy = 0;
    if ([1, 5, 10, 15, 20, 25].includes(dayOfMonth)) {
      pagosHoy = 80000 + Math.random() * 120000;
    } else if (isWeekday) {
      pagosHoy = 15000 + Math.random() * 25000;
    }

    cobrosAcumulados += cobrosHoy;
    pagosAcumulados += pagosHoy;

    return {
      fecha: format(day, 'dd MMM', { locale: es }),
      fechaFull: day,
      cobrosEsperados: Math.round(cobrosAcumulados),
      pagosComprometidos: Math.round(pagosAcumulados),
      diferencia: Math.round(cobrosAcumulados - pagosAcumulados),
    };
  });
};

// Top indirect expenses
const getTopIndirectExpenses = (gastosIndirectos: Record<string, number>) => {
  return Object.entries(gastosIndirectos)
    .map(([key, value]) => ({
      categoria: formatCategoryName(key),
      monto: value,
      key,
    }))
    .sort((a, b) => b.monto - a.monto)
    .slice(0, 5);
};

const formatCategoryName = (key: string): string => {
  const names: Record<string, string> = {
    renta: 'Renta de Oficina',
    nominaAdmin: 'Nómina Administrativa',
    serviciosPublicos: 'Luz / Agua / Gas',
    segurosOficina: 'Seguros de Oficina',
    papeleria: 'Papelería',
    suscripcionesSoftware: 'Software y Suscripciones',
    limpieza: 'Limpieza',
    otros: 'Otros Gastos',
  };
  return names[key] || key;
};

const getCategoryIcon = (key: string) => {
  const icons: Record<string, React.ReactNode> = {
    renta: <Building2 className="h-4 w-4" />,
    nominaAdmin: <Users className="h-4 w-4" />,
    serviciosPublicos: <Wallet className="h-4 w-4" />,
    segurosOficina: <ReceiptText className="h-4 w-4" />,
    papeleria: <ReceiptText className="h-4 w-4" />,
    suscripcionesSoftware: <ReceiptText className="h-4 w-4" />,
    limpieza: <ReceiptText className="h-4 w-4" />,
    otros: <ReceiptText className="h-4 w-4" />,
  };
  return icons[key] || <ReceiptText className="h-4 w-4" />;
};

export default function FinanzasDireccion() {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());

  // Generate data based on selected period
  const monthlyData = useMemo(() => 
    generateMonthlyData(selectedYear, selectedMonth), 
    [selectedYear, selectedMonth]
  );

  const cashFlowData = useMemo(() => 
    generateCashFlowProjection(), 
    []
  );

  const topExpenses = useMemo(() => 
    getTopIndirectExpenses(monthlyData.gastosIndirectos), 
    [monthlyData]
  );

  // Calculate totals
  const totalCostosDirectos = Object.values(monthlyData.costosDirectos).reduce((a, b) => a + b, 0);
  const totalGastosMantenimiento = Object.values(monthlyData.gastosMantenimiento).reduce((a, b) => a + b, 0);
  const totalGastosIndirectos = Object.values(monthlyData.gastosIndirectos).reduce((a, b) => a + b, 0);
  
  const utilidadBruta = monthlyData.facturacionTotal - totalCostosDirectos;
  const utilidadNeta = utilidadBruta - totalGastosMantenimiento - totalGastosIndirectos;
  const margenBruto = (utilidadBruta / monthlyData.facturacionTotal) * 100;
  const margenNeto = (utilidadNeta / monthlyData.facturacionTotal) * 100;

  // Format currency
  const formatMoney = (value: number) => 
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(value);

  // Cash flow status
  const lastCashFlowPoint = cashFlowData[cashFlowData.length - 1];
  const cashFlowIsPositive = lastCashFlowPoint?.diferencia > 0;

  // Months array for selector
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  // Years array for selector
  const years = [2024, 2025, 2026];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <PageHeader 
          title="FINANZAS - DIRECCIÓN" 
          description="Estado de resultados, flujo de efectivo y análisis de gastos"
        />
        
        {/* Period Filters */}
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Select
            value={String(selectedMonth)}
            onValueChange={(v) => setSelectedMonth(parseInt(v))}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card">
              {months.map((month, idx) => (
                <SelectItem key={idx} value={String(idx)}>{month}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={String(selectedYear)}
            onValueChange={(v) => setSelectedYear(parseInt(v))}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card">
              {years.map((year) => (
                <SelectItem key={year} value={String(year)}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main KPI - Net Profit */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className={`md:col-span-1 border-l-4 ${utilidadNeta > 0 ? 'border-l-emerald-500 bg-emerald-50/50' : 'border-l-rose-500 bg-rose-50/50'}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {utilidadNeta > 0 ? (
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-rose-600" />
              )}
              Utilidad Neta del Mes
            </CardTitle>
            <CardDescription>
              {months[selectedMonth]} {selectedYear}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${utilidadNeta > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {formatMoney(utilidadNeta)}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className={utilidadNeta > 0 ? 'text-emerald-700 border-emerald-300' : 'text-rose-700 border-rose-300'}>
                Margen: {margenNeto.toFixed(1)}%
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-blue-600" />
              Facturación Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-700">
              {formatMoney(monthlyData.facturacionTotal)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Ingresos por servicios de transporte
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <PiggyBank className="h-4 w-4 text-amber-600" />
              Utilidad Bruta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-700">
              {formatMoney(utilidadBruta)}
            </p>
            <Badge variant="outline" className="mt-2 text-amber-700 border-amber-300">
              Margen Bruto: {margenBruto.toFixed(1)}%
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Income Statement Waterfall */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ReceiptText className="h-5 w-5" />
            Estado de Resultados - {months[selectedMonth]} {selectedYear}
          </CardTitle>
          <CardDescription>
            Desglose paso a paso de ingresos a utilidad neta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Facturación */}
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-blue-900">Facturación Total</p>
                  <p className="text-xs text-blue-600">Ingresos por fletes y servicios</p>
                </div>
              </div>
              <p className="text-xl font-bold text-blue-700">{formatMoney(monthlyData.facturacionTotal)}</p>
            </div>

            {/* Costos Directos */}
            <div className="ml-4 pl-4 border-l-2 border-dashed border-slate-300 space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Minus className="h-3 w-3" />
                <span className="font-medium">Costos Directos de Viaje</span>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="p-2 bg-rose-50 rounded border border-rose-100">
                  <div className="flex items-center gap-2 mb-1">
                    <Fuel className="h-3 w-3 text-rose-600" />
                    <span className="text-xs text-rose-700">Diésel</span>
                  </div>
                  <p className="font-semibold text-rose-700 text-sm">-{formatMoney(monthlyData.costosDirectos.diesel)}</p>
                </div>
                <div className="p-2 bg-rose-50 rounded border border-rose-100">
                  <div className="flex items-center gap-2 mb-1">
                    <Truck className="h-3 w-3 text-rose-600" />
                    <span className="text-xs text-rose-700">Casetas</span>
                  </div>
                  <p className="font-semibold text-rose-700 text-sm">-{formatMoney(monthlyData.costosDirectos.casetas)}</p>
                </div>
                <div className="p-2 bg-rose-50 rounded border border-rose-100">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="h-3 w-3 text-rose-600" />
                    <span className="text-xs text-rose-700">Operadores</span>
                  </div>
                  <p className="font-semibold text-rose-700 text-sm">-{formatMoney(monthlyData.costosDirectos.pagosOperadores)}</p>
                </div>
                <div className="p-2 bg-rose-50 rounded border border-rose-100">
                  <div className="flex items-center gap-2 mb-1">
                    <Wallet className="h-3 w-3 text-rose-600" />
                    <span className="text-xs text-rose-700">Viáticos</span>
                  </div>
                  <p className="font-semibold text-rose-700 text-sm">-{formatMoney(monthlyData.costosDirectos.gastosViaje)}</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-2 bg-slate-100 rounded">
                <span className="text-sm font-medium">Subtotal Costos Directos</span>
                <span className="font-bold text-rose-700">-{formatMoney(totalCostosDirectos)}</span>
              </div>
            </div>

            {/* Utilidad Bruta */}
            <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <ArrowDown className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-medium text-amber-900">= Utilidad Bruta</p>
                  <p className="text-xs text-amber-600">Margen: {margenBruto.toFixed(1)}%</p>
                </div>
              </div>
              <p className="text-xl font-bold text-amber-700">{formatMoney(utilidadBruta)}</p>
            </div>

            {/* Gastos Mantenimiento */}
            <div className="ml-4 pl-4 border-l-2 border-dashed border-slate-300 space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Minus className="h-3 w-3" />
                <span className="font-medium">Gastos de Mantenimiento</span>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 bg-orange-50 rounded border border-orange-100">
                  <div className="flex items-center gap-2 mb-1">
                    <Wrench className="h-3 w-3 text-orange-600" />
                    <span className="text-xs text-orange-700">Refacciones</span>
                  </div>
                  <p className="font-semibold text-orange-700 text-sm">-{formatMoney(monthlyData.gastosMantenimiento.refacciones)}</p>
                </div>
                <div className="p-2 bg-orange-50 rounded border border-orange-100">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="h-3 w-3 text-orange-600" />
                    <span className="text-xs text-orange-700">Mano de Obra</span>
                  </div>
                  <p className="font-semibold text-orange-700 text-sm">-{formatMoney(monthlyData.gastosMantenimiento.manoObra)}</p>
                </div>
              </div>
            </div>

            {/* Gastos Indirectos */}
            <div className="ml-4 pl-4 border-l-2 border-dashed border-slate-300 space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Minus className="h-3 w-3" />
                <span className="font-medium">Gastos Indirectos (Oficina/Admin)</span>
              </div>
              
              <div className="flex items-center justify-between p-2 bg-slate-100 rounded">
                <span className="text-sm font-medium">Total Gastos Indirectos</span>
                <span className="font-bold text-slate-700">-{formatMoney(totalGastosIndirectos)}</span>
              </div>
            </div>

            {/* Utilidad Neta */}
            <div className={`flex items-center justify-between p-4 rounded-lg border-2 ${utilidadNeta > 0 ? 'bg-emerald-50 border-emerald-300' : 'bg-rose-50 border-rose-300'}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${utilidadNeta > 0 ? 'bg-emerald-200' : 'bg-rose-200'}`}>
                  {utilidadNeta > 0 ? (
                    <TrendingUp className="h-5 w-5 text-emerald-700" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-rose-700" />
                  )}
                </div>
                <div>
                  <p className={`font-bold ${utilidadNeta > 0 ? 'text-emerald-900' : 'text-rose-900'}`}>
                    = UTILIDAD NETA OPERATIVA
                  </p>
                  <p className={`text-xs ${utilidadNeta > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    Margen Neto: {margenNeto.toFixed(1)}%
                  </p>
                </div>
              </div>
              <p className={`text-2xl font-bold ${utilidadNeta > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {formatMoney(utilidadNeta)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Two Column Layout */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Cash Flow Projection */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Flujo de Efectivo Proyectado
              <Badge 
                variant="outline" 
                className={cashFlowIsPositive ? 'text-emerald-700 border-emerald-300 ml-auto' : 'text-rose-700 border-rose-300 ml-auto'}
              >
                {cashFlowIsPositive ? 'Positivo' : 'Alerta'}
              </Badge>
            </CardTitle>
            <CardDescription>
              Proyección a 30 días: Cobros esperados vs Pagos comprometidos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cashFlowData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="fecha" 
                    tick={{ fontSize: 10 }} 
                    interval={4}
                  />
                  <YAxis 
                    tick={{ fontSize: 10 }} 
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    formatter={(value: number) => formatMoney(value)}
                    labelFormatter={(label) => `Fecha: ${label}`}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                  />
                  <Legend />
                  <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                  <Line 
                    type="monotone" 
                    dataKey="cobrosEsperados" 
                    name="Cobros Esperados" 
                    stroke="hsl(142, 76%, 36%)" 
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="pagosComprometidos" 
                    name="Pagos Comprometidos" 
                    stroke="hsl(0, 84%, 60%)" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Cash flow summary */}
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="p-2 bg-emerald-50 rounded">
                <p className="text-xs text-emerald-600">Cobros 30d</p>
                <p className="font-bold text-emerald-700 text-sm">{formatMoney(lastCashFlowPoint?.cobrosEsperados || 0)}</p>
              </div>
              <div className="p-2 bg-rose-50 rounded">
                <p className="text-xs text-rose-600">Pagos 30d</p>
                <p className="font-bold text-rose-700 text-sm">{formatMoney(lastCashFlowPoint?.pagosComprometidos || 0)}</p>
              </div>
              <div className={`p-2 rounded ${cashFlowIsPositive ? 'bg-emerald-100' : 'bg-rose-100'}`}>
                <p className={`text-xs ${cashFlowIsPositive ? 'text-emerald-600' : 'text-rose-600'}`}>Diferencia</p>
                <p className={`font-bold text-sm ${cashFlowIsPositive ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {formatMoney(lastCashFlowPoint?.diferencia || 0)}
                </p>
              </div>
            </div>

            {!cashFlowIsPositive && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-600 mt-0.5" />
                <div className="text-sm text-rose-800">
                  <p className="font-medium">Alerta de Liquidez</p>
                  <p className="text-xs">Los pagos comprometidos superan los cobros esperados. Revisa la cartera de cobranza.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Indirect Expenses */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Top Gastos Indirectos
            </CardTitle>
            <CardDescription>
              ¿En qué se va el dinero de la oficina?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={topExpenses}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                  <XAxis 
                    type="number" 
                    tick={{ fontSize: 10 }}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="categoria" 
                    tick={{ fontSize: 11 }}
                    width={120}
                  />
                  <Tooltip 
                    formatter={(value: number) => formatMoney(value)}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                  />
                  <Bar dataKey="monto" name="Monto" radius={[0, 4, 4, 0]}>
                    {topExpenses.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={index === 0 ? 'hsl(215, 20%, 65%)' : `hsl(215, 20%, ${75 + index * 5}%)`}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Expense breakdown list */}
            <div className="mt-4 space-y-2">
              {topExpenses.map((expense, idx) => (
                <div key={expense.key} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-4">{idx + 1}.</span>
                    {getCategoryIcon(expense.key)}
                    <span className="text-sm">{expense.categoria}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{formatMoney(expense.monto)}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {((expense.monto / totalGastosIndirectos) * 100).toFixed(0)}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>

            <Separator className="my-4" />

            <div className="flex items-center justify-between">
              <span className="font-medium">Total Gastos Indirectos</span>
              <span className="font-bold text-lg">{formatMoney(totalGastosIndirectos)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
