import React from "react";
import { useNavigate } from "react-router-dom";
import ProductoPage from "./ProductoPage";
import ResumenDeudaSucursal from "../components/ResumenDeudaSucursal";

function SucursalDashboard() {
  const navigate = useNavigate();

  return (
    <div className="container mt-4">
      <div className="text-center mb-4">
        <h2 className="fw-bold mb-0">Panel de Sucursal</h2>
        <p className="text-white-50 small mb-0">Resumen del estado actual</p>
      </div>

      <div className="d-flex justify-content-center mb-4">
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
      </div>

      <ResumenDeudaSucursal />

      <ProductoPage />
    </div>
  );
}

export default SucursalDashboard;
