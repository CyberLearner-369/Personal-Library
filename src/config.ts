/**
 * Connection settings resolve in this order:
 *   1. In-app overrides saved from Settings (localStorage) — lets the owner
 *      connect Google without rebuilding the site.
 *   2. Build-time env vars (VITE_*) — set as GitHub Actions secrets.
 * With neither present the app runs in local-only mode: fully functional,
 * data in IndexedDB, sync disabled until configured.
 */

const LS_KEY = 'plm.connection';

export interface ConnectionConfig {
  scriptUrl: string;
  clientId: string;
}

interface StoredOverrides {
  scriptUrl?: string;
  clientId?: string;
}

function readOverrides(): StoredOverrides {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as StoredOverrides) : {};
  } catch {
    return {};
  }
}

export function getConfig(): ConnectionConfig {
  const overrides = readOverrides();
  return {
    scriptUrl: sanitizeScriptUrl(
      overrides.scriptUrl ?? import.meta.env.VITE_APPS_SCRIPT_URL ?? '',
    ),
    clientId: (overrides.clientId ?? import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '').trim(),
  };
}

export function saveConfigOverrides(config: ConnectionConfig): void {
  localStorage.setItem(
    LS_KEY,
    JSON.stringify({
      scriptUrl: sanitizeScriptUrl(config.scriptUrl),
      clientId: config.clientId.trim(),
    }),
  );
  window.dispatchEvent(new Event('plm:config-changed'));
}

export function isConfigured(): boolean {
  const { scriptUrl, clientId } = getConfig();
  return scriptUrl !== '' && clientId !== '';
}

/** Only genuine Apps Script web-app URLs are accepted; everything else is
 *  discarded so a pasted typo can never send library data elsewhere. */
export function sanitizeScriptUrl(url: string): string {
  const trimmed = url.trim();
  if (trimmed === '') return '';
  try {
    const parsed = new URL(trimmed);
    if (
      parsed.protocol === 'https:' &&
      parsed.hostname === 'script.google.com' &&
      /^\/macros\/s\/[\w-]+\/exec$/.test(parsed.pathname)
    ) {
      return parsed.origin + parsed.pathname;
    }
  } catch {
    /* invalid URL */
  }
  return '';
}
