// src/components/VentasPorMesSucursal.js
import React, { useEffect, useState } from "react";
import axios from "../utils/axiosInstance"; // ✅ Usamos el que ya incluye el token

function VentasPorMesSucursal() {
  const [datos, setDatos] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    axios
      .get("/ventas-mensuales-por-sucursal")
      .then((res) => {
        setDatos(res.data);
      })
      .catch((err) => {
        console.error("❌ Error al obtener ventas mensuales por sucursal", err);
        alert("Error al obtener ventas mensuales por sucursal");
      })
      .finally(() => setCargando(false));
  }, []);

  return (
    <div className="mt-5">
      <h4 className="mb-3">Ventas mensuales por sucursal (acumulado)</h4>
      {cargando ? (
        <div className="alert alert-info">Cargando datos...</div>
      ) : datos.length === 0 ? (
        <p>No hay datos disponibles.</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-striped table-bordered">
            <thead className="table-dark">
              <tr>
                <th>Sucursal</th>
                <th>Mes</th>
                <th>Año</th>
                <th>Total de Ventas</th>
              </tr>
            </thead>
            <tbody>
              {datos.map((item, idx) => (
                <tr key={idx}>
                  <td>{item.sucursal}</td>
                  <td>{item.mes}</td>
                  <td>{item.anio}</td>
                  <td>{item.total_ventas}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default VentasPorMesSucursal;
