import { Link, useLocation } from 'react-router-dom';
import {
  BarChart3,
  BookMarked,
  Handshake,
  LayoutDashboard,
  Library,
  Settings,
  Sparkles,
  Star,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import { useLibrary } from '@/state/LibraryContext';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  count?: number;
  isActive: (pathname: string, params: URLSearchParams) => boolean;
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { books, deletedBooks } = useLibrary();
  const location = useLocation();
  const params = new URLSearchParams(location.search);

  const shelf = books.filter((b) => b.status !== 'wishlist');
  const plainBooksView = !params.get('status') && params.get('favorite') !== '1';

  const items: NavItem[] = [
    {
      label: 'Dashboard',
      to: '/',
      icon: LayoutDashboard,
      isActive: (path) => path === '/',
    },
    {
      label: 'Books',
      to: '/books',
      icon: Library,
      count: shelf.length,
      isActive: (path) => path.startsWith('/books') && plainBooksView,
    },
    {
      label: 'Wishlist',
      to: '/books?status=wishlist',
      icon: Sparkles,
      count: books.filter((b) => b.status === 'wishlist').length,
      isActive: (path, p) => path === '/books' && p.get('status') === 'wishlist',
    },
    {
      label: 'Lent out',
      to: '/books?status=lent',
      icon: Handshake,
      count: books.filter((b) => b.status === 'lent').length,
      isActive: (path, p) => path === '/books' && p.get('status') === 'lent',
    },
    {
      label: 'Favorites',
      to: '/books?favorite=1',
      icon: Star,
      isActive: (path, p) => path === '/books' && p.get('favorite') === '1',
    },
    {
      label: 'Statistics',
      to: '/statistics',
      icon: BarChart3,
      isActive: (path) => path === '/statistics',
    },
    {
      label: 'Recycle bin',
      to: '/bin',
      icon: Trash2,
      count: deletedBooks.length || undefined,
      isActive: (path) => path === '/bin',
    },
    {
      label: 'Settings',
      to: '/settings',
      icon: Settings,
      isActive: (path) => path === '/settings',
    },
  ];

  return (
    <nav aria-label="Main navigation" className="flex h-full flex-col gap-6 p-4">
      <Link
        to="/"
        onClick={onNavigate}
        className="flex items-center gap-2.5 rounded-lg px-2 py-1"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-on-accent">
          <BookMarked size={18} aria-hidden="true" />
        </span>
        <span className="leading-tight">
          <span className="block font-display text-lg font-semibold text-ink">
            Library
          </span>
          <span className="block text-[11px] uppercase tracking-wider text-faint">
            Personal catalogue
          </span>
        </span>
      </Link>

      <ul className="flex flex-1 flex-col gap-0.5">
        {items.map((item) => {
          const active = item.isActive(location.pathname, params);
          const Icon = item.icon;
          return (
            <li key={item.label}>
              <Link
                to={item.to}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                  active
                    ? 'bg-accent-soft font-semibold text-accent-ink'
                    : 'text-muted hover:bg-sunken hover:text-ink',
                )}
              >
                <Icon size={16} aria-hidden="true" />
                <span className="flex-1">{item.label}</span>
                {item.count !== undefined && item.count > 0 && (
                  <span className="rounded-full bg-sunken px-1.5 py-px text-[11px] tabular-nums text-muted">
                    {item.count}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>

      <p className="px-3 text-[11px] leading-relaxed text-faint">
        Your books, your data — stored on this device and in your own Google Sheet.
      </p>
    </nav>
  );
}
