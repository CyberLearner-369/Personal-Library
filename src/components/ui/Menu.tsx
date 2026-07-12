import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button, type ButtonProps } from './Button';
import { cn } from '@/lib/utils';

export interface MenuItem {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  danger?: boolean;
}

export function Menu({
  label,
  icon,
  items,
  variant = 'secondary',
  size = 'md',
}: {
  label: string;
  icon?: ReactNode;
  items: MenuItem[];
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const onDocClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        const nodes = [
          ...(listRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []),
        ];
        if (nodes.length === 0) return;
        event.preventDefault();
        const index = nodes.indexOf(document.activeElement as HTMLElement);
        const delta = event.key === 'ArrowDown' ? 1 : -1;
        nodes[(index + delta + nodes.length) % nodes.length]?.focus();
      }
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <Button
        aria-haspopup="menu"
        aria-expanded={open}
        icon={icon}
        variant={variant}
        size={size}
        onClick={() => setOpen((value) => !value)}
      >
        {label}
        <ChevronDown size={14} aria-hidden="true" />
      </Button>
      {open && (
        <div
          ref={listRef}
          role="menu"
          className="card absolute right-0 z-30 mt-1 w-60 animate-scale-in overflow-hidden py-1 shadow-lift"
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              className={cn(
                'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-sunken focus-visible:bg-sunken',
                item.danger ? 'text-danger' : 'text-ink',
              )}
            >
              <span className="text-muted">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
