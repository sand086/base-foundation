import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Truck, Lock, User, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const success = login(username, password);
    
    if (success) {
      toast({
        title: "Bienvenido",
        description: "Has iniciado sesión correctamente",
      });
      navigate('/', { replace: true });
    } else {
      setError('Usuario o contraseña incorrectos');
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background with gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-black via-brand-dark to-brand-black" />
      
      {/* Decorative elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-red rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-brand-green rounded-full blur-3xl" />
      </div>
      
      {/* Grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}
      />

      {/* Login Card */}
      <Card className="w-full max-w-md mx-4 relative z-10 bg-card/95 backdrop-blur-sm border-border shadow-2xl">
        <CardHeader className="space-y-4 pb-6">
          {/* Logo Area */}
          <div className="flex flex-col items-center space-y-4">
            <div className="w-20 h-20 bg-brand-red rounded-2xl flex items-center justify-center shadow-lg">
              <Truck className="w-12 h-12 text-white" />
            </div>
            <div className="text-center">
              <h1 className="text-3xl font-bold text-foreground tracking-tight">
                Rápidos <span className="text-brand-red">3T</span>
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Transport Management System
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-status-danger-bg border border-status-danger-border rounded-md text-status-danger text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Username Field */}
            <div className="space-y-2">
              <Label htmlFor="username" className="text-foreground font-medium">
                Usuario
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="username"
                  type="text"
                  placeholder="Ingresa tu usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10 h-11 bg-background border-input focus:border-brand-red focus:ring-brand-red"
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground font-medium">
                Contraseña
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Ingresa tu contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-11 bg-background border-input focus:border-brand-red focus:ring-brand-red"
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-11 bg-brand-red hover:bg-brand-red/90 text-white font-semibold text-base transition-all duration-200 shadow-lg hover:shadow-xl"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Ingresando...
                </span>
              ) : (
                'Iniciar Sesión'
              )}
            </Button>

            {/* Demo Credentials Hint */}
            <div className="pt-4 border-t border-border">
              <p className="text-xs text-center text-muted-foreground">
                <span className="font-medium">Demo:</span> Usuario{' '}
                <code className="px-1 py-0.5 bg-muted rounded text-foreground">admin</code> / Contraseña{' '}
                <code className="px-1 py-0.5 bg-muted rounded text-foreground">admin</code>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="absolute bottom-4 left-0 right-0 text-center">
        <p className="text-xs text-white/40">
          © 2024 Rápidos 3T — Sistema de Gestión de Transporte
        </p>
      </div>
    </div>
  );
}
