import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  clearSession,
  isSessionValid,
  loadSession,
  type GoogleSession,
} from '@/auth/googleAuth';
import { library } from '@/data/libraryService';

interface AuthValue {
  session: GoogleSession | null;
  setSession: (session: GoogleSession | null) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within <AuthProvider>');
  return value;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<GoogleSession | null>(() =>
    loadSession(),
  );
  const sessionRef = useRef(session);
  sessionRef.current = session;

  // The sync engine pulls the token lazily so it always sees the freshest
  // session without re-wiring on every render.
  useEffect(() => {
    library.setTokenProvider(() =>
      isSessionValid(sessionRef.current) ? sessionRef.current!.token : null,
    );
  }, []);

  // Google ID tokens live ~1 hour; drop expired ones so the sync badge
  // flips to "sign in to sync" instead of failing silently.
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (sessionRef.current && !isSessionValid(sessionRef.current)) {
        setSessionState(null);
        library.sync.requestSync();
      }
    }, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const setSession = useCallback((next: GoogleSession | null) => {
    setSessionState(next);
    library.sync.requestSync();
  }, []);

  const signOut = useCallback(() => {
    clearSession();
    setSessionState(null);
    library.sync.requestSync();
  }, []);

  const value = useMemo(
    () => ({ session, setSession, signOut }),
    [session, setSession, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
