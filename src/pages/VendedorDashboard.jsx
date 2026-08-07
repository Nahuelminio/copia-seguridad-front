import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import ResumenDeudaSucursal from "../components/ResumenDeudaSucursal";
import SubirComprobante from "../components/SubirComprobante";
import { jwtDecode } from "jwt-decode";

function VendedorDashboard() {
  const navigate = useNavigate();
  const [mostrarComprobante, setMostrarComprobante] = useState(false);

  const token = localStorage.getItem("token");
  const decoded = token ? jwtDecode(token) : null;
  const nombreVendedor = decoded?.email?.split("@")[0] || "Vendedor";

  // Guard: solo vendedores
  if (!decoded || decoded.rol !== "vendedor") {
    navigate("/dashboard", { replace: true });
    return null;
  }

  return (
    <div className="container mt-4" style={{ maxWidth: 700 }}>

      {/* Header */}
      <div className="text-center mb-4">
        <h2 className="fw-bold mb-0">Panel de Vendedor</h2>
        <p className="text-white-50 small mb-0">{nombreVendedor}</p>
      </div>

      {/* Registrar venta / cargar comprobante */}
      <div className="d-flex justify-content-center gap-2 flex-wrap mb-4">
        <button
          className="btn fw-semibold shadow px-5 py-2"
          style={{
            background: "linear-gradient(135deg, #166534, #16a34a)",
            border: "none",
            borderRadius: "8px",
            color: "#fff",
            fontSize: "1rem",
            letterSpacing: "0.4px",
            minWidth: "260px",
          }}
          onClick={() => navigate("/vender")}
        >
          Registrar Venta
        </button>
        <button
          className="btn fw-semibold shadow px-5 py-2"
          style={{
            background: mostrarComprobante
              ? "rgba(255,255,255,0.08)"
              : "linear-gradient(135deg, #1e3a8a, #2563eb)",
            border: "none",
            borderRadius: "8px",
            color: "#fff",
            fontSize: "1rem",
            letterSpacing: "0.4px",
            minWidth: "260px",
          }}
          onClick={() => setMostrarComprobante((v) => !v)}
        >
          {mostrarComprobante ? "Cerrar" : "Cargar Comprobante"}
        </button>
      </div>

      {mostrarComprobante && (
        <div className="mb-4">
          <SubirComprobante />
        </div>
      )}

      {/* Resumen de deuda */}
      <ResumenDeudaSucursal />

      {/* Accesos rápidos */}
      <div className="row g-3 mt-2">
        <div className="col-6">
          <button
            className="w-100 btn"
            style={{
              background: "#111827",
              border: "1px solid #334155",
              borderRadius: 9,
              color: "#94a3b8",
              fontWeight: 600,
              fontSize: "0.88rem",
              padding: "11px 0",
            }}
            onClick={() => navigate("/historial")}
          >
            Mis ventas
          </button>
        </div>
        <div className="col-6">
          <button
            className="w-100 btn"
            style={{
              background: "#111827",
              border: "1px solid #334155",
              borderRadius: 9,
              color: "#94a3b8",
              fontWeight: 600,
              fontSize: "0.88rem",
              padding: "11px 0",
            }}
            onClick={() => navigate("/Cuentas-Corrientes")}
          >
            Mi cuenta corriente
          </button>
        </div>
      </div>

    </div>
  );
}

export default VendedorDashboard;
