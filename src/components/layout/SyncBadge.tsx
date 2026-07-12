import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Check,
  CloudOff,
  RefreshCw,
  UserRound,
  WifiOff,
  type LucideIcon,
} from 'lucide-react';
import { useLibrary } from '@/state/LibraryContext';
import { library } from '@/data/libraryService';
import { fmtTime } from '@/lib/format';
import { cn } from '@/lib/utils';

interface BadgeConfig {
  icon: LucideIcon;
  text: string;
  title: string;
  onClick?: () => void;
  spin?: boolean;
  danger?: boolean;
}

/** One glanceable pill that always tells the truth about the data:
 *  local-only, signed out, offline, syncing, error, or synced-at. */
export function SyncBadge() {
  const navigate = useNavigate();
  const { syncStatus } = useLibrary();
  const { phase, pending, lastSyncedAt, error } = syncStatus;

  const configs: Record<typeof phase, BadgeConfig> = {
    unconfigured: {
      icon: CloudOff,
      text: 'Local only',
      title: 'Data lives on this device. Connect Google Sheets in Settings to sync.',
      onClick: () => navigate('/settings'),
    },
    'signed-out': {
      icon: UserRound,
      text: 'Sign in to sync',
      title: 'Sign in with Google (Settings) to sync your changes.',
      onClick: () => navigate('/settings'),
    },
    offline: {
      icon: WifiOff,
      text: 'Offline',
      title: 'Changes are saved on this device and will sync automatically later.',
    },
    syncing: {
      icon: RefreshCw,
      text: 'Syncing…',
      title: 'Syncing with your Google Sheet.',
      spin: true,
    },
    error: {
      icon: AlertTriangle,
      text: 'Sync error',
      title: error ?? 'Sync failed — click to retry.',
      onClick: () => void library.sync.sync(),
      danger: true,
    },
    idle: {
      icon: Check,
      text: lastSyncedAt ? `Synced ${fmtTime(lastSyncedAt)}` : 'Synced',
      title: 'Everything is synced. Click to sync again.',
      onClick: () => void library.sync.sync(),
    },
  };

  const config = configs[phase];
  const Icon = config.icon;

  return (
    <button
      type="button"
      onClick={config.onClick}
      disabled={!config.onClick}
      title={config.title}
      aria-label={`Sync status: ${config.text}${pending > 0 ? `, ${pending} change(s) waiting` : ''}. ${config.title}`}
      className={cn(
        'flex h-8 items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 text-xs font-medium transition-colors',
        config.onClick && 'hover:bg-sunken',
        config.danger ? 'text-danger' : 'text-muted',
      )}
    >
      <Icon size={14} className={cn(config.spin && 'animate-spin')} aria-hidden="true" />
      <span className="hidden sm:inline">{config.text}</span>
      {pending > 0 && (
        <span className="rounded-full bg-accent px-1.5 py-px text-[10px] font-bold text-on-accent">
          {pending}
        </span>
      )}
    </button>
  );
}
