import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../utils/axiosInstance";
import { toast } from "react-toastify";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmtUsd(n) {
  return Number(n || 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtArs(n) {
  return Number(n || 0).toLocaleString("es-AR", { maximumFractionDigits: 0 });
}
function fmtMes(ym) {
  if (!ym) return "";
  const [y, m] = ym.split("-");
  const nombres = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  return `${nombres[parseInt(m) - 1]} ${y}`;
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ titulo, valor, sub, accent }) {
  return (
    <div style={{
      background: "#111827",
      border: `1px solid ${accent}30`,
      borderRadius: 12,
      padding: "18px 20px",
      position: "relative",
      overflow: "hidden",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
    }}>
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
        background: accent, borderRadius: "12px 0 0 12px",
      }} />
      <span style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 700,
        textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8, display: "block" }}>
        {titulo}
      </span>
      <div style={{ fontSize: "1.45rem", fontWeight: 700, color: "#f1f5f9", lineHeight: 1.2 }}>
        {valor}
      </div>
      <div style={{ fontSize: "0.74rem", color: "#64748b", marginTop: 6, minHeight: 16 }}>
        {sub || ""}
      </div>
    </div>
  );
}

// ─── Tooltip del gráfico ──────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#1e293b", border: "1px solid #334155",
      borderRadius: 8, padding: "10px 14px", fontSize: "0.82rem" }}>
      <div style={{ color: "#94a3b8", marginBottom: 4 }}>{label}</div>
      <div style={{ color: "#facc15", fontWeight: 700 }}>
        USD {fmtUsd(payload[0]?.value)}
      </div>
      {payload[1] && (
        <div style={{ color: "#60a5fa", marginTop: 2 }}>
          {payload[1].name}: {payload[1].value}
        </div>
      )}
    </div>
  );
}

// ─── Dashboard principal ──────────────────────────────────────────────────────
export default function DashboardMayorista() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const params = new URLSearchParams();
      if (desde) params.set("desde", desde);
      if (hasta) params.set("hasta", hasta);
      const res = await axios.get(`/mayorista/stats?${params}`);
      setStats(res.data);
    } catch {
      toast.error("Error al cargar estadísticas");
    } finally {
      setCargando(false);
    }
  }, [desde, hasta]);

  useEffect(() => { cargar(); }, [cargar]);

  const tot = stats?.totales || {};
  const maxUsdCliente = Math.max(...(stats?.porCliente || []).map((c) => Number(c.total_usd)), 1);

  // datos para gráfico (orden cronológico)
  const datosMes = [...(stats?.porMes || [])].reverse().map((m) => ({
    mes: fmtMes(m.mes),
    usd: Number(m.total_usd),
    pedidos: Number(m.pedidos),
  }));

  return (
    <div className="container-fluid py-4 px-3 px-md-4" style={{ maxWidth: 1100 }}>

      {/* ── Header ── */}
      <div className="d-flex justify-content-between align-items-start mb-4 flex-wrap gap-3">
        <div>
          <h4 className="mb-1 fw-bold">Dashboard Mayorista</h4>
          <p className="mb-0" style={{ color: "#64748b", fontSize: "0.85rem" }}>
            Estadísticas de pedidos confirmados
            {stats?.pendientes > 0 && (
              <span
                className="ms-2 badge bg-warning text-dark"
                style={{ cursor: "pointer", fontSize: "0.75rem" }}
                onClick={() => navigate("/mayorista")}
              >
                {stats.pendientes} pendiente{stats.pendientes !== 1 ? "s" : ""}
              </span>
            )}
          </p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary btn-sm" onClick={() => navigate("/mayorista")}>
            Ver pedidos
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => navigate("/mayorista/nuevo")}>
            + Nuevo pedido
          </button>
        </div>
      </div>

      {/* ── Filtro fechas ── */}
      <div className="d-flex gap-3 mb-4 flex-wrap align-items-end">
        <div>
          <label className="form-label small mb-1" style={{ color: "#64748b" }}>Desde</label>
          <input type="date" className="form-control form-control-sm input-dark"
            style={inputStyle} value={desde} onChange={(e) => setDesde(e.target.value)} />
        </div>
        <div>
          <label className="form-label small mb-1" style={{ color: "#64748b" }}>Hasta</label>
          <input type="date" className="form-control form-control-sm input-dark"
            style={inputStyle} value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </div>
        {(desde || hasta) && (
          <button className="btn btn-sm btn-outline-secondary"
            onClick={() => { setDesde(""); setHasta(""); }}>
            Limpiar filtro
          </button>
        )}
      </div>

      {cargando ? (
        <p className="text-muted text-center mt-5">Cargando…</p>
      ) : (
        <>
          {/* ── KPIs ── */}
          <div className="row g-3 mb-4 align-items-stretch">
            <div className="col-6 col-md-3">
              <KpiCard titulo="Pedidos confirmados" valor={tot.total_pedidos || 0}
                accent="#6366f1" />
            </div>
            <div className="col-6 col-md-3">
              <KpiCard titulo="Total USD"
                valor={`$ ${fmtUsd(tot.total_usd)}`}
                sub="ingresos confirmados"
                accent="#facc15" />
            </div>
            <div className="col-6 col-md-3">
              <KpiCard titulo="Total ARS"
                valor={`$ ${fmtArs(tot.total_ars)}`}
                sub="según tipo de cambio"
                accent="#60a5fa" />
            </div>
            <div className="col-6 col-md-3">
              <KpiCard titulo="Ticket promedio"
                valor={`$ ${fmtUsd(tot.ticket_promedio)}`}
                sub={`${tot.clientes_unicos || 0} cliente${tot.clientes_unicos !== 1 ? "s" : ""} únicos`}
                accent="#10b981" />
            </div>
          </div>

          {/* ── Gráfico ventas por mes ── */}
          {datosMes.length > 0 && (
            <div style={cardStyle} className="mb-4">
              <p style={sectionLabel}>Ventas mensuales (USD)</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={datosMes} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="mes" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => `$${Number(v).toLocaleString("es-AR", { maximumFractionDigits: 0 })}`} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                  <Bar dataKey="usd" fill="#facc15" radius={[4, 4, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="row g-4 mb-4">
            {/* ── Top clientes ── */}
            <div className="col-lg-6">
              <div style={cardStyle}>
                <p style={sectionLabel}>Top clientes por monto</p>
                {!stats?.porCliente?.length ? (
                  <p className="text-muted small">Sin datos</p>
                ) : (
                  <div className="d-flex flex-column gap-2">
                    {stats.porCliente.map((c, i) => {
                      const pct = Math.round((Number(c.total_usd) / maxUsdCliente) * 100);
                      return (
                        <div key={c.cliente}>
                          <div className="d-flex justify-content-between mb-1">
                            <span style={{ fontSize: "0.85rem", color: "#e2e8f0" }}>
                              <span style={{ color: "#64748b", marginRight: 6, fontSize: "0.75rem" }}>
                                #{i + 1}
                              </span>
                              {c.cliente}
                            </span>
                            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#facc15" }}>
                              $ {fmtUsd(c.total_usd)}
                              <span style={{ color: "#475569", fontWeight: 400, marginLeft: 6, fontSize: "0.75rem" }}>
                                ({c.pedidos} ped.)
                              </span>
                            </span>
                          </div>
                          <div style={{ background: "#1e293b", borderRadius: 4, height: 5 }}>
                            <div style={{
                              width: `${pct}%`, height: "100%", borderRadius: 4,
                              background: i === 0 ? "#facc15" : "#6366f1",
                              transition: "width 0.4s ease",
                            }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* ── Top productos ── */}
            <div className="col-lg-6">
              <div style={cardStyle}>
                <p style={sectionLabel}>Productos más vendidos</p>
                {!stats?.porProducto?.length ? (
                  <p className="text-muted small">Sin datos</p>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th style={th}>#</th>
                        <th style={th}>Producto</th>
                        <th style={{ ...th, textAlign: "center" }}>Unidades</th>
                        <th style={{ ...th, textAlign: "right" }}>USD</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.porProducto.map((p, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid #1e293b" }}>
                          <td style={{ ...td, color: "#475569", width: 28 }}>{i + 1}</td>
                          <td style={td}>
                            <div style={{ fontSize: "0.83rem", color: "#e2e8f0" }}>{p.producto}</div>
                            <div style={{ fontSize: "0.74rem", color: "#64748b" }}>{p.gusto}</div>
                          </td>
                          <td style={{ ...td, textAlign: "center" }}>
                            <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#a5f3fc" }}>
                              {p.total_unidades}
                            </span>
                          </td>
                          <td style={{ ...td, textAlign: "right", fontWeight: 700, color: "#facc15", fontSize: "0.82rem" }}>
                            $ {fmtUsd(p.total_usd)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          {/* ── Historial por mes (tabla) ── */}
          {stats?.porMes?.length > 0 && (
            <div style={cardStyle}>
              <p style={sectionLabel}>Detalle por mes</p>
              <div className="table-responsive">
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={th}>Mes</th>
                      <th style={{ ...th, textAlign: "center" }}>Pedidos</th>
                      <th style={{ ...th, textAlign: "right" }}>USD</th>
                      <th style={{ ...th, textAlign: "right" }}>ARS</th>
                      <th style={{ ...th, textAlign: "right" }}>Ticket prom.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.porMes.map((m) => {
                      const ticket = m.pedidos > 0 ? Number(m.total_usd) / Number(m.pedidos) : 0;
                      return (
                        <tr key={m.mes} style={{ borderBottom: "1px solid #1e293b" }}>
                          <td style={{ ...td, fontWeight: 600 }}>{fmtMes(m.mes)}</td>
                          <td style={{ ...td, textAlign: "center" }}>{m.pedidos}</td>
                          <td style={{ ...td, textAlign: "right", color: "#facc15", fontWeight: 700 }}>
                            $ {fmtUsd(m.total_usd)}
                          </td>
                          <td style={{ ...td, textAlign: "right", color: "#60a5fa" }}>
                            $ {fmtArs(m.total_ars)}
                          </td>
                          <td style={{ ...td, textAlign: "right", color: "#94a3b8" }}>
                            $ {fmtUsd(ticket)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const cardStyle = {
  background: "#111827",
  border: "1px solid #1e293b",
  borderRadius: 12,
  padding: 20,
};

const sectionLabel = {
  color: "#64748b",
  fontSize: "0.7rem",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  marginBottom: 16,
};

const th = {
  color: "#64748b",
  fontWeight: 600,
  padding: "6px 8px",
  fontSize: "0.74rem",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  borderBottom: "1px solid #1e293b",
};

const td = {
  color: "#e2e8f0",
  padding: "9px 8px",
  fontSize: "0.86rem",
};

const inputStyle = {
  background: "rgba(255,255,255,0.07)",
  border: "1px solid rgba(255,255,255,0.2)",
  color: "#fff",
};
