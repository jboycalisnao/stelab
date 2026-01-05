import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');

if (!rootElement) {
  // Direct DOM manipulation to ensure an error is visible even if React fails
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = 'color: #AF1456; padding: 40px; font-family: sans-serif; text-align: center; background: #fff1f2; border: 2px solid #AF1456; margin: 20px; border-radius: 12px;';
  errorDiv.innerHTML = '<h1>Configuration Error</h1><p>The root element "#root" was not found in index.html. Application cannot mount.</p>';
  document.body.appendChild(errorDiv);
  throw new Error("Could not find root element to mount to");
}

try {
  const root = ReactDOM.createRoot(rootElement);
  
  // Explicit console log to verify Vite entry execution in production logs
  console.log("SciLab Pro: Mounting React Application...");

  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  
  console.log("SciLab Pro: App Mounted Successfully.");
} catch (error) {
  console.error("SciLab Pro: Critical Render Error:", error);
  rootElement.innerHTML = `
    <div style="color: #AF1456; padding: 40px; font-family: sans-serif; text-align: center;">
      <h1 style="font-size: 24px;">Application Crash Detected</h1>
      <p style="color: #64748b;">${error instanceof Error ? error.message : 'Unknown runtime error'}</p>
      <div style="margin-top: 20px; font-size: 12px; color: #94a3b8; font-family: monospace;">Check browser console for stack trace.</div>
    </div>
  `;
}
