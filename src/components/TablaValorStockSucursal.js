import React, { useEffect, useState } from "react";
import axios from "../utils/axiosInstance";

const thStyle = {
  color: "#64748b",
  fontWeight: 600,
  padding: "8px 12px",
  fontSize: "0.78rem",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  borderBottom: "1px solid #1e293b",
};

const tdStyle = {
  color: "#e2e8f0",
  padding: "9px 12px",
  fontSize: "0.88rem",
  borderBottom: "1px solid #1e293b",
};

function TablaValorStockSucursal() {
  const [valores, setValores] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    axios
      .get("/valor-stock-por-sucursal")
      .then((res) => setValores(res.data))
      .catch(() => setValores([]))
      .finally(() => setCargando(false));
  }, []);

  const totalGeneral = valores.reduce(
    (acc, v) => acc + parseFloat(v.valor_total || 0),
    0
  );

  if (cargando) {
    return <p style={{ color: "#64748b", fontSize: "0.85rem" }}>Cargando...</p>;
  }

  if (valores.length === 0) {
    return <p style={{ color: "#64748b", fontSize: "0.85rem" }}>Sin datos de stock.</p>;
  }

  return (
    <div className="table-responsive">
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={thStyle}>Sucursal</th>
            <th style={{ ...thStyle, textAlign: "right" }}>Valor total</th>
          </tr>
        </thead>
        <tbody>
          {valores.map((v) => (
            <tr key={v.sucursal_id}>
              <td style={tdStyle}>{v.sucursal}</td>
              <td style={{ ...tdStyle, textAlign: "right" }}>
                ${parseFloat(v.valor_total).toFixed(2)}
              </td>
            </tr>
          ))}
          <tr style={{ borderTop: "2px solid #334155" }}>
            <td style={{ ...tdStyle, color: "#94a3b8", fontWeight: 700, borderBottom: "none" }}>
              Total general
            </td>
            <td
              style={{
                ...tdStyle,
                textAlign: "right",
                color: "#6ee7a0",
                fontWeight: 700,
                borderBottom: "none",
              }}
            >
              ${totalGeneral.toFixed(2)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default TablaValorStockSucursal;
