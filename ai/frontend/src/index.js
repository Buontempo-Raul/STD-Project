import React from "react";
import ReactDOM from "react-dom";
import "./index.css"; // Import index.css instead of App.css
import App from "./App";

// Wrap in a try-catch to see any rendering errors in the console
try {
  ReactDOM.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
    document.getElementById("root")
  );
} catch (error) {
  console.error("Error rendering React application:", error);
  // Add an error message to the page so we can see it
  const rootEl = document.getElementById("root");
  if (rootEl) {
    rootEl.innerHTML = `<div style="color: red; padding: 20px;">
      <h2>Error Rendering Application</h2>
      <p>${error.message}</p>
    </div>`;
  }
}