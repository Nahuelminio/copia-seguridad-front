import React from "react";
import ReactDOM from "react-dom/client";
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer } from "react-toastify";

import App from "./App";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";

import reportWebVitals from "./reportWebVitals";
import "./index.css";


const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
    <ToastContainer
      position="bottom-right"
      autoClose={3000}
      hideProgressBar={false}
      closeOnClick
      pauseOnHover
      theme="dark"
      toastStyle={{
        background: "#111827",
        border: "1px solid #1e293b",
        borderRadius: "10px",
        color: "#f1f5f9",
        fontSize: "0.9rem",
        boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
      }}
    />
  </React.StrictMode>
);

reportWebVitals();

