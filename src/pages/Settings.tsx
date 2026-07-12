import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  CloudUpload,
  Download,
  FileUp,
  HardDriveDownload,
  MonitorDown,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '@/state/AuthContext';
import { useLibrary } from '@/state/LibraryContext';
import { library } from '@/data/libraryService';
import { SheetsApi } from '@/data/api';
import { getConfig, isConfigured, sanitizeScriptUrl, saveConfigOverrides } from '@/config';
import { renderSignInButton } from '@/auth/googleAuth';
import { booksToCsv, downloadFile } from '@/lib/csv';
import { fmtTime, todayIso } from '@/lib/format';
import { useTheme, type Theme } from '@/hooks/useTheme';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { ImportDialog } from '@/components/books/ImportDialog';

const APP_VERSION = '1.0.0';

function Card({ title, children, description }: { title: string; children: ReactNode; description?: string }) {
  return (
    <section className="card px-5 py-4">
      <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
      {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      <div className="mt-4 flex flex-col gap-4">{children}</div>
    </section>
  );
}

function SignInButton() {
  const { setSession } = useAuth();
  const [error, setError] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const { clientId } = getConfig();

  useEffect(() => {
    const el = ref.current;
    if (!el || !clientId) return;
    renderSignInButton(el, clientId, setSession).catch((err: unknown) =>
      setError(err instanceof Error ? err.message : 'Google sign-in failed to load.'),
    );
  }, [clientId, setSession]);

  if (!clientId) {
    return (
      <p className="text-sm text-muted">
        Add your Google client ID in the connection section above, save, and the sign-in
        button will appear here.
      </p>
    );
  }
  return (
    <div>
      <div ref={ref} />
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}

export default function Settings() {
  const toast = useToast();
  const { confirm, confirmDialog } = useConfirm();
  const { session, signOut } = useAuth();
  const { books, allBooks, syncStatus } = useLibrary();
  const { theme, setTheme } = useTheme();
  const { canInstall, install, isStandalone } = useInstallPrompt();

  const [connection, setConnection] = useState(() => getConfig());
  const [testing, setTesting] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const restoreRef = useRef<HTMLInputElement>(null);

  const saveConnection = () => {
    if (connection.scriptUrl && !sanitizeScriptUrl(connection.scriptUrl)) {
      toast('That is not an Apps Script /exec URL — check docs/SETUP.md.', {
        kind: 'error',
      });
      return;
    }
    saveConfigOverrides(connection);
    setConnection(getConfig());
    toast('Connection settings saved.', { kind: 'success' });
  };

  const testConnection = async () => {
    setTesting(true);
    try {
      const api = new SheetsApi(() => session?.token ?? null);
      const result = await api.ping();
      toast(`Connected — the sheet holds ${result.bookCount} book(s).`, {
        kind: 'success',
      });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Connection test failed', {
        kind: 'error',
      });
    } finally {
      setTesting(false);
    }
  };

  const driveBackup = async () => {
    setBackingUp(true);
    try {
      const result = await library.driveBackup();
      toast(`Backup created in Google Drive: ${result.fileName}`, { kind: 'success' });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Backup failed', { kind: 'error' });
    } finally {
      setBackingUp(false);
    }
  };

  const handleRestore = async (file: File | undefined) => {
    if (!file) return;
    try {
      const text = await file.text();
      const ok = await confirm({
        title: 'Restore backup?',
        message:
          'Books from the backup will be merged into this library and pushed to your sheet on the next sync. Existing books with the same ID are overwritten.',
        confirmLabel: 'Restore',
      });
      if (!ok) return;
      const count = await library.restoreBackup(text);
      toast(`Restored ${count} book${count === 1 ? '' : 's'} from backup.`, {
        kind: 'success',
      });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Restore failed', { kind: 'error' });
    } finally {
      if (restoreRef.current) restoreRef.current.value = '';
    }
  };

  const clearLocal = async () => {
    const ok = await confirm({
      title: 'Clear data on this device?',
      message:
        'Removes the local copy of the library, unsent changes, and sync history from this browser only. Your Google Sheet is untouched — sign in afterwards to download it again.',
      confirmLabel: 'Clear this device',
      tone: 'danger',
    });
    if (!ok) return;
    await library.clearLocalData();
    toast('Local data cleared.', { kind: 'info' });
  };

  const themes: Array<{ value: Theme; label: string }> = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'Follow system' },
  ];

  return (
    <div className="mx-auto flex max-w-2xl animate-fade-in flex-col gap-5">
      <header>
        <h1 className="font-display text-3xl font-semibold text-ink">Settings</h1>
        <p className="mt-1 text-sm text-muted">
          Connection, appearance, and the keys to your data.
        </p>
      </header>

      <Card
        title="Google Sheets connection"
        description="One-time setup — full walkthrough in docs/SETUP.md of the repository."
      >
        <Input
          label="Apps Script web app URL"
          value={connection.scriptUrl}
          onChange={(event) =>
            setConnection((c) => ({ ...c, scriptUrl: event.target.value }))
          }
          placeholder="https://script.google.com/macros/s/…/exec"
          hint="Deploy backend/Code.gs as a web app and paste the /exec URL."
          autoComplete="off"
          className="font-mono"
        />
        <Input
          label="Google OAuth client ID"
          value={connection.clientId}
          onChange={(event) =>
            setConnection((c) => ({ ...c, clientId: event.target.value }))
          }
          placeholder="1234567890-….apps.googleusercontent.com"
          autoComplete="off"
          className="font-mono"
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={saveConnection}>
            Save connection
          </Button>
          <Button
            loading={testing}
            disabled={!isConfigured() || !session}
            onClick={() => void testConnection()}
            title={!session ? 'Sign in below first' : undefined}
          >
            Test connection
          </Button>
        </div>
      </Card>

      <Card title="Google account">
        {session ? (
          <div className="flex flex-wrap items-center gap-3">
            {session.picture && (
              <img
                src={session.picture}
                alt=""
                referrerPolicy="no-referrer"
                className="h-10 w-10 rounded-full border border-line"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">{session.name}</p>
              <p className="truncate text-xs text-muted">{session.email}</p>
            </div>
            <Button onClick={signOut}>Sign out</Button>
          </div>
        ) : (
          <SignInButton />
        )}
        <p className="text-xs text-faint">
          Sign-in stays on this device for the session; the backend re-verifies your
          Google identity on every request.
        </p>
      </Card>

      <Card title="Sync & backups">
        <p className="text-sm text-muted">
          Status: <span className="font-medium capitalize text-ink">{syncStatus.phase}</span>
          {syncStatus.lastSyncedAt && <> · last synced {fmtTime(syncStatus.lastSyncedAt)}</>}
          {syncStatus.pending > 0 && <> · {syncStatus.pending} change(s) waiting</>}
          {syncStatus.conflictsResolved > 0 && (
            <> · {syncStatus.conflictsResolved} conflict(s) auto-resolved (newest kept)</>
          )}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            icon={<RefreshCw size={15} />}
            onClick={() => void library.sync.sync()}
            disabled={!isConfigured()}
          >
            Sync now
          </Button>
          <Button
            icon={<CloudUpload size={15} />}
            loading={backingUp}
            disabled={!session || !isConfigured()}
            onClick={() => void driveBackup()}
          >
            Back up to Drive now
          </Button>
          <Button
            icon={<HardDriveDownload size={15} />}
            disabled={!session || !isConfigured()}
            onClick={() =>
              void confirm({
                title: 'Re-download library?',
                message:
                  'Fetches every book from the Google Sheet again and merges it here. Local changes are kept when newer.',
                confirmLabel: 'Re-download',
              }).then((ok) => { if (ok) return library.sync.fullResync(); }) 
            }
          >
            Re-download from sheet
          </Button>
        </div>
        <p className="text-xs text-faint">
          A daily Drive backup can also run automatically — run installDailyBackup() once
          in the Apps Script editor (docs/BACKUP_AND_RESTORE.md).
        </p>
      </Card>

      <Card title="Appearance">
        <fieldset>
          <legend className="text-sm font-medium text-ink">Theme</legend>
          <div className="mt-2 flex flex-wrap gap-4">
            {themes.map((option) => (
              <label key={option.value} className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="radio"
                  name="theme"
                  value={option.value}
                  checked={theme === option.value}
                  onChange={() => setTheme(option.value)}
                  className="h-4 w-4 accent-[rgb(var(--c-accent))]"
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>
      </Card>

      <Card title="App">
        {isStandalone ? (
          <p className="text-sm text-muted">Installed — running as its own app. ✓</p>
        ) : canInstall ? (
          <Button icon={<MonitorDown size={15} />} onClick={() => void install()}>
            Install on this device
          </Button>
        ) : (
          <p className="text-sm text-muted">
            To install: open the browser menu and choose “Install app” (Chrome/Edge) or
            Share → “Add to Home Screen” (iOS Safari).
          </p>
        )}
        <p className="text-xs text-faint">
          Personal Library Manager v{APP_VERSION} · keyboard: “/” search, “n” new book.
        </p>
      </Card>

      <Card
        title="Your data"
        description="Everything can leave the app at any time, in open formats."
      >
        <div className="flex flex-wrap gap-2">
          <Button
            icon={<Download size={15} />}
            onClick={() =>
              downloadFile(
                `library-${todayIso()}.csv`,
                booksToCsv(books),
                'text/csv;charset=utf-8',
              )
            }
          >
            Download CSV
          </Button>
          <Button
            icon={<Download size={15} />}
            onClick={() =>
              void library
                .exportBackup()
                .then((json) =>
                  downloadFile(
                    `library-backup-${todayIso()}.json`,
                    json,
                    'application/json',
                  ),
                )
            }
          >
            Download JSON backup
          </Button>
          <Button icon={<FileUp size={15} />} onClick={() => restoreRef.current?.click()}>
            Restore JSON backup
          </Button>
          <Button icon={<FileUp size={15} />} onClick={() => setImportOpen(true)}>
            Import CSV
          </Button>
        </div>
        <input
          ref={restoreRef}
          type="file"
          accept=".json,application/json"
          className="sr-only"
          aria-label="Restore JSON backup file"
          onChange={(event) => void handleRestore(event.target.files?.[0])}
        />
        <p className="text-xs text-faint">
          The JSON backup includes the recycle bin and a checksum ({allBooks.length}{' '}
          records right now); CSV covers the active library.
        </p>
      </Card>

      <section className="card border-danger/40 px-5 py-4">
        <h2 className="font-display text-lg font-semibold text-danger">Danger zone</h2>
        <p className="mt-0.5 text-sm text-muted">
          Only affects this browser — the Google Sheet keeps its copy.
        </p>
        <Button variant="danger" className="mt-4" onClick={() => void clearLocal()}>
          Clear data on this device
        </Button>
      </section>

      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
      {confirmDialog}
    </div>
  );
}
