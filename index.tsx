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
  console.error("Critical React Mounting Failure:", err);
  container.innerHTML = `
    <div style="padding: 40px; font-family: sans-serif; text-align: center;">
      <h2 style="color: #ef4444;">System Failed to Initialize</h2>
      <p style="color: #64748b;">A module loading error occurred. Please check your internet connection.</p>
      <button onclick="window.location.reload()" style="padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">
        Reload Application
      </button>
    </div>
  `;
}