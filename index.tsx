import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const container = document.getElementById('root');

if (!container) {
  throw new Error("Target container 'root' not found");
}

try {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (err) {
  console.error("React Mounting Failure:", err);
  container.innerHTML = `
    <div style="padding: 40px; font-family: sans-serif; text-align: center;">
      <h2 style="color: #ef4444;">System Initialization Error</h2>
      <p style="color: #64748b;">The application failed to start due to a module loading conflict.</p>
      <button onclick="window.location.reload()" style="padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">
        Reload System
      </button>
    </div>
  `;
}
