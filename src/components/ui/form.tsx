"use client";

import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

const control =
  "w-full min-h-11 rounded-[14px] border border-line bg-card px-3 text-[0.95rem] text-ink placeholder:text-muted/70 focus:border-mineral focus:outline-none focus-visible:outline-3 focus-visible:outline-orange aria-[invalid=true]:border-error";

interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  children: (ids: { id: string; describedBy?: string; invalid: boolean }) => ReactNode;
  className?: string;
}

/** Campo com label, dica e erro associados por aria-describedby. */
export function Field({ label, hint, error, children, className }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;
  const describedBy = [hintId, errId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="block text-sm font-semibold text-ink">
        {label}
      </label>
      {children({ id, describedBy, invalid: Boolean(error) })}
      {hint && (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errId} role="alert" className="text-xs font-semibold text-error">
          {error}
        </p>
      )}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(control, className)} {...props} />;
  },
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, ...props }, ref) {
    return <select ref={ref} className={cn(control, "appearance-auto", className)} {...props} />;
  },
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(control, "min-h-20 py-2", className)} {...props} />;
});

interface ChoiceOption<V extends string> {
  value: V;
  label: string;
  description?: string;
}

/** Grupo de opções acessível (radio) em formato de chips/cartões. */
export function ChoiceGroup<V extends string>({
  legend,
  options,
  value,
  onChange,
  columns = 1,
  error,
  hint,
}: {
  legend: string;
  options: ChoiceOption<V>[];
  value: V | null | undefined;
  onChange: (v: V) => void;
  columns?: 1 | 2 | 3;
  error?: string;
  hint?: string;
}) {
  const name = useId();
  return (
    <fieldset className="space-y-2">
      <legend className="mb-1 text-sm font-semibold text-ink">{legend}</legend>
      {hint && <p className="text-xs text-muted">{hint}</p>}
      <div
        className={cn("grid gap-2", columns === 2 && "grid-cols-2", columns === 3 && "grid-cols-3")}
      >
        {options.map((o) => {
          const checked = value === o.value;
          return (
            <label
              key={o.value}
              className={cn(
                "flex min-h-11 cursor-pointer items-start gap-2 rounded-[14px] border px-3 py-2.5 text-sm transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-orange",
                checked ? "border-forest bg-sage-soft text-forest" : "border-line bg-card text-ink",
              )}
            >
              <input
                type="radio"
                name={name}
                value={o.value}
                checked={checked}
                onChange={() => onChange(o.value)}
                className="mt-0.5 size-4 accent-[var(--brand-forest)]"
              />
              <span>
                <span className="font-semibold">{o.label}</span>
                {o.description && <span className="block text-xs text-muted">{o.description}</span>}
              </span>
            </label>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="text-xs font-semibold text-error">
          {error}
        </p>
      )}
    </fieldset>
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-[14px] border border-line bg-card px-3 py-2.5 text-sm has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-orange">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-5 shrink-0 accent-[var(--brand-forest)]"
      />
      <span>
        <span className="font-semibold text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-muted">{description}</span>}
      </span>
    </label>
  );
}
