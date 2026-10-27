import React, { useEffect, useState } from "react";
import axios from "../utils/axiosInstance";

const fmt = (n) => "$" + Math.round(Number(n || 0)).toLocaleString("es-AR");

// Lo que el vendedor cargó hoy, para que él mismo vea si algo quedó mal
// antes de rendir.
export default function MisVentasHoy() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    axios.get("/vendedores/mis-ventas-hoy")
      .then((r) => setData(r.data))
      .catch(() => setError(true));
  }, []);

  const card = { background: "#111827", border: "1px solid #1e293b", borderRadius: 12, padding: 16 };

  if (error) return <div style={card} className="mb-4 text-white-50 small">No se pudieron cargar tus ventas de hoy.</div>;
  if (!data) return <div style={card} className="mb-4 text-white-50 small">Cargando tus ventas de hoy...</div>;

  return (
    <div style={card} className="mb-4">
      <div className="d-flex justify-content-between align-items-baseline mb-2">
        <span style={{ color: "#94a3b8", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.6px" }}>
          Mis ventas de hoy
        </span>
        <span style={{ color: "#f1f5f9", fontWeight: 700 }}>
          {data.unidades} u. · <span style={{ color: "#22c55e" }}>{fmt(data.total)}</span>
        </span>
      </div>
      {data.ventas.length === 0 ? (
        <div className="text-white-50 small">Todavía no cargaste ventas hoy.</div>
      ) : (
        data.ventas.map((v) => (
          <div key={v.id} className="d-flex justify-content-between py-1"
            style={{ borderTop: "1px solid #1e293b", fontSize: "0.86rem", color: "#e2e8f0" }}>
            <span>
              <span style={{ color: "#64748b" }}>
                {new Date(v.fecha).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
              </span>{" "}
              {v.cantidad} × {v.producto_nombre} — {v.gusto}
            </span>
            <span>{fmt(v.cantidad * v.precio_unitario)}</span>
          </div>
        ))
      )}
      <div className="mt-2" style={{ color: "#64748b", fontSize: "0.75rem" }}>
        Si ves algo mal, avisale al administrador.
      </div>
    </div>
  );
}
