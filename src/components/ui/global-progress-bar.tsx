import { useEffect, useState } from "react";
import { useNavigation } from "react-router-dom";
import { cn } from "@/lib/utils";

interface GlobalProgressBarProps {
  className?: string;
}

export function GlobalProgressBar({ className }: GlobalProgressBarProps) {
  const navigation = useNavigation();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (navigation.state === "loading") {
      setIsVisible(true);
    } else {
      // Keep visible briefly after loading completes for smooth transition
      const timeout = setTimeout(() => setIsVisible(false), 200);
      return () => clearTimeout(timeout);
    }
  }, [navigation.state]);

  if (!isVisible) return null;

  return (
    <div className={cn("progress-bar-container", className)}>
      <div className="progress-bar-indeterminate" />
    </div>
  );
}

// Alternative hook-based progress for manual control
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

