import React, { useEffect, useState } from "react";
import axios from "axios";

function VentasTotalesPorSucursal() {
  const [datos, setDatos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const API = process.env.REACT_APP_API_URL;

  useEffect(() => {
    axios
      .get(`${API}/productos/ventas-totales-por-sucursal`)
      .then((res) => setDatos(res.data))
      .catch(() => alert("❌ Error al obtener ventas por sucursal"))
      .finally(() => setCargando(false));
  }, [API]);

  const totalGeneral = datos.reduce(
    (acc, s) => acc + Number(s.total_ventas || 0),
    0
  );

  return (
    <div className="mt-4">
      <h4 className="mb-3">🛒 Ventas Totales por Sucursal</h4>

      {cargando ? (
        <div className="alert alert-info">Cargando datos...</div>
      ) : (
        <table className="table table-bordered table-sm text-center align-middle">
          <thead className="table-dark">
            <tr>
              <th>Sucursal</th>
              <th>Total facturado</th>
            </tr>
          </thead>
          <tbody>
            {datos.map((sucursal, i) => (
              <tr key={i}>
                <td>{sucursal.sucursal}</td>
                <td>
                  $
                  {Number(sucursal.total_ventas || 0).toLocaleString("es-AR", {
                    minimumFractionDigits: 2,
                  })}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="fw-bold">
            <tr>
              <td>Total general</td>
              <td>
                $
                {totalGeneral.toLocaleString("es-AR", {
                  minimumFractionDigits: 2,
                })}
              </td>
            </tr>
          </tfoot>
        </table>
      )}
    </div>
  );
}

export default VentasTotalesPorSucursal;
