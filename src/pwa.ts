import { registerSW } from 'virtual:pwa-register';

/**
 * Service worker registration. When a new build is waiting, the app shell
 * shows a toast (listening for 'plm:sw-update') whose action applies it.
 */
let applyUpdate: ((reload?: boolean) => Promise<void>) | null = null;

export function registerPwa(): void {
  applyUpdate = registerSW({
    onNeedRefresh() {
      window.dispatchEvent(new CustomEvent('plm:sw-update'));
    },
    onOfflineReady() {
      window.dispatchEvent(new CustomEvent('plm:sw-offline-ready'));
    },
  });
}

export function applyPendingUpdate(): void {
  void applyUpdate?.(true);
}
