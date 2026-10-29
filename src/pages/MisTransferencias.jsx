import React, { useEffect, useState } from "react";
import axios from "../utils/axiosInstance";

const fecha = (f) =>
  f ? new Date(f).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";

// Historial de transferencias de la sucursal logueada: lo que le llegó y lo
// que mandó. Solo lectura; crear y confirmar sigue siendo del admin.
export default function MisTransferencias() {
  const [page, setPage] = useState(1);
  const [res, setRes] = useState(null);
  const [error, setError] = useState(false);
  const [abierta, setAbierta] = useState(null);

  useEffect(() => {
    setRes(null);
    axios.get("/transferencias/mias", { params: { page } })
      .then((r) => setRes(r.data))
      .catch(() => setError(true));
  }, [page]);

  const card = { background: "#111827", border: "1px solid #1e293b", borderRadius: 12, padding: 14 };

  return (
    <div className="container mt-4 mb-5" style={{ maxWidth: 760 }}>
      <h4 style={{ color: "#f1f5f9", fontWeight: 700 }}>Mis transferencias</h4>
      <p style={{ color: "#64748b", fontSize: "0.85rem" }}>
        Lo que te mandaron y lo que mandaste a otras sucursales. Tocá una para ver los sabores.
      </p>

      {error && <div className="alert alert-danger">No se pudieron cargar las transferencias.</div>}
      {!res && !error && <p style={{ color: "#64748b" }}>Cargando...</p>}
      {res && res.data.length === 0 && <p style={{ color: "#64748b" }}>Todavía no hay transferencias.</p>}

      {res?.data.map((t) => {
        const color = t.entrada ? "#22c55e" : "#f59e0b";
        const pendiente = t.estado === "pendiente";
        return (
          <div key={t.id} style={card} className="mb-2">
            <button type="button" onClick={() => setAbierta(abierta === t.id ? null : t.id)}
              className="w-100 text-start" style={{ background: "none", border: "none", padding: 0, color: "#e2e8f0" }}>
              <div className="d-flex justify-content-between align-items-center gap-2 flex-wrap">
                <span>
                  <strong style={{ color }}>{t.entrada ? "↓ Recibiste" : "↑ Mandaste"}</strong>{" "}
                  {t.unidades} u. {t.entrada ? `de ${t.sucursal_origen}` : `a ${t.sucursal_destino}`}
                </span>
                <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                  {pendiente
                    ? <span style={{ color: "#f59e0b" }}>Pendiente · {fecha(t.fecha_creacion)}</span>
                    : fecha(t.fecha_confirmacion)}
                  {" "}{abierta === t.id ? "▲" : "▼"}
                </span>
              </div>
            </button>
            {abierta === t.id && (
              <div className="mt-2 pt-2" style={{ borderTop: "1px solid #1e293b", fontSize: "0.86rem" }}>
                {t.items.map((i, k) => (
                  <div key={k} className="d-flex justify-content-between py-1">
                    <span>{i.producto_nombre} — {i.gusto}</span>
                    <strong>{i.cantidad}</strong>
                  </div>
                ))}
                {t.notas && <div className="mt-1" style={{ color: "#64748b" }}>Nota: {t.notas}</div>}
                {pendiente && (
                  <div className="mt-1" style={{ color: "#f59e0b", fontSize: "0.78rem" }}>
                    Todavía no se confirmó: el stock no se movió.
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {res?.totalPages > 1 && (
        <div className="d-flex justify-content-center gap-2 mt-3">
          <button className="btn btn-sm btn-outline-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</button>
          <span style={{ color: "#94a3b8", alignSelf: "center" }}>{page} / {res.totalPages}</span>
          <button className="btn btn-sm btn-outline-secondary" disabled={page >= res.totalPages} onClick={() => setPage(page + 1)}>Siguiente</button>
        </div>
      )}
    </div>
  );
}
