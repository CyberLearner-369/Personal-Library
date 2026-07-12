import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { useToast } from '@/components/ui/Toast';
import { applyPendingUpdate } from '@/pwa';

export function AppShell() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();

  // Close the mobile drawer on navigation.
  useEffect(() => setDrawerOpen(false), [location]);

  // Global shortcuts: “/” focuses search, “n” starts a new book.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);
      if (typing) return;
      if (event.key === '/') {
        event.preventDefault();
        document.getElementById('global-search')?.focus();
      } else if (event.key === 'n') {
        event.preventDefault();
        navigate('/books/new');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navigate]);

  // Service-worker lifecycle notifications.
  useEffect(() => {
    const onUpdate = () =>
      toast('A new version of the app is ready.', {
        kind: 'info',
        durationMs: 60_000,
        action: { label: 'Reload', onClick: applyPendingUpdate },
      });
    const onOfflineReady = () =>
      toast('Ready to work offline.', { kind: 'success' });
    window.addEventListener('plm:sw-update', onUpdate);
    window.addEventListener('plm:sw-offline-ready', onOfflineReady);
    return () => {
      window.removeEventListener('plm:sw-update', onUpdate);
      window.removeEventListener('plm:sw-offline-ready', onOfflineReady);
    };
  }, [toast]);

  // Escape closes the drawer.
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[80] focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-on-accent"
      >
        Skip to content
      </a>

      <aside className="no-print sticky top-0 hidden h-screen border-r border-line bg-surface/60 lg:block">
        <Sidebar />
      </aside>

      {drawerOpen && (
        <div className="no-print fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/40" aria-hidden="true" />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] animate-fade-in flex-col overflow-y-auto border-r border-line bg-surface shadow-lift"
          >
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close navigation menu"
              className="absolute right-3 top-3 rounded-md p-1.5 text-muted hover:bg-sunken hover:text-ink"
            >
              <X size={18} />
            </button>
            <Sidebar onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-col">
        <TopBar onMenuClick={() => setDrawerOpen(true)} />
        <main id="main-content" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
