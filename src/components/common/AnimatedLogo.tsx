import { cn } from "@/lib/utils";

interface AnimatedLogoProps {
  className?: string;
  collapsed?: boolean;
}

export function AnimatedLogo({ className, collapsed = false }: AnimatedLogoProps) {
  if (collapsed) {
    // Mini version - just the icon
    return (
      <div className={cn("relative", className)}>
        <svg
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          {/* Glow filter */}
          <defs>
            <filter id="glow-mini" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="logoGradientMini" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--brand-red))" />
              <stop offset="100%" stopColor="hsl(var(--brand-red))" stopOpacity="0.7" />
            </linearGradient>
          </defs>
          
          {/* Hexagon shield shape */}
          <path
            d="M20 2L36 11V29L20 38L4 29V11L20 2Z"
            fill="none"
            stroke="url(#logoGradientMini)"
            strokeWidth="2"
            filter="url(#glow-mini)"
            className="animate-logo-draw"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* 3T text stylized */}
          <text
            x="20"
            y="24"
            textAnchor="middle"
            fill="white"
            fontSize="12"
            fontWeight="bold"
            fontFamily="system-ui, sans-serif"
            className="animate-fade-in"
            style={{ animationDelay: '0.5s' }}
          >
            3T
          </text>
          
          {/* Speed lines */}
          <g className="animate-speed-lines" style={{ animationDelay: '0.8s' }}>
            <line x1="8" y1="15" x2="3" y2="15" stroke="hsl(var(--brand-red))" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
            <line x1="8" y1="20" x2="1" y2="20" stroke="hsl(var(--brand-red))" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
            <line x1="8" y1="25" x2="3" y2="25" stroke="hsl(var(--brand-red))" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
          </g>
        </svg>
      </div>
    );
  }

  // Full version with text
  return (
    <div className={cn("relative flex items-center gap-3", className)}>
      {/* Animated Icon */}
      <div className="relative w-10 h-10 flex-shrink-0">
        <svg
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          {/* Glow filter */}
          <defs>
            <filter id="glow-full" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--brand-red))" />
              <stop offset="50%" stopColor="hsl(var(--brand-red))" />
              <stop offset="100%" stopColor="hsl(0, 60%, 45%)" />
            </linearGradient>
            <linearGradient id="shieldFill" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--brand-red))" stopOpacity="0.15" />
              <stop offset="100%" stopColor="hsl(var(--brand-red))" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          
          {/* Hexagon shield - filled background */}
          <path
            d="M20 2L36 11V29L20 38L4 29V11L20 2Z"
            fill="url(#shieldFill)"
            className="animate-fade-in"
          />
          
          {/* Hexagon shield - animated stroke */}
          <path
            d="M20 2L36 11V29L20 38L4 29V11L20 2Z"
            fill="none"
            stroke="url(#logoGradient)"
            strokeWidth="2"
            filter="url(#glow-full)"
            className="animate-logo-draw"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Inner geometric accent */}
          <path
            d="M20 8L30 14V26L20 32L10 26V14L20 8Z"
            fill="none"
            stroke="hsl(var(--brand-red))"
            strokeWidth="1"
            opacity="0.3"
            className="animate-logo-draw-delayed"
          />
          
          {/* 3T text stylized */}
          <text
            x="20"
            y="24"
            textAnchor="middle"
            fill="white"
            fontSize="11"
            fontWeight="bold"
            fontFamily="system-ui, sans-serif"
            className="animate-fade-in"
            style={{ animationDelay: '0.5s' }}
          >
            3T
          </text>
          
          {/* Speed lines - motion effect */}
          <g className="animate-speed-lines" style={{ animationDelay: '0.8s' }}>
            <line x1="6" y1="14" x2="0" y2="14" stroke="hsl(var(--brand-red))" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
            <line x1="6" y1="20" x2="-2" y2="20" stroke="hsl(var(--brand-red))" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
            <line x1="6" y1="26" x2="0" y2="26" stroke="hsl(var(--brand-red))" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
          </g>
        </svg>
        
        {/* Pulse glow effect */}
        <div className="absolute inset-0 bg-brand-red/20 rounded-full blur-xl animate-pulse-slow opacity-50" />
      </div>
      
      {/* Text with gradient */}
      <div className="flex flex-col">
        <span className="text-lg font-bold tracking-tight text-gradient-title leading-none">
          Rápidos 3T
        </span>
        <span className="text-[10px] text-muted-foreground tracking-widest uppercase">
          TMS Pro
        </span>
      </div>
    </div>
  );
}
