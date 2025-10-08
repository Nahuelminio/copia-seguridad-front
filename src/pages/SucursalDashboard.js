import React from "react";
import ProductoPage from "./ProductoPage";
import RegistrarVenta from "../components/RegistrarVenta";
import ResumenDeudaSucursal from "../components/ResumenDeudaSucursal";

function SucursalDashboard() {
  return (
    <div className="container mt-4">
      <h2 className="text-center mb-4">Panel de Sucursal</h2>
      <ResumenDeudaSucursal />

      <ProductoPage />
    </div>
  );
}

export default SucursalDashboard;
