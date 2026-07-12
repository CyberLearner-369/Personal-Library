import { useId } from 'react';
import { cn } from '@/lib/utils';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}

export function Switch({ checked, onChange, label, description, disabled }: SwitchProps) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p id={id} className="text-sm font-medium text-ink">
          {label}
        </p>
        {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={id}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full border transition-colors disabled:opacity-50',
          checked ? 'border-accent bg-accent' : 'border-line bg-sunken',
        )}
      >
        <span
          className={cn(
            'absolute left-0.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 rounded-full shadow transition-transform',
            checked ? 'translate-x-5 bg-on-accent' : 'translate-x-0 bg-surface',
          )}
        />
      </button>
    </div>
  );
}
