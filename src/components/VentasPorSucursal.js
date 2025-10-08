import React, { useEffect, useState } from "react";
import axios from "axios";

function TablaVentasPorSucursal() {
  const [data, setData] = useState([]);
  const [cargando, setCargando] = useState(true);
  const API = process.env.REACT_APP_API_URL;

  useEffect(() => {
    setCargando(true);
    axios
      .get(`${API}/resumen-pagos`) // ✅ ruta actualizada sin "/productos"
      .then((res) => setData(res.data))
      .catch(() => alert("Error al cargar resumen de ventas"))
      .finally(() => setCargando(false));
  }, []);
 
  return (
    <div className="mt-4">
      <h4 className="mb-3">Ventas por Sucursal</h4>

      {cargando ? (
        <div className="alert alert-info">Cargando datos...</div>
      ) : (
        <table className="table table-bordered table-striped table-sm text-center">
          <thead className="table-dark">
            <tr>
              <th>Sucursal</th>
              <th>Total Ventas</th>
              <th>Total Pagado</th>
              <th>Deuda</th>
            </tr>
          </thead>
          <tbody>
            {data.map((s, i) => {
              const total = Number(s.total_facturado || 0);
              const pagado = Number(s.total_pagado || 0);
              const deuda = total - pagado;
              return (
                <tr key={i}>
                  <td>{s.sucursal}</td>
                  <td>${total.toFixed(2)}</td>
                  <td className="text-success">${pagado.toFixed(2)}</td>
                  <td className={deuda > 0 ? "text-danger" : "text-success"}>
                    ${deuda.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default TablaVentasPorSucursal;
