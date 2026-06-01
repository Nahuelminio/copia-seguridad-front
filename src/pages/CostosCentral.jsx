import React, { useEffect, useState, useCallback } from "react";
import axios from "../utils/axiosInstance";

const card = {
  background: "#111827",
  border: "1px solid #1e293b",
  borderRadius: 12,
  padding: "20px 24px",
};

const label = {
  color: "#64748b",
  fontSize: "0.72rem",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const fmt = (n) =>
  Number(n).toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

const fmtPct = (n) => (n != null ? `${n > 0 ? "+" : ""}${n.toFixed(1)}%` : "—");

function MargenBadge({ pct }) {
  if (pct == null) return <span style={{ color: "#475569", fontSize: "0.78rem" }}>sin costo</span>;
  const color = pct >= 30 ? "#10b981" : pct >= 10 ? "#f59e0b" : "#f87171";
  return (
    <span style={{
      background: `${color}18`,
      color,
      border: `1px solid ${color}40`,
      borderRadius: 6,
      padding: "2px 8px",
      fontSize: "0.78rem",
      fontWeight: 700,
    }}>
      {fmtPct(pct)}
    </span>
  );
}

export default function CostosCentral() {
  const hoy = new Date();
  const primerDiaMes = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-01`;
  const hoyStr = hoy.toISOString().slice(0, 10);

  const [desde, setDesde] = useState(primerDiaMes);
  const [hasta, setHasta] = useState(hoyStr);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [orden, setOrden] = useState("costo_total"); // costo_total | margen_pct | unidades_repuestas

  const cargar = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get("/costos-central", { params: { desde, hasta } });
      setData(res.data);
    } catch (e) {
      console.error(e);
      setError("Error al cargar los datos.");
    } finally {
      setLoading(false);
    }
  }, [desde, hasta]);

  useEffect(() => { cargar(); }, [cargar]);

  const productosFiltrados = data?.productos
    ? [...data.productos]
        .filter(p => {
          if (!busqueda) return true;
          const q = busqueda.toLowerCase();
          return p.producto.toLowerCase().includes(q) || p.gusto.toLowerCase().includes(q);
        })
        .sort((a, b) => {
          if (orden === "margen_pct") return (b.margen_pct ?? -999) - (a.margen_pct ?? -999);
          if (orden === "unidades_repuestas") return b.unidades_repuestas - a.unidades_repuestas;
          return b.costo_total - a.costo_total;
        })
    : [];

  return (
    <div className="container-fluid mt-4 px-3 mb-5">
      {/* Header */}
      <div className="mb-4">
        <h4 style={{ color: "#f1f5f9", fontWeight: 700, marginBottom: 4 }}>
          Costos — Central
        </h4>
        <p style={{ color: "#64748b", fontSize: "0.85rem", margin: 0 }}>
          Análisis de costos de reposición vs. precio de venta. Solo muestra reposiciones con precio de costo cargado.
        </p>
      </div>

      {/* Filtros */}
      <div style={card} className="mb-4">
        <div className="row g-3 align-items-end">
          <div className="col-6 col-md-3">
            <p style={label} className="mb-1">Desde</p>
            <input type="date" className="form-control form-control-sm"
              style={{ background: "#0f172a", border: "1px solid #1e293b", color: "#e2e8f0", borderRadius: 8 }}
              value={desde} onChange={e => setDesde(e.target.value)} />
          </div>
          <div className="col-6 col-md-3">
            <p style={label} className="mb-1">Hasta</p>
            <input type="date" className="form-control form-control-sm"
              style={{ background: "#0f172a", border: "1px solid #1e293b", color: "#e2e8f0", borderRadius: 8 }}
              value={hasta} onChange={e => setHasta(e.target.value)} />
          </div>
          <div className="col-12 col-md-4">
            <p style={label} className="mb-1">Buscar producto</p>
            <input type="text" className="form-control form-control-sm" placeholder="Ej: Ignite, mango..."
              style={{ background: "#0f172a", border: "1px solid #1e293b", color: "#e2e8f0", borderRadius: 8 }}
              value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          </div>
          <div className="col-12 col-md-2">
            <p style={label} className="mb-1">Ordenar por</p>
            <select className="form-select form-select-sm"
              style={{ background: "#0f172a", border: "1px solid #1e293b", color: "#e2e8f0", borderRadius: 8 }}
              value={orden} onChange={e => setOrden(e.target.value)}>
              <option value="costo_total">Mayor costo</option>
              <option value="margen_pct">Mayor margen</option>
              <option value="unidades_repuestas">Más unidades</option>
            </select>
          </div>
        </div>
      </div>

      {loading && (
        <div className="text-center py-5">
          <div className="spinner-border text-secondary" role="status" />
          <p style={{ color: "#64748b", marginTop: 12 }}>Cargando...</p>
        </div>
      )}

      {error && !loading && <div className="alert alert-danger">{error}</div>}

      {!loading && !error && data && (
        <>
          {/* Tarjetas resumen */}
          <div className="row g-3 mb-4">
            {[
              { label: "Invertido en reposición", value: fmt(data.totales.costo_total), color: "#f87171" },
              { label: "Facturado (período)", value: fmt(data.totales.total_vendido), color: "#10b981" },
              { label: "Ganancia estimada", value: fmt(data.totales.ganancia_estimada), color: data.totales.ganancia_estimada >= 0 ? "#10b981" : "#f87171" },
              { label: "Margen general", value: fmtPct(data.totales.margen_pct), color: "#6366f1" },
            ].map(({ label: l, value, color }) => (
              <div className="col-6 col-md-3" key={l}>
                <div style={{ ...card, borderColor: `${color}30` }}>
                  <p style={{ ...label, marginBottom: 4 }}>{l}</p>
                  <p style={{ color, fontWeight: 700, fontSize: "1.3rem", margin: 0 }}>{value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Tabla de productos */}
          {productosFiltrados.length === 0 ? (
            <div style={card}>
              <p style={{ color: "#475569", margin: 0 }}>
                {busqueda ? "Sin resultados para esa búsqueda." : "No hay reposiciones con precio de costo en ese período."}
              </p>
            </div>
          ) : (
            <div style={{ ...card, padding: 0, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table className="table table-dark mb-0" style={{ fontSize: "0.85rem" }}>
                  <thead>
                    <tr style={{ borderColor: "#1e293b", color: "#64748b", fontSize: "0.72rem", textTransform: "uppercase" }}>
                      <th style={{ padding: "12px 16px", fontWeight: 700 }}>Producto / Gusto</th>
                      <th style={{ padding: "12px 16px", textAlign: "right" }}>Repuesto</th>
                      <th style={{ padding: "12px 16px", textAlign: "right" }} title="Promedio ponderado: suma(cantidad×precio) / suma(cantidad con costo)">
                        Costo prom. ⓘ
                      </th>
                      <th style={{ padding: "12px 16px", textAlign: "right" }}>Costo total</th>
                      <th style={{ padding: "12px 16px", textAlign: "right" }}>Precio venta</th>
                      <th style={{ padding: "12px 16px", textAlign: "right" }}>Margen</th>
                      <th style={{ padding: "12px 16px", textAlign: "right" }}>Vendido</th>
                      <th style={{ padding: "12px 16px", textAlign: "right" }}>Stock actual</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productosFiltrados.map((p) => (
                      <tr key={p.gusto_id} style={{ borderColor: "#1e293b" }}>
                        <td style={{ padding: "10px 16px" }}>
                          <span style={{ color: "#f1f5f9", fontWeight: 600 }}>{p.producto}</span>
                          <span style={{ color: "#64748b", marginLeft: 6 }}>{p.gusto}</span>
                          {p.repos_con_costo < p.repos_total && (
                            <span style={{ marginLeft: 8, fontSize: "0.7rem", color: "#f59e0b" }}>
                              ({p.repos_con_costo}/{p.repos_total} con costo)
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "10px 16px", textAlign: "right", color: "#e2e8f0" }}>
                          {p.unidades_repuestas} u.
                        </td>
                        <td style={{ padding: "10px 16px", textAlign: "right" }}>
                          {p.costo_prom ? (
                            <>
                              <span style={{ color: "#e2e8f0" }}>{fmt(p.costo_prom)}</span>
                              {p.costo_prom_parcial && (
                                <span title={`Solo ${p.unidades_con_costo} de ${p.unidades_repuestas} u. tienen costo cargado`}
                                  style={{ color: "#f59e0b", fontSize: "0.72rem", marginLeft: 4 }}>~</span>
                              )}
                            </>
                          ) : <span style={{ color: "#475569" }}>—</span>}
                        </td>
                        <td style={{ padding: "10px 16px", textAlign: "right", color: "#f87171", fontWeight: 600 }}>
                          {p.costo_total > 0 ? fmt(p.costo_total) : "—"}
                        </td>
                        <td style={{ padding: "10px 16px", textAlign: "right", color: "#e2e8f0" }}>
                          {p.precio_venta != null ? fmt(p.precio_venta) : "—"}
                        </td>
                        <td style={{ padding: "10px 16px", textAlign: "right" }}>
                          <MargenBadge pct={p.margen_pct} />
                        </td>
                        <td style={{ padding: "10px 16px", textAlign: "right", color: "#10b981" }}>
                          {p.unidades_vendidas > 0 ? `${p.unidades_vendidas} u. / ${fmt(p.total_vendido)}` : <span style={{ color: "#475569" }}>—</span>}
                        </td>
                        <td style={{ padding: "10px 16px", textAlign: "right" }}>
                          <span style={{ color: p.stock_actual <= 0 ? "#f87171" : "#94a3b8" }}>
                            {p.stock_actual}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Totals row */}
                  <tfoot>
                    <tr style={{ borderTop: "2px solid #1e293b", background: "#0f172a" }}>
                      <td style={{ padding: "10px 16px", color: "#94a3b8", fontWeight: 700 }}>
                        {productosFiltrados.length} producto{productosFiltrados.length !== 1 ? "s" : ""}
                      </td>
                      <td style={{ padding: "10px 16px", textAlign: "right", color: "#e2e8f0" }}>
                        {productosFiltrados.reduce((s, p) => s + p.unidades_repuestas, 0)} u.
                      </td>
                      <td />
                      <td style={{ padding: "10px 16px", textAlign: "right", color: "#f87171", fontWeight: 700 }}>
                        {fmt(productosFiltrados.reduce((s, p) => s + p.costo_total, 0))}
                      </td>
                      <td />
                      <td />
                      <td style={{ padding: "10px 16px", textAlign: "right", color: "#10b981", fontWeight: 700 }}>
                        {fmt(productosFiltrados.reduce((s, p) => s + p.total_vendido, 0))}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
