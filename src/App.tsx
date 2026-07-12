import { createHashRouter, RouterProvider } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { ToastProvider } from '@/components/ui/Toast';
import { AuthProvider } from '@/state/AuthContext';
import { LibraryProvider } from '@/state/LibraryContext';
import Dashboard from '@/pages/Dashboard';
import Books from '@/pages/Books';
import BookDetail from '@/pages/BookDetail';
import BookEdit from '@/pages/BookEdit';
import Statistics from '@/pages/Statistics';
import RecycleBin from '@/pages/RecycleBin';
import Settings from '@/pages/Settings';
import PrintList from '@/pages/PrintList';
import BookLabel from '@/pages/BookLabel';
import NotFound from '@/pages/NotFound';

/**
 * Hash routing keeps deep links working on GitHub Pages (no server-side
 * rewrites available) and inside the installed PWA. Print/label routes
 * live outside the shell so they render as clean documents.
 */
const router = createHashRouter([
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <Dashboard /> },
      { path: '/books', element: <Books /> },
      { path: '/books/new', element: <BookEdit /> },
      { path: '/books/:id', element: <BookDetail /> },
      { path: '/books/:id/edit', element: <BookEdit /> },
      { path: '/statistics', element: <Statistics /> },
      { path: '/bin', element: <RecycleBin /> },
      { path: '/settings', element: <Settings /> },
      { path: '*', element: <NotFound /> },
    ],
  },
  { path: '/print', element: <PrintList /> },
  { path: '/books/:id/label', element: <BookLabel /> },
]);

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <LibraryProvider>
            <RouterProvider router={router} />
          </LibraryProvider>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
