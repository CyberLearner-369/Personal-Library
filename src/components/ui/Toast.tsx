import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ToastOptions {
  kind?: 'info' | 'success' | 'error';
  action?: { label: string; onClick: () => void };
  durationMs?: number;
}

interface ToastItem {
  id: number;
  message: string;
  kind: NonNullable<ToastOptions['kind']>;
  action?: ToastOptions['action'];
}

type PushToast = (message: string, options?: ToastOptions) => void;

const ToastContext = createContext<PushToast | null>(null);

export function useToast(): PushToast {
  const push = useContext(ToastContext);
  if (!push) throw new Error('useToast must be used within <ToastProvider>');
  return push;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const push = useCallback<PushToast>(
    (message, options = {}) => {
      const id = ++idRef.current;
      setToasts((current) => [
        ...current.slice(-3),
        { id, message, kind: options.kind ?? 'info', action: options.action },
      ]);
      const duration = options.durationMs ?? (options.kind === 'error' ? 8000 : 5000);
      window.setTimeout(() => dismiss(id), duration);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="no-print pointer-events-none fixed inset-x-0 bottom-4 z-[70] flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'card pointer-events-auto flex w-full max-w-sm animate-fade-in items-center gap-3 px-4 py-3 shadow-lift',
              toast.kind === 'error' && 'border-l-4 border-l-danger',
              toast.kind === 'success' && 'border-l-4 border-l-ok',
            )}
          >
            <p className="flex-1 text-sm text-ink">{toast.message}</p>
            {toast.action && (
              <button
                type="button"
                className="text-sm font-semibold text-accent-ink hover:underline"
                onClick={() => {
                  toast.action?.onClick();
                  dismiss(toast.id);
                }}
              >
                {toast.action.label}
              </button>
            )}
            <button
              type="button"
              aria-label="Dismiss notification"
              className="rounded p-0.5 text-faint hover:text-ink"
              onClick={() => dismiss(toast.id)}
            >
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
