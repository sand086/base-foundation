"use client";

import * as React from "react";
import { useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Loader2, AlertTriangle, XCircle, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface AsyncValidatedInputProps extends React.ComponentProps<
  typeof Input
> {
  label?: string;
  required?: boolean;
  validateFn: (value: string) => Promise<string | null | undefined>;
  debounceMs?: number;
  description?: string;
  validateOnBlurOnly?: boolean;
  onValidationChange?: (isValid: boolean, isPristine: boolean) => void;
  wrapperClassName?: string; //  Agregado para separar el contenedor del input
}

const AsyncValidatedInput = React.forwardRef<
  HTMLInputElement,
  AsyncValidatedInputProps
>(
  (
    {
      className,
      wrapperClassName,
      label,
      required,
      validateFn,
      debounceMs = 500,
      description,
      validateOnBlurOnly = true,
      onValidationChange,
      value,
      onChange,
      onBlur,
      ...props
    },
    ref,
  ) => {
    const [internalValue, setInternalValue] = useState(value || "");
    const [isValidating, setIsValidating] = useState(false);
    const [asyncError, setAsyncError] = useState<string | null>(null);
    const [isPristine, setIsPristine] = useState(true);
    const [isValid, setIsValid] = useState<boolean | null>(null);

    useEffect(() => {
      if (value !== undefined) setInternalValue(value);
    }, [value]);

    useEffect(() => {
      if (onValidationChange) {
        onValidationChange(!asyncError && !isPristine, isPristine);
      }
    }, [asyncError, isPristine, onValidationChange]);

    const performValidation = useCallback(
      async (valToValidate: string) => {
        if (!valToValidate || valToValidate.trim() === "") {
          setAsyncError(null);
          setIsValid(null);
          return;
        }
        setIsValidating(true);
        setAsyncError(null);
        setIsValid(null);

        try {
          const errorMsg = await validateFn(valToValidate);
          if (errorMsg) {
            setAsyncError(errorMsg);
            setIsValid(false);
          } else {
            setAsyncError(null);
            setIsValid(true);
          }
        } catch (error) {
          console.error("Error en validación asíncrona:", error);
        } finally {
          setIsValidating(false);
          setIsPristine(false);
        }
      },
      [validateFn],
    );

    useEffect(() => {
      if (validateOnBlurOnly || isPristine || !internalValue) return;
      const timer = setTimeout(() => {
        void performValidation(internalValue.toString());
      }, debounceMs);
      return () => clearTimeout(timer);
    }, [
      internalValue,
      debounceMs,
      validateOnBlurOnly,
      isPristine,
      performValidation,
    ]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setInternalValue(e.target.value);
      if (asyncError) {
        setAsyncError(null);
        setIsValid(null);
      }
      if (onChange) onChange(e);
    };

    const handleBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
      if (validateOnBlurOnly && internalValue) {
        await performValidation(internalValue.toString());
      }
      if (onBlur) onBlur(e);
    };

    const hasError = !!asyncError;
    const showSuccess = isValid && !hasError && !isValidating && !isPristine;

    return (
      <div className={cn("space-y-1.5 w-full", wrapperClassName)}>
        {label && (
          <Label
            variant="brand"
            required={required}
            className={cn(hasError && "text-brand-red dark:text-brand-red")}
          >
            {label}
          </Label>
        )}

        <div className="relative flex items-center">
          <Input
            ref={ref}
            value={value !== undefined ? value : internalValue}
            onChange={handleChange}
            onBlur={handleBlur}
            //  AHORA EL CLASSNAME VA DIRECTO A TU INPUT (Glassmorphism, h-11, etc)
            className={cn(
              className,
              "pr-10 transition-all duration-300",
              hasError &&
                "border-brand-red/60 focus-visible:ring-brand-red/50 bg-brand-red/5 dark:bg-brand-red/10 text-brand-red",
              showSuccess &&
                "border-emerald-500/50 focus-visible:ring-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10",
            )}
            {...props}
          />

          <div className="absolute right-3 flex items-center justify-center pointer-events-none">
            {isValidating ? (
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            ) : hasError ? (
              <AlertTriangle className="h-4 w-4 text-brand-red animate-in zoom-in duration-300" />
            ) : showSuccess ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500 animate-in zoom-in duration-300" />
            ) : null}
          </div>
        </div>

        {hasError && (
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-brand-red animate-in fade-in slide-in-from-top-1 flex items-center gap-1.5 mt-1.5 ml-1">
            <XCircle className="h-3 w-3" /> {asyncError}
          </p>
        )}

        {!hasError && description && (
          <p className="text-[11px] font-medium tracking-tight text-slate-500 dark:text-slate-400 leading-relaxed ml-1">
            {description}
          </p>
        )}
      </div>
    );
  },
);

AsyncValidatedInput.displayName = "AsyncValidatedInput";
export { AsyncValidatedInput };
