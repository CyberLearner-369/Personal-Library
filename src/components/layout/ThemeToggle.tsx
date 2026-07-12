import { Laptop, Moon, Sun } from 'lucide-react';
import { useTheme, type Theme } from '@/hooks/useTheme';

const order: Theme[] = ['light', 'dark', 'system'];
const icons = { light: Sun, dark: Moon, system: Laptop };
const labels = { light: 'Light', dark: 'Dark', system: 'System' };

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const next = order[(order.indexOf(theme) + 1) % order.length];
  const Icon = icons[theme];
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      title={`Theme: ${labels[theme]} — switch to ${labels[next]}`}
      aria-label={`Theme is ${labels[theme]}. Switch to ${labels[next]}`}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-surface text-muted transition-colors hover:bg-sunken hover:text-ink"
    >
      <Icon size={15} aria-hidden="true" />
    </button>
  );
}
