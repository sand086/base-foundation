import { useState, useRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
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
  Calendar as CalendarIcon,
  User,
  Truck,
  Pencil,
  Save,
  X,
  UploadCloud,
  FileText,
  Image as ImageIcon,
  GripVertical,
  Camera
} from 'lucide-react';
import { Operador, getDaysUntilExpiry, getExpiryStatus } from '@/data/flotaData';
import { format, differenceInYears } from 'date-fns';
import { es } from 'date-fns/locale';

interface OperatorDetailSheetProps {
  operator: Operador | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (operator: Operador) => void;
}

interface DocumentItem {
  id: string;
  name: string;
  type: 'pdf' | 'image';
  status: 'vigente' | 'por_vencer' | 'faltante' | 'vencido';
  expiryDate?: string;
  fileName?: string;
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

const getDocStatusBadge = (status: DocumentItem['status']) => {
  switch (status) {
    case 'vigente':
      return <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30 text-[10px]">Vigente</Badge>;
    case 'por_vencer':
      return <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30 text-[10px]">Por Vencer</Badge>;
    case 'vencido':
      return <Badge className="bg-rose-500/20 text-rose-500 border-rose-500/30 text-[10px]">Vencido</Badge>;
    case 'faltante':
      return <Badge className="bg-muted/50 text-muted-foreground border-muted text-[10px]">Faltante</Badge>;
  }
};

export function OperatorDetailSheet({ operator, open, onOpenChange, onSave }: OperatorDetailSheetProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null);

  // Editable form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    license_number: '',
    license_expiry: new Date(),
    medical_check_expiry: new Date(),
  });

  // Mock documents data
  const [documents, setDocuments] = useState<DocumentItem[]>([
    { id: 'lic', name: 'Licencia Federal', type: 'pdf', status: 'vigente', expiryDate: '2025-08-15', fileName: 'licencia_federal.pdf' },
    { id: 'ine', name: 'INE / Identificación', type: 'image', status: 'vigente', fileName: 'ine_frente.jpg' },
    { id: 'med', name: 'Apto Médico', type: 'pdf', status: 'por_vencer', expiryDate: '2025-03-20' },
    { id: 'dom', name: 'Comprobante Domicilio', type: 'pdf', status: 'faltante' },
    { id: 'ant', name: 'Antecedentes No Penales', type: 'pdf', status: 'vigente', fileName: 'antecedentes.pdf' },
  ]);

  // Initialize form when operator changes
  const initializeForm = () => {
    if (operator) {
      setFormData({
        name: operator.name,
        phone: operator.phone,
        email: `${operator.name.toLowerCase().replace(/\s+/g, '.')}@rapidos3t.com`,
        license_number: operator.license_number,
        license_expiry: new Date(operator.license_expiry),
        medical_check_expiry: new Date(operator.medical_check_expiry),
      });
      
      // Update documents based on operator data
      setDocuments(prev => prev.map(doc => {
        if (doc.id === 'lic') {
          return { ...doc, status: getExpiryStatus(operator.license_expiry) === 'danger' ? 'vencido' : 
                                   getExpiryStatus(operator.license_expiry) === 'warning' ? 'por_vencer' : 'vigente',
                   expiryDate: operator.license_expiry };
        }
        if (doc.id === 'med') {
          return { ...doc, status: getExpiryStatus(operator.medical_check_expiry) === 'danger' ? 'vencido' : 
                                   getExpiryStatus(operator.medical_check_expiry) === 'warning' ? 'por_vencer' : 'vigente',
                   expiryDate: operator.medical_check_expiry };
        }
        return doc;
      }));
    }
  };

  // Reset form when sheet opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && operator) {
      initializeForm();
      setIsEditing(false);
    }
    onOpenChange(newOpen);
  };

  const handleStartEditing = () => {
    initializeForm();
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    initializeForm();
    setIsEditing(false);
  };

  const handleSave = () => {
    if (operator) {
      const updatedOperator: Operador = {
        ...operator,
        name: formData.name,
        phone: formData.phone,
        license_number: formData.license_number,
        license_expiry: format(formData.license_expiry, 'yyyy-MM-dd'),
        medical_check_expiry: format(formData.medical_check_expiry, 'yyyy-MM-dd'),
      };
      onSave?.(updatedOperator);
      toast({
        title: 'Cambios guardados',
        description: `El expediente de ${formData.name} ha sido actualizado.`,
      });
    }
    setIsEditing(false);
  };

  const handleFileUpload = (docId: string) => {
    setUploadingDocId(docId);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && uploadingDocId) {
      setDocuments(prev => prev.map(doc => 
        doc.id === uploadingDocId 
          ? { ...doc, fileName: file.name, status: 'vigente' as const }
          : doc
      ));
      toast({
        title: 'Documento subido',
        description: `${file.name} se ha cargado correctamente.`,
      });
      setUploadingDocId(null);
    }
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      toast({
        title: `${files.length} archivo(s) recibido(s)`,
        description: 'Los documentos se están procesando...',
      });
    }
  };

  if (!operator) return null;

  const daysUntilLicenseExpiry = getDaysUntilExpiry(operator.license_expiry);
  const daysUntilMedicalExpiry = getDaysUntilExpiry(operator.medical_check_expiry);
  const licenseStatus = getExpiryStatus(operator.license_expiry);
  const medicalStatus = getExpiryStatus(operator.medical_check_expiry);
  const yearsOfService = differenceInYears(new Date(), new Date(operator.hire_date));

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        {/* Hidden file inputs */}
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleFileChange}
        />
        <input 
          type="file" 
          ref={avatarInputRef} 
          className="hidden" 
          accept="image/*"
          onChange={(e) => {
            if (e.target.files?.[0]) {
              toast({ title: 'Foto actualizada', description: 'La nueva foto de perfil se ha guardado.' });
            }
          }}
        />

        {/* Header with Edit/Save toggle */}
        <SheetHeader className="pb-4 flex flex-row items-center justify-between">
          <SheetTitle className="text-lg font-semibold">Expediente de Operador</SheetTitle>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleCancelEditing}
                  className="gap-1.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                  Cancelar
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleSave}
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Save className="h-4 w-4" />
                  Guardar
                </Button>
              </>
            ) : (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleStartEditing}
                className="gap-1.5 bg-white/5 border-white/10 hover:bg-white/10"
              >
                <Pencil className="h-4 w-4" />
                Editar
              </Button>
            )}
          </div>
        </SheetHeader>

        {/* Hero Section with Avatar */}
        <div className="flex flex-col items-center text-center mb-6 pt-2">
          <div className="relative group">
            <div className={`p-1 rounded-full ring-4 ${getStatusColor(operator.status)} transition-all`}>
              <Avatar className="h-28 w-28">
                <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${operator.name}`} />
                <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-primary/20 to-primary/5">
                  {operator.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              {isEditing && (
                <button 
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Camera className="h-6 w-6 text-white" />
                </button>
              )}
            </div>
            <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-semibold
              ${operator.status === 'activo' ? 'bg-emerald-500 text-white' : 
                operator.status === 'inactivo' ? 'bg-rose-500 text-white' :
                operator.status === 'vacaciones' ? 'bg-sky-500 text-white' : 
                'bg-amber-500 text-black'}`}>
              {getStatusLabel(operator.status)}
            </div>
          </div>

          {/* Editable Name & Contact */}
          <div className="mt-4 w-full max-w-xs space-y-2">
            {isEditing ? (
              <>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="text-center text-xl font-bold bg-white/5 border-white/10"
                />
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="text-center text-sm bg-white/5 border-white/10"
                  placeholder="Teléfono"
                />
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold text-foreground">{operator.name}</h2>
                <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                  <User className="h-3.5 w-3.5" /> {operator.id}
                </p>
              </>
            )}
          </div>

          {operator.assigned_unit && !isEditing && (
            <Badge variant="outline" className="mt-2 font-mono gap-1">
              <Truck className="h-3 w-3" />
              Unidad {operator.assigned_unit}
            </Badge>
          )}
          {!isEditing && (
            <p className="text-xs text-muted-foreground mt-1">
              {yearsOfService > 0 ? `${yearsOfService} años` : 'Menos de 1 año'} en la empresa
            </p>
          )}
        </div>

        {/* Bento Grid Content */}
        <div className="space-y-4">
          
          {/* License Card - Digital Wallet Style */}
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

            {isEditing ? (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Número de Licencia</Label>
                  <Input
                    value={formData.license_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, license_number: e.target.value }))}
                    className="font-mono bg-white/5 border-white/10 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Fecha de Vencimiento</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal bg-white/5 border-white/10 mt-1",
                          !formData.license_expiry && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.license_expiry ? format(formData.license_expiry, "PPP", { locale: es }) : "Seleccionar fecha"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.license_expiry}
                        onSelect={(date) => date && setFormData(prev => ({ ...prev, license_expiry: date }))}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            ) : (
              <>
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
              </>
            )}
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
              {isEditing ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="bg-white/5 border-white/10">
                      <CalendarIcon className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="single"
                      selected={formData.medical_check_expiry}
                      onSelect={(date) => date && setFormData(prev => ({ ...prev, medical_check_expiry: date }))}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              ) : (
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Vence</p>
                  <p className="text-sm font-medium text-foreground/80">
                    {format(new Date(operator.medical_check_expiry), 'dd/MM/yy')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Document Management Section */}
          <div className="rounded-xl p-4 bg-white/5 dark:bg-black/20 border border-white/10 backdrop-blur-sm">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Documentación Legal
            </h3>

            {/* Document List */}
            <div className="space-y-2 mb-4">
              {documents.map((doc) => (
                <div 
                  key={doc.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors group"
                >
                  <div className="p-2 rounded-lg bg-muted/30">
                    {doc.type === 'pdf' ? (
                      <FileText className="h-4 w-4 text-rose-400" />
                    ) : (
                      <ImageIcon className="h-4 w-4 text-sky-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{doc.name}</p>
                    {doc.fileName ? (
                      <p className="text-xs text-muted-foreground truncate">{doc.fileName}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">Sin archivo</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {getDocStatusBadge(doc.status)}
                    {isEditing && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleFileUpload(doc.id)}
                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <UploadCloud className="h-4 w-4 text-primary" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Drag & Drop Zone - Only visible in edit mode */}
            {isEditing && (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                  "relative border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer",
                  isDragOver 
                    ? "border-primary bg-primary/10 scale-[1.02]" 
                    : "border-white/20 bg-white/5 hover:border-white/30 hover:bg-white/10"
                )}
              >
                <div className="flex flex-col items-center gap-2">
                  <div className={cn(
                    "p-3 rounded-full transition-colors",
                    isDragOver ? "bg-primary/20" : "bg-muted/30"
                  )}>
                    <UploadCloud className={cn(
                      "h-6 w-6 transition-colors",
                      isDragOver ? "text-primary" : "text-muted-foreground"
                    )} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {isDragOver ? "Suelta para subir" : "Arrastra archivos aquí"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PDF, JPG o PNG hasta 10MB
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Contact Information - View only */}
          {!isEditing && (
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
              </div>
            </div>
          )}

          {/* Performance Badges - View only */}
          {!isEditing && (
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
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
