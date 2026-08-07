import React, { useEffect, useState } from "react";
import axios from "../utils/axiosInstance";

const fmt = (n) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(n);

const card = {
  background: "#111827",
  border: "1px solid #1e293b",
  borderRadius: 12,
  padding: "18px 22px",
  flex: 1,
  minWidth: 180,
};

export default function KpisHoy() {
  const [data, setData]       = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    axios.get("/kpis-hoy")
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  if (cargando) return null;
  if (!data)    return null;

  const { ventas_hoy, ventas_ayer, variacion_pct, unidades_hoy, transacciones_hoy } = data;

  const varColor = variacion_pct === null ? "#94a3b8"
    : variacion_pct >= 0 ? "#6ee7a0" : "#f87171";

  const varLabel = variacion_pct === null ? "Sin datos de ayer"
    : `${variacion_pct >= 0 ? "▲" : "▼"} ${Math.abs(variacion_pct).toFixed(1)}% vs ayer`;

  return (
    <div style={{ marginBottom: 24 }}>
      <p style={{ color: "#64748b", fontSize: "0.72rem", fontWeight: 700,
        textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
        Hoy
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>

        {/* Ventas del día */}
        <div style={card}>
          <p style={{ color: "#64748b", fontSize: "0.75rem", margin: "0 0 6px" }}>Ventas del día</p>
          <p style={{ color: "#f1f5f9", fontSize: "1.4rem", fontWeight: 700, margin: "0 0 4px" }}>
            {fmt(ventas_hoy)}
          </p>
          <p style={{ color: varColor, fontSize: "0.78rem", margin: 0 }}>{varLabel}</p>
        </div>

        {/* Ayer */}
        <div style={card}>
          <p style={{ color: "#64748b", fontSize: "0.75rem", margin: "0 0 6px" }}>Ayer</p>
          <p style={{ color: "#94a3b8", fontSize: "1.4rem", fontWeight: 700, margin: "0 0 4px" }}>
            {fmt(ventas_ayer)}
          </p>
          <p style={{ color: "#475569", fontSize: "0.78rem", margin: 0 }}>día anterior</p>
        </div>

        {/* Unidades */}
        <div style={card}>
          <p style={{ color: "#64748b", fontSize: "0.75rem", margin: "0 0 6px" }}>Unidades vendidas hoy</p>
          <p style={{ color: "#f1f5f9", fontSize: "1.4rem", fontWeight: 700, margin: "0 0 4px" }}>
            {unidades_hoy.toLocaleString("es-AR")}
          </p>
          <p style={{ color: "#475569", fontSize: "0.78rem", margin: 0 }}>
            {transacciones_hoy} transacción{transacciones_hoy !== 1 ? "es" : ""}
          </p>
        </div>

      </div>
    </div>
  );
}
