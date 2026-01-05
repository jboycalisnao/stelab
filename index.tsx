import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const container = document.getElementById('root');

if (!container) {
  console.error("Critical Error: Target container 'root' not found in DOM.");
} else {
  try {
    const root = createRoot(container);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (err) {
    console.error("React Initial Mount Failure:", err);
    container.innerHTML = `
      <div style="padding: 40px; font-family: sans-serif; text-align: center; color: #ef4444;">
        <h2 style="margin-bottom: 8px;">System Initialization Error</h2>
        <p style="color: #64748b; font-size: 14px;">A JavaScript error occurred during application startup.</p>
        <button onclick="window.location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">
          Retry Initialization
        </button>
      </div>
    `;
  }
}