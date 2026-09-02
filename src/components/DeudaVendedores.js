import React, { useEffect, useMemo, useState } from "react";
import axios from "../utils/axiosInstance";

// Mismos estilos que ResumenFinancieroSucursal, para que los dos paneles
// se lean igual estando uno al lado del otro.
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

const money = (n) =>
  "$" +
  Number(n || 0).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/**
 * Deuda de cada vendedor.
 *
 * Va aparte del resumen por sucursal a propósito: los pagos de los vendedores
 * se guardan sin sucursal, así que ese panel no los ve y ahí siempre
 * figurarían como saldados.
 */
export default function DeudaVendedores({ recargar }) {
  const [filas, setFilas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setCargando(true);
    setError("");
    axios
      .get("/vendedores/deudas")
      .then((r) => setFilas(Array.isArray(r.data) ? r.data : []))
      .catch(() => setError("No se pudo cargar la deuda de vendedores."))
      .finally(() => setCargando(false));
  }, [recargar]);

  const totales = useMemo(
    () =>
      filas.reduce(
        (a, v) => ({
          facturado: a.facturado + Number(v.total_facturado || 0),
          pagado: a.pagado + Number(v.total_pagado || 0),
          deuda: a.deuda + Number(v.deuda || 0),
        }),
        { facturado: 0, pagado: 0, deuda: 0 }
      ),
    [filas]
  );

  // Un centavo de diferencia por redondeo no es una deuda
  const debe = (n) => Number(n) > 1;

  if (cargando) return <p style={{ color: "#64748b" }}>Cargando...</p>;
  if (error) return <p style={{ color: "#f87171" }}>{error}</p>;
  if (filas.length === 0)
    return <p style={{ color: "#64748b" }}>No hay vendedores cargados.</p>;

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ ...thStyle, textAlign: "left" }}>Vendedor</th>
            <th style={{ ...thStyle, textAlign: "right" }}>Facturado</th>
            <th style={{ ...thStyle, textAlign: "right" }}>Pagado</th>
            <th style={{ ...thStyle, textAlign: "right" }}>Deuda</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((v) => (
            <tr key={v.id}>
              <td style={tdStyle}>{v.nombre || v.email}</td>
              <td style={{ ...tdStyle, textAlign: "right" }}>
                {money(v.total_facturado)}
              </td>
              <td style={{ ...tdStyle, textAlign: "right", color: "#4ade80" }}>
                {money(v.total_pagado)}
              </td>
              <td
                style={{
                  ...tdStyle,
                  textAlign: "right",
                  color: debe(v.deuda) ? "#f87171" : "#64748b",
                  fontWeight: debe(v.deuda) ? 600 : 400,
                }}
              >
                {debe(v.deuda) ? money(v.deuda) : "al día"}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td style={{ ...tdStyle, fontWeight: 700, borderBottom: "none" }}>
              Total
            </td>
            <td
              style={{
                ...tdStyle,
                textAlign: "right",
                fontWeight: 700,
                borderBottom: "none",
              }}
            >
              {money(totales.facturado)}
            </td>
            <td
              style={{
                ...tdStyle,
                textAlign: "right",
                fontWeight: 700,
                color: "#4ade80",
                borderBottom: "none",
              }}
            >
              {money(totales.pagado)}
            </td>
            <td
              style={{
                ...tdStyle,
                textAlign: "right",
                fontWeight: 700,
                color: debe(totales.deuda) ? "#f87171" : "#64748b",
                borderBottom: "none",
              }}
            >
              {debe(totales.deuda) ? money(totales.deuda) : "al día"}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
