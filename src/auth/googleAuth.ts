/**
 * Thin wrapper around Google Identity Services (GIS). Sign-in produces a
 * short-lived (~1 h) ID token; it is kept in sessionStorage only, never in
 * localStorage, and is sent to the Apps Script backend in each request
 * body, where it is verified server-side. When the token expires the app
 * keeps working locally and the sync badge asks for a fresh sign-in.
 */

const GIS_SRC = 'https://accounts.google.com/gsi/client';
const SESSION_KEY = 'plm.session';

export interface GoogleSession {
  token: string;
  email: string;
  name: string;
  picture: string;
  /** Unix seconds. */
  exp: number;
}

let gisLoading: Promise<void> | null = null;

export function loadGis(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  gisLoading ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      gisLoading = null;
      reject(new Error('Could not load Google sign-in (are you offline?)'));
    };
    document.head.append(script);
  });
  return gisLoading;
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const payload = token.split('.')[1] ?? '';
  const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
  const json = decodeURIComponent(
    atob(normalized)
      .split('')
      .map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`)
      .join(''),
  );
  return JSON.parse(json) as Record<string, unknown>;
}

export function sessionFromCredential(token: string): GoogleSession {
  const claims = decodeJwtPayload(token);
  return {
    token,
    email: String(claims.email ?? ''),
    name: String(claims.name ?? claims.email ?? 'Google account'),
    picture: String(claims.picture ?? ''),
    exp: Number(claims.exp ?? 0),
  };
}

export function saveSession(session: GoogleSession): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function loadSession(): GoogleSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as GoogleSession;
    return isSessionValid(session) ? session : null;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
  window.google?.accounts.id.disableAutoSelect();
}

export function isSessionValid(session: GoogleSession | null): boolean {
  return !!session && session.exp * 1000 > Date.now() + 60_000;
}

export async function renderSignInButton(
  container: HTMLElement,
  clientId: string,
  onSession: (session: GoogleSession) => void,
): Promise<void> {
  await loadGis();
  const gis = window.google?.accounts.id;
  if (!gis) throw new Error('Google sign-in failed to initialize');
  gis.initialize({
    client_id: clientId,
    auto_select: true,
    use_fedcm_for_prompt: true,
    callback: (response) => {
      const session = sessionFromCredential(response.credential);
      saveSession(session);
      onSession(session);
    },
  });
  container.replaceChildren();
  gis.renderButton(container, {
    theme: 'outline',
    size: 'large',
    shape: 'pill',
    text: 'signin_with',
  });
}
