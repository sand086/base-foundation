import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Eye, EyeOff, Wand2, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  showGenerator?: boolean;
  showStrength?: boolean;
  className?: string;
}

// Password strength calculation
const calculateStrength = (password: string): { score: number; label: string; color: string } => {
  let score = 0;

  if (!password) return { score: 0, label: "Sin contraseña", color: "bg-muted" };

  // Length checks
  if (password.length >= 8) score += 20;
  if (password.length >= 12) score += 10;
  if (password.length >= 16) score += 10;

  // Character type checks
  if (/[a-z]/.test(password)) score += 10;
  if (/[A-Z]/.test(password)) score += 15;
  if (/[0-9]/.test(password)) score += 15;
  if (/[^a-zA-Z0-9]/.test(password)) score += 20;

  // Variety bonus
  const uniqueChars = new Set(password).size;
  if (uniqueChars >= 8) score += Math.min(20, (uniqueChars - 8) * 2);

  // Penalties
  if (/(.)\1{2,}/.test(password)) score -= 10; // Repeated characters
  if (/^[a-zA-Z]+$/.test(password)) score -= 10; // Only letters
  if (/^[0-9]+$/.test(password)) score -= 20; // Only numbers

  score = Math.max(0, Math.min(100, score));

  if (score < 30) return { score, label: "Muy débil", color: "bg-destructive" };
  if (score < 50) return { score, label: "Débil", color: "bg-orange-500" };
  if (score < 70) return { score, label: "Moderada", color: "bg-yellow-500" };
  if (score < 90) return { score, label: "Fuerte", color: "bg-emerald-500" };
  return { score, label: "Muy fuerte", color: "bg-green-600" };
};

// Secure password generator
const generateSecurePassword = (length = 16): string => {
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";
  const symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?";
  const allChars = lowercase + uppercase + numbers + symbols;

  // Ensure at least one of each type
  let password = "";
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];

  // Fill the rest
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle
  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
};

export function PasswordInput({
  value,
  onChange,
  placeholder = "••••••••",
  id,
  showGenerator = true,
  showStrength = true,
  className,
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  const strength = useMemo(() => calculateStrength(value), [value]);

  const handleGenerate = () => {
    const newPassword = generateSecurePassword(16);
    onChange(newPassword);
    setShowPassword(true);
    toast.success("Contraseña segura generada");
  };

  const handleCopy = async () => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success("Contraseña copiada");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="relative flex gap-2">
        <div className="relative flex-1">
          <Input
            id={id}
            type={showPassword ? "text" : "password"}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="pr-20 h-9 text-sm font-mono"
          />
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
            {value && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-green-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff className="h-3.5 w-3.5" />
              ) : (
                <Eye className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>

        {showGenerator && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 shrink-0"
            onClick={handleGenerate}
          >
            <Wand2 className="h-3.5 w-3.5" />
            Generar
          </Button>
        )}
      </div>

      {showStrength && value && (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Progress
              value={strength.score}
              className={cn("h-1.5 flex-1", strength.color)}
            />
            <span
              className={cn(
                "text-xs font-medium",
                strength.score < 50 ? "text-destructive" : 
                strength.score < 70 ? "text-yellow-600" : "text-green-600"
              )}
            >
              {strength.label}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Usa mayúsculas, minúsculas, números y símbolos para mayor seguridad.
          </p>
        </div>
      )}
    </div>
  );
}
