import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
// Recover once from a stale hashed engine chunk after a deployment.
window.addEventListener('vite:preloadError', (event) => {
  try {
    const last = Number(sessionStorage.getItem('hanplay-asset-reload') ?? 0);
    if (!navigator.onLine || Date.now() - last < 15000) return;
    sessionStorage.setItem('hanplay-asset-reload', String(Date.now()));
    event.preventDefault();
    location.reload();
  } catch {
    /* Storage can be disabled; the game keeps its manual reload action. */
  }
});
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
