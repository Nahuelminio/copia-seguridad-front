import React, { useEffect, useState } from "react";
import axios from "../utils/axiosInstance"; // ✅ Usamos el axios con token

import VentasTotalesPorSucursal from "./VentasTotalesPorSucursal";
import ComparadorVentasMensuales from "./ComparadorVentasMensuales";
import TablaValorStockSucursal from "./TablaValorStockSucursal";
import ResumenFinancieroSucursal from "./ResumenFinancieroSucursal";
import FormularioPagoSucursal from "./FormularioPagoSucursal";
import TablaVentasPorSucursal from "./VentasPorSucursal";
import { jwtDecode } from "jwt-decode";

function Dashboard() {
  const token = localStorage.getItem("token");
  const decoded = token ? jwtDecode(token) : null;
  const esAdmin = decoded?.rol === "admin";

  const [resumen, setResumen] = useState(null);
  const [ventasSucursal, setVentasSucursal] = useState([]);
  const [recargarResumen, setRecargarResumen] = useState(false);

  const manejarPagoExitoso = () => setRecargarResumen((prev) => !prev);

  useEffect(() => {
    axios
      .get("/dashboard")
      .then((res) => setResumen(res.data))
      .catch((err) => console.error("❌ Error al cargar dashboard", err));

    axios
      .get("/ventas")
      .then((res) => setVentasSucursal(res.data))
      .catch(() => alert("❌ Error al obtener ventas por sucursal"));
  }, []);

  if (!resumen) {
    return (
      <div className="alert alert-info text-center">Cargando dashboard...</div>
    );
  }

  const { totalProductos, stockTotal, stockBajo, productosPorSucursal } =
    resumen;

  const barProductosPorSucursal = productosPorSucursal.map((s) => ({
    sucursal: s.nombre,
    cantidad: s.productos,
  }));

  const stockPieData = [
    { nombre: "Stock bajo (≤ 5)", valor: stockBajo },
    { nombre: "Stock normal", valor: (stockTotal || 0) - (stockBajo || 0) },
  ];

  return (
    <div className="mt-4 px-2">
      <h2 className="mb-4 text-center fs-3">📊 Dashboard</h2>
   
      {/* Modal de pago */}
      <FormularioPagoSucursal onPagoExitoso={manejarPagoExitoso} />
      <div className="card p-4 mt-4 mb-4 card2">
        <TablaValorStockSucursal />
        <ResumenFinancieroSucursal recargar={recargarResumen} />
      </div>
      {esAdmin && (
        <div className="mb-3 text-center">
          <button
            className="btn btn-outline-dark"
            onClick={() =>
              new window.bootstrap.Modal(
                document.getElementById("modalPago")
              ).show()
            }
          >
            Registrar nuevo pago
          </button>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
