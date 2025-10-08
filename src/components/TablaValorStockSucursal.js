import React, { useEffect, useState } from "react";
import axios from "../utils/axiosInstance"; // ✅ axios con token incluido

function TablaValorStockSucursal() {
  const [valores, setValores] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    axios
      .get("/valor-stock-por-sucursal")
      .then((res) => setValores(res.data))
      .catch((err) => {
        console.error("❌ Error al obtener valores de stock:", err);
        setValores([]);
      })
      .finally(() => setCargando(false));
  }, []);

  const totalGeneral = valores.reduce(
    (acc, v) => acc + parseFloat(v.valor_total || 0),
    0
  );

  return (
    <div className="p-4 mt-4 mb-4">
      <h4>Valor total de stock por sucursal</h4>
      {cargando ? (
        <p>Cargando...</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-bordered table-striped">
            <thead className="table-dark">
              <tr>
                <th>Sucursal</th>
                <th className="text-center">Valor total</th>
              </tr>
            </thead>
            <tbody>
              {valores.map((v) => (
                <tr key={v.sucursal_id}>
                  <td>{v.sucursal}</td>
                  <td className="text-center">
                    ${parseFloat(v.valor_total).toFixed(2)}
                  </td>
                </tr>
              ))}
              <tr className="table-secondary fw-bold">
                <td className="text-start bg-danger">Total general:</td>
                <td className="text-center bg-danger">
                  ${totalGeneral.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default TablaValorStockSucursal;
