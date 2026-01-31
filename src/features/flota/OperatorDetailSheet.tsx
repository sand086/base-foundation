import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Phone, 
  Mail, 
  MapPin, 
  Shield, 
  Award,
  Fuel,
  Clock,
  Heart,
  CheckCircle,
  AlertTriangle,
  XCircle,
  CreditCard,
  Calendar,
  User,
  Truck
} from 'lucide-react';
import { Operador, getDaysUntilExpiry, getExpiryStatus } from '@/data/flotaData';
import { format, differenceInYears } from 'date-fns';
import { es } from 'date-fns/locale';

interface OperatorDetailSheetProps {
  operator: Operador | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'activo':
      return 'ring-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)]';
    case 'inactivo':
      return 'ring-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.4)]';
    case 'vacaciones':
      return 'ring-sky-500 shadow-[0_0_20px_rgba(14,165,233,0.4)]';
    case 'incapacidad':
      return 'ring-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.4)]';
    default:
      return 'ring-muted';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'activo': return 'Activo';
    case 'inactivo': return 'Inactivo';
    case 'vacaciones': return 'Vacaciones';
    case 'incapacidad': return 'Incapacidad';
    default: return status;
  }
};

const getLicenseProgress = (expiryDate: string): number => {
  const daysUntil = getDaysUntilExpiry(expiryDate);
  // Assume license is valid for 2 years (730 days)
  const totalDays = 730;
  const daysRemaining = Math.max(0, Math.min(daysUntil, totalDays));
  return (daysRemaining / totalDays) * 100;
};

const getLicenseProgressColor = (expiryDate: string): string => {
  const status = getExpiryStatus(expiryDate);
  switch (status) {
    case 'danger': return 'bg-rose-500';
    case 'warning': return 'bg-amber-500';
    case 'success': return 'bg-emerald-500';
  }
};

export function OperatorDetailSheet({ operator, open, onOpenChange }: OperatorDetailSheetProps) {
  if (!operator) return null;

  const daysUntilLicenseExpiry = getDaysUntilExpiry(operator.license_expiry);
  const daysUntilMedicalExpiry = getDaysUntilExpiry(operator.medical_check_expiry);
  const licenseStatus = getExpiryStatus(operator.license_expiry);
  const medicalStatus = getExpiryStatus(operator.medical_check_expiry);
  const yearsOfService = differenceInYears(new Date(), new Date(operator.hire_date));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="sr-only">Expediente de {operator.name}</SheetTitle>
        </SheetHeader>

        {/* Hero Section */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className={`relative p-1 rounded-full ring-4 ${getStatusColor(operator.status)} transition-all`}>
            <Avatar className="h-28 w-28">
              <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${operator.name}`} />
              <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-primary/20 to-primary/5">
                {operator.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-semibold
              ${operator.status === 'activo' ? 'bg-emerald-500 text-white' : 
                operator.status === 'inactivo' ? 'bg-rose-500 text-white' :
                operator.status === 'vacaciones' ? 'bg-sky-500 text-white' : 
                'bg-amber-500 text-black'}`}>
              {getStatusLabel(operator.status)}
            </div>
          </div>
          <h2 className="mt-4 text-xl font-bold text-foreground">{operator.name}</h2>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <User className="h-3.5 w-3.5" /> {operator.id}
          </p>
          {operator.assigned_unit && (
            <Badge variant="outline" className="mt-2 font-mono gap-1">
              <Truck className="h-3 w-3" />
              Unidad {operator.assigned_unit}
            </Badge>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {yearsOfService > 0 ? `${yearsOfService} años` : 'Menos de 1 año'} en la empresa
          </p>
        </div>

        {/* Bento Grid Layout */}
        <div className="space-y-4">
          
          {/* License Card - Digital Card Style */}
          <div className="relative overflow-hidden rounded-2xl p-4 
            bg-gradient-to-br from-primary/10 via-primary/5 to-transparent
            border border-white/10 backdrop-blur-sm">
            <div className="absolute top-2 right-2">
              <CreditCard className="h-5 w-5 text-muted-foreground/30" />
            </div>
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Licencia Federal</p>
                <p className="text-lg font-bold text-foreground">Tipo {operator.license_type}</p>
              </div>
              <div className={`px-2.5 py-1 rounded-full text-xs font-semibold
                ${licenseStatus === 'success' ? 'bg-emerald-500/20 text-emerald-500' :
                  licenseStatus === 'warning' ? 'bg-amber-500/20 text-amber-500' :
                  'bg-rose-500/20 text-rose-500'}`}>
                {daysUntilLicenseExpiry < 0 ? 'Vencida' : 
                 daysUntilLicenseExpiry === 0 ? 'Vence hoy' :
                 `${daysUntilLicenseExpiry} días`}
              </div>
            </div>
            <p className="font-mono text-sm text-foreground/80 mb-3">{operator.license_number}</p>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Vigencia</span>
                <span className="text-foreground/80">
                  {format(new Date(operator.license_expiry), 'dd MMM yyyy', { locale: es })}
                </span>
              </div>
              <div className="relative h-2 rounded-full bg-muted/50 overflow-hidden">
                <div 
                  className={`absolute inset-y-0 left-0 rounded-full transition-all ${getLicenseProgressColor(operator.license_expiry)}`}
                  style={{ width: `${getLicenseProgress(operator.license_expiry)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Medical Check Card */}
          <div className={`rounded-xl p-4 border backdrop-blur-sm transition-all
            ${medicalStatus === 'success' ? 'bg-emerald-500/5 border-emerald-500/20' :
              medicalStatus === 'warning' ? 'bg-amber-500/5 border-amber-500/20' :
              'bg-rose-500/5 border-rose-500/20'}`}>
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl
                ${medicalStatus === 'success' ? 'bg-emerald-500/20' :
                  medicalStatus === 'warning' ? 'bg-amber-500/20' :
                  'bg-rose-500/20'}`}>
                {medicalStatus === 'success' ? (
                  <CheckCircle className="h-6 w-6 text-emerald-500" />
                ) : medicalStatus === 'warning' ? (
                  <AlertTriangle className="h-6 w-6 text-amber-500" />
                ) : (
                  <XCircle className="h-6 w-6 text-rose-500" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">Examen Psicofísico</p>
                <p className={`text-xs ${
                  medicalStatus === 'success' ? 'text-emerald-500' :
                  medicalStatus === 'warning' ? 'text-amber-500' :
                  'text-rose-500'
                }`}>
                  {daysUntilMedicalExpiry < 0 ? 'VENCIDO' : 
                   daysUntilMedicalExpiry <= 30 ? `VENCE EN ${daysUntilMedicalExpiry} DÍAS` : 
                   'VIGENTE'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Vence</p>
                <p className="text-sm font-medium text-foreground/80">
                  {format(new Date(operator.medical_check_expiry), 'dd/MM/yy')}
                </p>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="rounded-xl p-4 bg-white/5 dark:bg-black/20 border border-white/10 backdrop-blur-sm">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Phone className="h-4 w-4 text-primary" />
              Datos de Contacto
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <div className="p-2 rounded-lg bg-muted/30">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Teléfono</p>
                  <a href={`tel:${operator.phone}`} className="text-foreground hover:text-primary transition-colors">
                    {operator.phone}
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="p-2 rounded-lg bg-muted/30">
                  <Heart className="h-4 w-4 text-rose-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Contacto de Emergencia</p>
                  <p className="text-foreground">{operator.emergency_contact}</p>
                  <p className="text-xs text-muted-foreground">{operator.emergency_phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="p-2 rounded-lg bg-muted/30">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Fecha de Ingreso</p>
                  <p className="text-foreground">
                    {format(new Date(operator.hire_date), "dd 'de' MMMM, yyyy", { locale: es })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Badges */}
          <div className="rounded-xl p-4 bg-gradient-to-br from-amber-500/5 to-transparent border border-white/10 backdrop-blur-sm">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Award className="h-4 w-4 text-amber-500" />
              Reconocimientos
            </h3>
            <div className="flex flex-wrap gap-2">
              <Badge className="gap-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20">
                <Shield className="h-3.5 w-3.5" />
                Sin Accidentes
              </Badge>
              <Badge className="gap-1.5 bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20 hover:bg-sky-500/20">
                <Clock className="h-3.5 w-3.5" />
                Puntualidad
              </Badge>
              <Badge className="gap-1.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 hover:bg-purple-500/20">
                <Fuel className="h-3.5 w-3.5" />
                Eficiencia
              </Badge>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
