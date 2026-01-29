import { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

interface GlobalProgressBarProps {
  className?: string;
}

export function GlobalProgressBar({ className }: GlobalProgressBarProps) {
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const previousPathRef = useRef(location.pathname);

  useEffect(() => {
    // Show progress bar briefly on route change
    if (previousPathRef.current !== location.pathname) {
      setIsVisible(true);
      previousPathRef.current = location.pathname;
      
      // Hide after animation completes
      const timeout = setTimeout(() => setIsVisible(false), 400);
      return () => clearTimeout(timeout);
    }
  }, [location.pathname]);

  if (!isVisible) return null;

  return (
    <div className={cn("progress-bar-container", className)}>
      <div className="progress-bar-indeterminate" />
    </div>
  );
}

// Hook for manual progress control (API calls, etc.)
export function useGlobalProgress() {
  const [isLoading, setIsLoading] = useState(false);

  const startProgress = () => setIsLoading(true);
  const stopProgress = () => setIsLoading(false);

  return { isLoading, startProgress, stopProgress };
}

interface ManualProgressBarProps {
  isLoading: boolean;
  className?: string;
}

export function ManualProgressBar({ isLoading, className }: ManualProgressBarProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isLoading) {
      setIsVisible(true);
    } else {
      const timeout = setTimeout(() => setIsVisible(false), 200);
      return () => clearTimeout(timeout);
    }
  }, [isLoading]);

  if (!isVisible) return null;

  return (
    <div className={cn("progress-bar-container", className)}>
      <div className="progress-bar-indeterminate" />
    </div>
  );
}

