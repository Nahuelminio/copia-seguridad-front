import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

const PrivateRoute = ({ children }) => {
  const [expirado, setExpirado] = useState(false);
  const [redirect, setRedirect] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      setRedirect(true);
      return;
    }

    try {
      const decoded = jwtDecode(token);
      const currentTime = Date.now() / 1000;

      if (decoded.exp && decoded.exp < currentTime) {
        console.warn("🔒 Token expirado");
        localStorage.removeItem("token");
        setExpirado(true);

        // Pequeño delay antes de redirigir (1 segundo)
        setTimeout(() => {
          setRedirect(true);
        }, 1000);
      }
    } catch (error) {
      console.error("❌ Token inválido:", error);
      localStorage.removeItem("token");
      setExpirado(true);
      setTimeout(() => {
        setRedirect(true);
      }, 1000);
    }
  }, []); // 👈 SOLO una vez al montar

  if (redirect) {
    return <Navigate to="/login" replace />;
  }

  if (expirado) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100 bg-dark text-white">
        <div className="text-center">
          <div className="spinner-border text-light mb-3" role="status"></div>
          <p className="mb-0">
            Tu sesión ha expirado.
            <br />
            Redirigiendo al inicio de sesión...
          </p>
        </div>
      </div>
    );
  }

  return children;
};

export default PrivateRoute;
