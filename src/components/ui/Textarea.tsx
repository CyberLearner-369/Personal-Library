import { forwardRef, useId, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ label, error, hint, className, id: idProp, ...rest }, ref) {
    const autoId = useId();
    const id = idProp ?? autoId;
    return (
      <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
        <label htmlFor={id} className="text-[13px] font-medium text-muted">
          {label}
        </label>
        <textarea
          ref={ref}
          id={id}
          rows={4}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          className={cn(
            'w-full rounded-lg border bg-surface px-3 py-2 text-sm text-ink transition-colors placeholder:text-faint',
            error ? 'border-danger' : 'border-line hover:border-faint',
          )}
          {...rest}
        />
        {hint && !error && (
          <p id={`${id}-hint`} className="text-xs text-faint">
            {hint}
          </p>
        )}
        {error && (
          <p id={`${id}-error`} className="text-xs font-medium text-danger">
            {error}
          </p>
        )}
      </div>
    );
  },
);
