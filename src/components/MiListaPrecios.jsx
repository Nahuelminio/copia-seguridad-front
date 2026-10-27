import React, { useEffect, useState } from "react";
import axios from "../utils/axiosInstance";

const fmt = (n) => (n == null ? "—" : "$" + Math.round(Number(n)).toLocaleString("es-AR"));

// Lo que el vendedor paga por cada modelo y a cuánto conviene venderlo.
export default function MiListaPrecios() {
  const [filas, setFilas] = useState(null);
  const [error, setError] = useState(false);
  const [abierta, setAbierta] = useState(false);

  useEffect(() => {
    axios.get("/vendedores/mi-lista").then((r) => setFilas(r.data)).catch(() => setError(true));
  }, []);

  const card = { background: "#111827", border: "1px solid #1e293b", borderRadius: 12, padding: 16 };

  return (
    <div style={card} className="mb-4">
      <button type="button" onClick={() => setAbierta((a) => !a)}
        className="w-100 d-flex justify-content-between align-items-center"
        style={{ background: "none", border: "none", padding: 0, color: "#94a3b8",
          fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.6px" }}>
        <span>Mi lista de precios</span><span>{abierta ? "▲" : "▼"}</span>
      </button>
      {abierta && (
        error ? <div className="text-white-50 small mt-2">No se pudo cargar tu lista.</div>
        : !filas ? <div className="text-white-50 small mt-2">Cargando...</div>
        : (
          <div style={{ overflowX: "auto" }} className="mt-2">
            <table className="table table-dark mb-0" style={{ fontSize: "0.85rem" }}>
              <thead>
                <tr><th>Modelo</th><th>Tu costo</th><th>Venta recomendada</th><th>Ganás</th></tr>
              </thead>
              <tbody>
                {filas.map((f) => {
                  const gana = f.recomendado != null ? Number(f.recomendado) - Number(f.costo) : null;
                  return (
                    <tr key={f.producto_id}>
                      <td>{f.nombre} <span style={{ color: "#64748b" }}>({f.stock})</span></td>
                      <td>{fmt(f.costo)}</td>
                      <td style={{ color: "#93c5fd", fontWeight: 600 }}>{fmt(f.recomendado)}</td>
                      <td style={{ color: gana > 0 ? "#22c55e" : "#94a3b8" }}>{gana == null ? "—" : fmt(gana)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
