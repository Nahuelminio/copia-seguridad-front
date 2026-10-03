import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "../utils/axiosInstance";

/**
 * Qué nos costó cada pedido y cada compra, en un período.
 *
 * Dos pestañas: lo que vendimos (pedidos mayoristas y de Central, con su costo
 * y su margen) y lo que compramos (las reposiciones de Central, agrupadas por
 * tanda). Los números salen de los mismos endpoints que usan las pantallas de
 * cada pedido, así que no pueden contradecirse.
 */

const fmt = (n) =>
  "$" + Math.round(Number(n || 0)).toLocaleString("es-AR");

const fecha = (f) =>
  f ? new Date(f).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" }) : "—";

const th = {
  color: "#64748b",
  fontWeight: 600,
  padding: "8px 10px",
  fontSize: "0.72rem",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  borderBottom: "1px solid #1e293b",
  textAlign: "right",
  whiteSpace: "nowrap",
};
const td = {
  color: "#e2e8f0",
  padding: "8px 10px",
  fontSize: "0.86rem",
  borderBottom: "1px solid #1e293b",
  textAlign: "right",
  whiteSpace: "nowrap",
};

/** Primer día del mes en curso, en formato yyyy-mm-dd y en hora local. */
const primeroDelMes = () => {
  const h = new Date();
  return new Date(h.getFullYear(), h.getMonth(), 1).toLocaleDateString("sv-SE");
};
const hoyIso = () => new Date().toLocaleDateString("sv-SE");

export default function CostosPedidos() {
  const [solapa, setSolapa] = useState("ventas"); // ventas | compras
  const [desde, setDesde] = useState(primeroDelMes);
  const [hasta, setHasta] = useState(hoyIso);
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const cargar = useCallback(() => {
    setCargando(true);
    setError("");
    setDatos(null);
    const ruta = solapa === "ventas" ? "/costos/pedidos" : "/costos/compras";
    axios
      .get(ruta, { params: { desde, hasta } })
      .then((r) => setDatos(r.data))
      .catch(() => setError("No se pudieron cargar los costos."))
      .finally(() => setCargando(false));
  }, [solapa, desde, hasta]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const totales = datos?.totales;

  const kpis = useMemo(() => {
    if (!totales) return [];
    if (solapa === "ventas")
      return [
        ["Pedidos", String(totales.pedidos || 0), "#e2e8f0"],
        ["Facturado", fmt(totales.facturado), "#e2e8f0"],
        ["Costo", fmt(totales.costo), "#f87171"],
        ["Ganancia", fmt(totales.ganancia), "#4ade80"],
        ["Margen", totales.margen_pct == null ? "—" : `${totales.margen_pct}%`, "#38bdf8"],
      ];
    return [
      ["Compras", String(totales.compras || 0), "#e2e8f0"],
      ["Unidades", String(totales.unidades || 0), "#e2e8f0"],
      ["Invertido", fmt(totales.invertido), "#f87171"],
      ["Costo por unidad", fmt(totales.costo_promedio), "#38bdf8"],
    ];
  }, [totales, solapa]);

  const inputStyle = {
    background: "#111827",
    border: "1px solid #334155",
    color: "#e2e8f0",
    borderRadius: 8,
    fontSize: "0.85rem",
    padding: "4px 8px",
  };

  return (
    <div>
      {/* Solapas y rango */}
      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        {[
          ["ventas", "Lo que vendí"],
          ["compras", "Lo que compré"],
        ].map(([k, t]) => (
          <button
            key={k}
            onClick={() => setSolapa(k)}
            className="btn btn-sm"
            style={{
              background: solapa === k ? "#1e293b" : "transparent",
              border: "1px solid #334155",
              color: solapa === k ? "#f1f5f9" : "#94a3b8",
              borderRadius: 8,
              fontWeight: solapa === k ? 600 : 400,
            }}
          >
            {t}
          </button>
        ))}
        <div className="ms-auto d-flex align-items-center gap-2">
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} style={inputStyle} />
          <span style={{ color: "#64748b" }}>a</span>
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} style={inputStyle} />
        </div>
      </div>

      {/* Totales */}
      {totales && (
        <div className="d-flex flex-wrap mb-3" style={{ gap: 22 }}>
          {kpis.map(([t, v, c]) => (
            <div key={t}>
              <div style={{ color: "#64748b", fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {t}
              </div>
              <div style={{ color: c, fontWeight: 700, fontSize: "1.1rem" }}>{v}</div>
            </div>
          ))}
        </div>
      )}

      {error && <p style={{ color: "#f87171" }}>{error}</p>}
      {cargando && <p style={{ color: "#64748b" }}>Cargando...</p>}

      {!cargando && !error && solapa === "ventas" && (
        <div style={{ overflowX: "auto" }}>
          {(datos?.pedidos || []).length === 0 ? (
            <p style={{ color: "#64748b" }}>No hay pedidos confirmados en este período.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ ...th, textAlign: "left" }}>Pedido</th>
                  <th style={{ ...th, textAlign: "left" }}>Cliente</th>
                  <th style={th}>Fecha</th>
                  <th style={th}>Unid.</th>
                  <th style={th}>Facturado</th>
                  <th style={th}>Costo</th>
                  <th style={th}>Ganancia</th>
                  <th style={th}>Margen</th>
                </tr>
              </thead>
              <tbody>
                {(datos?.pedidos || []).map((p) => (
                  <tr key={`${p.tipo}-${p.id}`}>
                    <td style={{ ...td, textAlign: "left" }}>
                      <span
                        style={{
                          background: p.tipo === "mayorista" ? "#1e3a5f" : "#3b2f63",
                          color: "#cbd5e1",
                          borderRadius: 6,
                          padding: "1px 6px",
                          fontSize: "0.68rem",
                          marginRight: 6,
                        }}
                      >
                        {p.tipo === "mayorista" ? "mayorista" : "central"}
                      </span>
                      #{p.id}
                    </td>
                    <td style={{ ...td, textAlign: "left", color: "#cbd5e1" }}>{p.cliente || "—"}</td>
                    <td style={td}>{fecha(p.fecha)}</td>
                    <td style={td}>{p.unidades}</td>
                    <td style={td}>{fmt(p.facturado)}</td>
                    <td style={{ ...td, color: "#f87171" }}>{fmt(p.costo)}</td>
                    <td style={{ ...td, color: p.ganancia >= 0 ? "#4ade80" : "#f87171", fontWeight: 600 }}>
                      {fmt(p.ganancia)}
                    </td>
                    <td style={{ ...td, color: "#94a3b8" }}>
                      {p.margen_pct == null ? "—" : `${p.margen_pct}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {!cargando && !error && solapa === "compras" && (
        <div style={{ overflowX: "auto" }}>
          {(datos?.compras || []).length === 0 ? (
            <p style={{ color: "#64748b" }}>No cargaste reposiciones en este período.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ ...th, textAlign: "left" }}>Cuándo</th>
                  <th style={{ ...th, textAlign: "left" }}>Modelos</th>
                  <th style={th}>Unid.</th>
                  <th style={th}>Invertido</th>
                  <th style={th}>Costo por unidad</th>
                </tr>
              </thead>
              <tbody>
                {(datos?.compras || []).map((c) => (
                  <tr key={c.tanda}>
                    <td style={{ ...td, textAlign: "left" }}>{c.tanda}</td>
                    <td style={{ ...td, textAlign: "left", color: "#cbd5e1", whiteSpace: "normal" }}>
                      {c.detalle}
                      {c.sin_costo > 0 && (
                        <div style={{ color: "#fbbf24", fontSize: "0.74rem" }}>
                          {c.sin_costo} renglón{c.sin_costo === 1 ? "" : "es"} sin precio cargado:
                          el total de esta compra queda corto
                        </div>
                      )}
                    </td>
                    <td style={td}>{c.unidades}</td>
                    <td style={{ ...td, color: "#f87171", fontWeight: 600 }}>{fmt(c.invertido)}</td>
                    <td style={{ ...td, color: "#94a3b8" }}>{fmt(c.costo_promedio)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
