import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Home } from "lucide-react";
import robotTruck from "@/assets/robot-truck-404.png";
import logo from "@/assets/logo-negro.svg";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="relative min-h-screen overflow-hidden flex flex-col bg-gradient-to-b from-[hsl(210,40%,97%)] via-[hsl(210,30%,94%)] to-[hsl(210,25%,88%)]">

      {/* Logo top-left */}
      <img src={logo} alt="Logo" className="absolute top-5 left-5 sm:top-8 sm:left-8 w-28 sm:w-36 z-20 opacity-80" />

      {/* Clouds */}
      <svg className="absolute top-0 left-0 w-[300%] h-[25%] opacity-40 animate-[cloudDrift_60s_linear_infinite]" viewBox="0 0 4320 200" preserveAspectRatio="none">
        <ellipse cx="150" cy="80" rx="140" ry="50" fill="white" />
        <ellipse cx="240" cy="65" rx="100" ry="40" fill="white" />
        <ellipse cx="180" cy="90" rx="80" ry="30" fill="white" />
        <ellipse cx="600" cy="110" rx="120" ry="45" fill="white" />
        <ellipse cx="680" cy="95" rx="90" ry="35" fill="white" />
        <ellipse cx="1100" cy="70" rx="130" ry="48" fill="white" />
        <ellipse cx="1200" cy="58" rx="85" ry="32" fill="white" />
        <ellipse cx="1600" cy="100" rx="110" ry="42" fill="white" />
        <ellipse cx="1700" cy="85" rx="75" ry="30" fill="white" />
        <ellipse cx="2100" cy="75" rx="140" ry="50" fill="white" />
        <ellipse cx="2200" cy="62" rx="90" ry="35" fill="white" />
        <ellipse cx="2600" cy="95" rx="120" ry="44" fill="white" />
        <ellipse cx="2700" cy="80" rx="80" ry="30" fill="white" />
        <ellipse cx="3100" cy="70" rx="130" ry="46" fill="white" />
        <ellipse cx="3200" cy="58" rx="85" ry="32" fill="white" />
        <ellipse cx="3600" cy="100" rx="110" ry="40" fill="white" />
        <ellipse cx="3700" cy="85" rx="70" ry="28" fill="white" />
        <ellipse cx="4100" cy="78" rx="120" ry="42" fill="white" />
      </svg>

      {/* Birds */}
      <svg className="absolute top-[12%] opacity-25 animate-[birdFly_14s_linear_infinite]" style={{ left: "-30px" }} width="28" height="14" viewBox="0 0 28 14">
        <path d="M0 8 Q7 0 14 7 Q21 0 28 8" fill="none" stroke="hsl(var(--foreground))" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      <svg className="absolute top-[8%] opacity-20 animate-[birdFly_18s_linear_infinite]" style={{ left: "-30px", animationDelay: "4s" }} width="22" height="11" viewBox="0 0 28 14">
        <path d="M0 8 Q7 0 14 7 Q21 0 28 8" fill="none" stroke="hsl(var(--foreground))" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      <svg className="absolute top-[15%] opacity-15 animate-[birdFly_22s_linear_infinite]" style={{ left: "-30px", animationDelay: "8s" }} width="18" height="9" viewBox="0 0 28 14">
        <path d="M0 8 Q7 0 14 7 Q21 0 28 8" fill="none" stroke="hsl(var(--foreground))" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      <svg className="absolute top-[10%] opacity-20 animate-[birdFly_16s_linear_infinite]" style={{ left: "-30px", animationDelay: "2s" }} width="24" height="12" viewBox="0 0 28 14">
        <path d="M0 8 Q7 0 14 7 Q21 0 28 8" fill="none" stroke="hsl(var(--foreground))" strokeWidth="1.8" strokeLinecap="round" />
      </svg>

      {/* Buildings silhouette */}
      <svg className="absolute opacity-[0.06]" style={{ bottom: "48%", left: 0, right: 0, width: "100%" }} viewBox="0 0 1440 100" preserveAspectRatio="none">
        <rect x="30" y="20" width="50" height="80" fill="currentColor" className="text-foreground" />
        <rect x="95" y="35" width="40" height="65" fill="currentColor" className="text-foreground" />
        <rect x="150" y="10" width="30" height="90" fill="currentColor" className="text-foreground" />
        <rect x="200" y="30" width="70" height="70" fill="currentColor" className="text-foreground" />
        <rect x="370" y="15" width="25" height="85" fill="currentColor" className="text-foreground" />
        <rect x="420" y="35" width="60" height="65" fill="currentColor" className="text-foreground" />
        <rect x="900" y="30" width="50" height="70" fill="currentColor" className="text-foreground" />
        <rect x="1020" y="40" width="70" height="60" fill="currentColor" className="text-foreground" />
        <rect x="1170" y="35" width="55" height="65" fill="currentColor" className="text-foreground" />
        <rect x="1330" y="40" width="60" height="60" fill="currentColor" className="text-foreground" />
      </svg>

      {/* Gas Station — fuel pump only, doubled size, on the right */}
      <div className="absolute z-[3] hidden sm:block" style={{ bottom: "44%", right: "8%" }}>
        <svg width="200" height="180" viewBox="0 0 100 90" className="opacity-60">
          {/* Canopy */}
          <rect x="10" y="10" width="80" height="5" rx="2" fill="hsl(220,8%,75%)" />
          {/* Canopy poles */}
          <rect x="15" y="15" width="3" height="50" fill="hsl(220,8%,60%)" />
          <rect x="82" y="15" width="3" height="50" fill="hsl(220,8%,60%)" />
          {/* Pump island base */}
          <rect x="20" y="62" width="60" height="6" rx="2" fill="hsl(220,8%,78%)" stroke="hsl(220,8%,60%)" strokeWidth="1" />
          {/* Left pump */}
          <rect x="28" y="28" width="16" height="34" rx="2" fill="hsl(220,8%,88%)" stroke="hsl(220,8%,62%)" strokeWidth="1.2" />
          <rect x="30" y="32" width="12" height="8" rx="1" fill="hsl(220,8%,20%)" />
          <text x="36" y="39" textAnchor="middle" fill="hsl(var(--brand-green))" fontSize="5" fontWeight="bold" className="animate-[priceBlink_2s_ease-in-out_infinite]">
            $0.00
          </text>
          <rect x="31" y="43" width="4" height="3" rx="0.5" fill="hsl(var(--brand-red))" opacity="0.8" />
          <rect x="37" y="43" width="4" height="3" rx="0.5" fill="hsl(var(--brand-green))" opacity="0.8" />
          {/* Left hose */}
          <path d="M28 48 Q18 48 18 56 Q18 62 24 62" fill="none" stroke="hsl(220,8%,40%)" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="24" cy="62" r="1.5" fill="hsl(220,8%,30%)" />
          {/* Right pump */}
          <rect x="56" y="28" width="16" height="34" rx="2" fill="hsl(220,8%,88%)" stroke="hsl(220,8%,62%)" strokeWidth="1.2" />
          <rect x="58" y="32" width="12" height="8" rx="1" fill="hsl(220,8%,20%)" />
          <text x="64" y="39" textAnchor="middle" fill="hsl(var(--brand-green))" fontSize="5" fontWeight="bold" className="animate-[priceBlink_2s_ease-in-out_infinite]">
            $0.00
          </text>
          <rect x="59" y="43" width="4" height="3" rx="0.5" fill="hsl(var(--brand-red))" opacity="0.8" />
          <rect x="65" y="43" width="4" height="3" rx="0.5" fill="hsl(var(--brand-green))" opacity="0.8" />
          {/* Right hose */}
          <path d="M72 48 Q82 48 82 56 Q82 62 76 62" fill="none" stroke="hsl(220,8%,40%)" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="76" cy="62" r="1.5" fill="hsl(220,8%,30%)" />
          {/* Brand stripe on canopy */}
          <rect x="10" y="7" width="80" height="3" rx="1" fill="hsl(var(--brand-red))" opacity="0.85" />
          <rect x="10" y="5" width="80" height="2.5" rx="1" fill="hsl(var(--brand-green))" opacity="0.9" />
          {/* Ground */}
          <rect x="5" y="68" width="90" height="2" fill="hsl(30,10%,62%)" />
        </svg>
      </div>

      {/* Traffic sign — stop, left side */}
      <div className="absolute z-[3] opacity-40 hidden sm:block" style={{ bottom: "48%", left: "6%" }}>
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 rounded-full border-[3px] border-[hsl(var(--brand-red))] flex items-center justify-center bg-white/80">
            <span className="text-[hsl(var(--brand-red))] font-black text-xs">⛔</span>
          </div>
          <div className="w-[3px] h-16 bg-[hsl(220,8%,50%)]" />
        </div>
      </div>

      {/* 404 sign — RIGHT side of the image */}
      <div className="absolute z-[3] opacity-40 hidden lg:block" style={{ bottom: "48%", right: "32%" }}>
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 rounded-full border-[3px] border-[hsl(var(--brand-red))] flex items-center justify-center bg-white/80">
            <span className="text-foreground font-black text-[10px]">404</span>
          </div>
          <div className="w-[3px] h-16 bg-[hsl(220,8%,50%)]" />
        </div>
      </div>

      {/* Traffic light */}
      <div className="absolute z-[3] opacity-50 hidden md:flex flex-col items-center" style={{ bottom: "48%", left: "28%" }}>
        <div className="w-7 rounded-md bg-[hsl(220,8%,22%)] p-1 flex flex-col gap-1 items-center">
          <div className="w-4 h-4 rounded-full bg-[hsl(var(--brand-red))] animate-[trafficBlink_3s_ease-in-out_infinite]" />
          <div className="w-4 h-4 rounded-full bg-[hsl(48,90%,55%)] opacity-20" />
          <div className="w-4 h-4 rounded-full bg-[hsl(var(--brand-green))] opacity-20" />
        </div>
        <div className="w-[3px] h-20 bg-[hsl(220,8%,35%)]" />
      </div>

      {/* Sidewalk */}
      <div className="absolute left-0 right-0 h-[4%] bg-gradient-to-t from-[hsl(30,10%,62%)] to-[hsl(30,12%,72%)]" style={{ bottom: "44%" }}>
        <div className="absolute bottom-0 left-0 right-0 h-[4px] bg-[hsl(30,6%,55%)]" />
      </div>

      {/* Road */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[hsl(220,8%,24%)] via-[hsl(220,6%,32%)] to-[hsl(220,6%,38%)]" style={{ height: "44%" }}>
        <div className="absolute top-[30%] left-0 right-0 flex gap-14 px-8">
          {Array.from({ length: 18 }).map((_, i) => (
            <div key={i} className="h-[3px] w-14 flex-shrink-0 rounded bg-[hsl(48,85%,60%,0.45)]" />
          ))}
        </div>
        <div className="absolute top-[55%] left-0 right-0 flex gap-14 px-16">
          {Array.from({ length: 18 }).map((_, i) => (
            <div key={`b-${i}`} className="h-[2px] w-10 flex-shrink-0 rounded bg-[hsl(0,0%,50%,0.2)]" />
          ))}
        </div>
      </div>

      {/* Tumbleweed — bigger, slower */}
      <div className="absolute z-[5] animate-[tumbleweed_14s_linear_infinite]" style={{ bottom: "34%" }}>
        <svg width="60" height="60" viewBox="0 0 40 40" className="animate-[tumbleweedSpin_1.8s_linear_infinite] opacity-60">
          <circle cx="20" cy="20" r="16" fill="none" stroke="hsl(35,45%,50%)" strokeWidth="1.5" />
          <circle cx="20" cy="20" r="11" fill="none" stroke="hsl(35,40%,45%)" strokeWidth="1" />
          <circle cx="20" cy="20" r="6" fill="none" stroke="hsl(35,35%,42%)" strokeWidth="0.8" />
          <line x1="4" y1="20" x2="36" y2="20" stroke="hsl(35,40%,48%)" strokeWidth="0.8" />
          <line x1="20" y1="4" x2="20" y2="36" stroke="hsl(35,40%,48%)" strokeWidth="0.8" />
          <line x1="8" y1="8" x2="32" y2="32" stroke="hsl(35,35%,45%)" strokeWidth="0.7" />
          <line x1="32" y1="8" x2="8" y2="32" stroke="hsl(35,35%,45%)" strokeWidth="0.7" />
          <line x1="10" y1="5" x2="30" y2="35" stroke="hsl(35,30%,50%)" strokeWidth="0.5" />
          <line x1="5" y1="14" x2="35" y2="26" stroke="hsl(35,30%,50%)" strokeWidth="0.5" />
          <line x1="5" y1="26" x2="35" y2="14" stroke="hsl(35,30%,50%)" strokeWidth="0.5" />
          <line x1="14" y1="5" x2="26" y2="35" stroke="hsl(35,30%,50%)" strokeWidth="0.5" />
          <path d="M6 15 Q20 18 34 12" fill="none" stroke="hsl(35,38%,52%)" strokeWidth="0.5" />
          <path d="M8 28 Q22 24 36 30" fill="none" stroke="hsl(35,38%,52%)" strokeWidth="0.5" />
          <path d="M12 4 Q18 20 14 36" fill="none" stroke="hsl(35,32%,48%)" strokeWidth="0.4" />
          <path d="M28 6 Q24 22 30 38" fill="none" stroke="hsl(35,32%,48%)" strokeWidth="0.4" />
          <circle cx="20" cy="20" r="3" fill="hsl(35,30%,55%)" opacity="0.4" />
        </svg>
      </div>

      {/* Second tumbleweed — bigger, slower */}
      <div className="absolute z-[5] animate-[tumbleweed_18s_linear_infinite] hidden sm:block" style={{ bottom: "28%", animationDelay: "6s" }}>
        <svg width="48" height="48" viewBox="0 0 40 40" className="animate-[tumbleweedSpin_1.5s_linear_infinite] opacity-45">
          <circle cx="20" cy="20" r="16" fill="none" stroke="hsl(35,45%,50%)" strokeWidth="1.5" />
          <circle cx="20" cy="20" r="10" fill="none" stroke="hsl(35,40%,45%)" strokeWidth="1" />
          <line x1="4" y1="20" x2="36" y2="20" stroke="hsl(35,40%,48%)" strokeWidth="0.8" />
          <line x1="20" y1="4" x2="20" y2="36" stroke="hsl(35,40%,48%)" strokeWidth="0.8" />
          <line x1="8" y1="8" x2="32" y2="32" stroke="hsl(35,35%,45%)" strokeWidth="0.7" />
          <line x1="32" y1="8" x2="8" y2="32" stroke="hsl(35,35%,45%)" strokeWidth="0.7" />
          <path d="M6 15 Q20 18 34 12" fill="none" stroke="hsl(35,38%,52%)" strokeWidth="0.5" />
          <circle cx="20" cy="20" r="3" fill="hsl(35,30%,55%)" opacity="0.4" />
        </svg>
      </div>

      {/* === Main content === */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4">
        <h1
          className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground mb-3 sm:mb-4 text-center"
          style={{ fontFeatureSettings: '"kern" 1, "liga" 1' }}
        >
          Página no encontrada
        </h1>

        <img
          src={robotTruck}
          alt="Robot empujando camión Error 404"
          className="relative z-[2] w-full max-w-[280px] sm:max-w-[380px] md:max-w-[480px] lg:max-w-[560px] xl:max-w-[640px] object-contain"
        />

        <div className="relative z-10 text-center mt-3 sm:mt-4">
          <p className="mb-4 max-w-lg mx-auto text-xs sm:text-sm md:text-base font-bold text-white leading-relaxed drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]">
            ¡Ooops! Al parecer la página que intentas acceder no existe.
          </p>
          <button
            onClick={() => navigate("/")}
            className="group relative overflow-hidden rounded-[var(--radius)] border border-border bg-card px-5 sm:px-7 py-2 sm:py-2.5 text-sm font-semibold text-foreground shadow-sm transition-all duration-300 hover:border-[hsl(var(--brand-red))] hover:text-[hsl(var(--brand-red))] hover:shadow-md active:scale-[0.97] inline-flex items-center gap-2"
          >
            <Home className="w-4 h-4 relative z-10" />
            <span className="relative z-10">Regresar al Inicio</span>
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-[hsl(var(--brand-red)/0.06)] to-transparent transition-transform duration-500 group-hover:translate-x-full" />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes cloudDrift {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.33%); }
        }
        @keyframes trafficBlink {
          0%, 45%, 100% { opacity: 1; }
          50%, 95% { opacity: 0.15; }
        }
        @keyframes priceBlink {
          0%, 70%, 100% { opacity: 1; }
          75%, 95% { opacity: 0.3; }
        }
        @keyframes birdFly {
          0% { transform: translateX(0) translateY(0); }
          25% { transform: translateX(30vw) translateY(-10px); }
          50% { transform: translateX(60vw) translateY(5px); }
          75% { transform: translateX(85vw) translateY(-8px); }
          100% { transform: translateX(110vw) translateY(0); }
        }
        @keyframes tumbleweed {
          0% { left: -80px; }
          100% { left: 110%; }
        }
        @keyframes tumbleweedSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default NotFound;
