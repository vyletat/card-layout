/**
 * Registers the offline service worker. Only in production builds — in dev a
 * cached shell would shadow Vite's HMR.
 */
export function registerServiceWorker(): void {
  if (import.meta.env.DEV) return;
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      // Offline support is a bonus; a failed registration must not break the app.
    });
  });
}
